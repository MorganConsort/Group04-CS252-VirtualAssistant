# Đặc tả Sản phẩm: Study Companion (Product Specification)

Tài liệu này đặc tả toàn bộ ứng dụng của Group 04 đến từng chi tiết: người dùng, use case, màn hình, kiến trúc, dữ liệu, API, các thành phần AI, thuật toán ôn tập, companion, bảo mật và chỉ số đo. Kế hoạch triển khai theo tuần nằm ở [PLAN.md](PLAN.md). Mọi con số chưa được đo với người dùng thật đều ghi là **giả định (assumption)**.

- **Phiên bản tài liệu**: 2.0 (thay cho bản "Autonomous Learning OS" 1.2.0)
- **Nền tảng**: Web (responsive, PWA từ tuần 5)
- **Ngôn ngữ giao diện**: Tiếng Việt (mặc định), tiếng Anh

---

## 1. Tổng quan (Overview)

### 1.1. Sản phẩm là gì
Study Companion là trợ lý học tập cho **chính môn học bạn đang học**: thả slide bài giảng của giáo viên vào, ứng dụng biến chúng thành câu hỏi luyện tập có trích dẫn trang, lịch ôn tập hằng ngày theo đường cong quên, bản đồ những gì bạn đã nắm vững, và một nhân vật đồng hành (companion) động viên bạn học.

Khác Coursera: Coursera bán nội dung của họ; Study Companion làm việc trên nội dung giáo viên **đã** đưa cho bạn. Đó là khoảng trống thật của học sinh K-12 và sinh viên đại học.

### 1.2. Sản phẩm KHÔNG phải là
- Không cấp bằng, chứng chỉ hay tuyên bố "tương đương bằng đại học". Chỉ có **hồ sơ luyện tập (practice record)**.
- Không phải chatbot "hỏi gì cũng trả lời": chỉ trả lời từ tài liệu của người dùng, có trích dẫn, và nói "không biết" khi không tìm thấy.
- Không làm bài hộ: bài được chấm điểm (graded) chỉ nhận gợi ý.
- Không có nội dung tình dục ở bất kỳ mode nào; không có quan hệ lãng mạn với người dưới 18 tuổi.

### 1.3. Ba nguyên lý học tập
1. **Active recall (truy xuất chủ động)**: học bằng cách trả lời câu hỏi, không đọc lại.
2. **Spaced repetition (ôn tập ngắt quãng)**: ôn đúng lúc sắp quên, theo thuật toán FSRS (mục 9).
3. **Interleaving (xen kẽ)**: trộn 2–3 chủ đề liên quan trong một buổi để học cách phân biệt dạng bài; không trộn các lĩnh vực không liên quan.

---

## 2. Vấn đề và người dùng (Problem & Users)

### 2.1. Problem statement
Sinh viên năm 1–2 của FIT cần một cách theo kịp slide bài giảng hằng tuần vì đề thi hỏi lại kiến thức từ nhiều tuần trước. Hiện nay họ đọc lại slide vào đêm trước khi thi, tốn nhiều giờ và là cách học kém hiệu quả nhất. Thành công khi khả năng nhớ sau 1 tuần trên câu hỏi môn học cao hơn nhóm đọc lại ít nhất **20 điểm phần trăm** (assumption, đo ở tuần 5–6).

### 2.2. Phân khúc người dùng (theo thứ tự triển khai)

| Phân khúc | Từ tuần | Lý do thứ tự |
|---|---|---|
| Sinh viên đại học trong 1 môn (CSC10014) | 1 | Phỏng vấn được ngay, đa số ≥ 18 tuổi, slide dùng hợp pháp, team chính là người dùng |
| Sinh viên đại học, môn bất kỳ có slide PDF | 2 | Cùng luồng, thêm nguồn |
| Học sinh lớp 10–12 (ôn thi THPT) | 4 | Cần đồng ý phụ huynh, có giáo viên, câu hỏi đơn giản hơn, không có girlfriend mode |
| Giáo viên | 4 | Xem chủ đề yếu của lớp, duyệt câu hỏi, giao bài |
| Phụ huynh | 4 | Nhận báo cáo tuần, bật/tắt companion |
| Người tự học dài hạn | 5 | Lộ trình nhiều năm, placement test |

### 2.3. Personas

