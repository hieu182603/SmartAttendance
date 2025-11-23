# SMART ATTENDANCE SYSTEM - USE CASE FLOW DIAGRAM

## TỔNG QUAN HỆ THỐNG

Hệ thống Smart Attendance quản lý chấm công với các role:
- **SUPER_ADMIN**: Quản trị viên cấp cao nhất
- **ADMIN**: Quản trị viên hệ thống
- **HR_MANAGER**: Quản lý nhân sự
- **MANAGER**: Quản lý phòng ban
- **EMPLOYEE**: Nhân viên

---

## 1. FLOW USE CASE CHO EMPLOYEE (NHÂN VIÊN)

### 1.1. ĐĂNG KÝ TÀI KHOẢN
**Actor**: Employee (Chưa có tài khoản)

**Flow chi tiết**:
```
1. Truy cập Landing Page (/)
   └─> Xem thông tin hệ thống
   └─> Click "Đăng ký ngay"

2. Trang Đăng ký (/register)
   ├─> Nhập thông tin:
   │   ├─> Email
   │   ├─> Mật khẩu
   │   ├─> Xác nhận mật khẩu
   │   └─> Họ và tên
   ├─> Click "Đăng ký"
   └─> Hệ thống gửi OTP qua email

3. Trang Xác thực OTP (/verify-otp)
   ├─> Nhập mã OTP 6 số
   ├─> Click "Xác thực OTP"
   ├─> Hệ thống kiểm tra OTP
   └─> [Success] → Redirect đến /employee
       [Fail] → Hiển thị lỗi, yêu cầu nhập lại
```

### 1.2. ĐĂNG NHẬP
**Actor**: Employee (Đã có tài khoản)

**Flow chi tiết**:
```
1. Truy cập Landing Page (/)
   └─> Click "Đăng nhập"

2. Trang Đăng nhập (/login)
   ├─> Nhập Email
   ├─> Nhập Mật khẩu
   ├─> [Optional] Check "Ghi nhớ đăng nhập"
   └─> Click "Đăng nhập"

3. Hệ thống xác thực
   ├─> [Success] → Lưu token → Redirect đến /employee
   └─> [Fail] → Hiển thị lỗi "Email hoặc mật khẩu không đúng"
```

### 1.3. QUẢN LÝ CHẤM CÔNG

#### 1.3.1. Chấm công bằng QR Code
**Flow chi tiết**:
```
1. Vào trang Dashboard (/employee)
   └─> Click menu "Quét QR" hoặc truy cập /employee/scan

2. Trang Quét QR (/employee/scan)
   ├─> Hệ thống yêu cầu quyền truy cập camera
   ├─> [Grant] → Hiển thị camera
   │   ├─> Quét QR code tại vị trí làm việc
   │   ├─> Hệ thống xác minh:
   │   │   ├─> QR code hợp lệ?
   │   │   ├─> Vị trí GPS đúng?
   │   │   └─> Thời gian trong ca làm việc?
   │   └─> [Success] → Lưu attendance record
   │       └─> Hiển thị thông báo "Chấm công thành công"
   └─> [Deny] → Hiển thị hướng dẫn bật camera
```

#### 1.3.2. Chấm công bằng Camera (Face Recognition)
**Flow chi tiết**:
```
1. Vào trang Dashboard (/employee)
   └─> Click menu "Camera Check-in" hoặc /employee/camera-checkin

2. Trang Camera Check-in (/employee/camera-checkin)
   ├─> Hệ thống yêu cầu quyền truy cập camera
   ├─> [Grant] → Hiển thị camera
   │   ├─> Đưa khuôn mặt vào khung
   │   ├─> Hệ thống nhận diện khuôn mặt
   │   ├─> Xác minh:
   │   │   ├─> Khuôn mặt khớp với tài khoản?
   │   │   ├─> Vị trí GPS đúng?
   │   │   └─> Thời gian trong ca làm việc?
   │   └─> [Success] → Lưu attendance record
   │       └─> Hiển thị thông báo "Chấm công thành công"
   └─> [Deny] → Hiển thị hướng dẫn bật camera
```

