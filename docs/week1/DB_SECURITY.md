# Tasks for Database & Security (Tuần 1: Schema, FastAPI Ingest, Auth)

Tài liệu này mô tả chi tiết nhiệm vụ tuần 1 của nhóm Database & Security (Thắng, Minh, Võ Thành Đạt): schema, API ingest, xác thực và các quy tắc bảo mật phải theo từ ngày đầu.

## 🎯 Sứ mệnh tuần 1
Dựng **nền dữ liệu và backend**: schema có migration, API nhận PDF và lưu từng trang, tài khoản an toàn. Đây là đường găng của tuần: AI không thể chạy thật nếu chưa có bảng `sources`.

Dưới đây là các hạng mục công việc cần hoàn thiện:

- [ ] **Task 1: Schema + migration (#12, Thắng, 6 giờ, xong thứ Hai)**
  - **Nguồn**: `db/schema.sql` (9 bảng); `python dev.py db init` tạo DB local.
  - **Migration**: Alembic, `DATABASE_URL` từ env; `0001_initial`.
  - **ADR**: `docs/adr/001-database.md`.
- [ ] **Task 2: FastAPI + ingest PDF (#13, Minh, 10 giờ, xong thứ Tư)**
  - **Endpoint**: `GET /api/v1/health`, `POST /api/v1/courses`, `POST /api/v1/courses/{id}/sources`.
  - **Kiểm tra đầu vào**: đuôi + magic bytes `%PDF`, ≤ 20 MB, `pypdf` đọc được.
  - **Lưu**: một dòng mỗi trang, trang bắt đầu từ 1; cảnh báo `scanned_pdf` nếu > 80% trang rỗng.
- [ ] **Task 3: Auth (#14, Võ Thành Đạt, 10 giờ, xong thứ Năm)**
  - **Đăng ký/đăng nhập**: argon2, JWT 60 phút, khóa tạm sau 5 lần sai.
  - **Phân quyền**: mọi truy vấn lọc theo `owner_id`; tài nguyên người khác → 404.
  - **Chuẩn bị age gate**: lưu `birth_year`, `account_level`, `adult_verified = 0`.

---

## 🗄️ Tóm tắt schema (chi tiết: spec mục 7)

| Bảng | Khóa | Ràng buộc quan trọng |
|---|---|---|
| `users` | `id` | `email` unique; `role`, `account_level`, `companion_mode` có giá trị mặc định |
| `courses` | `id` | `owner_id → users` |
| `sources` | `id` | unique `(course_id, file_name, page)` |
| `concepts` | `id` | unique `(course_id, slug)` |
| `prereqs` | `(parent_id, child_id)` | 2 FK → `concepts` |
| `items` | `id` | `source_id NOT NULL` (safeguard cite-or-refuse) |
| `cards` | `(user_id, item_id)` | index `(user_id, due_at)` |
| `reviews` | `id` | chỉ thêm (append-only) |
| `companion_events` | `id` | |

## 🛡️ Quy tắc bảo mật bắt buộc từ tuần 1

| # | Quy tắc | Cách kiểm tra |
|---|---|---|
| 1 | Secret chỉ trong `.env`; repo chỉ có `.env.example` | `python dev.py db scan-secrets` (chạy trong CI) |
| 2 | Mật khẩu hash argon2; không log mật khẩu, token, hash | Test + review PR |
| 3 | Mọi truy vấn dữ liệu lọc theo user hiện tại | Test user A đọc dữ liệu user B → 404 |
| 4 | Text slide là **dữ liệu**, không ghép vào system prompt | Review PR #9 #10 |
| 5 | Không lưu file PDF gốc hay dữ liệu cá nhân thật trong repo | `data/` chỉ có dữ liệu giả lập |
| 6 | Giới hạn kích thước upload ở server (20 MB) | Test 413 |

## 🔐 Ma trận quyền tuần 1 (student)

| Hành động | Chủ sở hữu | User khác | Chưa đăng nhập |
|---|---|---|---|
| Tạo course | ✅ | — | ❌ 401 |
| Upload source vào course | ✅ | ❌ 404 | ❌ 401 |
| Đọc sources / concepts / items | ✅ | ❌ 404 | ❌ 401 |
| `GET /health` | ✅ | ✅ | ✅ |

## 🤝 Phối hợp với role khác

| Với | Cần gì | Khi nào |
|---|---|---|
| AI (Minh) | Review schema 15 phút (`items`, `prereqs`, `cards`) | Thứ Hai |
| UI/UX (Đạt, Mân) | Mã lỗi và định dạng response upload/auth | Thứ Ba |
| DevOps (#18) | Dockerfile chạy được app; `DATABASE_URL` Postgres | Thứ Năm |
| QA (#16) | Fixture `client`, `sample_pdf`; review PR | Thứ Tư–Năm |

## 📊 Kết quả tuần 1 (điền khi xong)

**Ingest 4 file slide CSC10014 (#13)**

| File | Số trang | Trang rỗng | Thời gian (giây) | Ghi chú |
|---|---:|---:|---:|---|

### Hạn chế & Hướng cải thiện
| # | Hạn chế | Hướng cải thiện |
|---|---|---|
| 1 | PDF chỉ có ảnh không trích được chữ | OCR ở tuần 2 |
| 2 | JWT chưa có refresh token | Thêm refresh token trước khi mở pilot (tuần 5) |

## 📂 Codebase Guidelines
- API trong `src/app/api/`, logic ingest trong `src/app/ingest/`, kết nối DB trong `src/app/db.py`.
- Mọi endpoint có tiền tố `/api/v1`; lỗi trả `{"error": {"code", "message"}}`.
- Lệnh: `python dev.py db init [--reset]`, `python dev.py db scan-secrets`.

## 📚 Reference
- **OWASP Top 10 for LLM Applications**: prompt injection, lộ dữ liệu nhạy cảm.
- **OWASP ASVS (mục Authentication)**: yêu cầu tối thiểu cho mật khẩu và khóa đăng nhập.

## 🌿 Git Workflow & Branching
- Nhánh: `dbsec-<name>/<issue>-<task>`, ví dụ `dbsec-thang/12-schema-migration`, `dbsec-vodat/14-auth`.
- Commit: `feat(db): add initial alembic migration`, `feat(security): hash passwords with argon2`.
