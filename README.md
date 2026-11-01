# Bếp Nhà: app hướng dẫn nấu ăn 3D

**Mở app:** https://nminhcuongdev.github.io/cooking-app/

Web app hướng dẫn nấu món ăn gia đình Việt từng bước. Mỗi bước có hoạt cảnh 3D minh họa. App chạy tốt trên cả máy tính lẫn điện thoại.

## Tính năng
- **66 món, 347 bước** lấy từ thư mục [`recipes/`](recipes). Mỗi bước tự chọn một trong 13 hoạt cảnh 3D theo thao tác: sơ chế (dao thái trên thớt), ướp/trộn, xào/phi/rang (chảo tung), chiên ngập dầu, luộc/nấu, kho/rim (nồi đất), hấp (xửng), nướng (vỉ than), thắng nước màu, nêm nếm, gói/nặn, ngâm/rửa, bày đĩa.
- Nguyên liệu trong hoạt cảnh (thịt, gà, tôm, cá, nghêu, mực, rau, cà chua, nấm…) được nhận diện từ nội dung từng bước.
- Mỗi món và mỗi bước có link riêng để chia sẻ: `#mon-canh-chua-ca-loc`, `#nau-3-canh-chua-ca-loc`.
- Kéo để xoay góc nhìn, cuộn chuột để phóng to, nhấp đúp để đặt lại.
- **Chế độ nấu:** thanh tiến độ, chuyển bước bằng nút, phím ←/→ hoặc vuốt ngang trên điện thoại. Bước nào có thời gian thì có **hẹn giờ** kèm chuông và rung khi hết giờ. Màn hình được giữ sáng trong lúc nấu.
- **Nguyên liệu:** đánh dấu những thứ đã chuẩn bị, **đổi khẩu phần** thì định lượng tự quy đổi (hiển thị phân số ½, ⅓, ¼).
- Tìm kiếm theo tên món hoặc nguyên liệu (gõ có dấu hay không dấu đều được), lọc theo nhóm món, lưu món yêu thích.
- Giao diện sáng/tối, responsive từ màn hình 320 px đến màn hình rộng.

## Chạy trên máy
App là trang tĩnh, không cần cài đặt:
```bash
python3 -m http.server 8000
```
Sau đó mở http://localhost:8000. Hoặc mở thẳng file [`dist/bep-nha.html`](dist/bep-nha.html), là bản gộp sẵn trong một file (cần mạng để tải Three.js và font).

## Thêm hoặc sửa công thức
1. Thêm hoặc sửa file `.md` trong `recipes/<nhóm>/` theo mẫu [`recipes/_mau-cong-thuc.md`](recipes/_mau-cong-thuc.md): có bảng khẩu phần, mục `## Nguyên liệu` với các nhóm `###`, mục `## Cách làm` đánh số `1. **Tên bước (thời gian).** …`, và tùy chọn `## Mẹo`, `## Nguồn`.
2. Build lại dữ liệu:
   ```bash
   python3 tools/build_data.py   # recipes/*.md -> data/recipes.js
   python3 tools/bundle.py       # -> dist/bep-nha.html
   ```
3. Commit và push lên `main`. GitHub Pages tự cập nhật sau khoảng 1 phút.

## Cấu trúc
| Đường dẫn | Vai trò |
|---|---|
| `index.html` | Khung trang |
| `css/style.css` | Giao diện, theme sáng/tối, responsive |
| `js/app.js` | Điều hướng, danh sách, chi tiết, chế độ nấu, hẹn giờ, quy đổi khẩu phần |
| `js/scene3d.js` | Nhận diện thao tác và nguyên liệu, dựng 13 hoạt cảnh 3D bằng Three.js r128 |
| `data/recipes.js` | Dữ liệu sinh tự động từ `recipes/`, không sửa tay |
| `recipes/` | Công thức gốc dạng Markdown |
| `tools/` | Script build dữ liệu và đóng gói |
| `dist/bep-nha.html` | Bản gộp một file |
| `.nojekyll` | Tắt Jekyll để Pages phục vụ nguyên các file tĩnh |

## Nguồn công thức
Công thức đánh dấu 🌐 lấy từ [Món Ngon Mỗi Ngày](https://monngonmoingay.com), giữ nguyên định lượng gốc và có link nguồn trong từng file. Công thức đánh dấu 👤 là công thức nhà mình.
