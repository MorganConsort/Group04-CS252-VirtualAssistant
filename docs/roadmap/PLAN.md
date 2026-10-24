# 🚀 Kế hoạch Phát triển 6 Tuần (6-Week Roadmap)

Tài liệu này là kế hoạch triển khai chính thức của Group 04: trong 6 tuần, team xây phần mềm cho cả 7 giai đoạn (phase) của lộ trình startup 18 tháng, mỗi tuần khoảng một phase, chia việc theo 5 mảng: **UI/UX · AI implementation · Database & Security · QA/QC · DevOps**. Mô tả chi tiết sản phẩm nằm ở [APP_SPECIFICATION.md](APP_SPECIFICATION.md).

> [!IMPORTANT]
> 6 tuần đủ để **xây** mọi tính năng ở mức prototype chạy được end-to-end và có test. 6 tuần **không đủ** để **chứng minh** chúng với người dùng thật: kết quả pilot, hợp đồng với trường học, duyệt app store và gọi vốn bắt đầu trong 6 tuần này nhưng kết thúc sau đó. Mục có nhãn **(stretch)** là thứ bỏ đầu tiên khi tuần bị trễ.

---

## 📌 1. Tổng quan (Overview)

| Tuần | Chủ đề | Phase (lộ trình 18 tháng) | Demo thứ Sáu | Tag |
|---:|---|---|---|---|
| 1 | Nền móng: slide vào, câu hỏi có trích dẫn ra | 0, 2 (data model) | Upload PDF, xác nhận concept, nhận 10 câu hỏi có trích dẫn trang | `v0.1` |
| 2 | Vòng ôn tập hằng ngày + knowledge graph | 0, 2 | Một buổi review 10 phút; graph tự dựng có kiểm tra cycle | `v0.2` |
| 3 | Adaptive engine, dạng bài nâng cao, companion | 3 | Buổi học interleaving, câu spot-the-bug, gap repair, 3 mode companion | `v0.3` |
| 4 | K-12 và trường học | 4 | Giáo viên giao bài; tài khoản K-12 không mở được girlfriend mode; email phụ huynh | `v0.4` |
| 5 | Mobile (PWA), thanh toán, lộ trình dài hạn | 5 | Cài lên điện thoại, thanh toán sandbox, placement test cắt bớt lộ trình | `v0.5` |
| 6 | Mở rộng, bảo mật, ra mắt | 6 | Load test pass, pilot mở cho 50 sinh viên, pitch deck có số liệu đầu tiên | `v1.0` |

**Phân công theo mảng** (theo lịch hiện có của team trong `docs/schedule/`):

| Mảng | Mã role | Người phụ trách |
|---|---|---|
| UI/UX | `uiux` | Mân, Thịnh, Đạt |
| AI implementation | `ai` | Minh, Thắng |
| Database & Security | `dbsec` | Minh, Thắng (hỗ trợ: Võ Thành Đạt) |
| QA/QC | `qa` | Lê Hồng Đăng |
| DevOps | `devops` | Lê Hồng Đăng, Võ Thành Đạt |
| Leader / PM | `pm` | Võ Thành Đạt |

**Nhịp tuần (Weekly rhythm):** Thứ Hai: PM mở milestone và issue của tuần · Hằng tối: standup 15 phút · Thứ Tư: merge giữa tuần, gỡ vướng · Thứ Sáu: demo, báo cáo QA, retro, tag release.

---

## 📍 Tuần 1: Nền móng (Foundation)

* **Mục tiêu**: Upload một file slide, xác nhận danh sách concept và nhận 10 câu hỏi, mỗi câu trích dẫn đúng trang slide.
* **Chi tiết từng role**: [docs/week1/](../week1/README.md) · Issue: #5 đến #18.

