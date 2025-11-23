# USE CASE DIAGRAM - ROLE EMPLOYEE

## 📊 MÔ TẢ TỔNG QUAN

Use Case Diagram cho role **EMPLOYEE** trong hệ thống Smart Attendance, mô tả tất cả các chức năng mà nhân viên có thể thực hiện trong hệ thống.

---

## 🎯 ACTOR

**EMPLOYEE** (Nhân viên)
- Mô tả: Người dùng có vai trò nhân viên trong hệ thống
- Ký hiệu: Hình người que (stick figure) ở bên trái diagram

---

## 📦 SYSTEM BOUNDARY

**Smart Attendance System**
- Ký hiệu: Hình chữ nhật lớn bao quanh tất cả các use case
- Tên hệ thống: "Smart Attendance System"

---

## 🔵 USE CASES (Các chức năng)

### 1. Authentication & Account Management

#### UC-01: Đăng ký tài khoản (Register Account)
- **Mô tả**: Nhân viên đăng ký tài khoản mới
- **Precondition**: Chưa có tài khoản
- **Postcondition**: Tài khoản được tạo, chờ xác thực OTP
- **Relationships**: 
  - <<include>> Verify OTP

#### UC-02: Xác thực OTP (Verify OTP)
- **Mô tả**: Xác thực mã OTP sau khi đăng ký
- **Precondition**: Đã đăng ký, nhận được OTP qua email
- **Postcondition**: Tài khoản được kích hoạt
- **Relationships**: 
  - <<include>> trong Register Account

#### UC-03: Đăng nhập (Login)
- **Mô tả**: Nhân viên đăng nhập vào hệ thống
- **Precondition**: Đã có tài khoản và đã xác thực
- **Postcondition**: Đăng nhập thành công, vào Dashboard
- **Relationships**: 
  - <<include>> View Dashboard

#### UC-04: Quên mật khẩu (Forgot Password)
- **Mô tả**: Yêu cầu reset mật khẩu khi quên
- **Precondition**: Đã có tài khoản
- **Postcondition**: Nhận OTP để reset mật khẩu
- **Relationships**: 
  - <<include>> Verify Reset OTP
  - <<include>> Reset Password

#### UC-05: Xác thực OTP Reset (Verify Reset OTP)
- **Mô tả**: Xác thực OTP để reset mật khẩu
- **Precondition**: Đã yêu cầu reset mật khẩu
- **Postcondition**: Được phép đặt lại mật khẩu
- **Relationships**: 
  - <<include>> trong Forgot Password

#### UC-06: Đặt lại mật khẩu (Reset Password)
- **Mô tả**: Đặt mật khẩu mới sau khi xác thực OTP
- **Precondition**: Đã xác thực OTP reset
- **Postcondition**: Mật khẩu mới được lưu
- **Relationships**: 
  - <<include>> trong Forgot Password

---

### 2. Attendance Management

#### UC-07: Chấm công bằng QR Code (Check-in with QR Code)
- **Mô tả**: Chấm công bằng cách quét QR code
- **Precondition**: Đã đăng nhập, có quyền truy cập camera
- **Postcondition**: Attendance record được lưu
- **Relationships**: 
  - <<include>> Verify GPS Location
  - <<include>> Save Attendance Record
  - <<extend>> View Attendance Success

#### UC-08: Chấm công bằng Camera (Check-in with Camera)
- **Mô tả**: Chấm công bằng nhận diện khuôn mặt
- **Precondition**: Đã đăng nhập, có quyền truy cập camera
- **Postcondition**: Attendance record được lưu
- **Relationships**: 
  - <<include>> Face Recognition
  - <<include>> Verify GPS Location
  - <<include>> Save Attendance Record
  - <<extend>> View Attendance Success

#### UC-09: Xác minh vị trí GPS (Verify GPS Location)
- **Mô tả**: Xác minh vị trí GPS khi chấm công
- **Precondition**: Đang thực hiện chấm công
- **Postcondition**: Vị trí được xác minh
- **Relationships**: 
  - <<include>> trong Check-in with QR Code và Check-in with Camera

