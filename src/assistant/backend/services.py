"""Scheduling transactions and ownership rules shared by the API routes."""

from datetime import datetime, time, timedelta
from functools import wraps
from inspect import signature
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session

from .models import (
    Availability,
    BusyBlock,
    Goal,
    Membership,
    Notification,
    ScheduleEntry,
    Task,
    Team,
    User,
)
from .scheduler import WorkItem, build_plan, minutes
from .schemas import PlanRequest, ReportOut

REMINDER_LEAD = timedelta(minutes=15)


def serialize_schedule_changes(handler):
    """SQLite has no row locks; share the planner lock across related mutations."""
    parameters = signature(handler)

    @wraps(handler)
    def serialized(*args, **kwargs):
        arguments = parameters.bind(*args, **kwargs).arguments
        with arguments["request"].app.state.schedule_lock:
            try:
                return handler(*args, **kwargs)
            except Exception:
                arguments["db"].rollback()
                raise

    return serialized


def owned_goal(db: Session, goal_id: str, user_id: str):
    goal = db.get(Goal, goal_id)
    if goal is None or goal.owner_id != user_id:
        raise HTTPException(404, "Goal not found")
    return goal


def team_member(db: Session, team_id: str, user_id: str):
    team = db.get(Team, team_id)
    if team is None or db.get(Membership, (team_id, user_id)) is None:
        raise HTTPException(404, "Team not found")
    return team


def visible_task(db: Session, task_id: str, user_id: str, edit=False):
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(404, "Task not found")
    if task.team_id is not None:
        team = team_member(db, task.team_id, user_id)
        if edit and user_id not in {task.owner_id, task.assignee_id, team.owner_id}:
            raise HTTPException(
                403, "Only the creator, assignee or team owner can edit this task"
            )
    elif task.owner_id != user_id:
        raise HTTPException(404, "Task not found")
    return task


def lock_task_for_edit(db: Session, task_id: str, user_id: str, extra_assignees=()):
    task = visible_task(db, task_id, user_id, edit=True)
    original_assignee = task.assignee_id
    for assignee_id in sorted({original_assignee, *extra_assignees}):
        db.execute(
            select(User).where(User.id == assignee_id).with_for_update()
        ).scalar_one()
    current = db.scalar(
        select(Task).where(Task.id == task_id).execution_options(populate_existing=True)
    )
    if current is None:
        raise HTTPException(404, "Task not found")
    if current.assignee_id != original_assignee:
        raise HTTPException(409, "The task was reassigned; refresh and try again")
    return visible_task(db, task_id, user_id, edit=True)


def invalidate_future(
    db: Session, user_id: str, now: datetime, task_id: str | None = None
):
    query = delete(ScheduleEntry).where(
        ScheduleEntry.user_id == user_id,
        ScheduleEntry.status == "planned",
        ScheduleEntry.starts_at >= now,
    )
    if task_id is not None:
        query = query.where(ScheduleEntry.task_id == task_id)
    db.execute(query)