| Mảng | Việc cần làm | Done when |
|---|---|---|
| UI/UX | Wireframe upload, concept editor, review session, ask panel, companion panel · design tokens · merge frontend Pathly (React + Vite), app shell có đăng nhập | Figma được team duyệt; app shell lên staging |
| AI | Module `llm` interface (1 vendor phía sau) · prompt trích concept · prompt sinh câu hỏi bắt buộc trích dẫn trang · BM25 retrieval trên page chunks | 20 câu hỏi kiểm tra tay, ≥ 80% đúng |
| Database & Security | Schema (`db/schema.sql`) + migration · FastAPI + ingest PDF theo trang · đăng ký/đăng nhập, hash mật khẩu · secret chỉ trong `.env` | Migration chạy trong CI; quét secret sạch |
| QA/QC | Test plan · `eval/benchmark.jsonl` 20 case · template bug log · báo cáo QA tuần 1 | 20 case được commit; báo cáo 1 được merge |
| DevOps | Git flow: branch, PR, 1 review, CI (lint + test + quét secret + benchmark) · Docker Compose API + DB · deploy staging | Mỗi lần merge `main` tự deploy staging |

## 📍 Tuần 2: Vòng ôn tập + Knowledge graph

* **Mục tiêu**: Học sinh làm một buổi review 10 phút, được chấm và thấy khi nào câu hỏi quay lại; graph tự dựng từ slide và được kiểm tra cycle.
* **Sự kế thừa từ Tuần 1**: Dùng lại bảng `sources`, `concepts`, `items` và module `llm`.

| Mảng | Việc cần làm | Done when |
|---|---|---|
| UI/UX | Màn hình review session và kết quả · mastery map (danh sách tô màu) · graph view 2D kéo thả cạnh · hàng chờ duyệt câu hỏi | Một sinh viên tự làm xong buổi 10 phút không cần hướng dẫn |
| AI | Chấm short answer theo rubric · graph builder: concept theo trang, gộp trùng bằng embeddings, đề xuất cạnh kèm confidence · hybrid retrieval (BM25 + vector) | Chấm điểm khớp người chấm ≥ 85% trên 40 câu |
| Database & Security | Scheduler dùng thư viện `fsrs` + review log · Kahn's sort và Tarjan SCC khi lưu graph · kiểm tra quyền theo từng user · rate limit endpoint LLM | Không user nào đọc được thẻ của user khác (có test) |
| QA/QC | Unit test grader và scheduler · benchmark lên 40 case · 5 graph tham chiếu để đo precision/recall cạnh · báo cáo QA tuần 2 | Báo cáo 2 có số liệu grader và graph |
| DevOps | Error tracking (Sentry free tier) · log chi phí LLM mỗi request · backup DB hằng đêm · tag `v0.2` | Chi phí mỗi buổi review hiện trên dashboard |

## 📍 Tuần 3: Adaptive engine, dạng bài nâng cao, companion

* **Mục tiêu**: Scheduler interleaving, các dạng bài bậc cao, gợi ý theo bậc (hint ladder), sửa lỗ hổng kiến thức (gap repair) và companion 3 mode.
* **Sự kế thừa từ Tuần 2**: Review log là nguồn dữ liệu cho scheduler, gap repair và companion.

| Mảng | Việc cần làm | Done when |
|---|---|---|
| UI/UX | Ask panel với citation bấm được · UI hint ladder · companion panel có chuyển mode và 3 cảnh unlock · session planner (warm-up / core / wrap) | Test với 3 sinh viên, sửa 3 vấn đề lớn nhất |
| AI | Hint ladder · câu spot-the-bug sinh từ câu đã duyệt · câu inversion và "giải thích bằng lời đơn giản" · interleaving giữa các nhánh anh em · prompt companion cho buddy, mentor, girlfriend · bài code trong sandbox **(stretch)** | Tỷ lệ lộ đáp án ≤ 2% trên 30 prompt red-team |
| Database & Security | Gap repair sau 2 lần sai · age gate 18+ và feature flag cho girlfriend mode · lọc prompt injection trong text upload · log an toàn (không log câu trả lời) | Age gate không bị vượt trong 10 lần thử |
| QA/QC | Bộ red-team: 30 lộ đáp án, 10 slide chèn lệnh, 20 hội thoại companion · benchmark lên 60 case · báo cáo QA tuần 3 | Mọi safeguard test pass trong CI |
| DevOps | Dịch vụ feature flag · staging có dữ liệu user giả lập · tag `v0.3` | Đổi mode bằng flag không cần deploy lại |