#### UC-10: Nhận diện khuôn mặt (Face Recognition)
- **Mô tả**: Nhận diện khuôn mặt để xác thực
- **Precondition**: Đang thực hiện chấm công bằng camera
- **Postcondition**: Khuôn mặt được xác thực
- **Relationships**: 
  - <<include>> trong Check-in with Camera

#### UC-11: Lưu bản ghi chấm công (Save Attendance Record)
- **Mô tả**: Lưu thông tin chấm công vào database
- **Precondition**: Đã xác minh GPS và (QR hoặc Face)
- **Postcondition**: Attendance record được lưu
- **Relationships**: 
  - <<include>> trong Check-in with QR Code và Check-in with Camera

#### UC-12: Xem thông báo chấm công thành công (View Attendance Success)
- **Mô tả**: Hiển thị thông báo sau khi chấm công thành công
- **Precondition**: Chấm công thành công
- **Postcondition**: Thông báo được hiển thị
- **Relationships**: 
  - <<extend>> từ Check-in with QR Code và Check-in with Camera

---

### 3. View & History

#### UC-13: Xem Dashboard (View Dashboard)
- **Mô tả**: Xem trang tổng quan sau khi đăng nhập
- **Precondition**: Đã đăng nhập
- **Postcondition**: Dashboard được hiển thị
- **Relationships**: 
  - <<include>> trong Login

#### UC-14: Xem lịch sử chấm công (View Attendance History)
- **Mô tả**: Xem lịch sử các lần chấm công
- **Precondition**: Đã đăng nhập
- **Postcondition**: Danh sách lịch sử được hiển thị
- **Relationships**: 
  - <<include>> Filter Attendance History
  - <<include>> Export Attendance Report

#### UC-15: Lọc lịch sử chấm công (Filter Attendance History)
- **Mô tả**: Lọc lịch sử theo tháng, loại, trạng thái
- **Precondition**: Đang xem lịch sử chấm công
- **Postcondition**: Danh sách được lọc
- **Relationships**: 
  - <<include>> trong View Attendance History

#### UC-16: Xuất báo cáo chấm công (Export Attendance Report)
- **Mô tả**: Xuất báo cáo lịch sử chấm công ra file
- **Precondition**: Đang xem lịch sử chấm công
- **Postcondition**: File báo cáo được tạo
- **Relationships**: 
  - <<include>> trong View Attendance History

#### UC-17: Xem lịch làm việc (View Work Schedule)
- **Mô tả**: Xem lịch làm việc của bản thân
- **Precondition**: Đã đăng nhập
- **Postcondition**: Lịch làm việc được hiển thị
- **Relationships**: 
  - <<include>> Filter Work Schedule

#### UC-18: Lọc lịch làm việc (Filter Work Schedule)
- **Mô tả**: Lọc lịch theo tuần, tháng, năm
- **Precondition**: Đang xem lịch làm việc
- **Postcondition**: Lịch được lọc
- **Relationships**: 
  - <<include>> trong View Work Schedule

---

### 4. Leave Management

#### UC-19: Tạo yêu cầu nghỉ phép (Create Leave Request)
- **Mô tả**: Tạo yêu cầu nghỉ phép mới
- **Precondition**: Đã đăng nhập
- **Postcondition**: Yêu cầu được tạo và gửi đi
- **Relationships**: 
  - <<include>> Select Leave Type
  - <<include>> Fill Leave Request Form
  - <<include>> Submit Leave Request

#### UC-20: Chọn loại nghỉ phép (Select Leave Type)
- **Mô tả**: Chọn loại nghỉ phép (Annual, Sick, Unpaid, etc.)
- **Precondition**: Đang tạo yêu cầu nghỉ phép
- **Postcondition**: Loại nghỉ phép được chọn
- **Relationships**: 
  - <<include>> trong Create Leave Request

