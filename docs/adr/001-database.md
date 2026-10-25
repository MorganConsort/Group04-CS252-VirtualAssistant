# ADR 001 — Lựa chọn và quản lý database

- **Trạng thái**: Đã chấp nhận
- **Ngày**: 2026-10-25
- **Liên quan**: Issue #12, đặc tả mục 7

## Bối cảnh (Context)

Study Companion lưu tài khoản, môn học, các trang tài liệu nguồn, concept, câu hỏi, trạng thái ôn tập theo từng người dùng và log buổi học. Nhóm cần:

- Một database **0 đồng** cho máy cá nhân và test tự động, không yêu cầu cài server.
- Một database đủ mạnh cho staging/production, có transaction, index và khóa ngoại.
- Schema có version để local, CI, staging và production không bị lệch nhau.
- Giữ được các ràng buộc bảo mật ngay ở tầng dữ liệu, đặc biệt là *cite-or-refuse*.

Thời gian đầu nhóm chưa cần sharding, full-text search chuyên dụng hay JSONB; ưu tiên tốc độ dựng nền và chi phí bằng 0.

## Quyết định (Decision)

1. **SQLite cho local và test**, mặc định `DATABASE_URL=sqlite:///./local.db`. Không cần server, file database nằm trong `.gitignore`.
2. **PostgreSQL 16 cho staging/production**, cấu hình bằng cùng biến `DATABASE_URL` (ví dụ `postgresql+psycopg://...`).
3. **`db/schema.sql` là nguồn chuẩn của mô hình dữ liệu**, viết bằng DDL di động (TEXT/INTEGER/REAL, `CURRENT_TIMESTAMP`, không dùng cú pháp riêng của một hệ quản trị).
4. **Alembic quản lý thay đổi schema**, bắt đầu bằng migration `0001_initial` tạo đúng 9 bảng và index `idx_cards_user_due`. Mọi thay đổi sau này phải là một migration mới, không sửa migration đã merge.
5. **Kiểu dữ liệu chung**: `id` là `TEXT` chứa UUID dạng chuỗi; thời gian là `TEXT` theo ISO-8601 UTC; JSON (choices, fsrs_state, payload, source_pages) lưu trong `TEXT`. Có thể chuyển sang `JSONB` của PostgreSQL ở migration sau nếu cần.
6. **Bật khóa ngoại**: PostgreSQL luôn bật; với SQLite, `src/app/db.py` và `alembic/env.py` chạy `PRAGMA foreign_keys = ON` trên **mỗi connection**.

### Phương án đã cân nhắc

| Phương án | Lý do không chọn |
|---|---|
| Chỉ dùng SQLite | Không phù hợp staging/production nhiều người dùng, thiếu một số kiểu dữ liệu và khả năng vận hành của PostgreSQL. |
| MongoDB | Mô hình quan hệ (user → course → source → concept → item → review) phù hợp với khóa ngoại và transaction hơn; không cần schema linh hoạt ở giai đoạn này. |
| Chỉ dùng PostgreSQL, kể cả local | Tốn công cài Docker/server, làm test chậm và không đạt mục tiêu 0 đồng cho mọi thành viên. |

## Ràng buộc Bảo mật & Toàn vẹn dữ liệu

- **`items.source_id NOT NULL`**: mỗi câu hỏi bắt buộc trỏ tới một trang nguồn trong `sources`. Đây là ràng buộc của safeguard *cite-or-refuse*: không có nguồn thì không tạo item, không trả lời. Database từ chối item thiếu nguồn, không chỉ dựa vào kiểm tra ở ứng dụng.
- **`sources` UNIQUE (`course_id`, `file_name`, `page`)**: một trang của một file chỉ được nhập một lần, tránh citation trùng và dữ liệu rác khi upload lại.
- **`concepts` UNIQUE (`course_id`, `slug`)**: slug ổn định trong từng môn, thuận tiện cho graph và tra cứu.
- **Tách mastery sang `cards`**: trạng thái FSRS và `due_at` thuộc về từng cặp (`user_id`, `item_id`), không bao giờ lưu trên `concepts`/`items` dùng chung. Điều này ngăn rò rỉ tiến độ học giữa các user và cho phép mỗi người có lịch ôn riêng. Index `idx_cards_user_due` tối ưu truy vấn "câu đến hạn hôm nay".
- **`reviews` chỉ thêm (append-only)**: mỗi lần trả lời là một dòng mới; ứng dụng không UPDATE/DELETE. Scheduler, gap repair, companion và metric đều đọc từ log bất biến này, nhờ đó có thể tái tạo lịch sử học tập.
- **Xóa cascade có kiểm soát**: xóa user/course/source/concept/item sẽ dọn các dòng phụ thuộc qua `ON DELETE CASCADE`. Xóa file SQLite local không ảnh hưởng dữ liệu staging/production.
- **Không có secret/PII thật trong repo**: `DATABASE_URL` đọc từ biến môi trường; chỉ `.env.example` được commit; `python dev.py db scan-secrets` chạy trong CI.

## Hệ quả (Consequences)

- **Tích cực**: thành viên chạy được database ngay bằng `python dev.py db init`; test nhanh và không tốn phí; staging/production dùng PostgreSQL với cùng schema và migration.
- **Đánh đổi**: phải giữ `db/schema.sql` và migration `0001_initial` đồng bộ, đồng thời kiểm tra mọi thay đổi trên cả SQLite lẫn PostgreSQL. Test tự động kiểm tra số bảng, UNIQUE, NOT NULL và giá trị mặc định để giảm rủi ro lệch schema.
- **Vận hành**: SQLite cần `PRAGMA foreign_keys = ON` trên từng connection; thiếu bước này khóa ngoại sẽ không được thực thi dù DDL có khai báo. Code đã bật pragma trong `src/app/db.py` và `alembic/env.py`.
- **Mở rộng sau này**: khi cần tìm kiếm vector, JSONB, replication hoặc nhiều người dùng đồng thời, PostgreSQL 16 là đường nâng cấp tự nhiên; không phải viết lại mô hình dữ liệu.