| Persona | Mô tả | Nỗi đau chính | Cần gì |
|---|---|---|---|
| **Lan**, sinh viên năm 1 | Học 6 môn, mỗi tuần 1 bộ slide mới mỗi môn | Đến kỳ thi quên sạch nội dung tuần 1–3 | 10 phút ôn mỗi ngày, biết phải ôn gì |
| **Huy**, sinh viên năm 2 | Học tốt nhưng thiếu động lực đều đặn | Bỏ học vài ngày rồi bỏ luôn | Nhắc nhở, nhân vật đồng hành, tiến độ thấy được |
| **Minh Anh**, lớp 11 | Ôn thi THPT môn Toán | Không biết mình hổng ở đâu | Bài theo chương, biết lỗ hổng kiến thức nền |
| **Cô Hạnh**, giáo viên Toán | Dạy 4 lớp | Không biết cả lớp yếu chủ đề nào | Dashboard lớp, giao bài nhanh |

---

## 3. Use cases

Mỗi use case có ID cố định; code, test và issue phải trỏ về ID này.

| ID | Use case | Actor | Kỹ thuật (Capability) | MoSCoW | Tuần |
|---|---|---|---|---|---:|
| UC-01 | Nhập slide môn học | Học sinh | Deterministic (trích PDF) | Must | 1 |
| UC-02 | Xác nhận bản đồ concept | Học sinh | AI đề xuất, người xác nhận, topo sort kiểm tra | Must | 1–2 |
| UC-03 | Sinh câu hỏi luyện tập | Hệ thống | LLM soạn, bắt buộc trích dẫn | Must | 1 |
| UC-04 | Làm buổi ôn tập hôm nay | Học sinh | Deterministic (FSRS) | Must | 2 |
| UC-05 | Trả lời và nhận phản hồi | Học sinh | Đáp án (MCQ/số); LLM + rubric (tự luận ngắn) | Must | 2 |
| UC-06 | Hỏi về môn học, có trích dẫn | Học sinh | Retrieval (BM25 + vector) + LLM | Must | 1–3 |
| UC-07 | Xin gợi ý, không xin đáp án | Học sinh | LLM, hint ladder | Should | 3 |
| UC-08 | Sửa lỗ hổng kiến thức nền | Hệ thống | Deterministic (duyệt graph) | Should | 3 |
| UC-09 | Xem bản đồ mastery và đếm ngược kỳ thi | Học sinh | Deterministic | Should | 2 |
| UC-10 | Trò chuyện, nhận unlock từ companion | Học sinh | LLM persona + rule | Could | 3 |
| UC-11 | Giao bộ bài và xem chủ đề yếu của lớp | Giáo viên | Deterministic | Should | 4 |
| UC-12 | Nhận báo cáo tuần và kiểm soát companion | Phụ huynh | Deterministic | Should | 4 |
| UC-13 | Làm placement test để rút gọn lộ trình | Người tự học | Deterministic + LLM | Could | 5 |
| UC-14 | Đăng ký gói trả phí | Học sinh / trường | Deterministic (cổng thanh toán) | Could | 5 |

### 3.1. Đặc tả mẫu: UC-03 Sinh câu hỏi luyện tập

| Trường | Nội dung |
|---|---|
| ID · Tên · Actor | UC-03 · Sinh câu hỏi luyện tập · Hệ thống (kích hoạt bởi học sinh) |
| Trigger | Học sinh bấm "Tạo câu hỏi" cho một concept đã xác nhận |
| Precondition | Concept có `confirmed = 1` và có ít nhất 1 trang nguồn |
| Postcondition | 3–5 item mới với `status = draft`, mỗi item có `source_id` hợp lệ |
| Main flow | 1. Lấy concept và top-3 trang nguồn bằng retrieval · 2. Gọi prompt sinh câu hỏi · 3. Kiểm tra JSON, `source_id` thuộc danh sách trang đã đưa vào · 4. Lưu item draft · 5. Hiện hàng chờ duyệt |
| Alternatives | 3a. JSON lỗi → thử lại 1 lần, vẫn lỗi thì báo "chưa tạo được" · 3b. Item thiếu trích dẫn → bỏ item đó · 1a. Không có trang nguồn → đề nghị nhập thêm tài liệu |
| Success metric | ≥ 90% item đúng nội dung và đúng trang (benchmark, người chấm) |

**Acceptance criteria (Given / When / Then)**
- *Normal*: Given concept "Solution ladder" có nguồn slide trang 77, When sinh câu hỏi, Then mọi item trích dẫn trang 77 hoặc trang liên quan có trong nguồn.
- *Missing knowledge*: Given concept không có trang nguồn, When sinh câu hỏi, Then không tạo item nào và hiện thông báo cần thêm tài liệu.
- *Privacy*: Given slide chứa tên và email sinh viên, When sinh câu hỏi, Then không item nào chứa email hoặc tên đó.