### 1.4. XEM LỊCH SỬ CHẤM CÔNG
**Flow chi tiết**:
```
1. Vào trang Dashboard (/employee)
   └─> Click menu "Lịch sử" hoặc /employee/history

2. Trang Lịch sử (/employee/history)
   ├─> Hiển thị danh sách attendance records
   ├─> Filter theo:
   │   ├─> Tháng/Năm
   │   ├─> Loại (Check-in/Check-out)
   │   └─> Trạng thái (Đúng giờ/Trễ/Sớm)
   ├─> Xem chi tiết từng record:
   │   ├─> Thời gian
   │   ├─> Vị trí (GPS)
   │   ├─> Phương thức (QR/Camera)
   │   └─> Ghi chú
   └─> Export báo cáo (nếu có)
```

### 1.5. XEM LỊCH LÀM VIỆC
**Flow chi tiết**:
```
1. Vào trang Dashboard (/employee)
   └─> Click menu "Lịch làm việc" hoặc /employee/schedule

2. Trang Lịch làm việc (/employee/schedule)
   ├─> Hiển thị lịch làm việc theo:
   │   ├─> Tuần
   │   ├─> Tháng
   │   └─> Năm
   ├─> Xem thông tin:
   │   ├─> Ca làm việc (Shift)
   │   ├─> Giờ vào/ra
   │   ├─> Ngày nghỉ
   │   └─> Ngày lễ
   └─> [Optional] Export lịch
```

### 1.6. QUẢN LÝ YÊU CẦU NGHỈ PHÉP
**Flow chi tiết**:
```
1. Vào trang Dashboard (/employee)
   └─> Click menu "Yêu cầu" hoặc /employee/requests

2. Trang Yêu cầu (/employee/requests)
   ├─> Tab "Yêu cầu của tôi"
   │   ├─> Xem danh sách yêu cầu đã gửi
   │   ├─> Filter theo trạng thái:
   │   │   ├─> Pending (Chờ duyệt)
   │   │   ├─> Approved (Đã duyệt)
   │   │   └─> Rejected (Từ chối)
   │   └─> Xem chi tiết từng yêu cầu
   │
   └─> Tab "Tạo yêu cầu mới"
       ├─> Click "Tạo yêu cầu mới"
       ├─> Form tạo yêu cầu:
       │   ├─> Loại nghỉ phép:
       │   │   ├─> Nghỉ phép năm (Annual)
       │   │   ├─> Nghỉ ốm (Sick)
       │   │   ├─> Nghỉ không lương (Unpaid)
       │   │   ├─> Nghỉ bù (Compensatory)
       │   │   └─> Nghỉ thai sản (Maternity)
       │   ├─> Ngày bắt đầu
       │   ├─> Ngày kết thúc
       │   ├─> Số ngày
       │   ├─> Lý do
       │   └─> File đính kèm (nếu có)
       ├─> Click "Gửi yêu cầu"
       └─> [Success] → Hiển thị thông báo "Yêu cầu đã được gửi"
           └─> Yêu cầu chuyển sang trạng thái "Pending"
```

### 1.7. XEM SỐ NGÀY PHÉP
**Flow chi tiết**:
```
1. Vào trang Dashboard (/employee)
   └─> Click menu "Số ngày phép" hoặc /employee/leave-balance

2. Trang Số ngày phép (/employee/leave-balance)
   ├─> Hiển thị tổng quan:
   │   ├─> Nghỉ phép năm:
   │   │   ├─> Tổng: X ngày
   │   │   ├─> Đã dùng: Y ngày
   │   │   ├─> Còn lại: Z ngày
   │   │   └─> Đang chờ: W ngày
   │   ├─> Nghỉ ốm: (tương tự)
   │   ├─> Nghỉ không lương: (tương tự)
   │   ├─> Nghỉ bù: (tương tự)
   │   └─> Nghỉ thai sản: (tương tự)
   └─> Xem lịch sử sử dụng phép
```