#### UC-21: Điền form yêu cầu nghỉ phép (Fill Leave Request Form)
- **Mô tả**: Điền thông tin chi tiết yêu cầu nghỉ phép
- **Precondition**: Đã chọn loại nghỉ phép
- **Postcondition**: Form được điền đầy đủ
- **Relationships**: 
  - <<include>> trong Create Leave Request

#### UC-22: Gửi yêu cầu nghỉ phép (Submit Leave Request)
- **Mô tả**: Gửi yêu cầu nghỉ phép để duyệt
- **Precondition**: Form đã được điền đầy đủ
- **Postcondition**: Yêu cầu được gửi, trạng thái "Pending"
- **Relationships**: 
  - <<include>> trong Create Leave Request

#### UC-23: Xem yêu cầu nghỉ phép (View Leave Requests)
- **Mô tả**: Xem danh sách các yêu cầu nghỉ phép đã gửi
- **Precondition**: Đã đăng nhập
- **Postcondition**: Danh sách yêu cầu được hiển thị
- **Relationships**: 
  - <<include>> Filter Leave Requests
  - <<include>> View Leave Request Details

#### UC-24: Lọc yêu cầu nghỉ phép (Filter Leave Requests)
- **Mô tả**: Lọc yêu cầu theo trạng thái, loại, thời gian
- **Precondition**: Đang xem danh sách yêu cầu
- **Postcondition**: Danh sách được lọc
- **Relationships**: 
  - <<include>> trong View Leave Requests

#### UC-25: Xem chi tiết yêu cầu nghỉ phép (View Leave Request Details)
- **Mô tả**: Xem thông tin chi tiết của một yêu cầu
- **Precondition**: Đang xem danh sách yêu cầu
- **Postcondition**: Chi tiết yêu cầu được hiển thị
- **Relationships**: 
  - <<include>> trong View Leave Requests

#### UC-26: Xem số ngày phép (View Leave Balance)
- **Mô tả**: Xem số ngày phép còn lại của các loại
- **Precondition**: Đã đăng nhập
- **Postcondition**: Số ngày phép được hiển thị
- **Relationships**: 
  - <<include>> View Leave Balance History

#### UC-27: Xem lịch sử sử dụng phép (View Leave Balance History)
- **Mô tả**: Xem lịch sử sử dụng các loại phép
- **Precondition**: Đang xem số ngày phép
- **Postcondition**: Lịch sử được hiển thị
- **Relationships**: 
  - <<include>> trong View Leave Balance

---

### 5. Profile Management

#### UC-28: Xem hồ sơ cá nhân (View Profile)
- **Mô tả**: Xem thông tin hồ sơ cá nhân
- **Precondition**: Đã đăng nhập
- **Postcondition**: Thông tin hồ sơ được hiển thị
- **Relationships**: 
  - <<include>> View Personal Information
  - <<include>> View Security Settings
  - <<include>> View App Settings

#### UC-29: Xem thông tin cá nhân (View Personal Information)
- **Mô tả**: Xem các thông tin cá nhân
- **Precondition**: Đang xem hồ sơ
- **Postcondition**: Thông tin được hiển thị
- **Relationships**: 
  - <<include>> trong View Profile

#### UC-30: Cập nhật thông tin cá nhân (Update Personal Information)
- **Mô tả**: Cập nhật thông tin cá nhân (tên, SĐT, địa chỉ, etc.)
- **Precondition**: Đang xem hồ sơ, click "Chỉnh sửa"
- **Postcondition**: Thông tin được cập nhật
- **Relationships**: 
  - <<extend>> từ View Personal Information

#### UC-31: Đổi mật khẩu (Change Password)
- **Mô tả**: Thay đổi mật khẩu tài khoản
- **Precondition**: Đang xem tab "Bảo mật" trong hồ sơ
- **Postcondition**: Mật khẩu mới được lưu
- **Relationships**: 
  - <<include>> trong View Security Settings

