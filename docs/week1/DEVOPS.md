# Tasks for DevOps (Tuần 1: Git Workflow, CI, Docker Compose, Staging)

Tài liệu này mô tả chi tiết nhiệm vụ DevOps tuần 1 (Võ Thành Đạt, Lê Hồng Đăng): rào chắn cho quy trình Git, CI, môi trường chạy chung và staging tự deploy.

## 🎯 Sứ mệnh tuần 1
Để mọi người code an toàn và nhanh: **không ai push thẳng `main`**, mọi PR được kiểm tra tự động, cả team chạy cùng môi trường và mỗi lần merge thì staging tự cập nhật.

Dưới đây là các hạng mục công việc cần hoàn thiện:

- [ ] **Task 1: Git workflow (#17, Võ Thành Đạt, 5 giờ, phần milestone xong sáng thứ Hai)**
  - **Milestone**: `Week 1` … `Week 6`; gán `Week 1` cho #5–#18.
  - **Branch protection**: PR bắt buộc, 1 approve, CI pass, cấm force push.
  - **CI**: lint, test, quét secret, kiểm tra benchmark, kiểm tra tên nhánh của PR.
  - **Hook**: 6/6 thành viên chạy `python dev.py devops install-hooks`.
- [ ] **Task 2: Docker Compose + staging (#18, Lê Hồng Đăng, 10 giờ)**
  - **Local**: `docker compose up --build` chạy API + Postgres 16.
  - **Staging**: UI trên Vercel; API + DB trên dịch vụ free tier; auto-deploy từ `main`.
  - **Tài liệu**: `docs/DEPLOYMENT.md`, ADR `docs/adr/002-hosting.md`.

---

## 🧰 Dev CLI (đã có trong repo)

| Lệnh | Việc |
|---|---|
| `python dev.py devops check` | Kiểm tra môi trường (Python, venv, git, pytest) |
| `python dev.py devops ci` | Chạy toàn bộ kiểm tra như CI: ruff, pytest, quét secret, benchmark |
| `python dev.py devops branch [tên]` | Kiểm tra tên nhánh `<role>-<name>/<issue>-<task>` |
| `python dev.py devops commit-msg "<msg>"` | Kiểm tra commit message |
| `python dev.py devops install-hooks` | Cài hook `commit-msg` chặn commit sai cú pháp |
| `python dev.py db scan-secrets` | Tìm API key, token, private key trong file git đang theo dõi |

## 🏗️ CI hiện tại (`.github/workflows/ci.yml`)

| Bước | Lệnh | Fail khi |
|---|---|---|
| Lint | `ruff check .` | Lỗi cú pháp, import thừa |
| Test | `pytest tests/` | Bất kỳ test nào fail |
| Quét secret | `python dev.py db scan-secrets` | Có key/token hoặc file `.env` bị commit |
| Benchmark | `python dev.py ai benchmark validate` | Sai định dạng, trùng id |
| Tên nhánh (chỉ PR) | `python dev.py devops branch "$HEAD_REF"` | Nhánh không đúng cú pháp |

**Tuần 1 thêm:** `alembic upgrade head` trên SQLite tạm (phối hợp #12); build UI `npm run build` khi `ui/package.json` đã có (sau #6).

## 🌐 Môi trường

| Môi trường | Dùng cho | Cập nhật | Dữ liệu |
|---|---|---|---|
| Local | Code hằng ngày | Tay | SQLite `data/local.db` hoặc Postgres trong Compose |
| Staging | Demo thứ Sáu, test ghép nối | Tự động khi merge `main` | User giả lập |
| Production | Pilot (từ tuần 6) | Tag `v*` | Người dùng thật |

**Bảng service/port (local)**

| Service | Port | Kiểm tra |
|---|---:|---|
| API (FastAPI) | 8000 | `curl http://127.0.0.1:8000/api/v1/health` |
| UI (Vite) | 5173 | mở `http://127.0.0.1:5173` |
| Postgres | 5432 | `docker compose ps` (healthy) |

## 🔐 Quản lý secret

| Secret | Ở đâu | Ai giữ |
|---|---|---|
| `LLM_API_KEY` | `.env` local, dashboard dịch vụ staging | AI lead + DevOps |
| `JWT_SECRET` | `.env` local (giá trị ngẫu nhiên riêng), dashboard staging | DevOps |
| `DATABASE_URL` | `.env` local, dashboard staging | DevOps |

Lỡ commit secret: **thu hồi key ở nhà cung cấp trước**, báo DevOps, sau đó mới xóa khỏi lịch sử.

## 🤝 Phối hợp với role khác

| Với | Cần gì | Khi nào |
|---|---|---|
| Cả team | Cài hook, đọc `docs/guidelines/` | Standup thứ Hai |
| DB&Security (#12, #13) | Migration và app FastAPI chạy được trong container | Thứ Tư–Năm |
| UI/UX (#6) | Cấu hình Vercel cho `ui/` | Thứ Năm |
| QA | Thêm test mới vào CI | Liên tục |

## 📊 Kết quả tuần 1 (điền khi xong)

| Hạng mục | Kết quả |
|---|---|
| Thành viên đã cài hook | _.../6_ |
| URL staging UI | _..._ |
| URL staging API | _..._ |
| Thời gian từ merge đến staging cập nhật | _... phút_ |

## 🌿 Git Workflow & Branching
- Nhánh: `devops-<name>/<issue>-<task>`, ví dụ `devops-vodat/17-git-workflow`, `devops-dang/18-compose-staging`.
- Commit: `ci(devops): check branch names on pull requests`, `chore(devops): add docker compose for api and db`.