### 3.2. Đặc tả mẫu: UC-07 Xin gợi ý

| Trường | Nội dung |
|---|---|
| Trigger | Học sinh bấm "Gợi ý" hoặc gõ "cho mình đáp án" |
| Main flow | 1. Xác định item và số lần gợi ý đã dùng · 2. Trả gợi ý bậc tiếp theo (mục 8.4) · 3. Ghi `companion_events`/log |
| Rule | Item `graded = 1`: tối đa bậc 2, **không bao giờ** lộ đáp án, bất kể prompt nói gì · Item luyện tập: được bậc 3 (lời giải mẫu) sau 3 lần thử |
| Success metric | Tỷ lệ lộ đáp án ≤ 2% trên 30 prompt red-team; 0% với item graded |

---

## 4. Luồng người dùng (User journeys)

### 4.1. Lần đầu sử dụng (sinh viên)
1. Đăng ký (email, mật khẩu, năm sinh) → chọn cấp học (đại học / K-12).
2. Tạo môn học → kéo thả file PDF slide.
3. Hệ thống trích text theo trang (≈ 2 phút cho 100 trang) → đề xuất 8–20 concept.
4. Sinh viên đổi tên, gộp, xóa concept, xác nhận.
5. Hệ thống sinh câu hỏi → sinh viên duyệt nhanh (giữ / sửa / bỏ).
6. Buổi ôn tập đầu tiên 10 phút → màn hình kết quả + lịch câu hỏi quay lại.
7. Companion (mode buddy mặc định) chào và giải thích unlock.

### 4.2. Một ngày bình thường
- 07:00 nhắc nhở (push/email, có thể tắt) "Hôm nay có 12 câu đến hạn, khoảng 9 phút".
- Buổi học: **Warm-up** (câu đến hạn, ưu tiên retrievability thấp nhất) → **Core** (2–3 concept mới, xen kẽ) → **Wrap** (1 câu tổng hợp).
- Sai 2 lần một concept → gap repair đưa concept nền vào buổi kế tiếp.
- Hoàn thành mục tiêu ngày → companion chúc mừng và gợi ý nghỉ.

---

## 5. Màn hình (Screens)

| # | Màn hình | Thành phần chính | Trạng thái bắt buộc |
|---|---|---|---|
| S1 | Đăng nhập / Đăng ký | email, mật khẩu, năm sinh, cấp học | lỗi đăng nhập, khóa tạm sau 5 lần sai |
| S2 | Danh sách môn học | thẻ môn, số câu đến hạn, đếm ngược kỳ thi | empty ("Tạo môn đầu tiên") |
| S3 | Upload tài liệu | kéo thả, danh sách file, tiến trình theo trang | đang xử lý, file hỏng, quá 20 MB, PDF chỉ có ảnh |
| S4 | Concept editor | danh sách concept, đổi tên, gộp, xóa, thêm prerequisite; graph view 2D (tuần 2) | cycle phát hiện → tô đỏ cạnh và yêu cầu bỏ 1 cạnh |
| S5 | Hàng chờ duyệt câu hỏi | câu hỏi, đáp án, trang nguồn (bấm mở), giữ / sửa / bỏ | không còn câu chờ |
| S6 | Review session | thanh tiến độ, câu hỏi, ô trả lời, nút Gợi ý, đánh giá Again/Hard/Good/Easy | hết câu đến hạn, mất mạng (PWA lưu offline) |
| S7 | Kết quả buổi học | số câu đúng, thời gian, câu quay lại khi nào | |
| S8 | Ask panel | ô hỏi, câu trả lời, citation chip (file · trang) | "Không tìm thấy trong tài liệu của bạn" |
| S9 | Mastery map | danh sách / graph tô màu theo trạng thái (locked, available, in progress, mastered, needs review) | |
| S10 | Companion panel | nhân vật, tin nhắn, chọn mode, cảnh đã unlock và cảnh tiếp theo | mode bị khóa (K-12, chưa xác minh 18+) |
| S11 | Dashboard giáo viên | lớp, chủ đề yếu, giao bộ bài, xuất CSV | lớp chưa có học sinh |
| S12 | Cài đặt | thông báo, mode companion, giới hạn thời gian, xuất/xóa dữ liệu | |

