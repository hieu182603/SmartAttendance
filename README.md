# SmartAttendance (PNPM Monorepo)

Dự án này đã được cấu trúc lại theo mô hình **Monorepo** sử dụng **PNPM Workspace**. Hệ thống bao gồm 3 thành phần chính được phân chia rõ ràng:
- **Frontend (Web)**: Nằm tại `apps/web` (React + Vite)
- **Backend API**: Nằm tại `packages/backend` (Node.js + Express)
- **AI Service**: Nằm tại `packages/ai-service` (Python + FastAPI)
- **Shared Package**: Nằm tại `packages/shared` (Chứa các Type, Constants, và Zod Schema dùng chung để đồng bộ dữ liệu giữa Web và Backend)

---

## 🛠 1. Yêu cầu hệ thống
- **Node.js**: Phiên bản 20.x trở lên.
- **PNPM**: Trình quản lý package chính. Nếu chưa có, hãy cài đặt bằng lệnh: `npm install -g pnpm`
- **Python**: Phiên bản 3.10+ (Dành cho AI Service).

---

## 🚀 2. Cài đặt ban đầu (Chỉ chạy 1 lần)

### Bước 1: Cài đặt dependencies cho hệ sinh thái Node.js
Mở terminal tại thư mục gốc của dự án (`e:\OJT\SmartAttendance`) và chạy:
```bash
pnpm install
```
*(Lệnh này sẽ tự động cài package cho tất cả các thư mục con và build biên dịch sẵn package `shared`).*

### Bước 2: Cài đặt môi trường cho AI Service
Mở một terminal khác, di chuyển vào thư mục AI và chạy file cài đặt tự động:
```bash
cd packages/ai-service
setup.bat
cd ../..
```

### Bước 3: Thiết lập các biến môi trường (.env)
Dự án có 3 nơi chứa cấu hình riêng biệt. Bạn cần sao chép nội dung từ file `.env.example` thành file `.env` tương ứng tại:
1. `apps/web/.env`
2. `packages/backend/.env`
3. `packages/ai-service/.env`

*(Lưu ý: Điền các thông số kết nối Database, Redis, Gemini API Key tương ứng của bạn vào các file này).*

---

## 🏃 3. Hướng dẫn khởi chạy dự án (Môi trường Dev)

Từ thư mục gốc của dự án (`e:\OJT\SmartAttendance`), bạn hãy mở **3 Tab Terminal** khác nhau và chạy lần lượt các lệnh sau:

### 🌐 Terminal 1 - Chạy Frontend Web
```bash
pnpm run dev:web
```

### ⚙️ Terminal 2 - Chạy Backend API
```bash
pnpm run dev:backend
```

### 🤖 Terminal 3 - Chạy AI Service
```bash
pnpm run dev:ai
```
*(Lưu ý: Nếu lệnh `dev:ai` báo lỗi do Windows không tự nhận môi trường ảo, bạn có thể khởi động AI Service thủ công bằng cách sau:)*
```bash
cd packages/ai-service
.\venv\Scripts\activate
set DEV_MODE=true
python run.py
```

---

## 🧪 4. Các lệnh quản lý hữu ích khác
Đứng từ thư mục gốc, pnpm hỗ trợ chạy các script đồng loạt trên toàn bộ Workspace:
- `pnpm run build:all` : Build phiên bản Production cho tất cả dự án.
- `pnpm run test` : Chạy toàn bộ Test case (Unit/Integration Test) của hệ thống.
- `pnpm run lint` : Kiểm tra chuẩn format code (ESLint) cho toàn cục.
