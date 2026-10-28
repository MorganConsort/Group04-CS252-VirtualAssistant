"""Companion chat with private, persisted per-user history."""

from fastapi import APIRouter, Query, Request, Response
from sqlalchemy import delete, select

from .companion import respond
from .dependencies import DB, CurrentUser
from .models import ChatMessage
from .schemas import ChatOut, ChatRequest, MessageOut

router = APIRouter(prefix="/api/ai", tags=["AI companion"])


@router.post("/chat", response_model=ChatOut)
def chat(data: ChatRequest, request: Request, db: DB, user: CurrentUser):
    return respond(
        db,
        user,
        data,
        request.app.state.settings,
        request.app.state.now(),
        request.app.state.ai_transport,
    )


@router.get("/messages", response_model=list[MessageOut])
def history(db: DB, user: CurrentUser, limit: int = Query(default=50, ge=1, le=200)):
    rows = db.scalars(
        select(ChatMessage)
        .where(ChatMessage.user_id == user.id)
        .order_by(ChatMessage.created_at.desc(), ChatMessage.id.desc())
        .limit(limit)
    ).all()
    return list(reversed(rows))


@router.delete("/messages", status_code=204)
def clear_history(db: DB, user: CurrentUser):
    db.execute(delete(ChatMessage).where(ChatMessage.user_id == user.id))
    db.commit()
    return Response(status_code=204)