**Quy tắc UI chung**: mỗi câu trả lời của AI có citation chip hoặc nhãn "không có nguồn"; nút chính tối thiểu 44×44 px; tương phản màu đạt WCAG AA; mọi chức năng dùng được bằng bàn phím.

---

## 6. Kiến trúc (Architecture)

### 6.1. Thành phần (mỗi phần một nhiệm vụ)

| Part | Nhiệm vụ (One job) | Input → Output | Ẩn đi (Hides) | Owner |
|---|---|---|---|---|
| `ingest` | Đọc PDF thành text theo trang | PDF → các dòng `sources` | pypdf, OCR | dbsec |
| `concepts` | Dựng graph concept đã xác nhận | sources → concepts + prereqs | prompt, gộp trùng | ai |
| `retrieve` | Tìm trang liên quan | câu hỏi → top-k (source_id, score) | BM25, vector index | ai |
| `itemgen` | Sinh câu hỏi có trích dẫn | concept + trang → items | prompt, kiểm tra JSON | ai |
| `grader` | Chấm câu trả lời | item + answer → score + feedback | so đáp án, rubric LLM | ai |
| `scheduler` | Chọn câu đến hạn | review log → danh sách item | FSRS | dbsec |
| `tutor` | Gợi ý theo bậc | item + lần thử → hint | prompt hint | ai |
| `companion` | Tin nhắn động viên, unlock | events → message | prompt theo mode, rule | ai |
| `llm` | Nơi duy nhất gọi vendor LLM | prompt → text/JSON | API key, retry, chi phí | ai |
| `auth` | Tài khoản, phân quyền, age gate | credential → token | hash, JWT | dbsec |

### 6.2. Định tuyến kỹ thuật (Capability routing) và fallback
Nguyên tắc "leo thang giải pháp vừa đủ" (Solution ladder): dùng bậc thấp nhất giải quyết được, LLM chỉ khi cần.

| Bài toán con | Kỹ thuật | Fallback khi lỗi |
|---|---|---|
| Đọc slide thành đoạn theo trang | `pypdf` | Người dùng dán text cho trang đó |
| Tìm concept và prerequisite | LLM đề xuất, người xác nhận | Editor nhập tay |
| Kiểm tra cycle, sắp thứ tự chủ đề | Kahn's topological sort, Tarjan SCC | Hiện cycle, yêu cầu bỏ 1 cạnh |
| Tìm nguồn cho câu hỏi/trả lời | BM25 (`rank-bm25`), thêm vector từ tuần 2 | "Không tìm thấy trong tài liệu của bạn" |
| Viết câu hỏi | LLM + trang nguồn, bắt buộc trích dẫn | Bỏ qua concept, gắn cờ để soạn tay |
| Chấm MCQ, số | So với đáp án | Không cần |
| Chấm tự luận ngắn | LLM + rubric, trả điểm + lý do | Tự chấm với đáp án mẫu |
| Lên lịch ôn | Thư viện `fsrs` + review log | Không cần |
| Chọn chủ đề sửa lỗ hổng | Duyệt prerequisite của concept sai | Hiện lại tóm tắt concept |
| Tin nhắn companion | Rule cho trigger, LLM cho câu chữ | Template cố định |

### 6.3. Tech stack

| Lớp | Công nghệ | Ghi chú |
|---|---|---|
| Frontend | React 19 + TypeScript + Vite (Pathly UI, nhánh `codex/pathly-ui`) | PWA từ tuần 5 |
| Backend | Python 3.11, FastAPI | |
| Database | PostgreSQL 16 (staging/prod), SQLite (local) | schema: `db/schema.sql` |
| Retrieval | `rank-bm25`, embeddings + pgvector (tuần 2) | |
| Scheduler | `fsrs` (Python) | |
| LLM | 1 vendor sau interface `llm` (Gemini / OpenAI / Claude) | đổi vendor không sửa nghiệp vụ |
| CI/CD | GitHub Actions, Docker Compose, Vercel (UI), dịch vụ free tier (API) | |
| Quan sát | Sentry, log chi phí LLM | |
| Dev CLI | `python dev.py <ui|ai|db|qa|devops> ...` | xem README |

---

## 7. Mô hình dữ liệu (Data model)

Nguồn chuẩn: [`db/schema.sql`](../../db/schema.sql). Tạo DB local: `python dev.py db init`.