## 📍 Tuần 4: K-12 và trường học

* **Mục tiêu**: Sản phẩm an toàn cho học sinh lớp 10–12 mà trường học có thể ký.
* **Sự kế thừa từ Tuần 3**: Dùng lại engine câu hỏi, scheduler, companion (khóa ở buddy/mentor cho K-12).

| Mảng | Việc cần làm | Done when |
|---|---|---|
| UI/UX | UI học sinh K-12 (câu đơn giản, tiếng Việt trước) · dashboard giáo viên: chủ đề yếu của lớp, giao bài, xuất điểm · email tuần cho phụ huynh · rà accessibility (bàn phím, screen reader) | Giáo viên giao và xem một bộ bài trong < 5 phút |
| AI | Dạng câu K-12 (MCQ, số, điền khuyết) · graph mẫu toán lớp 10–12 từ mục lục sách giáo khoa · companion K-12 chỉ buddy hoặc mentor | 30 câu K-12 được giáo viên duyệt, ≥ 90% đúng |
| Database & Security | Role: student, teacher, parent, admin · lưu đồng ý của phụ huynh · tối thiểu hóa dữ liệu trẻ vị thành niên · bản nháp privacy policy và điều khoản · luồng xử lý khi có dấu hiệu tự hại | 0 tài khoản K-12 vào được girlfriend mode trong 50 test |
| QA/QC | Ma trận test phân quyền · bộ test an toàn trẻ em · regression · báo cáo QA tuần 4 | Ma trận phân quyền pass 100% |
| DevOps | Staging riêng cho demo trường học · audit log hành động của giáo viên/admin · tag `v0.4` | Tài khoản trường demo hoạt động |

## 📍 Tuần 5: Mobile, thanh toán, lộ trình dài hạn

* **Mục tiêu**: Dùng trên điện thoại, trả tiền được (sandbox), và có lộ trình nhiều năm cho người tự học.
* **Sự kế thừa từ Tuần 4**: Dùng lại toàn bộ API; PWA thay cho app native để kịp thời gian.

| Mảng | Việc cần làm | Done when |
|---|---|---|
| UI/UX | PWA cài được (ôn tập offline, nhắc nhở push) thay cho app native · trang giá và checkout · màn hình lộ trình nhiều môn · placement test | Ôn tập offline trên Android rồi đồng bộ lại được |
| AI | Placement test đánh dấu concept đã biết · một lộ trình nhiều năm (CS fundamentals) liên kết syllabus công khai · chuyển việc dễ sang model nhỏ hơn | Placement cắt ≥ 30% lộ trình với người thử có kinh nghiệm |
| Database & Security | Bảng subscriptions · thanh toán sandbox (Stripe hoặc MoMo test mode), không lưu thẻ · không bán unlock companion · xuất và xóa dữ liệu tài khoản | Thanh toán, hoàn tiền, xóa tài khoản đều chạy |
| QA/QC | Ma trận 3 điện thoại · edge case thanh toán (lỗi, hoàn tiền, hết hạn) · báo cáo QA tuần 5 | Edge case thanh toán pass 100% |
| DevOps | Build PWA và cache · CDN cho asset · tag `v0.5` · CLI companion cho học viên **(stretch)** | Lighthouse PWA check pass |

## 📍 Tuần 6: Mở rộng, bảo mật, ra mắt