#### UC-32: Xem cài đặt bảo mật (View Security Settings)
- **Mô tả**: Xem các cài đặt bảo mật
- **Precondition**: Đang xem hồ sơ
- **Postcondition**: Cài đặt bảo mật được hiển thị
- **Relationships**: 
  - <<include>> trong View Profile

#### UC-33: Xem cài đặt ứng dụng (View App Settings)
- **Mô tả**: Xem các cài đặt ứng dụng (theme, language, notifications)
- **Precondition**: Đang xem hồ sơ
- **Postcondition**: Cài đặt được hiển thị
- **Relationships**: 
  - <<include>> trong View Profile

#### UC-34: Thay đổi theme (Change Theme)
- **Mô tả**: Chuyển đổi giữa chế độ tối/sáng
- **Precondition**: Đang xem cài đặt ứng dụng
- **Postcondition**: Theme được thay đổi
- **Relationships**: 
  - <<extend>> từ View App Settings

#### UC-35: Thay đổi ngôn ngữ (Change Language)
- **Mô tả**: Chọn ngôn ngữ hiển thị (Tiếng Việt/English)
- **Precondition**: Đang xem cài đặt ứng dụng
- **Postcondition**: Ngôn ngữ được thay đổi
- **Relationships**: 
  - <<extend>> từ View App Settings

#### UC-36: Cài đặt thông báo (Configure Notifications)
- **Mô tả**: Bật/tắt các loại thông báo (Email, Push, SMS)
- **Precondition**: Đang xem cài đặt ứng dụng
- **Postcondition**: Cài đặt thông báo được lưu
- **Relationships**: 
  - <<extend>> từ View App Settings

---

### 6. Notifications

#### UC-37: Xem thông báo (View Notifications)
- **Mô tả**: Xem danh sách thông báo
- **Precondition**: Đã đăng nhập
- **Postcondition**: Danh sách thông báo được hiển thị
- **Relationships**: 
  - <<include>> Filter Notifications
  - <<include>> View Notification Details
  - <<include>> Mark Notification as Read

#### UC-38: Lọc thông báo (Filter Notifications)
- **Mô tả**: Lọc thông báo theo loại, trạng thái đọc
- **Precondition**: Đang xem danh sách thông báo
- **Postcondition**: Danh sách được lọc
- **Relationships**: 
  - <<include>> trong View Notifications

#### UC-39: Xem chi tiết thông báo (View Notification Details)
- **Mô tả**: Xem nội dung chi tiết của một thông báo
- **Precondition**: Đang xem danh sách thông báo
- **Postcondition**: Chi tiết thông báo được hiển thị
- **Relationships**: 
  - <<include>> trong View Notifications

#### UC-40: Đánh dấu đã đọc (Mark Notification as Read)
- **Mô tả**: Đánh dấu thông báo là đã đọc
- **Precondition**: Đang xem thông báo
- **Postcondition**: Thông báo được đánh dấu đã đọc
- **Relationships**: 
  - <<include>> trong View Notifications

---

## 🔗 RELATIONSHIPS (Mối quan hệ)

### Include Relationships (<<include>>)
- **Ý nghĩa**: Use case A luôn phải include use case B
- **Ký hiệu**: Mũi tên nét đứt với nhãn <<include>>

**Danh sách Include:**
1. Register Account → Verify OTP
2. Login → View Dashboard
3. Forgot Password → Verify Reset OTP
4. Forgot Password → Reset Password
5. Check-in with QR Code → Verify GPS Location
6. Check-in with QR Code → Save Attendance Record
7. Check-in with Camera → Face Recognition
8. Check-in with Camera → Verify GPS Location
9. Check-in with Camera → Save Attendance Record
10. View Attendance History → Filter Attendance History
11. View Attendance History → Export Attendance Report
12. View Work Schedule → Filter Work Schedule
13. Create Leave Request → Select Leave Type
14. Create Leave Request → Fill Leave Request Form
15. Create Leave Request → Submit Leave Request
16. View Leave Requests → Filter Leave Requests
17. View Leave Requests → View Leave Request Details
18. View Leave Balance → View Leave Balance History
19. View Profile → View Personal Information
20. View Profile → View Security Settings
21. View Profile → View App Settings
22. Change Password → View Security Settings
23. View Notifications → Filter Notifications
24. View Notifications → View Notification Details
25. View Notifications → Mark Notification as Read

