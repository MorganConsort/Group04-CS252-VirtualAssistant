"""Account, profile and session lifecycle."""

import secrets
from datetime import timedelta

from fastapi import APIRouter, HTTPException, Request, Response
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError

from .dependencies import DB, CurrentUser
from .models import AuthSession, User
from .schemas import Login, ProfilePatch, Register, TokenOut, UserOut
from .security import hash_password, token_hash, verify_password

router = APIRouter(prefix="/api", tags=["Accounts"])
_dummy_hash = hash_password("unregistered-account-placeholder")


def issue_session(db, user, request):
    raw = secrets.token_urlsafe(32)
    expires = request.app.state.now() + timedelta(
        hours=request.app.state.settings.session_hours
    )
    db.execute(
        delete(AuthSession).where(AuthSession.expires_at <= request.app.state.now())
    )
    db.add(AuthSession(token_hash=token_hash(raw), user_id=user.id, expires_at=expires))
    db.commit()
    return TokenOut(
        access_token=raw, expires_at=expires, user=UserOut.model_validate(user)
    )


@router.post("/auth/register", response_model=TokenOut, status_code=201)
def register(data: Register, request: Request, db: DB):
    user = User(
        email=data.email,
        name=data.name,
        timezone=data.timezone,
        password_hash=hash_password(data.password),
    )
    db.add(user)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "An account with this email already exists") from None
    return issue_session(db, user, request)


@router.post("/auth/login", response_model=TokenOut)
def login(data: Login, request: Request, db: DB):
    user = db.scalar(select(User).where(User.email == data.email))
    valid = verify_password(data.password, user.password_hash if user else _dummy_hash)
    if not valid or user is None:
        raise HTTPException(401, "Invalid email or password")
    return issue_session(db, user, request)


@router.post("/auth/logout", status_code=204)
def logout(request: Request, db: DB, user: CurrentUser):
    raw = request.headers["authorization"].split()[1]
    db.execute(delete(AuthSession).where(AuthSession.token_hash == token_hash(raw)))
    db.commit()
    return Response(status_code=204)


@router.get("/me", response_model=UserOut)
def profile(user: CurrentUser):
    return user


@router.patch("/me", response_model=UserOut)
def update_profile(data: ProfilePatch, user: CurrentUser, db: DB):
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(user, key, value)
    db.commit()
    return user
