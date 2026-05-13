# 📝 Note App - Final Project

## 📌 Giới thiệu

Đây là đồ án cuối kỳ môn **Công nghệ phần mềm**.

Ứng dụng Note App hỗ trợ:

* Đăng ký / Đăng nhập
* Xác thực email
* Quên mật khẩu bằng OTP
* Đổi mật khẩu khi đã đăng nhập
* Dark Mode / Light Mode
* Upload nhiều ảnh
* Ghim ghi chú
* Khóa ghi chú bằng mật khẩu
* Chia sẻ ghi chú
* Realtime bằng WebSocket
* Auto Save
* Responsive cho PC / Tablet / Mobile

---

# 🚀 Công nghệ sử dụng

## Frontend

* HTML
* CSS
* JavaScript

## Backend

* NodeJS
* ExpressJS

## Database

* SQL Server

## Libraries

* bcrypt
* jsonwebtoken
* multer
* nodemailer
* websocket
* sweetalert2
* dotenv
* mssql

---

# 📂 Clone project

```bash
git clone https://github.com/Khoi3303/note-app.git
```

---

# 📦 Cài thư viện

Mở terminal tại thư mục project:

```bash
npm install
```

---

# 🗄️ Cấu hình Database

## Bước 1: Mở SQL Server Management Studio

Mở file SQL:

```text
create_fresh_database.sql
```

Sau đó chạy toàn bộ script.

---

## Bước 2: Bật SQL Server Authentication

### Thực hiện:

* Right click vào Server
* Chọn Properties
* Chọn Security
* Tick:

```text
SQL Server and Windows Authentication mode
```

* Nhấn OK
* Restart SQL Server

---

## Bước 3: Enable tài khoản sa

### Vào:

```text
Security
→ Logins
→ sa
```

### Sau đó:

* Enable Login
* Đặt password cho tài khoản sa

---

# ⚙️ Tạo file .env

Tạo file:

```text
.env
```

ở thư mục gốc project.

Ví dụ:

```env
PORT=8080

DB_USER=sa
DB_PASSWORD=your_password
DB_SERVER=localhost
DB_DATABASE=FinalProject_NoteApp

JWT_SECRET=your_secret_key

EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

---

# 📧 Cấu hình Gmail OTP

Để chức năng OTP hoạt động:

## Bước 1:

Bật xác minh 2 bước cho Gmail

## Bước 2:

Tạo App Password:

https://myaccount.google.com/apppasswords

## Bước 3:

Dùng App Password thay cho mật khẩu Gmail trong `.env`

Ví dụ:

```env
EMAIL_USER=example@gmail.com
EMAIL_PASS=abcd efgh ijkl mnop
```

---

# ▶️ Chạy project

Mở terminal:

```bash
npm run dev
```

Nếu thành công sẽ hiển thị:

```text
Server chạy tại:
http://localhost:8080
```

---

# 🌐 Link chạy project

```text
http://localhost:8080
```

---

# ✨ Các chức năng chính

## Authentication

* Đăng ký
* Đăng nhập
* Xác thực email
* Quên mật khẩu
* Đổi mật khẩu

---

## Notes

* Tạo ghi chú
* Chỉnh sửa ghi chú
* Xóa ghi chú
* Ghim ghi chú
* Khóa ghi chú
* Upload nhiều ảnh

---

## Sharing

* Chia sẻ ghi chú
* Quyền xem
* Quyền chỉnh sửa

---

## Realtime

* Đồng bộ realtime
* WebSocket
* Auto Save

---

## UI / UX

* Responsive
* Dark mode
* SweetAlert2
* Modal popup

---

Final Project - Software Engineering