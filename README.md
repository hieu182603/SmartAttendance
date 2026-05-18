# SmartAttendance (PNPM Monorepo)

Dự án này đã được cấu trúc lại theo mô hình **Monorepo** sử dụng **PNPM Workspace**. Hệ thống bao gồm 3 thành phần chính được phân chia rõ ràng:
- **Frontend (Web)**: Nằm tại `apps/web` (React + Vite)
- **Mobile App**: Nằm tại `apps/mobile` (React Native + Expo)
- **Backend API**: Nằm tại `packages/backend` (Node.js + Express)
- **AI Service**: Nằm tại `packages/ai-service` (Python + FastAPI)
- **Shared Package**: Nằm tại `packages/shared` (Chứa các Type, Constants, và Zod Schema dùng chung để đồng bộ dữ liệu giữa Web, Mobile và Backend)

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

### 📱 Terminal 4 - Chạy Mobile App (Android)

> **Yêu cầu:** Android Emulator đang chạy **hoặc** thiết bị Android kết nối qua USB (USB Debugging bật).

**Lần đầu tiên** (tạo thư mục `android/` từ cấu hình Expo):
```bash
cd apps/mobile
pnpm exec expo prebuild --platform android --no-install
cd ../..
```

**Chạy app (kết nối tới backend fly.dev — mặc định):**
```bash
pnpm --filter @smartattendance/mobile android
```

**Chạy app kết nối tới backend local** (Terminal 2 đang chạy ở port 4000):
1. Mở file `apps/mobile/.env`, thay đổi:
   ```
   EXPO_PUBLIC_API_URL=http://10.0.2.2:4000/api
   ```
2. Chạy lại lệnh android ở trên.

> **Lưu ý:** `10.0.2.2` là địa chỉ đặc biệt của Android Emulator trỏ về `localhost` của máy host. Nếu dùng thiết bị thật kết nối cùng WiFi, thay bằng IP LAN của máy (vd: `192.168.1.x`).

Metro Bundler sẽ mở và giữ kết nối để hỗ trợ **Hot Reload** trong quá trình phát triển.

---

## 🧪 4. Hướng dẫn chạy Test

Hệ thống bao gồm nhiều cấp độ test cho từng phần của ứng dụng:

### 4.1. Backend Unit/Integration Test (Jest)
Không cần kết nối Database thật vì sử dụng `mongodb-memory-server`.
```bash
# Đứng từ thư mục gốc
pnpm run test

# Hoặc chạy riêng biệt
cd packages/backend
pnpm test
```

### 4.2. Frontend Web E2E Test (Playwright)
**Yêu cầu bắt buộc:** Backend phải đang chạy và DB đã được đưa dữ liệu mẫu (Seed).

**Bước 1: Seed dữ liệu mẫu (Chỉ cần làm 1 lần)**
```bash
cd packages/backend
node scripts/seed.js
```
*(Tài khoản seed mặc định: `admin@smartattendance.com` / `manager...` / `hr...` / `employee.0001...` - Mật khẩu chung: `SmartAttendance@2026!`)*

**Bước 2: Cấu hình biến môi trường E2E**
```bash
cd apps/web
cp e2e/env.example .env.test
```

**Bước 3: Chạy Test (Terminal 1 chạy backend, Terminal 2 chạy test)**
```bash
# Cài đặt browser (chỉ lần đầu)
npx playwright install

# Chạy test ngầm
npx playwright test

# Chạy test với giao diện trực quan
npx playwright test --ui
```

### 4.3. Mobile App Unit Test (Jest)
```bash
cd apps/mobile
npm test
```

---

## 🛠 5. Các lệnh quản lý hữu ích khác
Đứng từ thư mục gốc, pnpm hỗ trợ chạy các script đồng loạt:
- `pnpm run build:all` : Build phiên bản Production cho tất cả dự án.
- `pnpm run lint` : Kiểm tra chuẩn format code (ESLint) cho toàn cục.