* **Mục tiêu**: Production chạy ổn định, an toàn, mở pilot cho 50 sinh viên, có pitch deck.
* **Sự kế thừa từ Tuần 5**: Toàn bộ hệ thống; tuần này chỉ đo, sửa và triển khai.

| Mảng | Việc cần làm | Done when |
|---|---|---|
| UI/UX | Hoàn thiện 5 màn hình chính · trạng thái empty/loading/error · landing page có waitlist · onboarding cho sinh viên pilot | 3 người dùng mới tự onboard không cần trợ giúp |
| AI | Cache câu trả lời theo trang · chạy full benchmark, sửa 10 lỗi lớn nhất · kiểm tra companion (không gây cảm giác tội lỗi, giới hạn thời gian hoạt động) | Benchmark ≥ 90% về trích dẫn và độ đúng |
| Database & Security | Index và tối ưu truy vấn · rà OWASP Top 10 for LLM Applications · sửa phát hiện · quy trình xử lý sự cố 1 trang | Không còn lỗi mức nghiêm trọng cao |
| QA/QC | Load test 1.000 user giả lập · full regression · báo cáo QA cuối với bug còn mở và giới hạn | p95 < 2 giây ở 1.000 user |
| DevOps | Deploy production · dashboard (latency, lỗi, chi phí LLM, cờ an toàn) · runbook và lịch trực · tag `v1.0` | Production chạy, cảnh báo gửi về nhóm chat |

---

## 🚧 2. Sau tuần 6 (What continues)

| Việc | Vì sao không xong trong 6 tuần | Bắt đầu |
|---|---|---|
| Đo retention 4 tuần của pilot | Cần người dùng thật dùng ít nhất 4 tuần | Tuần 6 |
| Nghiên cứu khả năng nhớ (recall study) | Cần độ trễ ≥ 1 tuần giữa học và kiểm tra | Tuần 5 |
| Ký pilot với trường học | Chu kỳ ra quyết định của trường, đồng ý phụ huynh, rà soát pháp lý | Tuần 4 |
| App native trên store | Duyệt store và xếp hạng độ tuổi | Sau tuần 6 |
| Gọi vốn seed | Nhà đầu tư cần số liệu traction thật | Sau pilot |

**Kiểm tra khối lượng (Honest load check):** Kế hoạch này khoảng **3 lần** khối lượng của MVP 4 tuần cho cùng 6 người. Dự kiến bỏ phần lớn mục **(stretch)** và làm mỏng một số tính năng tuần 4–5. Ưu tiên tuyệt đối: safeguard test và benchmark (đây là yêu cầu tối thiểu được chấm điểm).

## ⚠️ 3. Rủi ro chính

| # | Rủi ro | Giảm thiểu |
|---|---|---|
| 1 | LLM sinh câu hỏi sai hoặc không trích dẫn | Bước duyệt của người dùng, bắt buộc citation, mục tiêu 90% trên benchmark |
| 2 | PDF trích xuất kém (ảnh, công thức) | Thử cả 4 file slide ở tuần 1; cho phép dán text thay thế |
| 3 | Phạm vi phình to | Non-goals trong spec; PM từ chối issue ngoài kế hoạch |
| 4 | Girlfriend mode lộ cho người dưới 18 tuổi | Age gate + feature flag + 50 test K-12; mode tắt mặc định |
| 5 | Quá tải người làm | Cắt (stretch) trước; không cắt safeguard và benchmark |

---
**Tóm lược:** Tuần 1–2 **xây lõi** (slide → câu hỏi có trích dẫn → ôn tập) $\rightarrow$ Tuần 3 **thông minh hóa** (adaptive, companion) $\rightarrow$ Tuần 4–5 **mở rộng người dùng** (K-12, mobile, thanh toán) $\rightarrow$ Tuần 6 **ra mắt** (bảo mật, scale, pilot).