### Extend Relationships (<<extend>>)
- **Ý nghĩa**: Use case A có thể mở rộng use case B (optional)
- **Ký hiệu**: Mũi tên nét đứt với nhãn <<extend>>

**Danh sách Extend:**
1. View Attendance Success ← Check-in with QR Code
2. View Attendance Success ← Check-in with Camera
3. Update Personal Information ← View Personal Information
4. Change Theme ← View App Settings
5. Change Language ← View App Settings
6. Configure Notifications ← View App Settings

---

## 📐 CÁCH VẼ USE CASE DIAGRAM

### Bước 1: Vẽ Actor
```
Vẽ hình người que (stick figure) ở bên trái, ghi nhãn "EMPLOYEE"
```

### Bước 2: Vẽ System Boundary
```
Vẽ hình chữ nhật lớn bao quanh tất cả use cases
Ghi nhãn "Smart Attendance System" ở trên cùng
```

### Bước 3: Vẽ Use Cases
```
Vẽ các hình oval (ellipse) cho mỗi use case
Sắp xếp theo nhóm chức năng:
- Nhóm Authentication (phía trên bên trái)
- Nhóm Attendance (phía trên giữa)
- Nhóm View & History (phía trên bên phải)
- Nhóm Leave Management (phía dưới bên trái)
- Nhóm Profile (phía dưới giữa)
- Nhóm Notifications (phía dưới bên phải)
```

### Bước 4: Vẽ Associations
```
Vẽ đường thẳng từ Actor (EMPLOYEE) đến các use case chính:
- Register Account
- Login
- Forgot Password
- Check-in with QR Code
- Check-in with Camera
- View Dashboard
- View Attendance History
- View Work Schedule
- Create Leave Request
- View Leave Requests
- View Leave Balance
- View Profile
- View Notifications
```

### Bước 5: Vẽ Include Relationships
```
Vẽ mũi tên nét đứt với nhãn <<include>> từ use case chính đến use case phụ
Ví dụ: Register Account --[<<include>>]--> Verify OTP
```

### Bước 6: Vẽ Extend Relationships
```
Vẽ mũi tên nét đứt với nhãn <<extend>> từ use case mở rộng đến use case gốc
Ví dụ: View Attendance Success --[<<extend>>]--> Check-in with QR Code
```

---

## 📋 SƠ ĐỒ TEXT (Text Diagram)

