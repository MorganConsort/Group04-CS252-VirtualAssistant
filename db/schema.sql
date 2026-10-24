-- Data model for the study companion (see docs/roadmap/APP_SPECIFICATION.md, section 6).
-- Written in portable SQL: runs on SQLite for local dev and on Postgres in staging.

CREATE TABLE IF NOT EXISTS users (
    id              TEXT PRIMARY KEY,
    display_name    TEXT NOT NULL,
    email           TEXT UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    birth_year      INTEGER,
    role            TEXT NOT NULL DEFAULT 'student',      -- student | teacher | parent | admin
    account_level   TEXT NOT NULL DEFAULT 'university',   -- university | k12
    companion_mode  TEXT NOT NULL DEFAULT 'buddy',        -- off | buddy | mentor | girlfriend (18+ only)
    adult_verified  INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS courses (
    id          TEXT PRIMARY KEY,
    owner_id    TEXT NOT NULL REFERENCES users(id),
    title       TEXT NOT NULL,
    level       TEXT NOT NULL DEFAULT 'university',       -- university | k12
    language    TEXT NOT NULL DEFAULT 'vi',
    created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- One row per page of an uploaded file: the unit every citation points to.
CREATE TABLE IF NOT EXISTS sources (
    id          TEXT PRIMARY KEY,
    course_id   TEXT NOT NULL REFERENCES courses(id),
    file_name   TEXT NOT NULL,
    page        INTEGER NOT NULL,
    text        TEXT NOT NULL,
    UNIQUE (course_id, file_name, page)
);

CREATE TABLE IF NOT EXISTS concepts (
    id           TEXT PRIMARY KEY,
    course_id    TEXT NOT NULL REFERENCES courses(id),
    slug         TEXT NOT NULL,
    title        TEXT NOT NULL,
    summary      TEXT,
    bloom_level  TEXT,                                    -- remember | understand | apply | analyze | evaluate | create
    confirmed    INTEGER NOT NULL DEFAULT 0,
    UNIQUE (course_id, slug)
);

CREATE TABLE IF NOT EXISTS prereqs (
    parent_id   TEXT NOT NULL REFERENCES concepts(id),
    child_id    TEXT NOT NULL REFERENCES concepts(id),
    kind        TEXT NOT NULL DEFAULT 'strict',           -- strict | soft
    confidence  REAL,
    PRIMARY KEY (parent_id, child_id)
);

CREATE TABLE IF NOT EXISTS items (
    id          TEXT PRIMARY KEY,
    concept_id  TEXT NOT NULL REFERENCES concepts(id),
    type        TEXT NOT NULL,                            -- mcq | numeric | short | spot_bug
    prompt      TEXT NOT NULL,
    answer      TEXT NOT NULL,
    rubric      TEXT,
    source_id   TEXT NOT NULL REFERENCES sources(id),     -- no item without a citation
    graded      INTEGER NOT NULL DEFAULT 0,               -- 1 = hint-only, never reveal the answer
    status      TEXT NOT NULL DEFAULT 'draft'             -- draft | approved | rejected
);

CREATE TABLE IF NOT EXISTS cards (
    user_id     TEXT NOT NULL REFERENCES users(id),
    item_id     TEXT NOT NULL REFERENCES items(id),
    fsrs_state  TEXT NOT NULL,                            -- JSON from the fsrs package
    due_at      TEXT NOT NULL,
    PRIMARY KEY (user_id, item_id)
);

-- Append-only: the scheduler, gap repair, companion and every metric read from here.
CREATE TABLE IF NOT EXISTS reviews (
    id           TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL REFERENCES users(id),
    item_id      TEXT NOT NULL REFERENCES items(id),
    rating       INTEGER NOT NULL,                        -- 1 again | 2 hard | 3 good | 4 easy
    answer_text  TEXT,
    score        REAL,
    reviewed_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS companion_events (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id),
    kind        TEXT NOT NULL,                            -- session_done | streak | unlock | checkin
    payload     TEXT,
    created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cards_due ON cards (user_id, due_at);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews (user_id, reviewed_at);
