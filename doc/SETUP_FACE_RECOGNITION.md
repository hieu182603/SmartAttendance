# 🚀 Hướng Dẫn Setup Face Recognition Feature

## ⚠️ QUAN TRỌNG: Bạn cần thêm các bước sau để chạy dự án với tính năng Face Recognition mới!

---

## 📋 BƯỚC 1: Cài Đặt Dependencies Mới

### Backend (Node.js)
```bash
cd backend
npm install form-data express-rate-limit axios
```

**Lý do:**
- `form-data`: Cần để gửi multipart/form-data requests đến AI service
- `express-rate-limit`: Cần để rate limiting cho face recognition endpoints
- `axios`: Cần để gửi HTTP requests đến AI service

### AI Service (Python)
```bash
cd ai-service

# Tạo virtual environment (khuyến nghị)
python -m venv venv

# Kích hoạt virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Cài đặt dependencies
pip install -r requirements.txt
```

**Lưu ý:** Lần đầu cài đặt InsightFace sẽ download model (~100MB), có thể mất vài phút.

---

## 📋 BƯỚC 2: Cấu Hình Environment Variables

### Backend (`backend/.env`)
Thêm các biến sau vào file `.env` của bạn (hoặc copy từ `env.example`):

```env
# AI Service Configuration
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_API_KEY=your-secret-api-key-here
ENABLE_FACE_RECOGNITION=true
FACE_VERIFICATION_THRESHOLD=0.6
AI_SERVICE_TIMEOUT=5000
```

**Lưu ý:** 
- `AI_SERVICE_API_KEY`: Tạo một API key ngẫu nhiên (ví dụ: dùng `openssl rand -hex 32`)
- Đảm bảo API key này khớp với AI service

### AI Service (`ai-service/.env`)
Tạo file `.env` trong thư mục `ai-service`:

```env
# Server Configuration
PORT=8000
HOST=0.0.0.0
LOG_LEVEL=INFO

# AI Model Configuration
MODEL_NAME=buffalo_l
DETECTION_THRESHOLD=0.5
VERIFICATION_THRESHOLD=0.6

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:4000,http://localhost:5173

# API Authentication
API_KEY=your-secret-api-key-here

# Face Registration Configuration
# These values must match across backend, frontend, and AI service
# Backend: backend/src/config/app.config.js (FACE_RECOGNITION_CONFIG)
# Frontend: Uses VITE_MIN_REGISTRATION_IMAGES and VITE_MAX_REGISTRATION_IMAGES env vars (defaults: 5, 10)
# AI Service: Uses MIN_REGISTRATION_IMAGES and MAX_REGISTRATION_IMAGES env vars (defaults: 5, 10)
MIN_REGISTRATION_IMAGES=5
MAX_REGISTRATION_IMAGES=10
```

**⚠️ QUAN TRỌNG:** `API_KEY` phải giống nhau ở cả Backend và AI Service!

---

## 📋 BƯỚC 3: Chạy Migration Script

Chạy migration để thêm field `faceData` cho các user hiện có:

```bash
cd backend
node scripts/migrateFaceData.js
```

**Kết quả mong đợi:**
```
🔄 Connecting to database...
✅ Database connected successfully
📋 Found X users to migrate...
✅ Migrated user: user@example.com
...
✅ Migration complete! Migrated X out of X users.
```

---

## 📋 BƯỚC 4: Khởi Động Services

### Terminal 1: Backend Server
```bash
cd backend
npm run dev
# hoặc
npm start
```

Backend sẽ chạy tại: `http://localhost:4000`

### Terminal 2: AI Service (Python)
```bash
cd ai-service

# Kích hoạt virtual environment nếu chưa
# Windows: venv\Scripts\activate
# Linux/Mac: source venv/bin/activate

# Chạy AI service
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

AI Service sẽ chạy tại: `http://localhost:8000`

**Lưu ý:** 
- Lần đầu khởi động, AI service sẽ download InsightFace model (~100MB), có thể mất 1-2 phút
- Bạn sẽ thấy log: `"Loading InsightFace model..."` và `"Model loaded successfully"`

### Terminal 3: Frontend (nếu chưa chạy)
```bash
cd frontend
npm run dev
```