### 1.8. QUẢN LÝ HỒ SƠ CÁ NHÂN
**Flow chi tiết**:
```
1. Vào trang Dashboard (/employee)
   └─> Click menu "Hồ sơ" hoặc /employee/profile

2. Trang Hồ sơ (/employee/profile)
   ├─> Tab "Thông tin"
   │   ├─> Xem thông tin:
   │   │   ├─> Họ và tên
   │   │   ├─> Email
   │   │   ├─> Số điện thoại
   │   │   ├─> Địa chỉ
   │   │   ├─> Ngày sinh
   │   │   ├─> Phòng ban
   │   │   ├─> Chức vụ
   │   │   ├─> Số tài khoản ngân hàng
   │   │   └─> Tên ngân hàng
   │   ├─> Click "Chỉnh sửa"
   │   ├─> Cập nhật thông tin (trừ Email, Phòng ban, Chức vụ)
   │   └─> Click "Lưu"
   │
   ├─> Tab "Bảo mật"
   │   ├─> Đổi mật khẩu:
   │   │   ├─> Nhập mật khẩu hiện tại
   │   │   ├─> Nhập mật khẩu mới
   │   │   ├─> Xác nhận mật khẩu mới
   │   │   └─> Click "Cập nhật mật khẩu"
   │
   └─> Tab "Cài đặt"
       ├─> Chế độ tối/sáng
       ├─> Ngôn ngữ (Tiếng Việt/English)
       └─> Cài đặt thông báo:
           ├─> Email notifications
           ├─> Push notifications
           └─> SMS notifications
```

### 1.9. XEM THÔNG BÁO
**Flow chi tiết**:
```
1. Vào trang Dashboard (/employee)
   └─> Click icon chuông thông báo hoặc /employee/notifications

2. Trang Thông báo (/employee/notifications)
   ├─> Hiển thị danh sách thông báo:
   │   ├─> Chưa đọc (highlight)
   │   └─> Đã đọc
   ├─> Filter theo:
   │   ├─> Tất cả
   │   ├─> Chưa đọc
   │   └─> Loại thông báo
   ├─> Click vào thông báo để xem chi tiết
   └─> Đánh dấu đã đọc
```

---

## 2. FLOW USE CASE CHO MANAGER (QUẢN LÝ PHÒNG BAN)

### 2.1. ĐĂNG NHẬP
**Flow**: Tương tự Employee (1.2)

### 2.2. XEM DASHBOARD TỔNG QUAN
**Flow chi tiết**:
```
1. Vào trang Dashboard (/employee)
   └─> Hiển thị Overview với thông tin:
       ├─> Thống kê nhân viên trong phòng ban:
       │   ├─> Tổng số nhân viên
       │   ├─> Số người đang làm việc
       │   ├─> Số người nghỉ phép
       │   └─> Tỷ lệ chấm công đúng giờ
       ├─> Biểu đồ attendance theo ngày/tuần/tháng
       └─> Danh sách yêu cầu nghỉ phép cần duyệt
```

### 2.3. DUYỆT YÊU CẦU NGHỈ PHÉP
**Flow chi tiết**:
```
1. Vào trang Dashboard (/employee)
   └─> Click menu "Yêu cầu" hoặc /employee/requests

2. Trang Yêu cầu (/employee/requests)
   ├─> Tab "Yêu cầu cần duyệt"
   │   ├─> Hiển thị danh sách yêu cầu từ nhân viên trong phòng ban
   │   ├─> Filter theo:
   │   │   ├─> Trạng thái (Pending)
   │   │   ├─> Loại nghỉ phép
   │   │   └─> Nhân viên
   │   ├─> Click vào yêu cầu để xem chi tiết:
   │   │   ├─> Thông tin nhân viên
   │   │   ├─> Loại nghỉ phép
   │   │   ├─> Ngày bắt đầu/kết thúc
   │   │   ├─> Số ngày
   │   │   ├─> Lý do
   │   │   └─> Số ngày phép còn lại
   │   └─> Thực hiện hành động:
   │       ├─> Click "Duyệt"
   │       │   └─> [Optional] Nhập ghi chú
   │       │   └─> Xác nhận → Yêu cầu chuyển sang "Approved"
   │       └─> Click "Từ chối"
   │           └─> Nhập lý do từ chối
   │           └─> Xác nhận → Yêu cầu chuyển sang "Rejected"
   │
   └─> Tab "Lịch sử duyệt"
       └─> Xem tất cả yêu cầu đã duyệt/từ chối
```

### 2.4. XEM BÁO CÁO PHÒNG BAN
**Flow chi tiết**:
```
1. Vào trang Dashboard (/employee)
   └─> Xem các báo cáo:
       ├─> Báo cáo chấm công phòng ban:
       │   ├─> Tỷ lệ chấm công đúng giờ
       │   ├─> Số lần đi muộn/về sớm
       │   └─> Thống kê theo nhân viên
       ├─> Báo cáo nghỉ phép:
       │   ├─> Tổng số ngày nghỉ
       │   ├─> Phân loại theo loại nghỉ
       │   └─> Xu hướng theo tháng
       └─> Export báo cáo (PDF/Excel)
```

