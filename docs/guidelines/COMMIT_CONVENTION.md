# 📌 Quy ước Commit (Git Commit Convention)

Để lịch sử commit dễ đọc, dễ truy vết và hạn chế conflict khi làm nhóm, cả team thống nhất dùng chuẩn **Conventional Commits** (tham khảo từ repo AICHCM-2026-Glitch). Git hook và CI kiểm tra tự động bằng `python dev.py devops commit-msg`.

## 🏗️ 1. Cú pháp cơ bản (Basic Syntax)

```text
<type>(<scope>): <mô tả ngắn>

[Phần thân (body) tùy chọn: giải thích vì sao, không phải làm gì]

[Footer tùy chọn: Closes #9]
```

### 1.1. `<type>` (Bắt buộc) 🎯

| Type | Dùng khi | Emoji (tùy chọn) |
|---|---|---|
| `feat` | Thêm tính năng mới | ✨ |
| `fix` | Sửa bug | 🐛 |
| `docs` | Chỉ sửa tài liệu (README, `docs/`) | 📚 |
| `style` | Định dạng code, không đổi logic | 💎 |
| `refactor` | Viết lại code, không thêm tính năng, không sửa bug | ♻️ |
| `perf` | Tối ưu hiệu năng | 🚀 |
| `test` | Thêm hoặc sửa test, benchmark | 🧪 |
| `chore` | Cấu hình, thư viện, `.gitignore` | 🔧 |
| `ci` | GitHub Actions, deploy, Docker | 👷 |

### 1.2. `<scope>` (Khuyến khích) 🔍
Mảng hoặc module bị ảnh hưởng, viết thường. Ưu tiên dùng mã role hoặc tên module:
`ui`, `ai`, `db`, `security`, `qa`, `devops`, `api`, `ingest`, `retrieval`, `scheduler`, `companion`, `docs`.

### 1.3. `<mô tả>` (Bắt buộc) 📝
- Viết bằng **tiếng Anh**, bắt đầu bằng động từ nguyên mẫu, viết thường: `add`, `fix`, `remove`, `update`.
- Ngắn gọn, nên dưới 50 ký tự; dòng đầu tối đa 100 ký tự (hook sẽ chặn nếu dài hơn).
- Không chấm câu ở cuối.
- Emoji đặt sau dấu `: ` nếu muốn dùng: `feat(ai): ✨ add hint ladder`.

---

## 💡 2. Ví dụ

✅ **Đúng (khuyến khích):**
- `feat(ingest): add pdf page extraction with pypdf`
- `fix(retrieval): 🐛 return not-found below score threshold`
- `docs(week1): 📚 add qa mission details`
- `test(qa): add 14 benchmark cases for privacy and safety`
- `chore: 🔧 add rank-bm25 to requirements`
- `ci(devops): run secret scan on every pull request`
- `refactor(ui): ♻️ extract CitationChip component`

❌ **Sai (TUYỆT ĐỐI TRÁNH):**
- `update code` (không biết cập nhật gì)
- `fix bug` (bug nào, ở đâu?)
- `Push code cuối ngày` (không mô tả thay đổi)
- `xong task 1 nha mn` (giao tiếp cá nhân, không thuộc commit)
- `Feat(AI): Added prompt.` (type viết hoa, động từ quá khứ, có dấu chấm)

---

## 🔄 3. Quy trình hằng ngày (Daily Workflow)

1. 📥 `git add <file cụ thể>` (tránh `git add .` khi có file nháp, file `.env`).
2. 💾 `git commit -m "feat(ai): add concept extraction prompt"`
3. 🔄 `git pull origin main` (đồng bộ code mới nhất trước khi push).
4. 📤 `git push origin <tên-nhánh-của-bạn>`

---

## 🛡️ 4. Cài hook tự kiểm tra (làm 1 lần sau khi clone)

**Git Bash**
```bash
python dev.py devops install-hooks
```

**PowerShell**
```powershell
python dev.py devops install-hooks
```

Từ đó, commit sai cú pháp sẽ bị chặn ngay ở máy bạn. Kiểm tra thử một message:

```bash
python dev.py devops commit-msg "feat(ai): add concept extraction prompt"
```

> [!IMPORTANT]
> Không dùng `git commit --no-verify` để vượt hook. Nếu hook báo sai, sửa message cho đúng.
