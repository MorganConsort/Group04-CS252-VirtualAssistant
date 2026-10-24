# 📚 Hướng dẫn làm việc nhóm (Team Guidelines)

Thư mục này chứa các quy tắc bắt buộc cho mọi thành viên Group 04. Đọc cả hai file trước khi mở PR đầu tiên.

| File | Nội dung |
|---|---|
| [GIT_WORKFLOW.md](GIT_WORKFLOW.md) | Role và mã viết tắt, cú pháp tên nhánh `<role>-<name>/<issue>-<task>`, quy trình PR, review, merge, milestone |
| [COMMIT_CONVENTION.md](COMMIT_CONVENTION.md) | Cú pháp commit `<type>(<scope>): <mô tả>`, ví dụ đúng/sai, cài git hook |

**Lệnh kiểm tra nhanh**

```bash
python dev.py devops branch          # tên nhánh hiện tại có đúng không
python dev.py devops commit-msg "feat(ai): add concept extraction prompt"
python dev.py devops install-hooks   # tự chặn commit sai cú pháp
python dev.py devops ci              # chạy toàn bộ kiểm tra như CI trước khi push
```