def make_plan(db: Session, user: User, data: PlanRequest, now: datetime):
    # PostgreSQL serializes plans, check-ins and task edits on the same user row.
    db.execute(select(User).where(User.id == user.id).with_for_update()).scalar_one()
    windows = db.scalars(
        select(Availability).where(Availability.user_id == user.id)
    ).all()
    busy = db.scalars(select(BusyBlock).where(BusyBlock.user_id == user.id)).all()
    all_entries = db.scalars(
        select(ScheduleEntry).where(ScheduleEntry.user_id == user.id)
    ).all()
    expired_ids = {
        entry.id
        for entry in all_entries
        if entry.status == "planned" and entry.ends_at <= now
    }
    replaceable = [
        entry
        for entry in all_entries
        if (
            entry.status == "planned"
            and entry.starts_at >= data.starts_at
            and entry.ends_at <= data.ends_at
        )
    ]
    replaceable_ids = {entry.id for entry in replaceable}
    fixed = [
        entry
        for entry in all_entries
        if entry.id not in replaceable_ids | expired_ids and entry.status != "missed"
    ]
    planned_elsewhere: dict[str, int] = {}
    for entry in fixed:
        if entry.status == "planned":
            planned_elsewhere[entry.task_id] = planned_elsewhere.get(
                entry.task_id, 0
            ) + minutes(entry.starts_at, entry.ends_at)
    tasks = db.scalars(
        select(Task).where(Task.assignee_id == user.id, Task.status == "pending")
    ).all()
    plan = build_plan(
        [
            WorkItem(
                task.id,
                max(
                    0,
                    task.duration_minutes
                    - task.completed_minutes
                    - planned_elsewhere.get(task.id, 0),
                ),
                task.priority,
                task.due_at,
            )
            for task in tasks
        ],
        [(window.starts_at, window.ends_at) for window in windows],
        [(block.starts_at, block.ends_at) for block in busy]
        + [(entry.starts_at, entry.ends_at) for entry in fixed],
        [(entry.starts_at, entry.ends_at) for entry in fixed],
        data,
        user.timezone,
    )
    plan.expired_sessions = len(expired_ids)
    if data.commit:
        if expired_ids:
            db.execute(
                update(ScheduleEntry)
                .where(ScheduleEntry.id.in_(expired_ids))
                .values(status="missed", actual_minutes=0)
            )
        if replaceable_ids:
            db.execute(
                delete(ScheduleEntry).where(ScheduleEntry.id.in_(replaceable_ids))
            )
        rows = [
            ScheduleEntry(
                user_id=user.id,
                task_id=entry.task_id,
                starts_at=entry.starts_at,
                ends_at=entry.ends_at,
            )
            for entry in plan.entries
        ]
        db.add_all(rows)
        db.flush()
        titles = {task.id: task.title for task in tasks}
        zone = ZoneInfo(user.timezone)
        # Reminders are written now and become visible (created_at) 15 minutes before
        # the session, so reading notifications never writes. Deleting or replanning
        # a session removes its reminder through the ON DELETE CASCADE foreign key.
        db.add_all(
            Notification(
                user_id=user.id,
                entry_id=row.id,
                created_at=row.starts_at - REMINDER_LEAD,
                message=f"{titles[row.task_id]} starts at "
                f"{row.starts_at.astimezone(zone):%H:%M} ({user.timezone}).",
            )
            for row in rows
        )
        db.add(
            Notification(
                user_id=user.id,
                created_at=now,
                message="Your schedule has been updated. Review the new plan.",
            )
        )
        db.commit()
        plan.committed = True
    return plan


def progress_report(db: Session, user: User, start_date):
    cache = db.info.get("report_cache")
    cache_key = (user.id, user.timezone, start_date)
    generation = cache.generation if cache is not None else None
    if cache is not None:
        cached = cache.get(cache_key)
        if cached is not None:
            return cached
    zone = ZoneInfo(user.timezone)
    start = datetime.combine(start_date, time.min, zone)
    end = start + timedelta(days=7)
    tasks = db.scalars(
        select(Task).where(
            Task.assignee_id == user.id,
            Task.status != "cancelled",
            Task.due_at >= start,
            Task.due_at < end,
        )
    ).all()
    entries = db.scalars(
        select(ScheduleEntry).where(
            ScheduleEntry.user_id == user.id,
            ScheduleEntry.starts_at < end,
            ScheduleEntry.ends_at > start,
        )
    ).all()
    # Missed sessions are counted in missed_sessions; their replanned copies would
    # otherwise count the same work twice.
    planned = sum(
        minutes(max(entry.starts_at, start), min(entry.ends_at, end))
        for entry in entries
        if entry.status != "missed"
    )
    completed = sum(
        entry.actual_minutes
        for entry in entries
        if entry.status == "completed" and start <= entry.starts_at < end
    )
    total = len(tasks)
    done = sum(task.status == "completed" for task in tasks)
    report = ReportOut(
        start_date=start_date,
        end_date=start_date + timedelta(days=6),
        total_tasks=total,
        completed_tasks=done,
        planned_minutes=planned,
        completed_minutes=completed,
        missed_sessions=sum(entry.status == "missed" for entry in entries),
        completion_percent=round(done * 100 / total) if total else 0,
    )
    if cache is not None:
        cache.put(cache_key, report, generation)
    return report
