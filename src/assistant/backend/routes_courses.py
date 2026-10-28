"""Courses, page-level PDF sources (UC-01, issue #13) and concept proposals (UC-02, issue #9)."""

import json
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy import delete, select, text
from sqlalchemy.exc import IntegrityError

from app.concepts.extract import extract_concepts, save_concepts
from app.concepts.visual import read_visuals
from app.llm import LLMClient, get_client, get_vision_client

from .dependencies import DB, CurrentUser
from .ingest import MAX_UPLOAD_BYTES, InvalidPdf, extract_pages, looks_scanned
from .models import Course, Source
from .schemas import ConceptGraphOut, CourseCreate, CourseOut, SourceOut, UploadOut

router = APIRouter(tags=["Courses and sources"])


def owned_course(db, course_id: str, user_id: str) -> Course:
    course = db.get(Course, course_id)
    if course is None or course.owner_id != user_id:
        raise HTTPException(404, "Course not found")  # never reveal others' courses
    return course


@router.post("/courses", response_model=CourseOut, status_code=201)
def create_course(data: CourseCreate, db: DB, user: CurrentUser):
    course = Course(owner_id=user.id, **data.model_dump())
    db.add(course)
    db.commit()
    return course


@router.get("/courses", response_model=list[CourseOut])
def list_courses(db: DB, user: CurrentUser):
    return db.scalars(
        select(Course).where(Course.owner_id == user.id).order_by(Course.created_at)
    ).all()


@router.get("/courses/{course_id}/sources", response_model=list[SourceOut])
def list_sources(course_id: str, db: DB, user: CurrentUser):
    owned_course(db, course_id, user.id)
    return db.scalars(
        select(Source)
        .where(Source.course_id == course_id)
        .order_by(Source.file_name, Source.page)
    ).all()


@router.post("/courses/{course_id}/sources", response_model=UploadOut, status_code=201)
def upload_source(
    course_id: str,
    file: UploadFile,
    db: DB,
    user: CurrentUser,
    vision: Annotated[LLMClient, Depends(get_vision_client)],
):
    owned_course(db, course_id, user.id)
    # Browsers may send a Windows path; keep only the base name.
    name = (file.filename or "").replace("\\", "/").rsplit("/", 1)[-1].strip()
    if not 1 <= len(name) <= 255:
        raise HTTPException(422, "invalid_file_name")
    data = file.file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "file_too_large")
    if not data:
        raise HTTPException(400, "invalid_pdf")
    if not name.lower().endswith(".pdf") or not data.startswith(b"%PDF"):
        raise HTTPException(415, "not_pdf")
    try:
        pages = extract_pages(data)
    except InvalidPdf:
        raise HTTPException(400, "invalid_pdf") from None
    notes = read_visuals(vision, data, len(pages))  # "" per page if the vision model fails
    # Re-uploading the same file name replaces its pages.
    db.execute(
        delete(Source).where(Source.course_id == course_id, Source.file_name == name)
    )
    db.add_all(
        Source(course_id=course_id, file_name=name, page=number, text=text,
               visual_notes=note or None)
        for number, (text, note) in enumerate(zip(pages, notes, strict=True), start=1)
    )
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "upload_in_progress") from None
    return UploadOut(
        file_name=name,
        pages=len(pages),
        status="processed",
        warning="scanned_pdf" if looks_scanned(pages) else None,
    )


@router.post("/courses/{course_id}/concepts:propose", response_model=ConceptGraphOut)
def propose_concepts(
    course_id: str,
    db: DB,
    user: CurrentUser,
    llm: Annotated[LLMClient, Depends(get_client)],
    file_name: str | None = None,
):
    """Extract concepts from uploaded pages (one file, or every file) and store them unconfirmed."""
    owned_course(db, course_id, user.id)
    query = select(Source.file_name, Source.text, Source.visual_notes).where(
        Source.course_id == course_id)
    if file_name is not None:
        query = query.where(Source.file_name == file_name)
    decks: dict[str, tuple[list[str], list[str]]] = {}
    for name, page_text, note in db.execute(query.order_by(Source.file_name, Source.page)):
        pages, notes = decks.setdefault(name, ([], []))
        pages.append(page_text)
        notes.append(note or "")
    if not decks:
        raise HTTPException(404, "no_sources")
    for pages, notes in decks.values():
        concepts = extract_concepts(llm, pages, notes)
        # shortcut: a deck with text but no concepts means every LLM call failed (quota,
        # network, bad JSON); report it rather than look like an empty deck.
        if not concepts and (any(pages) or any(notes)):
            raise HTTPException(503, "concepts_unavailable")
        save_concepts(db, course_id, concepts)
    try:
        db.commit()
    except IntegrityError:  # a concurrent proposal inserted the same slug
        db.rollback()
        raise HTTPException(409, "proposal_in_progress") from None
    rows = db.execute(text(
        "SELECT id, slug, title, summary, bloom_level, source_pages, confirmed FROM concepts "
        "WHERE course_id = :course_id"), {"course_id": course_id}).mappings()
    concepts = [{**row, "source_pages": json.loads(row["source_pages"] or "[]")} for row in rows]
    concepts.sort(key=lambda c: (c["source_pages"] or [0])[0])
    return {"concepts": concepts, "prereqs": []}