```
                    ┌─────────────────────────────────────────────────────┐
                    │         Smart Attendance System                    │
                    │                                                     │
                    │  ┌─────────────────────────────────────────────┐  │
                    │  │  Authentication & Account Management        │  │
                    │  │  ┌──────────────┐  ┌──────────────┐         │  │
                    │  │  │Register      │──│Verify OTP    │         │  │
                    │  │  │Account       │  └──────────────┘         │  │
                    │  │  └──────────────┘                           │  │
                    │  │  ┌──────────────┐  ┌──────────────┐         │  │
                    │  │  │Login         │──│View Dashboard│         │  │
                    │  │  └──────────────┘  └──────────────┘         │  │
                    │  │  ┌──────────────┐  ┌──────────────┐         │  │
                    │  │  │Forgot        │──│Verify Reset  │         │  │
                    │  │  │Password      │  │OTP           │         │  │
                    │  │  └──────────────┘  └──────────────┘         │  │
                    │  │                    ┌──────────────┐         │  │
                    │  │                    │Reset Password│         │  │
                    │  │                    └──────────────┘         │  │
                    │  └─────────────────────────────────────────────┘  │
                    │                                                     │
                    │  ┌─────────────────────────────────────────────┐  │
                    │  │  Attendance Management                      │  │
                    │  │  ┌──────────────┐  ┌──────────────┐         │  │
                    │  │  │Check-in with │──│Verify GPS    │         │  │
                    │  │  │QR Code       │  │Location      │         │  │
                    │  │  └──────────────┘  └──────────────┘         │  │
                    │  │  ┌──────────────┐  ┌──────────────┐         │  │
                    │  │  │Check-in with │──│Face           │         │  │
                    │  │  │Camera        │  │Recognition    │         │  │
                    │  │  └──────────────┘  └──────────────┘         │  │
                    │  │  ┌──────────────┐                          │  │
                    │  │  │Save          │                          │  │
                    │  │  │Attendance    │                          │  │
                    │  │  │Record        │                          │  │
                    │  │  └──────────────┘                          │  │
                    │  │  ┌──────────────┐                          │  │
                    │  │  │View          │                          │  │
                    │  │  │Attendance    │                          │  │
                    │  │  │Success       │                          │  │
                    │  │  └──────────────┘                          │  │
                    │  └─────────────────────────────────────────────┘  │
                    │                                                     │
                    │  ┌─────────────────────────────────────────────┐  │
                    │  │  View & History                              │  │
                    │  │  ┌──────────────┐  ┌──────────────┐         │  │
                    │  │  │View          │──│Filter        │         │  │
                    │  │  │Attendance    │  │Attendance    │         │  │
                    │  │  │History       │  │History       │         │  │
                    │  │  └──────────────┘  └──────────────┘         │  │
                    │  │  ┌──────────────┐                           │  │
                    │  │  │Export        │                           │  │
                    │  │  │Attendance    │                           │  │
                    │  │  │Report        │                           │  │
                    │  │  └──────────────┘                           │  │
                    │  │  ┌──────────────┐  ┌──────────────┐         │  │
                    │  │  │View Work     │──│Filter Work   │         │  │
                    │  │  │Schedule      │  │Schedule      │         │  │
                    │  │  └──────────────┘  └──────────────┘         │  │
                    │  └─────────────────────────────────────────────┘  │
                    │                                                     │
                    │  ┌─────────────────────────────────────────────┐  │
                    │  │  Leave Management                           │  │
                    │  │  ┌──────────────┐  ┌──────────────┐         │  │
                    │  │  │Create Leave  │──│Select Leave  │         │  │
                    │  │  │Request       │  │Type          │         │  │
                    │  │  └──────────────┘  └──────────────┘         │  │
                    │  │  ┌──────────────┐  ┌──────────────┐         │  │
                    │  │  │Fill Leave    │  │Submit Leave  │         │  │
                    │  │  │Request Form  │  │Request       │         │  │
                    │  │  └──────────────┘  └──────────────┘         │  │
                    │  │  ┌──────────────┐  ┌──────────────┐         │  │
                    │  │  │View Leave    │──│Filter Leave  │         │  │
                    │  │  │Requests      │  │Requests      │         │  │
                    │  │  └──────────────┘  └──────────────┘         │  │
                    │  │  ┌──────────────┐                           │  │
                    │  │  │View Leave    │                           │  │
                    │  │  │Request       │                           │  │
                    │  │  │Details       │                           │  │
                    │  │  └──────────────┘                           │  │
                    │  │  ┌──────────────┐  ┌──────────────┐         │  │
                    │  │  │View Leave    │──│View Leave    │         │  │
                    │  │  │Balance       │  │Balance       │         │  │
                    │  │  │              │  │History       │         │  │
                    │  │  └──────────────┘  └──────────────┘         │  │
                    │  └─────────────────────────────────────────────┘  │
                    │                                                     │
                    │  ┌─────────────────────────────────────────────┐  │
                    │  │  Profile Management                         │  │
                    │  │  ┌──────────────┐  ┌──────────────┐         │  │
                    │  │  │View Profile  │──│View Personal │         │  │
                    │  │  │              │  │Information   │         │  │
                    │  │  └──────────────┘  └──────────────┘         │  │
                    │  │  ┌──────────────┐                           │  │
                    │  │  │Update        │                           │  │
                    │  │  │Personal      │                           │  │
                    │  │  │Information   │                           │  │
                    │  │  └──────────────┘                           │  │
                    │  │  ┌──────────────┐  ┌──────────────┐         │  │
                    │  │  │View Security │──│Change        │         │  │
                    │  │  │Settings      │  │Password      │         │  │
                    │  │  └──────────────┘  └──────────────┘         │  │
                    │  │  ┌──────────────┐  ┌──────────────┐         │  │
                    │  │  │View App      │──│Change Theme  │         │  │
                    │  │  │Settings      │  └──────────────┘         │  │
                    │  │  └──────────────┘  ┌──────────────┐         │  │
                    │  │                    │Change        │         │  │
                    │  │                    │Language      │         │  │
                    │  │                    └──────────────┘         │  │
                    │  │                    ┌──────────────┐         │  │
                    │  │                    │Configure     │         │  │
                    │  │                    │Notifications │         │  │
                    │  │                    └──────────────┘         │  │
                    │  └─────────────────────────────────────────────┘  │
                    │                                                     │
                    │  ┌─────────────────────────────────────────────┐  │
                    │  │  Notifications                              │  │
                    │  │  ┌──────────────┐  ┌──────────────┐         │  │
                    │  │  │View          │──│Filter        │         │  │
                    │  │  │Notifications │  │Notifications │         │  │
                    │  │  └──────────────┘  └──────────────┘         │  │
                    │  │  ┌──────────────┐  ┌──────────────┐         │  │
                    │  │  │View          │  │Mark          │         │  │
                    │  │  │Notification  │  │Notification   │         │  │
                    │  │  │Details       │  │as Read       │         │  │
                    │  │  └──────────────┘  └──────────────┘         │  │
                    │  └─────────────────────────────────────────────┘  │
                    └─────────────────────────────────────────────────────┘
                                        ▲
                                        │
                                    ┌───┴───┐
                                    │EMPLOYEE│
                                    └───────┘
```

