// pages/attendance/attendance.js
const app = getApp();
const i18n = require("../../utils/i18n.js");

Page({
  data: {
    todayStr: "",
    checkIn: "",
    checkOut: "",
    // Computed display values (avoid || in template)
    checkInDisplay: "--:--",
    checkOutDisplay: "--:--",
    checkInClass: "time--pending",
    checkOutClass: "time--pending",
    // State flags for template
    showCheckIn: true,
    showCheckOut: false,
    showDone: false,
    canSubmit: false,
    // Camera
    capturedImage: "",
    cameraAuthorized: true,
    // GPS
    latitude: null,
    longitude: null,
    hasLocation: false,
    latDisplay: "",
    lngDisplay: "",
    locationText: "Chưa lấy vị trí",
    locationStatusClass: "loc--pending",
    isRemote: false,
    isOutOfRange: false,
    branches: [],
    // Loading states
    loading: false,
    loadingLocation: false,
    t: {},
    theme: "light",
    // OTP Fallback states
    showOtpModal: false,
    otpVal: "",
    otpLoading: false,
    otpError: "",
    submitMode: "",
    tempImagePath: ""
  },

  onShow() {
    const t = i18n.getTranslations();
    this.setData({
      t,
      theme: i18n.getTheme()
    });
    tt.setNavigationBarTitle({
      title: t.dashboard.attendance
    });

    // Tự động đồng bộ lại quyền camera khi quay lại trang (ví dụ từ Cài đặt hệ thống)
    tt.getSetting({
      success: (res) => {
        if (res.authSetting["scope.camera"] !== undefined) {
          this.setData({
            cameraAuthorized: !!res.authSetting["scope.camera"]
          });
        }
      }
    });
  },

  onLoad() {
    const now = new Date();
    const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    this.setData({
      todayStr: days[now.getDay()] + " " + now.getDate() + "/" + (now.getMonth() + 1) + "/" + now.getFullYear(),
    });
    this.loadTodayStatus();
    this.loadUserInfoAndBranches();
    this.getLocation();
  },

  onReady() {
    this.cameraCtx = tt.createCameraContext("attCamera");
  },

  // API: GET /api/attendance/recent?limit=1
  loadTodayStatus() {
    tt.request({
      url: app.globalData.apiHost + "/api/attendance/recent?limit=1",
      method: "GET",
      header: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + app.globalData.token,
      },
      success: (res) => {
        if (res.statusCode === 200 && Array.isArray(res.data) && res.data.length > 0) {
          const d = res.data[0];

          // Kiểm tra ngày của bản ghi chấm công gần nhất có phải ngày hôm nay không (giống bản web)
          const today = new Date();
          const todayStr = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

          const parseAttendanceDate = (dateStr) => {
            if (!dateStr) return null;
            const dateMatch = dateStr.match(
              /(\d{1,2})\s*(?:tháng\s*)?(\d{1,2})(?:,\s*|\s+)(\d{4})/
            );
            if (!dateMatch) return null;
            const [, day, month, year] = dateMatch;
            return `${parseInt(day)}/${parseInt(month)}/${year}`;
          };

          const attendanceStr = parseAttendanceDate(d.date);

          if (attendanceStr === todayStr) {
            this._updateCheckState(d.checkIn || "", d.checkOut || "");
          } else {
            // Không phải ngày hôm nay -> Reset trạng thái chưa check-in
            this._updateCheckState("", "");
          }
        } else {
          this._updateCheckState("", "");
        }
      },
      fail: () => {
        this._updateCheckState("", "");
      },
    });
  },

  // Tính toán tất cả display values từ checkIn/checkOut
  _updateCheckState(checkIn, checkOut) {
    const showCheckIn = !checkIn;
    const showCheckOut = !!checkIn && !checkOut;
    const showDone = !!checkIn && !!checkOut;

    this.setData({
      checkIn,
      checkOut,
      checkInDisplay: checkIn || "--:--",
      checkOutDisplay: checkOut || "--:--",
      checkInClass: checkIn ? "time--done" : "time--pending",
      checkOutClass: checkOut ? "time--done" : "time--pending",
      showCheckIn,
      showCheckOut,
      showDone,
    });
    this._recomputeCanSubmit();
  },

  _recomputeCanSubmit() {
    const { hasLocation, isOutOfRange, isRemote, loading } = this.data;
    const locationValid = hasLocation && (isRemote || !isOutOfRange);
    this.setData({ canSubmit: locationValid && !loading });
  },

  // Tải thông tin user remote và danh sách các chi nhánh
  loadUserInfoAndBranches() {
    // 1. Lấy thông tin user để kiểm tra isRemote
    app.request({
      url: "/api/auth/me",
      method: "GET",
      success: (res) => {
        if (res.statusCode === 200 && res.data) {
          this.setData({ isRemote: !!res.data.isRemote });
          this._validateCurrentLocation();
        }
      }
    });

    // 2. Lấy danh sách chi nhánh
    app.request({
      url: "/api/branches/list",
      method: "GET",
      success: (res) => {
        if (res.statusCode === 200 && res.data && Array.isArray(res.data.branches)) {
          this.setData({ branches: res.data.branches });
          this._validateCurrentLocation();
        }
      }
    });
  },

  // Tính toán khoảng cách Haversine (mét)
  _calculateDistance(lat1, lon1, lat2, lon2) {
    const toRad = (value) => (value * Math.PI) / 180;
    const R = 6371000; // Bán kính Trái Đất (mét)
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  // Xác thực khoảng cách GPS hiện tại với các văn phòng công ty
  _validateCurrentLocation() {
    const { latitude, longitude, isRemote, branches } = this.data;
    if (latitude === null || longitude === null) return;

    if (isRemote) {
      this.setData({
        hasLocation: true,
        isOutOfRange: false,
        locationText: "Hợp lệ (Remote)",
        locationStatusClass: "loc--success",
      });
      this._recomputeCanSubmit();
      return;
    }

    if (branches.length === 0) {
      // Chờ API chi nhánh trả về kết quả
      return;
    }

    let minDistance = Infinity;
    let nearestBranch = null;

    for (const branch of branches) {
      if (branch.latitude === undefined || branch.longitude === undefined) continue;
      const d = this._calculateDistance(latitude, longitude, branch.latitude, branch.longitude);
      if (d < minDistance) {
        minDistance = d;
        nearestBranch = branch;
      }
    }

    // Bán kính mặc định: 100 mét
    const maxDistance = 100;

    if (minDistance <= maxDistance) {
      this.setData({
        hasLocation: true,
        isOutOfRange: false,
        locationText: `Hợp lệ - ${nearestBranch.name}`,
        locationStatusClass: "loc--success",
      });
    } else {
      let distStr = "";
      if (minDistance >= 1000) {
        distStr = (minDistance / 1000).toFixed(1) + "km";
      } else {
        distStr = Math.round(minDistance) + "m";
      }
      this.setData({
        hasLocation: true,
        isOutOfRange: true,
        locationText: `Ngoài phạm vi (${distStr} từ ${nearestBranch ? nearestBranch.name : 'VP'})`,
        locationStatusClass: "loc--error",
      });
    }
    this._recomputeCanSubmit();
  },

  // Lấy vị trí GPS
  getLocation() {
    this.setData({ loadingLocation: true, locationText: "Đang lấy vị trí..." });

    tt.getLocation({
      type: "gcj02",
      success: (res) => {
        const lat = res.latitude.toFixed(5);
        const lng = res.longitude.toFixed(5);
        this.setData({
          latitude: res.latitude,
          longitude: res.longitude,
          latDisplay: lat,
          lngDisplay: lng,
          loadingLocation: false,
        });
        this._validateCurrentLocation();
      },
      fail: () => {
        this.setData({
          locationText: "Không lấy được vị trí. Kiểm tra lại quyền GPS.",
          locationStatusClass: "loc--error",
          loadingLocation: false,
          hasLocation: false,
          isOutOfRange: false,
        });
        this._recomputeCanSubmit();
        tt.showToast({ title: "Vui lòng bật GPS và cấp quyền vị trí!", icon: "none" });
      },
    });
  },

  // Chụp ảnh trực tiếp từ live camera
  takePhoto() {
    if (this.data.loading) return;
    if (!this.cameraCtx) {
      this.cameraCtx = tt.createCameraContext("attCamera");
    }

    tt.showLoading({ title: "Đang chụp..." });
    this.cameraCtx.takePhoto({
      quality: "high",
      success: (res) => {
        tt.hideLoading();
        this.setData({ capturedImage: res.tempImagePath });
        this._recomputeCanSubmit();
        tt.showToast({ title: "Đã chụp ảnh", icon: "success" });
      },
      fail: (err) => {
        tt.hideLoading();
        tt.showToast({ title: "Không thể chụp ảnh", icon: "none" });
        console.error("takePhoto error:", err);
      }
    });
  },

  // Xóa ảnh đã chụp để chụp lại
  retakePhoto() {
    this.setData({ capturedImage: "" });
    this._recomputeCanSubmit();
  },

  // Xử lý khi nhấn vào khung quét tròn
  handleFrameTap() {
    if (!this.data.cameraAuthorized) {
      this.openSetting();
    }
  },

  // Xử lý lỗi camera
  onCameraError(e) {
    console.error("Camera error:", e);
    this.setData({ cameraAuthorized: false });
    tt.showModal({
      title: "Lỗi Camera",
      content: "Chi tiết: " + JSON.stringify(e.detail) + "\n\nVui lòng đảm bảo ứng dụng Lark Suite đã được cấp quyền Camera trong Cài đặt hệ thống của điện thoại.",
      showCancel: false
    });
  },

  // Mở cài đặt để phân quyền camera
  openSetting() {
    tt.openSetting({
      success: (res) => {
        if (res.authSetting["scope.camera"]) {
          this.setData({ cameraAuthorized: true });
        }
      }
    });
  },


  handleCheckIn() { this._submitAttendance("check-in"); },
  handleCheckOut() { this._submitAttendance("check-out"); },

  goBack() {
    tt.navigateBack();
  },

  // Tự động chụp ảnh và gửi yêu cầu chấm công lên máy chủ
  _submitAttendance(mode) {
    const { hasLocation, isOutOfRange, isRemote, cameraAuthorized, loading, latitude, longitude } = this.data;
    const locationValid = hasLocation && (isRemote || !isOutOfRange);

    if (!locationValid || latitude === null) {
      tt.showToast({ title: "Vị trí không hợp lệ để chấm công!", icon: "none" });
      return;
    }
    if (!cameraAuthorized) {
      tt.showToast({ title: "Vui lòng cấp quyền camera!", icon: "none" });
      return;
    }
    if (loading) return;

    this.setData({ loading: true });
    this._recomputeCanSubmit();

    tt.showLoading({ title: "Đang nhận diện...", mask: true });

    if (!this.cameraCtx) {
      this.cameraCtx = tt.createCameraContext("attCamera");
    }

    // 1. Tự động chụp ảnh bằng camera nhúng
    this.cameraCtx.takePhoto({
      quality: "high",
      success: (photoRes) => {
        const imagePath = photoRes.tempImagePath;
        // Freeze khung hình xem trước để tăng tính trực quan
        this.setData({ capturedImage: imagePath });
        
        // 2. Thực hiện tải lên và chấm công
        this._doUploadAndSubmit(mode, imagePath);
      },
      fail: (err) => {
        tt.hideLoading();
        this.setData({ loading: false });
        this._recomputeCanSubmit();
        tt.showModal({
          title: "Lỗi camera",
          content: "Không thể chụp ảnh để chấm công. Vui lòng thử lại.",
          showCancel: false
        });
        console.error("Auto takePhoto fail:", err);
      }
    });
  },

  // Thực hiện tải tệp ảnh lên và gửi API chấm công (hỗ trợ lý do check-out sớm)
  _doUploadAndSubmit(mode, imagePath, earlyCheckoutReason = null) {
    const modeLabel = mode === "check-in" ? "Check-in" : "Check-out";
    const endpoint = mode === "check-in" ? "/api/attendance/checkin" : "/api/attendance/checkout";

    const formData = {
      latitude: String(this.data.latitude),
      longitude: String(this.data.longitude),
    };
    if (earlyCheckoutReason) {
      formData.earlyCheckoutReason = earlyCheckoutReason;
    }

    tt.uploadFile({
      url: app.globalData.apiHost + endpoint,
      filePath: imagePath,
      name: "photo",
      formData: formData,
      header: {
        Authorization: "Bearer " + app.globalData.token,
      },
      success: (res) => {
        tt.hideLoading();
        this.setData({ loading: false, capturedImage: "" }); // Clear freeze frame
        this._recomputeCanSubmit();

        let result;
        try {
          result = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
        } catch (e) {
          result = {};
        }

        if (res.statusCode === 200 && result.success) {
          this.loadTodayStatus();
          const timeVal = result.data?.checkIn || result.data?.checkOut || "";
          let timeDisplay = "";
          if (timeVal) {
            try {
              const d = new Date(timeVal);
              timeDisplay = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
            } catch (e) {
              timeDisplay = timeVal;
            }
          }

          tt.showModal({
            title: modeLabel + " thành công!",
            content: (result.message || "") + (timeDisplay ? "\nLúc: " + timeDisplay : ""),
            showCancel: false,
            confirmText: "OK",
          });
        } else if (res.statusCode === 400 && result.requireOtpFallback) {
          // Hiển thị modal nhập OTP dự phòng
          this.setData({
            showOtpModal: true,
            otpVal: "",
            otpError: "",
            submitMode: mode,
            tempImagePath: imagePath,
            capturedImage: imagePath, // Giữ đông khung hình xem trước
          });
          tt.showToast({ title: "Nhập mã OTP để xác nhận", icon: "none" });
        } else if (res.statusCode === 400 && result.code === "INSUFFICIENT_WORK_HOURS" && result.data?.requiresReason) {
          // Hiển thị Action Sheet để chọn lý do check-out sớm giống bản web
          tt.showActionSheet({
            itemList: ["Sự cố máy", "Việc cá nhân khẩn cấp", "Theo yêu cầu quản lý"],
            success: (sheetRes) => {
              const reasons = ["machine_issue", "personal_emergency", "manager_request"];
              const selectedReason = reasons[sheetRes.tapIndex];

              // Đặt lại trạng thái loading và hiển thị freeze frame
              this.setData({ loading: true, capturedImage: imagePath });
              this._recomputeCanSubmit();
              tt.showLoading({ title: "Đang gửi lý do...", mask: true });

              this._doUploadAndSubmit(mode, imagePath, selectedReason);
            },
            fail: () => {
              tt.showToast({ title: "Đã hủy check-out sớm", icon: "none" });
            }
          });
        } else {
          tt.showModal({
            title: modeLabel + " thất bại",
            content: result.message || "Không nhận diện được khuôn mặt hoặc ngoài phạm vi.",
            showCancel: false,
          });
        }
      },
      fail: () => {
        tt.hideLoading();
        this.setData({ loading: false, capturedImage: "" });
        this._recomputeCanSubmit();
        tt.showToast({ title: "Lỗi kết nối máy chủ", icon: "none" });
      },
    });
  },

  onOtpInput(e) {
    this.setData({ otpVal: e.detail.value, otpError: "" });
  },

  closeOtpModal() {
    this.setData({
      showOtpModal: false,
      otpVal: "",
      otpError: "",
      capturedImage: "",
    });
    this._recomputeCanSubmit();
  },

  submitOtp() {
    const { otpVal, t } = this.data;
    if (!otpVal || otpVal.trim().length !== 6) {
      this.setData({ otpError: "Mã OTP phải gồm 6 chữ số" });
      return;
    }

    this.setData({ otpLoading: true });
    tt.showLoading({ title: "Đang xác thực OTP...", mask: true });

    app.request({
      url: "/api/face/verify-fallback-otp",
      method: "POST",
      data: { otp: otpVal.trim() },
      success: (res) => {
        tt.hideLoading();
        this.setData({ otpLoading: false });
        if (res.statusCode === 200 && res.data && res.data.success) {
          const action = res.data.action || "check_in";
          const actionLabel = action === "check_in" ? "Check-in" : "Check-out";
          
          this.setData({
            showOtpModal: false,
            otpVal: "",
            capturedImage: "",
          });
          
          this.loadTodayStatus();
          
          tt.showModal({
            title: actionLabel + " thành công!",
            content: `Chấm công ${action === 'check_in' ? 'vào' : 'ra'} thành công bằng mã OTP!`,
            showCancel: false,
            confirmText: "OK",
          });
        } else {
          this.setData({
            otpError: res.data?.message || "Mã OTP không đúng hoặc đã hết hạn."
          });
        }
      },
      fail: () => {
        tt.hideLoading();
        this.setData({ otpLoading: false, otpError: "Lỗi kết nối máy chủ" });
      }
    });
  },
});
