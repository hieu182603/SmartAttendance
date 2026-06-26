// pages/face-reg/face-reg.js — Logic đăng ký khuôn mặt
const app = getApp();
const i18n = require("../../utils/i18n.js");

Page({
  data: {
    isRegistered: false,
    loading: false,
    capturedCount: 0,
    remainCount: 4,
    consentGiven: false,
    consentChecked: false,
    activeAngleIndex: 0,
    cameraAuthorized: true,
    angles: [
      { id: "front", label: "Nhìn thẳng", iconClass: "icon-angle-front", imagePath: "", captured: false, uploadedUrl: "" },
      { id: "left",  label: "Nghiêng trái", iconClass: "icon-angle-left", imagePath: "", captured: false, uploadedUrl: "" },
      { id: "right", label: "Nghiêng phải", iconClass: "icon-angle-right", imagePath: "", captured: false, uploadedUrl: "" },
      { id: "up",    label: "Ngước lên", iconClass: "icon-angle-up", imagePath: "", captured: false, uploadedUrl: "" },
    ],
    t: {},
    theme: "light"
  },

  onShow() {
    const t = i18n.getTranslations();
    const theme = i18n.getTheme();
    const isEn = i18n.getLanguage() === "en";

    // Kiểm tra tài khoản TRIAL để chặn đăng ký khuôn mặt
    if (app.globalData.userRole === "TRIAL") {
      tt.showModal({
        title: isEn ? "Feature Restricted" : "Tính năng hạn chế",
        content: isEn 
          ? "Face registration is not available for trial accounts. Please upgrade to experience this feature." 
          : "Rất tiếc, các tính năng AI bao gồm Đăng ký khuôn mặt không khả dụng cho tài khoản dùng thử. Vui lòng nâng cấp tài khoản để trải nghiệm.",
        showCancel: false,
        confirmText: "OK",
        success: () => {
          tt.navigateBack();
        }
      });
      return;
    }
    
    const labelMap = {
      front: isEn ? "Front View" : "Nhìn thẳng",
      left: isEn ? "Left Profile" : "Nghiêng trái",
      right: isEn ? "Right Profile" : "Nghiêng phải",
      up: isEn ? "Look Up" : "Ngước lên"
    };

    const angles = this.data.angles.map(item => ({
      ...item,
      label: labelMap[item.id] || item.label
    }));

    this.setData({
      t,
      theme,
      angles
    });

    tt.setNavigationBarTitle({
      title: t.face.title
    });

    // Tự động đồng bộ lại quyền camera khi quay lại trang
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

  toggleConsentChecked() {
    this.setData({ consentChecked: !this.data.consentChecked });
  },

  giveConsent() {
    if (this.data.consentChecked) {
      this.setData({ consentGiven: true });
    }
  },

  declineConsent() {
    tt.navigateBack();
  },

  onLoad() {
    this.checkRegistrationStatus();
  },

  onReady() {
    this.cameraCtx = tt.createCameraContext("faceRegCamera");
  },

  // ===== Kiểm tra đã đăng ký chưa =====
  checkRegistrationStatus() {
    app.request({
      url: "/api/face/status",
      method: "GET",
      success: (res) => {
        if (res.statusCode === 200 && res.data.success && res.data.data) {
          this.setData({ isRegistered: res.data.data.isRegistered });
        }
      },
      fail: () => {},
    });
  },

  // ===== Xử lý lỗi Camera nhúng =====
  onCameraError(e) {
    console.error("Camera error:", e);
    this.setData({ cameraAuthorized: false });
    tt.showModal({
      title: "Lỗi Camera",
      content: "Chi tiết: " + JSON.stringify(e.detail) + "\n\nVui lòng đảm bảo ứng dụng Lark Suite đã được cấp quyền Camera trong Cài đặt hệ thống của điện thoại.",
      showCancel: false
    });
  },

  openSetting() {
    tt.openSetting({
      success: (res) => {
        if (res.authSetting["scope.camera"]) {
          this.setData({ cameraAuthorized: true });
        }
      }
    });
  },

  // ===== Chọn góc chụp thủ công từ lưới (hoặc xem ảnh phóng to nếu đã chụp) =====
  selectAngle(e) {
    const index = e.currentTarget.dataset.index;
    const angle = this.data.angles[index];
    if (angle.imagePath) {
      // Đã chụp -> Nhấp để xem to ảnh bằng tt.previewImage
      tt.previewImage({
        current: angle.imagePath,
        urls: this.data.angles.filter(a => a.imagePath).map(a => a.imagePath)
      });
    } else {
      // Chưa chụp -> Chọn góc này để chuẩn bị chụp
      this.setData({ activeAngleIndex: index });
    }
  },

  // ===== Chụp ảnh trực tiếp bằng Camera nhúng =====
  takePhoto() {
    if (this.data.loading) return;
    const { activeAngleIndex, angles } = this.data;
    const currentAngle = angles[activeAngleIndex];
    
    if (!this.cameraCtx) {
      this.cameraCtx = tt.createCameraContext("faceRegCamera");
    }

    tt.showLoading({ title: "Đang ghi nhận..." });
    
    this.cameraCtx.takePhoto({
      quality: "high",
      success: (res) => {
        tt.hideLoading();
        const imagePath = res.tempImagePath;
        
        const updatedAngles = [...angles];
        updatedAngles[activeAngleIndex].imagePath = imagePath;
        
        const capturedCount = updatedAngles.filter(a => a.imagePath).length;
        
        // Tự động tìm góc kế tiếp chưa được chụp
        let nextIndex = activeAngleIndex;
        if (capturedCount < 4) {
          const firstUncaptured = updatedAngles.findIndex(a => !a.imagePath);
          if (firstUncaptured !== -1) {
            nextIndex = firstUncaptured;
          }
        }

        this.setData({
          angles: updatedAngles,
          capturedCount,
          remainCount: 4 - capturedCount,
          activeAngleIndex: nextIndex
        });

        tt.showToast({ title: `Đã chụp góc ${currentAngle.label}`, icon: "success" });
      },
      fail: (err) => {
        tt.hideLoading();
        console.error("takePhoto fail:", err);
        tt.showToast({ title: "Lỗi camera, vui lòng thử lại", icon: "none" });
      }
    });
  },

  // ===== Tải lên từng ảnh đơn lẻ (Promise) =====
  _uploadSingleFile(filePath) {
    return new Promise((resolve, reject) => {
      tt.uploadFile({
        url: `${app.globalData.apiHost}/api/face/upload`,
        filePath: filePath,
        name: "image",
        header: {
          Authorization: `Bearer ${app.globalData.token}`,
        },
        success: (res) => {
          let result;
          try {
            result = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
          } catch (e) {
            result = {};
          }
          if (res.statusCode === 200 && result.success && result.fileUrl) {
            resolve(result.fileUrl);
          } else {
            reject(new Error(result.message || "Tải ảnh lên thất bại"));
          }
        },
        fail: (err) => {
          reject(err);
        }
      });
    });
  },

  // ===== Gửi toàn bộ 4 ảnh đã chụp để đăng ký sinh trắc học =====
  async handleRegister() {
    const { angles, t } = this.data;
    if (angles.some(a => !a.imagePath)) {
      tt.showToast({ title: "Vui lòng chụp đủ 4 góc", icon: "none" });
      return;
    }

    this.setData({ loading: true });
    tt.showLoading({ title: "Đang tải ảnh sinh trắc học...", mask: true });

    try {
      const uploadPromises = angles.map(a => this._uploadSingleFile(a.imagePath));
      const urls = await Promise.all(uploadPromises);
      
      tt.showLoading({ title: "Đang lưu dữ liệu...", mask: true });
      
      app.request({
        url: "/api/face/register",
        method: "POST",
        data: {
          faceImages: urls,
          consent_given: true,
          consent_channel: "lark",
        },
        success: (res) => {
          tt.hideLoading();
          this.setData({ loading: false });
          if (res.statusCode === 200 && res.data.success) {
            tt.showModal({
              title: t.common.success || "Thành công",
              content: t.face.success || "Đăng ký khuôn mặt thành công!",
              showCancel: false,
              confirmText: "OK",
              success: () => {
                tt.navigateBack();
              },
            });
          } else {
            tt.showModal({
              title: t.common.error || "Lỗi",
              content: res.data?.message || (t.face.error || "Đăng ký khuôn mặt thất bại."),
              showCancel: false,
            });
          }
        },
        fail: () => {
          tt.hideLoading();
          this.setData({ loading: false });
          tt.showToast({ title: t.common.error || "Lỗi kết nối", icon: "none" });
        },
      });
    } catch (err) {
      tt.hideLoading();
      this.setData({ loading: false });
      console.error("Upload fail:", err);
      tt.showModal({
        title: "Lỗi kết nối",
        content: err.message || "Không thể tải ảnh lên máy chủ. Vui lòng kiểm tra lại mạng.",
        showCancel: false
      });
    }
  },

  resetAll() {
    const angles = this.data.angles.map(a => ({
      ...a,
      imagePath: "",
      captured: false,
      uploadedUrl: "",
    }));
    this.setData({
      angles,
      capturedCount: 0,
      remainCount: 4,
      activeAngleIndex: 0
    });
  },
});