---

## 🎨 HƯỚNG DẪN VẼ CHI TIẾT

### 1. Sử dụng công cụ vẽ:
- **Draw.io (diagrams.net)**: https://app.diagrams.net/
- **Lucidchart**: https://www.lucidchart.com/
- **Visual Paradigm**: https://www.visual-paradigm.com/
- **PlantUML**: https://plantuml.com/

### 2. Ký hiệu chuẩn UML:
- **Actor**: Hình người que (stick figure)
- **Use Case**: Hình oval (ellipse)
- **System Boundary**: Hình chữ nhật
- **Association**: Đường thẳng liền
- **Include**: Mũi tên nét đứt với nhãn <<include>>
- **Extend**: Mũi tên nét đứt với nhãn <<extend>>

### 3. Màu sắc đề xuất:
- **Actor**: Màu xanh dương
- **Use Case chính**: Màu xanh lá
- **Use Case phụ (include)**: Màu vàng
- **Use Case mở rộng (extend)**: Màu cam
- **System Boundary**: Màu xám nhạt

### 4. Bố cục đề xuất:
- Actor ở bên trái
- Use cases được nhóm theo chức năng
- Include relationships vẽ từ use case chính đến use case phụ
- Extend relationships vẽ từ use case mở rộng đến use case gốc

---

## 📝 GHI CHÚ

1. **Tổng số Use Cases**: 40 use cases
2. **Tổng số Include Relationships**: 25 relationships
3. **Tổng số Extend Relationships**: 6 relationships
4. **Tổng số Associations**: 13 associations (từ Actor đến use case chính)

---

**File này cung cấp đầy đủ thông tin để vẽ Use Case Diagram cho role EMPLOYEE một cách chi tiết và chính xác.**

