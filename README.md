# SmartAttendance

1. Tạo file `.env` ở từng folder `backend`, `frontend`, và `ai-service`.
2. Copy paste nội dung của file `.env.example` tương ứng vào.
   - Lưu ý: nếu có thêm key ở `.env` nhớ paste vào `.env.example`.
3. Thêm các value vào key tương ứng (tuỳ chọn).

4. Chạy từng service riêng lẻ:
# Terminal 1 - Backend
cd backend && yarn dev

# Terminal 2 - Frontend  
cd frontend && yarn dev

# Terminal 3 - AI Service
    python -m venv venv
   .\venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   set DEV_MODE=true
   python run.py