### 2.5. QUẢN LÝ LỊCH LÀM VIỆC PHÒNG BAN
**Flow chi tiết**:
```
1. Vào trang Dashboard (/employee)
   └─> Click menu "Lịch làm việc" hoặc /employee/schedule

2. Trang Lịch làm việc (/employee/schedule)
   ├─> Xem lịch làm việc của tất cả nhân viên trong phòng ban
   ├─> Filter theo:
   │   ├─> Nhân viên
   │   ├─> Tháng/Năm
   │   └─> Ca làm việc
   └─> [Optional] Chỉnh sửa lịch (nếu có quyền)
```

### 2.6. CÁC CHỨC NĂNG KHÁC
- Xem lịch sử chấm công (tương tự Employee)
- Quản lý hồ sơ cá nhân (tương tự Employee)
- Xem thông báo (tương tự Employee)

---

## 3. FLOW USE CASE CHO HR_MANAGER (QUẢN LÝ NHÂN SỰ)

### 3.1. ĐĂNG NHẬP
**Flow**: Tương tự Employee (1.2)

### 3.2. QUẢN LÝ NHÂN VIÊN
**Flow chi tiết**:
```
1. Vào trang Dashboard (/employee)
   └─> Click menu "Quản lý nhân viên" (nếu có)

2. Trang Quản lý nhân viên
   ├─> Xem danh sách tất cả nhân viên
   ├─> Filter theo:
   │   ├─> Phòng ban
   │   ├─> Chi nhánh
   │   ├─> Trạng thái (Active/Inactive)
   │   └─> Role
   ├─> Tìm kiếm theo tên/email
   ├─> Xem chi tiết nhân viên:
   │   ├─> Thông tin cá nhân
   │   ├─> Lịch sử chấm công
   │   ├─> Lịch sử nghỉ phép
   │   └─> Số ngày phép
   └─> Thực hiện hành động:
       ├─> Chỉnh sửa thông tin nhân viên
       ├─> Thay đổi phòng ban/chi nhánh
       ├─> Cập nhật số ngày phép
       ├─> Kích hoạt/Vô hiệu hóa tài khoản
       └─> Reset mật khẩu
```

### 3.3. DUYỆT YÊU CẦU NGHỈ PHÉP
**Flow**: Tương tự Manager (2.3), nhưng có thể duyệt yêu cầu từ tất cả phòng ban

### 3.4. QUẢN LÝ SỐ NGÀY PHÉP
**Flow chi tiết**:
```
1. Vào trang Dashboard (/employee)
   └─> Click menu "Quản lý phép" (nếu có)

2. Trang Quản lý phép
   ├─> Xem tổng quan số ngày phép của tất cả nhân viên
   ├─> Cập nhật số ngày phép cho nhân viên:
   │   ├─> Chọn nhân viên
   │   ├─> Chọn loại phép
   │   ├─> Nhập số ngày mới
   │   └─> Lưu
   └─> Xem báo cáo sử dụng phép
```

### 3.5. XEM BÁO CÁO TỔNG HỢP
**Flow chi tiết**:
```
1. Vào trang Dashboard (/employee)
   └─> Xem các báo cáo:
       ├─> Báo cáo chấm công toàn công ty:
       │   ├─> Tỷ lệ chấm công đúng giờ
       │   ├─> Thống kê theo phòng ban
       │   └─> Xu hướng theo thời gian
       ├─> Báo cáo nghỉ phép:
       │   ├─> Tổng số ngày nghỉ
       │   ├─> Phân loại theo loại nghỉ
       │   └─> So sánh giữa các phòng ban
       └─> Export báo cáo (PDF/Excel)
```

### 3.6. CÁC CHỨC NĂNG KHÁC
- Tất cả chức năng của Manager và Employee

---

## 4. FLOW USE CASE CHO ADMIN (QUẢN TRỊ VIÊN)

### 4.1. ĐĂNG NHẬP
**Flow**: Tương tự Employee (1.2)

### 4.2. QUẢN LÝ HỆ THỐNG