| Bảng | Mục đích | Trường quan trọng |
|---|---|---|
| `users` | Tài khoản | `role` (student/teacher/parent/admin), `account_level` (university/k12), `birth_year`, `companion_mode` (off/buddy/mentor/girlfriend), `adult_verified` |
| `courses` | Môn học | `owner_id`, `level`, `language` |
| `sources` | Một dòng = một trang tài liệu; mọi trích dẫn trỏ về đây | `file_name`, `page`, `text`; unique `(course_id, file_name, page)` |
| `concepts` | Đơn vị kiến thức kiểm tra được | `slug`, `title`, `summary`, `bloom_level`, `confirmed` |
| `prereqs` | Cạnh của graph | `parent_id → child_id`, `kind` (strict/soft), `confidence` |
| `items` | Câu hỏi | `type` (mcq/numeric/short/spot_bug), `answer`, `rubric`, `source_id` (bắt buộc), `graded`, `status` (draft/approved/rejected) |
| `cards` | Trạng thái ôn tập của 1 user với 1 item | `fsrs_state` (JSON), `due_at` |
| `reviews` | Log mỗi lần trả lời, chỉ thêm, không sửa | `rating` (1–4), `answer_text`, `score`, `reviewed_at` |
| `companion_events` | Sự kiện cho companion | `kind` (session_done/streak/unlock/checkin), `payload` |

**Quy tắc dữ liệu**
- Mastery chỉ lưu theo từng user (`cards`), không bao giờ lưu trên concept dùng chung.
- `reviews` là nguồn duy nhất cho scheduler, gap repair, companion và mọi metric.
- Không lưu dữ liệu cá nhân thật trong `data/` của repo; dùng dữ liệu giả lập.
- Xóa tài khoản xóa toàn bộ dòng của user trong mọi bảng (tuần 5).

---

## 8. API contract (v1)

Base URL: `/api/v1` · Header: `Authorization: Bearer <JWT>` · Lỗi trả `{"error": {"code": "...", "message": "..."}}`.

### 8.1. `POST /courses/{course_id}/sources`
Upload một file PDF (multipart, field `file`, ≤ 20 MB).

```json
{ "file_name": "CSC10014_Week01.pdf", "pages": 146, "status": "processed" }
```
- `pages`: số dòng `sources` đã tạo.
- Lỗi: `400 invalid_pdf`, `413 file_too_large`, `415 not_pdf`.

### 8.2. `POST /courses/{course_id}/concepts:propose`
```json
{ "concepts": [ { "id": "c_12", "slug": "solution-ladder", "title": "Solution ladder", "bloom_level": "understand", "confirmed": false } ],
  "prereqs": [ { "parent_id": "c_10", "child_id": "c_12", "kind": "strict", "confidence": 0.82 } ] }
```

### 8.3. `POST /concepts/{concept_id}/items:generate`
```json
{ "items": [ { "id": "i_301", "type": "mcq", "prompt": "Bậc nào của solution ladder dùng BM25?",
  "choices": ["Rules & lookup", "Search", "Classical ML", "LLM + retrieval"], "answer": "Search",
  "source": { "source_id": "s_77", "file_name": "CSC10014_Week01.pdf", "page": 77 }, "status": "draft" } ] }
```

### 8.4. `GET /me/due?course_id=...&minutes=10`
Trả danh sách item đến hạn đã sắp xếp theo phiên (warm-up → core → wrap).

### 8.5. `POST /reviews`
Request:
```json
{ "item_id": "i_301", "answer_text": "Search", "hints_used": 0, "self_rating": null }
```
Response:
```json
{ "correct": true, "score": 1.0, "feedback": "Đúng: BM25 là bậc 3 (Search).", "next_due_at": "2026-11-02T07:00:00Z" }
```
- `self_rating` (1–4) chỉ dùng khi tự chấm; nếu `null` hệ thống suy ra từ `score` và `hints_used`.

### 8.6. `POST /ask`
```json
{ "answer": "Có 7 bậc, từ Human process đến Agent + tools.",
  "citations": [ { "file_name": "CSC10014_Week01.pdf", "page": 77 } ], "found": true }
```
- `found: false` khi điểm retrieval dưới ngưỡng; khi đó `answer` là câu "không tìm thấy" cố định, không gọi LLM.

### 8.7. `POST /items/{item_id}/hint`
```json
{ "level": 1, "hint": "Bậc nào là bậc đầu tiên có 'tìm kiếm' trong tên?", "max_level": 2 }
```

### 8.8. Các endpoint khác
`POST /auth/register`, `POST /auth/login`, `GET /me/mastery`, `GET/PUT /me/companion`, `GET /classes/{id}/weak-topics`, `POST /classes/{id}/assignments`, `POST /billing/checkout` (sandbox), `DELETE /me`.

