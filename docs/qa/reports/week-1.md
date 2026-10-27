# Báo cáo QA tuần 1 (Weekly QA Report)

Báo cáo này tổng hợp kết quả kiểm thử của tuần 1. Ngày tạo: 2026-10-24. Cập nhật: 2026-10-27.

## Kết luận
- **Trạng thái**: Đạt về hạ tầng kiểm thử (CI xanh, benchmark 20 case hợp lệ). Chưa đo được chất lượng AI vì pipeline retrieval / sinh câu hỏi chưa merge.

## Kết quả kiểm thử
| Nhóm | Số test | Pass | Fail | Ghi chú |
|---|---:|---:|---:|---|
| Unit test (`dev qa test`) | 27 | 27 | 0 | pytest, chạy offline; vitest (UI) chưa chạy trong CI |
| Benchmark (`dev ai benchmark stats`) | 20 | 20 | 0 | Chỉ kiểm định dạng: normal=10, missing_knowledge=4, privacy=3, safety=3 |
| Safeguard / red-team | 10 | — | — | 10 case red-team đã viết, chờ pipeline để chấm |

## Bug log
| # | Mức độ | Mô tả | Role phụ trách | Issue | Trạng thái |
|---|---|---|---|---|---|
| 1 | Major | Merge `main` vào nhánh LLM để lại 2 dòng `if` chồng nhau trong `src/devcli/db.py` → ruff, pytest, scan-secrets đều lỗi trên CI | AI | PR #22 | Đã sửa (commit `5b6787f`) |
| 2 | Minor | Case B002 trích `Week 0 - Orientation.pdf#53` theo số in trên slide; trang PDF đúng là 50 | QA/QC | #15 | Đã sửa |

## Hạn chế & Hướng cải thiện (Limitations)
| # | Hạn chế | Hướng cải thiện |
|---|---|---|
| 1 | Benchmark mới kiểm định dạng, chưa chấm câu trả lời thật | Viết script chạy benchmark qua pipeline khi UC-06 merge (tuần 2) |
| 2 | Test UI (vitest) chưa nằm trong CI | Đề xuất DevOps thêm bước `npm test` |
| 3 | `Week 0 - Orientation.pdf` có số "Page N" lệch số trang PDF | Quy ước dùng số trang PDF (TEST_PLAN mục 3) |
| 4 | Chưa có review 5 case `normal` từ AI (Minh) | Nhờ review trong PR của #15 |
