# Tasks for UI/UX (Tuần 1: Wireframe, App Shell, Upload & Concept Editor)

Tài liệu này mô tả chi tiết nhiệm vụ tuần 1 của nhóm UI/UX (Thịnh, Mân, Đạt): vì sao làm, làm theo thứ tự nào, chuẩn thiết kế phải theo và phối hợp với các role khác.

## 🎯 Sứ mệnh tuần 1
Thiết kế và dựng phần đầu tiên của luồng chính, **tải slide lên và xác nhận concept**, sao cho tuần 2 chỉ cần đổi lớp API mock sang API thật là chạy.

Dưới đây là các hạng mục công việc cần hoàn thiện:

- [ ] **Task 1: Wireframe 5 màn hình chính (#5, Thịnh, 8 giờ)**
  - **Màn hình**: S3 Upload, S4 Concept editor, S6 Review session, S8 Ask panel, S10 Companion panel (định nghĩa ở spec mục 5).
  - **Kích thước**: desktop 1440×900 và mobile 390×844.
  - **Trạng thái**: empty, loading, error cho từng màn hình.
  - **Duyệt**: ≥ 2 người khác role comment trên Figma trước thứ Tư.
  *(Ghi chú PM: S6, S8, S10 chưa code trong tuần 1 nhưng phải vẽ ngay để AI biết dữ liệu UI cần.)*
- [ ] **Task 2: Merge Pathly + design tokens + app shell (#6, Mân, 10 giờ)**
  - **Merge**: `codex/pathly-ui` vào `main` qua nhánh `uiux-man/6-pathly-shell`.
  - **Tokens**: CSS variables màu, chữ, khoảng cách, bo góc, dark mode.
  - **Shell**: header, điều hướng 5 mục (dưới đáy trên mobile), đăng nhập/đăng ký mock có validate.
- [ ] **Task 3: Màn hình Upload + Concept editor với mock (#7, Đạt, 12 giờ)**
  - **API mock**: `ui/src/api/courses.ts`, đúng định dạng spec mục 8.1–8.2.
  - **Upload**: chỉ PDF, ≤ 20 MB, tiến trình, 3 loại lỗi.
  - **Concept editor**: rename, merge, delete (undo 5 giây), add prerequisite, chặn vòng lặp.

---

## 📐 Chuẩn thiết kế (Design rules)

| Quy tắc | Chi tiết |
|---|---|
| Lưới và khoảng cách | Bước 4 px; khoảng giữa các khối 16 px; lề mobile 16 px |
| Chữ | Inter; 14 (phụ), 16 (thân), 20 (tiêu đề khối), 24 (tiêu đề trang) |
| Màu | Chỉ dùng token, không mã màu cứng; tương phản WCAG AA (4.5:1 cho chữ thường) |
| Vùng bấm | ≥ 44×44 px |
| Trích dẫn | Mọi nội dung do AI tạo có citation chip `Tên file · tr. N` hoặc nhãn "không có nguồn" |
| Ngôn ngữ | Tiếng Việt mặc định; thuật ngữ môn học giữ như slide |
| Companion | Girlfriend mode hiển thị khóa (ổ khóa + "Chỉ dành cho người dùng 18+ đã xác minh"), không hiện hình ảnh lãng mạn khi chưa mở |

## 🧪 Câu chữ cho lỗi (Error copy)

| Tình huống | Câu hiển thị |
|---|---|
| File không phải PDF | "Hiện chỉ hỗ trợ file PDF." |
| File > 20 MB | "File lớn hơn 20 MB. Hãy tách file hoặc nén lại." |
| PDF chỉ có ảnh | "Không đọc được chữ trong file này. Bạn có thể dán nội dung trang cần học." |
| Tạo vòng lặp prerequisite | "Thêm cạnh này sẽ tạo vòng lặp. Hãy bỏ một cạnh trước." |
| Mất mạng | "Mất kết nối. Thay đổi của bạn sẽ được lưu khi có mạng lại." |

## 🤝 Phối hợp với role khác

| Với | Cần gì | Khi nào |
|---|---|---|
| AI (Minh) | Danh sách trường của concept và item để vẽ đúng | Thứ Hai |
| DB&Security (Minh) | Mã lỗi thật của upload (400/413/415, `warning: scanned_pdf`) | Thứ Ba |
| DB&Security (Võ Thành Đạt) | Định dạng request/response auth | Thứ Ba |
| QA (Đăng) | Checklist test thủ công cho 2 màn hình | Thứ Năm |
| DevOps (Đăng) | Cấu hình Vercel cho `ui/` | Thứ Năm |

## 📊 Kết quả tuần 1 (điền khi xong)

| Hạng mục | Link / kết quả |
|---|---|
| Figma | _chưa có_ |
| Ảnh chụp app shell (desktop, mobile) | _chưa có_ |
| Staging UI | _chưa có_ |

### Hạn chế & Hướng cải thiện
| # | Hạn chế | Hướng cải thiện |
|---|---|---|
| 1 | Dữ liệu concept là mock | Nối API thật của #9 ở tuần 2 |

## 📂 Codebase Guidelines
- Component trong `ui/src/components/`, trang trong `ui/src/pages/`, gọi API chỉ qua `ui/src/api/`.
- Lệnh: `python dev.py ui install | dev | build | test`.
- PR UI bắt buộc có ảnh chụp màn hình desktop và mobile.

## 🌿 Git Workflow & Branching
- Nhánh: `uiux-<name>/<issue>-<task>`, ví dụ `uiux-thinh/5-wireframes`, `uiux-dat/7-upload-concepts`.
- Commit: `feat(ui): add upload dropzone`, `style(ui): apply spacing tokens`.
- Xem [docs/guidelines/GIT_WORKFLOW.md](../guidelines/GIT_WORKFLOW.md).
