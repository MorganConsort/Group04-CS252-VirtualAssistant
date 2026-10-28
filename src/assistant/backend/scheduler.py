"""Deterministic interval scheduling, independent of HTTP, SQL and LLMs.

Intervals are half-open: [start, end). Priority 1 wins, then earlier deadlines.
The engine reports every minute it cannot place rather than exceeding capacity.
"""

from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from .schemas import PlanOut, PlanRequest, ProposedEntry, Unscheduled

Interval = tuple[datetime, datetime]


def minutes(start: datetime, end: datetime) -> int:
    return max(0, int((end - start).total_seconds() // 60))


def merge(intervals: list[Interval]) -> list[Interval]:
    result: list[Interval] = []
    for start, end in sorted(intervals):
        if start >= end:
            continue
        if result and start <= result[-1][1]:
            result[-1] = (result[-1][0], max(result[-1][1], end))
        else:
            result.append((start, end))
    return result


def subtract(windows: list[Interval], occupied: list[Interval]) -> list[Interval]:
    result = merge(windows)
    for busy_start, busy_end in merge(occupied):
        next_result = []
        for start, end in result:
            if busy_end <= start or busy_start >= end:
                next_result.append((start, end))
                continue
            if start < busy_start:
                next_result.append((start, busy_start))
            if busy_end < end:
                next_result.append((busy_end, end))
        result = next_result
    return result


def intersect(left: list[Interval], right: list[Interval]) -> list[Interval]:
    result = []
    a, b = merge(left), merge(right)
    i = j = 0
    while i < len(a) and j < len(b):
        start, end = max(a[i][0], b[j][0]), min(a[i][1], b[j][1])
        if start < end:
            result.append((start, end))
        if a[i][1] <= b[j][1]:
            i += 1
        else:
            j += 1
    return result


def split_days(interval: Interval, zone: ZoneInfo) -> list[Interval]:
    start, end = interval
    result = []
    while start < end:
        tomorrow = start.astimezone(zone).date() + timedelta(days=1)
        midnight = datetime.combine(tomorrow, time.min, zone).astimezone(start.tzinfo)
        boundary = min(midnight, end)
        result.append((start, boundary))
        start = boundary
    return result


@dataclass(frozen=True)
class WorkItem:
    id: str
    remaining: int
    priority: int
    due_at: datetime


def build_plan(
    tasks: list[WorkItem],
    windows: list[Interval],
    occupied: list[Interval],
    fixed_work: list[Interval],
    request: PlanRequest,
    timezone_name: str,
) -> PlanOut:
    zone = ZoneInfo(timezone_name)
    horizon = [(request.starts_at, request.ends_at)]
    free = subtract(intersect(windows, horizon), occupied)
    free = [piece for window in free for piece in split_days(window, zone)]
    daily_used: dict = defaultdict(int)
    for interval in fixed_work:
        for start, end in split_days(interval, zone):
            daily_used[start.astimezone(zone).date()] += minutes(start, end)

    entries, unscheduled = [], []
    for task in sorted(tasks, key=lambda item: (item.priority, item.due_at, item.id)):
        remaining = task.remaining
        if remaining <= 0:
            continue
        for index, (start, end) in enumerate(free):
            if remaining <= 0:
                break
            end = min(end, task.due_at)
            day = start.astimezone(zone).date()
            capacity = min(
                minutes(start, end), request.daily_limit_minutes - daily_used[day]
            )
            while capacity > 0 and remaining > 0:
                length = min(request.max_session_minutes, capacity, remaining)
                # A final short remainder is allowed; other fragments must meet the minimum.
                if length < request.min_session_minutes and length < remaining:
                    break
                stop = start + timedelta(minutes=length)
                entries.append(
                    ProposedEntry(task_id=task.id, starts_at=start, ends_at=stop)
                )
                daily_used[day] += length
                remaining -= length
                capacity -= length
                start = stop
                free[index] = (start, free[index][1])
        if remaining:
            reason = (
                "deadline_passed"
                if task.due_at <= request.starts_at
                else "insufficient_capacity"
            )
            unscheduled.append(
                Unscheduled(task_id=task.id, minutes=remaining, reason=reason)
            )
    entries.sort(key=lambda entry: (entry.starts_at, entry.task_id))
    return PlanOut(committed=False, entries=entries, unscheduled=unscheduled)
