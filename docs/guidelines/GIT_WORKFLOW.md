# 🌿 Quy tắc Git & Pull Request (Git Workflow & Branching)

Tài liệu này quy định cách cả team tạo nhánh (branch), mở Pull Request (PR), review và merge code. Mọi thành viên **bắt buộc** làm theo; `python dev.py devops branch` và CI sẽ kiểm tra tự động.

> [!IMPORTANT]
> Không ai được push thẳng lên `main`. Mọi thay đổi, kể cả sửa 1 dòng tài liệu, đều đi qua: **Issue → Branch → PR → Review → CI → Merge**.

---

## 📌 1. Vai trò (Role) và mã viết tắt

Mỗi người dùng **mã role** của mình ở đầu tên nhánh và tiêu đề PR.

| Mảng (Domain) | Mã role | Thành viên | Label trên GitHub |
|---|---|---|---|
| UI/UX | `uiux` | Lê Phan Đức Mân, Nguyễn Quốc Thịnh | `role: ui-ux` |
| AI implementation (AI-Integration) | `ai` | Võ Gia Minh, Trần Quyết Thắng | `role: ai` |
| Database & Security (Security & Data) | `dbsec` | Võ Gia Minh, Trần Quyết Thắng, Nguyễn Quốc Thịnh | `role: db-security` |
| QA/QC | `qa` | Lê Hồng Đăng | `role: qa-qc` |
| DevOps | `devops` | Lê Hồng Đăng, Võ Thành Đạt (Developer) | `role: devops` |
| Leader / Presenter | `pm` | Võ Thành Đạt | (không bắt buộc) |

Người có hai mảng dùng mã role của mảng mà issue thuộc về (ví dụ Thịnh làm issue auth thì nhánh là `dbsec-thinh/...`).

`<name>` là tên gọi của bạn viết thường, không dấu, không khoảng trắng:

| Thành viên | `<name>` |
|---|---|
| Võ Thành Đạt | `dat` |
| Lê Hồng Đăng | `dang` |
| Võ Gia Minh | `minh` |
| Trần Quyết Thắng | `thang` |
| Lê Phan Đức Mân | `man` |
| Nguyễn Quốc Thịnh | `thinh` |

---

## 🏗️ 2. Cú pháp tên nhánh (Branch naming)

```text
<role>-<name>/<issue>-<short-task>
```

- **`<role>-<name>`**: ai đang làm, thuộc mảng nào (ví dụ `ai-minh`).
- **`<issue>`**: số issue trên GitHub, bắt buộc. Không có issue → tạo issue trước.
- **`<short-task>`**: 2–5 từ tiếng Anh, viết thường, nối bằng `-`.

✅ **Đúng:**
- `ai-minh/9-concept-extraction`
- `uiux-thinh/7-upload-page`
- `dbsec-thang/13-pdf-ingest`
- `qa-dang/15-benchmark-20-cases`
- `devops-dat/17-branch-protection`

❌ **Sai (TUYỆT ĐỐI TRÁNH):**
- `minh` (không có role, không có issue)
- `feature/login` (không biết ai làm, issue nào)
- `ai-minh/concept-extraction` (thiếu số issue)
- `AI_Minh/9` (viết hoa, dùng `_`)

**Nhánh cố định (long-lived):** `main` (luôn deploy được), `dev` (tùy chọn, nếu team cần tích hợp trước khi lên `main`). Nhánh do bot tạo (`claude/...`, `codex/...`, `dependabot/...`) được miễn quy tắc.

Kiểm tra tên nhánh hiện tại:

**Git Bash**
```bash
python dev.py devops branch
```

**PowerShell**
```powershell
python dev.py devops branch
```

---

## 🔄 3. Quy trình làm một task (Daily Workflow)

1. 📋 Nhận issue trên GitHub (tự assign mình), đọc phần **Done when**.
2. 🌱 Tạo nhánh từ `main` mới nhất:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b ai-minh/9-concept-extraction
   ```
3. 💾 Commit nhỏ, thường xuyên, đúng [COMMIT_CONVENTION.md](COMMIT_CONVENTION.md):
   ```bash
   git add src/app/llm/concepts.py tests/test_concepts.py
   git commit -m "feat(ai): add concept extraction prompt"
   ```
4. 🔁 Trước khi push, cập nhật code mới từ `main` để giảm conflict:
   ```bash
   git pull origin main
   ```
5. ✅ Chạy CI cục bộ, sửa hết lỗi:
   ```bash
   python dev.py devops ci
   ```
6. 📤 Push và mở PR:
   ```bash
   git push -u origin ai-minh/9-concept-extraction
   ```

---

## 📝 4. Pull Request

### 4.1. Tiêu đề PR

```text
[<role>-<name>] <type>(<scope>): <mô tả ngắn>
```

✅ `[ai-minh] feat(ai): add concept extraction prompt`
✅ `[qa-dang] test(qa): add 14 benchmark cases`
❌ `Update` · ❌ `minh's code` · ❌ `fix bug`

### 4.2. Nội dung PR
Dùng template có sẵn (`.github/pull_request_template.md`), điền đủ:
- **Issue**: `Closes #9` (GitHub tự đóng issue khi merge).
- **Đã làm**: 2–5 gạch đầu dòng.
- **Cách kiểm tra**: lệnh để reviewer chạy lại.
- **Ảnh chụp màn hình**: bắt buộc với PR của UI/UX.
- **Checklist**: CI cục bộ pass, không có secret, có test cho code mới.

### 4.3. Quy tắc review và merge
- Mỗi PR cần **ít nhất 1 approve** từ người **khác role** hoặc PM.
- PR nhỏ: dưới ~400 dòng thay đổi. Lớn hơn → tách PR.
- Reviewer trả lời trong **24 giờ**; tác giả sửa xong thì comment "đã sửa" vào từng ý.
- CI phải xanh. **Không** tắt test hay bỏ qua lint để cho qua.
- Merge bằng **Squash and merge**, tiêu đề squash giữ đúng cú pháp commit.
- Merge xong: xóa nhánh trên GitHub.

---

## 🗓️ 5. Milestone và Label

- Mỗi tuần có 1 milestone: `Week 1`, `Week 2`, ... `Week 6`.
- Mỗi issue có đúng 1 label role + label tuần (`week-1`).
- Thứ Sáu: PM rà milestone, issue chưa xong được chuyển sang tuần sau kèm comment lý do.

---

## ⚠️ 6. Khi gặp sự cố

| Tình huống | Cách xử lý |
|---|---|
| Conflict khi `git pull origin main` | Sửa conflict ở máy mình, chạy lại `python dev.py devops ci`, rồi commit `fix: resolve merge conflict with main` |
| Lỡ commit secret (API key) | Báo ngay cho DevOps, **thu hồi key** ở nhà cung cấp trước, sau đó mới xóa khỏi lịch sử |
| Đặt sai tên nhánh | `git branch -m <tên-đúng>` rồi push lại |
| Commit message sai | Chưa push: `git commit --amend`. Đã push lên nhánh của mình: sửa lúc squash merge |

---

**Tóm lược:** Issue → nhánh `<role>-<name>/<issue>-<task>` → commit đúng cú pháp → `python dev.py devops ci` → PR `[<role>-<name>] ...` → 1 approve + CI xanh → squash merge.