#### 4.2.1. Quản lý người dùng
**Flow**: Tương tự HR_MANAGER (3.2), nhưng có thể:
- Tạo tài khoản mới
- Phân quyền role
- Xóa tài khoản

#### 4.2.2. Quản lý chi nhánh (Locations)
**Flow chi tiết**:
```
1. Vào trang Dashboard (/employee)
   └─> Click menu "Quản lý chi nhánh" (nếu có)

2. Trang Quản lý chi nhánh
   ├─> Xem danh sách chi nhánh
   ├─> Tạo chi nhánh mới:
   │   ├─> Nhập tên chi nhánh
   │   ├─> Nhập địa chỉ
   │   ├─> Nhập tọa độ GPS
   │   └─> Lưu
   ├─> Chỉnh sửa chi nhánh
   └─> Xóa chi nhánh
```

#### 4.2.3. Quản lý ca làm việc (Shifts)
**Flow chi tiết**:
```
1. Vào trang Dashboard (/employee)
   └─> Click menu "Quản lý ca làm việc" (nếu có)

2. Trang Quản lý ca làm việc
   ├─> Xem danh sách ca làm việc
   ├─> Tạo ca làm việc mới:
   │   ├─> Nhập tên ca
   │   ├─> Nhập giờ vào
   │   ├─> Nhập giờ ra
   │   └─> Lưu
   ├─> Chỉnh sửa ca làm việc
   └─> Xóa ca làm việc
```

#### 4.2.4. Quản lý phòng ban (Departments)
**Flow chi tiết**:
```
1. Vào trang Dashboard (/employee)
   └─> Click menu "Quản lý phòng ban" (nếu có)

2. Trang Quản lý phòng ban
   ├─> Xem danh sách phòng ban
   ├─> Tạo phòng ban mới:
   │   ├─> Nhập tên phòng ban
   │   ├─> Chọn chi nhánh
   │   └─> Lưu
   ├─> Chỉnh sửa phòng ban
   └─> Xóa phòng ban
```

### 4.3. XEM BÁO CÁO HỆ THỐNG
**Flow**: Tương tự HR_MANAGER (3.5), nhưng có thêm:
- Báo cáo hoạt động hệ thống
- Báo cáo người dùng
- Audit logs

### 4.4. CÁC CHỨC NĂNG KHÁC
- Tất cả chức năng của HR_MANAGER, Manager và Employee

---

## 5. FLOW USE CASE CHO SUPER_ADMIN (QUẢN TRỊ VIÊN CẤP CAO)

### 5.1. ĐĂNG NHẬP
**Flow**: Tương tự Employee (1.2)

### 5.2. QUẢN LÝ TOÀN BỘ HỆ THỐNG
**Flow**: Tương tự ADMIN (4.2), nhưng có thêm:
- Quản lý ADMIN accounts
- Cấu hình hệ thống
- Xem audit logs toàn hệ thống

### 5.3. CÁC CHỨC NĂNG KHÁC
- Tất cả chức năng của ADMIN, HR_MANAGER, Manager và Employee

---

## 6. FLOW CHUNG - QUÊN MẬT KHẨU

### 6.1. YÊU CẦU RESET MẬT KHẨU
**Flow chi tiết**:
```
1. Trang Đăng nhập (/login)
   └─> Click "Quên mật khẩu?"

2. Trang Quên mật khẩu (/forgot-password)
   ├─> Nhập Email
   ├─> Click "Gửi mã OTP"
   └─> Hệ thống gửi OTP qua email

3. Trang Xác thực OTP (/verify-reset-otp)
   ├─> Nhập mã OTP 6 số
   ├─> Click "Xác thực OTP"
   └─> [Success] → Redirect đến /reset-password
       [Fail] → Hiển thị lỗi

4. Trang Đặt lại mật khẩu (/reset-password)
   ├─> Nhập mật khẩu mới
   ├─> Xác nhận mật khẩu mới
   ├─> Click "Đặt lại mật khẩu"
   └─> [Success] → Redirect đến /login
       [Fail] → Hiển thị lỗi
```

---

## 7. DIAGRAM FLOW TỔNG QUAN

### 7.1. Flow Đăng ký/Đăng nhập
```
[Landing Page]
    │
    ├─> [Register] → [Verify OTP] → [Dashboard]
    │
    └─> [Login] → [Dashboard]
```