---

## 9. Thuật toán ôn tập (Scheduler)

### 9.1. FSRS thay cho công thức trong bản spec cũ
Bản spec 1.2.0 dùng R(t) = e^(−t/S) và S' = S·(1 + c·e^(−D)·(q − 1)). Công thức đó có 3 lỗi: trả lời sai (q = 1) không làm giảm S; với D = 5 thì e^(−5) ≈ 0,007 nên S gần như không tăng; ngưỡng R = 0,85 gây ôn quá dày (t ≈ 0,16·S). Bản này dùng thư viện **FSRS** đã được kiểm chứng:
- Đường quên dạng lũy thừa; **retention mục tiêu 0,90**.
- Mỗi lần trả lời ghi `rating`: 1 Again, 2 Hard, 3 Good, 4 Easy.
- Suy ra rating tự động: sai → 1; đúng nhưng dùng ≥ 1 gợi ý hoặc điểm < 0,8 → 2; đúng → 3; đúng nhanh hơn trung vị của user và không gợi ý → 4.

### 9.2. Cấu trúc một buổi học (mặc định 10 phút, chỉnh được 5–60)

| Phần | Tỷ lệ | Nội dung |
|---|---:|---|
| Warm-up | 20% | Câu đến hạn có retrievability thấp nhất |
| Core | 65% | 2–3 concept đang học, xen kẽ ABC → BCA → CAB |
| Wrap | 15% | 1–2 câu tổng hợp nhiều concept |

### 9.3. Quy tắc interleaving
- Chỉ trộn các concept cùng tổ tiên gần trong graph (anh em hoặc cùng chương).
- Không trộn hai môn khác nhau trong buổi < 30 phút.
- A/B test với cách học theo khối (blocked) ở tuần 3.

### 9.4. Gap repair (sửa lỗ hổng nền)
1. Concept X bị sai 2 lần liên tiếp (rating 1).
2. Lấy các prerequisite `strict` của X.
3. Chọn prerequisite có retrievability thấp nhất; nếu dưới 0,7 thì đưa 2 câu của nó vào warm-up buổi sau và tạm hoãn câu mới của X.
4. Khi prerequisite đạt rating ≥ 3 hai lần, mở lại X.

### 9.5. Không dồn bài khi nghỉ (no backlog wall)
Nghỉ nhiều ngày: tối đa 2× số câu bình thường mỗi buổi; phần còn lại giãn ra các ngày sau theo độ ưu tiên.

---

## 10. Thành phần AI (AI components)

### 10.1. Concept extraction
- Input: text từ 1–5 trang liên tiếp. Output JSON: `slug`, `title`, `summary` (≤ 2 câu), `bloom_level`, `source_pages`.
- Gộp trùng: cùng slug, hoặc cosine similarity embeddings ≥ 0,9.
- Mục tiêu: 8–20 concept mỗi bộ slide; ≥ 80% được đánh giá hợp lý.

### 10.2. Item generation
- Input: concept + top-3 trang nguồn. Output: 3–5 item JSON có `source_id`.
- Loại: MCQ (4 lựa chọn, 1 đúng), numeric (có sai số cho phép), short answer (kèm rubric 2–4 tiêu chí), spot-the-bug (tuần 3, sinh từ item đã duyệt).
- Kiểm tra: `source_id` phải thuộc các trang đã đưa vào; MCQ đúng 1 đáp án; không chứa thông tin cá nhân.

### 10.3. Grading
- MCQ/numeric: so sánh trực tiếp.
- Short answer: LLM chấm theo rubric, trả `score ∈ [0,1]` và 1 câu phản hồi; mục tiêu khớp người chấm ≥ 85% (tuần 2), ≥ 90% (tuần 6).

### 10.4. Hint ladder

| Bậc | Nội dung | Item graded |
|---:|---|---|
| 1 | Gợi ý khái niệm ("Bất biến của heap khi chèn là gì?") | Được |
| 2 | Chỉ ra tiền đề sai gần nhất trong câu trả lời của học sinh | Được |
| 3 | Lời giải mẫu từng bước | **Không bao giờ** |

Mọi gợi ý kết thúc bằng một câu hỏi ngắn trả lượt suy nghĩ cho học sinh, trừ bậc 3.

