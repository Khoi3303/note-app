# 📝 Note App - Modern Web Notes Platform

[![Node.js](https://img.shields.io/badge/Node.js-v16%2B-green.svg)](https://nodejs.org/)
[![Framework](https://img.shields.io/badge/Express.js-v5-blue.svg)](https://expressjs.com/)
[![Database](https://img.shields.io/badge/SQL%20Server-Database-red.svg)](https://www.microsoft.com/sql-server)
[![Realtime](https://img.shields.io/badge/WebSocket-Realtime-purple.svg)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)

---

**Note App** là đồ án cuối kỳ môn **Lập trình web và ứng dụng**, được xây dựng như một nền tảng ghi chú cá nhân hiện đại. Ứng dụng hỗ trợ đăng ký, đăng nhập, xác thực email, ghi chú realtime, upload hình ảnh, phân loại bằng nhãn, chia sẻ ghi chú và trải nghiệm responsive trên PC, tablet, mobile.

---

## 📺 Video Demo

**Xem video demo sản phẩm tại đây:**  
https://drive.google.com/file/d/1a-MZyWk2Dn17MCbTJoEBeNvx5LX8rS91/view?fbclid=IwY2xjawRyIN5leHRuA2FlbQIxMABicmlkETFiZVltRFNjSWpJYThxbEE4c3J0YwZhcHBfaWQQMjIyMDM5MTc4ODIwMDg5MgABHghexc4sRBxl90yC9FEWUyfCk-OGBn5XJnlJ8IvxARLJvqOzna47RodWAOpC_aem_ODI9vB2MoGLmJ6LVEe4r3g

---

## 🚀 Quick Start

Chạy project theo đúng các bước đã cấu hình sẵn:

```bash
# 1. Clone repository
git clone https://github.com/Khoi3303/note-app.git

# 2. Mở project trong VS Code
# 3. Mở terminal tại thư mục source

# 4. Cài thư viện
npm install

# 5. Tạo database bằng file create_fresh_database.sql

# 6. Tạo file .env trong thư mục source

# 7. Chạy server
npm run dev
```

Sau khi chạy thành công, truy cập:

```text
http://localhost:8080
```

---

## 🌟 Key Features

- **🔐 Authentication đầy đủ**: Đăng ký, đăng nhập, JWT, xác thực email, đổi mật khẩu và quên mật khẩu bằng OTP/token.
- **📝 Quản lý ghi chú thông minh**: Tạo, sửa, xóa, ghim, khóa ghi chú bằng mật khẩu và tự động lưu.
- **🏷️ Labels System**: Tạo nhãn, chỉnh sửa nhãn, xóa nhãn và gắn nhãn cho từng ghi chú.
- **🖼️ Multi-image Upload**: Upload nhiều ảnh cho mỗi ghi chú với giới hạn định dạng và dung lượng.
- **🤝 Sharing Notes**: Chia sẻ ghi chú qua email với quyền xem hoặc quyền chỉnh sửa.
- **⚡ Realtime Sync**: Đồng bộ thay đổi ghi chú theo thời gian thực bằng WebSocket.
- **🌙 Dark Mode / Light Mode**: Giao diện sáng tối linh hoạt, thân thiện với người dùng.
- **📱 Responsive UI**: Tối ưu trải nghiệm trên máy tính, tablet và điện thoại.
- **📦 PWA / Offline Support**: Có manifest, service worker và trang offline cho trải nghiệm gần giống ứng dụng cài đặt.

---

## 🛠️ Technologies Used

| Layer | Technology |
| :--- | :--- |
| **Frontend** | HTML, CSS, Vanilla JavaScript |
| **Backend** | Node.js, Express.js |
| **Database** | SQL Server, `mssql` |
| **Authentication** | JWT, bcrypt/bcryptjs |
| **File Upload** | Multer |
| **Email / OTP** | Nodemailer, Gmail App Password |
| **Realtime** | WebSocket (`ws`) |
| **UI / UX** | SweetAlert2, responsive CSS, dark mode |

---

## 🏗️ System Architecture

Project được tổ chức theo hướng tách biệt frontend và backend:

- **Frontend**: Các file HTML/CSS/JS nằm trong `frontend_notes/`, được Express serve trực tiếp.
- **Backend**: API, controller, route, middleware và cấu hình database nằm trong `src/`.
- **Database**: SQL Server lưu user, notes, images, labels và quyền chia sẻ.
- **Realtime Layer**: WebSocket server phát sự kiện khi ghi chú được tạo, sửa, xóa, ghim, khóa hoặc chia sẻ.

---

## 📂 Project Structure

```text
src/
├── frontend_notes/               # Giao diện người dùng
│   ├── css/                      # Style cho auth, layout, notes, modal, dark mode...
│   ├── js/                       # Logic UI, notes, labels, websocket, toast...
│   ├── index.html                # Trang đăng nhập/đăng ký
│   ├── home.html                 # Trang chính quản lý ghi chú
│   ├── reset_password.html       # Trang đặt lại mật khẩu
│   ├── manifest.json             # PWA manifest
│   ├── sw.js                     # Service worker
│   └── offline.html              # Trang offline
├── source/                          # Backend Node.js/Express
│   ├── config/                   # Kết nối SQL Server
│   ├── controllers/              # Xử lý auth và notes
│   ├── middleware/               # JWT auth và upload middleware
│   ├── routes/                   # API routes
│   ├── server.js                 # Entry point của server
│   ├── wsServer.js               # WebSocket server
│   └── package.json              # Scripts và dependencies
├── create_fresh_database.sql     # Script tạo database SQL Server
└── README.md
```

---

## ⚙️ Installation Guide

### Prerequisites

- [Node.js](https://nodejs.org/) v16 hoặc cao hơn
- [SQL Server](https://www.microsoft.com/sql-server)
- SQL Server Management Studio
- Gmail App Password nếu muốn dùng đầy đủ chức năng OTP/email

---

## 📂 Clone Project

```bash
git clone https://github.com/Khoi3303/note-app.git
```

---

## 📦 Cài Thư Viện

### Bước 1: Mở project bằng VS Code

### Bước 2: Open đúng thư mục:

```text
source
```

Trong project hiện tại, mã nguồn backend nằm trong:

```text
source
```

### Bước 3: Mở terminal tại thư mục `source`

Sau đó chạy:

```bash
npm install
```

---

## 🗄️ Cấu Hình Database

### Bước 1: Mở SQL Server Management Studio

Mở file SQL:

```text
create_fresh_database.sql
```

Sau đó chạy toàn bộ script để tạo database:

```text
FinalProject_NoteApp
```

### Bước 2: Bật SQL Server Authentication

Thực hiện:

- Right click vào Server
- Chọn **Properties**
- Chọn **Security**
- Tick:

```text
SQL Server and Windows Authentication mode
```

- Nhấn **OK**
- Restart SQL Server

### Bước 3: Enable tài khoản `sa`

Vào:

```text
Security
→ Logins
→ sa
```

Sau đó:

- Enable Login
- Đặt password cho tài khoản `sa`, ví dụ `123456`, hoặc dùng mật khẩu bạn đã thiết lập trong SQL Server

---

## ⚙️ Tạo File `.env`

Tạo file:

```text
.env
```

ở thư mục backend (`source`).

Sau đó copy nội dung sau vào file `.env`:

```env
PORT=8080 (hoặc cổng khác nếu cổng 8080 đã được dùng)

DB_USER=sa
DB_PASSWORD=123456 (hoặc mật khẩu đặt cho sa trong SQL)
DB_SERVER=localhost (hoặc tên server SQL)
DB_NAME=FinalProject_NoteApp

JWT_SECRET=BiMatToanDiAemA

APP_BASE_URL=http://localhost:8080 (cùng cổng với PORT ở trên)

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false

SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password (nếu code có cách thì phải cách)

SMTP_FROM=your_email@gmail.com
```

> Có thể đổi `PORT`, `DB_PASSWORD`, `DB_SERVER` theo máy của bạn. Nếu đổi `PORT`, hãy đổi `APP_BASE_URL` tương ứng.

---

## 📧 Cấu Hình Gmail OTP

Để chức năng xác thực email và quên mật khẩu hoạt động:

### Bước 1

Bật xác minh 2 bước cho Gmail.

### Bước 2

Tạo App Password tại:

```text
https://myaccount.google.com/apppasswords
```

### Bước 3

Điền Gmail và App Password vào file `.env`:

```env
SMTP_USER=example@gmail.com
SMTP_PASS=abcdefghijklmnop (nếu code có cách thì phải cách)
SMTP_FROM=example@gmail.com
```

---

## ▶️ Chạy Project

Mở terminal tại thư mục:

```text
source
```

Sau đó chạy:

```bash
npm run dev
```

Nếu thành công sẽ hiển thị:

```text
Server chạy tại: http://localhost:8080
```

---

## 🌐 Link Chạy Project

```text
http://localhost:8080
```

Nếu bạn đổi `PORT` trong `.env`, hãy truy cập theo cổng mới.

---

## 🔌 API Endpoints

### Authentication

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Đăng ký tài khoản |
| `POST` | `/api/auth/login` | Đăng nhập và nhận JWT |
| `GET` | `/api/auth/me` | Lấy thông tin người dùng hiện tại |
| `GET` | `/api/auth/verify-email/:token` | Xác thực email |
| `POST` | `/api/auth/resend-verification` | Gửi lại email kích hoạt |
| `POST` | `/api/auth/request-password-reset` | Yêu cầu đặt lại mật khẩu |
| `POST` | `/api/auth/reset-password` | Đặt lại mật khẩu bằng token/OTP |
| `GET` | `/api/auth/profile` | Lấy profile |
| `PUT` | `/api/auth/profile` | Cập nhật profile |
| `PUT` | `/api/auth/change-password` | Đổi mật khẩu khi đã đăng nhập |

### Notes

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/notes` | Lấy danh sách ghi chú |
| `POST` | `/api/notes` | Tạo ghi chú mới |
| `PUT/PATCH` | `/api/notes/:id` | Cập nhật ghi chú |
| `DELETE` | `/api/notes/:id` | Xóa ghi chú |
| `PATCH` | `/api/notes/:id/pin` | Ghim/bỏ ghim ghi chú |
| `PATCH` | `/api/notes/:id/lock` | Khóa ghi chú bằng mật khẩu |
| `PATCH` | `/api/notes/:id/unlock` | Mở khóa ghi chú |
| `POST` | `/api/notes/:id/verify-password` | Xác thực mật khẩu ghi chú |
| `POST` | `/api/notes/:id/share` | Chia sẻ ghi chú |
| `DELETE` | `/api/notes/:id/unshare` | Hủy chia sẻ ghi chú |
| `GET` | `/api/notes/shared` | Lấy ghi chú được chia sẻ |

### Labels

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/notes/labels` | Lấy danh sách nhãn |
| `POST` | `/api/notes/labels` | Tạo nhãn mới |
| `PUT` | `/api/notes/labels/:id` | Cập nhật nhãn |
| `DELETE` | `/api/notes/labels/:id` | Xóa nhãn |

---

## 🔐 Authentication Flow

1. **Registration**: Người dùng đăng ký bằng email và mật khẩu.
2. **Email Verification**: Hệ thống gửi link kích hoạt qua Gmail SMTP.
3. **Login**: Backend kiểm tra mật khẩu đã hash và trả về JWT.
4. **Authorization**: Các API ghi chú, nhãn, profile yêu cầu token hợp lệ.
5. **Password Recovery**: Người dùng có thể đặt lại mật khẩu bằng link token hoặc OTP gửi qua email.

---

## 🧠 Main Modules

### Authentication

- Đăng ký / đăng nhập
- Xác thực email
- Gửi lại email kích hoạt
- Quên mật khẩu bằng OTP/token
- Đổi mật khẩu khi đã đăng nhập
- Cập nhật profile và màu avatar

### Notes

- Tạo, sửa, xóa ghi chú
- Ghim ghi chú
- Khóa ghi chú bằng mật khẩu
- Upload nhiều ảnh
- Auto save
- Theo dõi người chỉnh sửa gần nhất

### Sharing

- Chia sẻ ghi chú qua email
- Quyền `read`
- Quyền `edit`
- Hủy chia sẻ ghi chú

### UI / UX

- Dark mode / light mode
- Modal popup
- Toast notification
- SweetAlert2
- Responsive layout
- Offline page và service worker

---

## 🛠️ Troubleshooting

- **Không kết nối được database**: Kiểm tra SQL Server đã chạy, `DB_SERVER`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` trong `.env` đã đúng chưa.
- **Đăng nhập SQL Server lỗi**: Đảm bảo đã bật `SQL Server and Windows Authentication mode` và enable tài khoản `sa`.
- **Không nhận email OTP**: Kiểm tra Gmail đã bật 2FA, dùng App Password, và điền đúng `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.
- **Upload ảnh lỗi**: Chỉ upload các định dạng `jpg`, `jpeg`, `png`, `webp`, `gif`; mỗi file tối đa 5MB.
- **Cổng 8080 đã được dùng**: Đổi `PORT` trong `.env`, đồng thời đổi `APP_BASE_URL` theo cổng mới.

---

## 🌍 Online Deployment

Frontend deployment:

```text
https://note-app-two-vert.vercel.app/
```

---

## 🛡️ Security Notes

- Mật khẩu người dùng được hash trước khi lưu.
- API quan trọng được bảo vệ bằng JWT.
- File `.env` không nên commit lên Git.
- Token/OTP đặt lại mật khẩu có thời hạn.
- Ghi chú có thể khóa bằng mật khẩu riêng.

---

*Final Project - Software Engineering*