---

## 📋 BƯỚC 5: Kiểm Tra Setup

### 1. Kiểm tra AI Service Health
```bash
curl http://localhost:8000/face/health
```

**Response mong đợi:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "service": "Face Recognition API",
  "version": "1.0.0"
}
```

### 2. Kiểm tra Backend API
Truy cập: `http://localhost:4000/api/docs`

Kiểm tra xem có endpoint `/api/face/status` và `/api/face/register` không.

### 3. Test Face Registration Flow
1. Đăng nhập vào frontend
2. Truy cập: `http://localhost:5173/employee/face-registration` (hoặc role tương ứng)
3. Chụp 5-7 ảnh khuôn mặt
4. Kiểm tra xem có upload thành công không

---

## 🔧 Xử Lý Lỗi Thường Gặp

### Lỗi: "Module 'form-data' not found"
```bash
cd backend
npm install form-data
```

### Lỗi: "Cannot find module 'express-rate-limit'"
```bash
cd backend
npm install express-rate-limit
```

### Lỗi: "AI Service connection refused"
- Đảm bảo AI service đã khởi động tại port 8000
- Kiểm tra `AI_SERVICE_URL` trong backend `.env`

### Lỗi: "Invalid API key"
- Đảm bảo `AI_SERVICE_API_KEY` trong backend `.env` khớp với `API_KEY` trong ai-service `.env`
- Hoặc tắt tạm thời authentication bằng cách để `API_KEY` rỗng (chỉ trong development!)

### Lỗi: "Model download failed"
- Kiểm tra kết nối internet (model sẽ được download tự động lần đầu)
- Hoặc download thủ công và đặt vào thư mục `ai-service/models/`

### Lỗi: "Face verification failed"
- Đảm bảo user đã đăng ký face trước khi check-in
- Kiểm tra ảnh có chất lượng tốt không (đủ sáng, khuôn mặt rõ ràng)

---

## ⚙️ Cấu Hình Tùy Chọn

### Tắt Face Recognition Tạm Thời (nếu cần)
Trong `backend/.env`:
```env
ENABLE_FACE_RECOGNITION=false
```

Backend vẫn chạy bình thường nhưng sẽ bỏ qua face verification.

### Thay Đổi Verification Threshold
```env
FACE_VERIFICATION_THRESHOLD=0.7  # Cao hơn = khắt khe hơn (0.5 - 0.9)
```

### Thay Đổi Số Lượng Ảnh Đăng Ký
**⚠️ QUAN TRỌNG:** Các giá trị này phải được cập nhật ở cả 3 nơi để đồng bộ:

1. **Backend** (`backend/.env`):
```env
MIN_REGISTRATION_IMAGES=5
MAX_REGISTRATION_IMAGES=10
```

2. **Frontend** (`frontend/.env`):
```env
VITE_MIN_REGISTRATION_IMAGES=5
VITE_MAX_REGISTRATION_IMAGES=10
```

3. **AI Service** (`ai-service/.env`):
```env
MIN_REGISTRATION_IMAGES=5
MAX_REGISTRATION_IMAGES=10
```

**Lưu ý:** Tất cả 3 giá trị phải giống nhau. Nếu thay đổi, hãy cập nhật cả 3 file và khởi động lại tất cả services.

---

## 📝 Checklist Trước Khi Chạy

- [ ] Đã cài `form-data` và `express-rate-limit` cho backend
- [ ] Đã cài dependencies cho AI service (`pip install -r requirements.txt`)
- [ ] Đã cấu hình `.env` cho cả backend và ai-service
- [ ] `API_KEY` khớp nhau ở cả 2 service
- [ ] Đã chạy migration script (`node scripts/migrateFaceData.js`)
- [ ] AI service đã khởi động và model đã load thành công
- [ ] Backend có thể kết nối đến AI service (check health endpoint)

---

## 🎯 Sau Khi Setup Xong

1. **Test đăng ký face:** `/employee/face-registration`
2. **Test check-in với face verification:** `/employee/scan`
3. **Kiểm tra logs** nếu có lỗi

Nếu mọi thứ hoạt động, bạn đã sẵn sàng sử dụng tính năng Face Recognition! 🎉