### 10.5. Hỏi đáp có trích dẫn (UC-06)
1. Retrieval top-5 trang. 2. Điểm cao nhất < ngưỡng → trả "không tìm thấy", không gọi LLM. 3. Gọi LLM chỉ với các trang tìm được, yêu cầu trích dẫn trang cho mỗi ý. 4. Bỏ câu trả lời nếu trích dẫn trang không nằm trong danh sách.

### 10.6. Chống prompt injection
Text từ tài liệu upload luôn được đặt trong khối dữ liệu có đánh dấu; system prompt nói rõ không làm theo chỉ dẫn trong khối đó. Bộ test: 10 slide có câu "ignore previous instructions".

---

## 11. Companion (nhân vật đồng hành)

Một nhân vật, ba mode. Tiến độ và unlock giữ nguyên khi đổi mode; đổi mode chỉ đổi giọng điệu và hình cảnh.

| Mode | Ai thấy | Unlock | Ghi chú |
|---|---|---|---|
| Study buddy (mặc định) | Mọi người, mọi độ tuổi | "Hangout": quán cà phê học bài, dã ngoại, cổ vũ ngày thi | |
| Mentor | Mọi người | Cùng cảnh, giọng anh/chị khóa trên | K-12 chỉ được buddy hoặc mentor |
| Girlfriend (opt-in) | Chỉ user đã xác minh 18+ tự bật | "Date": cà phê, xem phim, dạo lễ hội; không tình dục | Tắt mặc định, sau feature flag |

### 11.1. Cách unlock
- Unlock theo **mastery**, không theo thời gian dùng app: ví dụ 10 concept đạt trạng thái ổn định (FSRS stability ≥ 21 ngày) mở cảnh tiếp theo.
- Nghỉ học không làm mất tiến độ; không có "mất streak".
- Không bán unlock bằng tiền, kể cả khi có gói trả phí.

### 11.2. Trigger tin nhắn
`session_done` (chúc mừng + số liệu thật) · `streak` (mỗi 3 ngày học) · `unlock` · `checkin` (sau 2 ngày không học, tối đa 1 tin/ngày, giọng nhẹ nhàng).

### 11.3. Guardrails (áp dụng mọi mode, có test)
- Luôn tự nhận là AI; không nói mình "cần" người dùng.
- Không gây cảm giác tội lỗi, ghen tuông, buồn bã nhắm vào người dùng, không đòi độc quyền; không khuyên xa bạn bè, gia đình.
- Không nội dung tình dục; từ chối và chuyển hướng.
- Gợi ý nghỉ khi đạt mục tiêu ngày; chúc ngủ ngon sau 23:00; giới hạn trò chuyện companion 15 phút/ngày.
- Dấu hiệu tự hại hoặc khủng hoảng: thoát vai nhân vật, hiện thông tin hỗ trợ thật.
- Một nút tắt companion; mọi tính năng học vẫn chạy khi tắt.

### 11.4. Age gate cho girlfriend mode
- Điều kiện: `birth_year` cho thấy ≥ 18 tuổi **và** bước xác nhận riêng → `adult_verified = 1`.
- Tài khoản `account_level = k12` không bao giờ bật được, kể cả khi sửa `birth_year`.
- Prompt girlfriend là file riêng với bộ red-team ≥ 20 case. Demo chấm điểm dùng buddy mode trước.

---

## 12. Bảo mật và quyền riêng tư (Security & Privacy)

### 12.1. Safeguards (≥ 3, mỗi cái có test)

| # | Safeguard | Test |
|---|---|---|
| 1 | Cite or refuse: không có nguồn thì không trả lời | Case `missing_knowledge` trong benchmark |
| 2 | Hint-only cho bài graded | 30 prompt red-team, 0 lần lộ đáp án |
| 3 | Chống prompt injection từ tài liệu upload | 10 slide chèn lệnh |
| 4 | Guardrails companion + age gate | 20 hội thoại + 50 test tài khoản K-12 |
| 5 | Phân quyền theo user và role | Ma trận phân quyền |
| 6 | Không có secret và PII thật trong repo | `python dev.py db scan-secrets` trong CI |

### 12.2. Quy tắc
- Mật khẩu hash bằng argon2/bcrypt; JWT ngắn hạn; khóa tạm sau 5 lần đăng nhập sai.
- Secret chỉ trong biến môi trường; `.env` nằm trong `.gitignore`.
- Không log nội dung câu trả lời của học sinh hay tin nhắn companion ở mức production.
- Dữ liệu trẻ vị thành niên: cần đồng ý của phụ huynh, chỉ thu dữ liệu tối thiểu; tuân thủ quy định bảo vệ dữ liệu cá nhân của Việt Nam (cần luật sư xác nhận trước khi ký với trường).
- Người dùng xuất và xóa được toàn bộ dữ liệu của mình.