### 7.2. Flow Chấm công
```
[Dashboard]
    │
    ├─> [Scan QR] → [Verify Location] → [Save Attendance] → [Success]
    │
    └─> [Camera Check-in] → [Face Recognition] → [Verify Location] → [Save Attendance] → [Success]
```

### 7.3. Flow Nghỉ phép
```
[Dashboard]
    │
    └─> [Create Request] → [Submit] → [Manager/HR Review] → [Approved/Rejected] → [Notification]
```

### 7.4. Flow Duyệt yêu cầu (Manager/HR)
```
[Dashboard]
    │
    └─> [View Requests] → [Review Details] → [Approve/Reject] → [Update Leave Balance] → [Notification]
```

---

## 8. BẢNG PHÂN QUYỀN CHỨC NĂNG

| Chức năng | EMPLOYEE | MANAGER | HR_MANAGER | ADMIN | SUPER_ADMIN |
|-----------|----------|---------|------------|-------|-------------|
| Chấm công (QR/Camera) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Xem lịch sử chấm công | ✅ (của mình) | ✅ (phòng ban) | ✅ (tất cả) | ✅ (tất cả) | ✅ (tất cả) |
| Tạo yêu cầu nghỉ phép | ✅ | ✅ | ✅ | ✅ | ✅ |
| Duyệt yêu cầu nghỉ phép | ❌ | ✅ (phòng ban) | ✅ (tất cả) | ✅ (tất cả) | ✅ (tất cả) |
| Xem số ngày phép | ✅ (của mình) | ✅ (phòng ban) | ✅ (tất cả) | ✅ (tất cả) | ✅ (tất cả) |
| Quản lý nhân viên | ❌ | ❌ | ✅ | ✅ | ✅ |
| Quản lý chi nhánh | ❌ | ❌ | ❌ | ✅ | ✅ |
| Quản lý ca làm việc | ❌ | ❌ | ❌ | ✅ | ✅ |
| Quản lý phòng ban | ❌ | ❌ | ❌ | ✅ | ✅ |
| Xem báo cáo | ❌ | ✅ (phòng ban) | ✅ (tất cả) | ✅ (tất cả) | ✅ (tất cả) |
| Quản lý hệ thống | ❌ | ❌ | ❌ | ✅ | ✅ |
| Quản lý ADMIN | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 9. HƯỚNG DẪN VẼ BIỂU ĐỒ

### 9.1. Use Case Diagram
- **Actors**: Vẽ các actor (Employee, Manager, HR_MANAGER, ADMIN, SUPER_ADMIN) ở bên trái
- **Use Cases**: Vẽ các use case (hình oval) ở giữa
- **System Boundary**: Vẽ hình chữ nhật bao quanh các use case
- **Relationships**: 
  - Vẽ đường thẳng từ actor đến use case (association)
  - Vẽ mũi tên <<include>> hoặc <<extend>> giữa các use case

### 9.2. Activity Diagram
- **Start Node**: Hình tròn đen
- **Activity**: Hình chữ nhật bo góc
- **Decision**: Hình thoi (có điều kiện Yes/No)
- **End Node**: Hình tròn đen có viền

### 9.3. Sequence Diagram
- **Actors/Objects**: Vẽ ở trên cùng
- **Lifeline**: Vẽ đường đứt nét xuống dưới
- **Messages**: Vẽ mũi tên ngang giữa các lifeline
- **Activation Box**: Vẽ hình chữ nhật trên lifeline khi object active

---

## 10. GHI CHÚ QUAN TRỌNG

1. **Authentication**: Tất cả các flow đều yêu cầu đăng nhập (trừ Landing Page, Register, Login)
2. **Authorization**: Mỗi role chỉ có quyền truy cập các chức năng được phân quyền
3. **Validation**: Tất cả input đều được validate ở cả frontend và backend
4. **Notifications**: Hệ thống gửi thông báo khi có sự kiện quan trọng (duyệt phép, chấm công, etc.)
5. **GPS Verification**: Chấm công yêu cầu xác minh vị trí GPS
6. **Face Recognition**: Chấm công bằng camera yêu cầu nhận diện khuôn mặt

---

**Tài liệu này có thể được sử dụng để vẽ các biểu đồ Use Case, Activity Diagram, Sequence Diagram cho hệ thống Smart Attendance.**