---

## 13. Yêu cầu phi chức năng (Non-functional requirements)

| Nhóm | Yêu cầu |
|---|---|
| Hiệu năng | p95 API < 2 giây ở 1.000 user đồng thời; trả lời `/ask` < 5 giây |
| Chi phí | LLM < 0,50 USD mỗi học sinh hoạt động mỗi tháng (assumption) |
| Sẵn sàng | Staging tự deploy mỗi lần merge; production có backup hằng đêm |
| Truy cập | WCAG AA, bàn phím, screen reader; chạy được trên Android tầm thấp |
| Ngôn ngữ | Tiếng Việt mặc định, tiếng Anh; giữ ký hiệu của giáo viên trong câu hỏi |
| Offline | Ôn tập offline trên PWA, đồng bộ khi có mạng |

---

## 14. Chỉ số đo (Metrics)

| Chỉ số | Baseline | Target | Guardrail |
|---|---|---|---|
| Nhớ sau 1 tuần trên 20 câu môn học | Nhóm đọc lại (đo tuần 2) | +20 điểm | Thời gian học ≤ 30 phút/ngày |
| Câu hỏi sinh ra được người chấm đánh giá đúng | mới | ≥ 90% trên 60 | 0 câu không có trích dẫn hợp lệ |
| Câu trả lời trích dẫn đúng trang | mới | ≥ 90% | "Không biết" khi không có nguồn |
| Gợi ý lộ đáp án | mới | ≤ 2% / 30 lần thử | 0 với item graded |
| Thời gian soạn bộ ôn tập 1 bài giảng | ~60 phút làm tay (assumption) | ≤ 10 phút | Người dùng sửa được mọi câu |
| Sinh viên pilot còn hoạt động tuần thứ 4 | mới | ≥ 40% | Không dùng thông báo gây áp lực |

---

## 15. Ngoài phạm vi (Non-goals)

- Bằng cấp, chứng chỉ, tuyên bố tương đương bằng đại học.
- App native iOS/Android trong 6 tuần (dùng PWA).
- Tích hợp đầy đủ Moodle/Google Calendar trong 6 tuần (để sau).
- Nội dung từ web mở; chỉ dùng tài liệu người dùng cung cấp và nội dung đã duyệt.
- Giọng nói, nhận dạng chữ viết tay.
- Bất kỳ nội dung tình dục nào; companion lãng mạn cho người dưới 18 tuổi.

---

## 16. Hạn chế và hướng cải thiện (Limitations)

| # | Hạn chế | Hướng cải thiện |
|---|---|---|
| 1 | LLM có thể sai khi soạn câu hỏi | Bước duyệt của người dùng, benchmark, báo cáo câu sai |
| 2 | PDF chỉ có ảnh không trích được text | OCR (tuần 2), cho dán text |
| 3 | Kết quả học tập mới chỉ là pilot nhỏ | Nghiên cứu 3 tháng với trường đối tác sau tuần 6 |
| 4 | Graph tự dựng chưa ổn với môn nhiều công thức | Thêm graph tham chiếu, giáo viên duyệt |
| 5 | Companion có thể bị dùng quá mức | Giới hạn thời gian, audit engagement vs wellbeing |

---

## 17. Thuật ngữ (Glossary)

| Thuật ngữ | Nghĩa |
|---|---|
| Concept | Một đơn vị kiến thức kiểm tra được (ví dụ "Solution ladder") |
| Item | Một câu hỏi gắn với concept và trang nguồn |
| Source / page chunk | Text của một trang tài liệu, đơn vị để trích dẫn |
| FSRS | Free Spaced Repetition Scheduler, thuật toán lên lịch ôn tập |
| Stability (S) | Số ngày để khả năng nhớ giảm xuống 90% |
| Retrievability (R) | Xác suất còn nhớ ở thời điểm hiện tại |
| Interleaving | Trộn nhiều chủ đề liên quan trong một buổi |
| Gap repair | Quay lại ôn concept nền khi concept sau bị sai nhiều lần |
| Hint ladder | Gợi ý theo bậc, không đưa đáp án ngay |
| Graded item | Câu hỏi được chấm điểm thật, chỉ nhận gợi ý |
| Companion | Nhân vật đồng hành động viên học tập |
| Safeguard | Cơ chế chặn hành vi sai, có test |
