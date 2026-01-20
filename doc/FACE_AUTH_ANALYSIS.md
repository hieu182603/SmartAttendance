# Phân Tích Chi Tiết Face-Auth-Library

## Tổng Quan

Thư viện `face-auth-library` là một giải pháp xác thực khuôn mặt chạy hoàn toàn trên trình duyệt, sử dụng **TensorFlow.js** và **MediaPipe FaceMesh** để phát hiện và xác thực khuôn mặt real-time với hướng dẫn bằng giọng nói tiếng Việt.

---

## 1. Kiến Trúc và Dependencies

### 1.1 Dependencies Chính

```json
{
  "@tensorflow/tfjs": "^3.18.0",
  "@tensorflow-models/face-landmarks-detection": "^0.0.1"
}
```

### 1.2 Flow Khởi Tạo

```javascript
// 1. Load TensorFlow.js model
this.faceDetectionModel = await faceLandmarksDetection.load(
    faceLandmarksDetection.SupportedPackages.mediapipeFacemesh,
    { 
        maxFaces: 1,
        shouldLoadIrisModel: false 
    }
);

// 2. Request camera access
this.stream = await navigator.mediaDevices.getUserMedia({ 
    video: { 
        facingMode: "user",
        width: { ideal: 640 },
        height: { ideal: 480 }
    } 
});

// 3. Start face detection loop
this.startFaceDetection();
```

---

## 2. TensorFlow.js và MediaPipe FaceMesh

### 2.1 MediaPipe FaceMesh Model

**MediaPipe FaceMesh** là một mô hình ML được Google phát triển để phát hiện 468 điểm landmark trên khuôn mặt:

- **468 điểm landmark**: Bao gồm mắt, mũi, miệng, cằm, trán, má
- **Real-time performance**: Chạy mượt trên trình duyệt với GPU acceleration
- **High accuracy**: Độ chính xác cao trong việc phát hiện các đặc điểm khuôn mặt

### 2.2 Cách Sử Dụng trong face-auth.js

```javascript:759:783:d:/Exe101/face-auth-library-main/face-auth.js
async loadFaceDetectionModel() {
    try {
        this.setStatus('Đang tải hệ thống...');
        
        // Speak loading message
        if (this.voiceEnabled) {
            this.speak("Đang tải hệ thống, xin đợi một lát");
        }
        
        // Load TensorFlow.js model for face detection
        this.faceDetectionModel = await faceLandmarksDetection.load(
            faceLandmarksDetection.SupportedPackages.mediapipeFacemesh,
            { 
                maxFaces: 1,
                shouldLoadIrisModel: false 
            }
        );
        
        console.log('Face detection model loaded successfully');
        
    } catch (error) {
        console.error('Failed to load face detection model:', error);
        throw new Error('Không thể tải mô hình nhận diện khuôn mặt.');
    }
}
```

### 2.3 Face Detection Loop

```javascript:820:911:d:/Exe101/face-auth-library-main/face-auth.js
startFaceDetection() {
    let lastDetectionTime = 0;
    
    const detectFaces = async () => {
        if (!this.stream || this.isCapturing) {
            this.animationFrameId = requestAnimationFrame(detectFaces);
            return;
        }
        
        const now = Date.now();
        if (now - lastDetectionTime < this.config.detectionInterval) {
            this.animationFrameId = requestAnimationFrame(detectFaces);
            return;
        }
        
        lastDetectionTime = now;
        
        try {
            const faces = await this.faceDetectionModel.estimateFaces({
                input: this.video,
                returnTensors: false,
                flipHorizontal: false,
                predictIrises: false
            });

            if (faces.length > 0) {
                const face = faces[0];
                const faceValidation = this.validateFace(face);
                const isFaceCentered = this.checkFacePosition(face);
                
                // Check for foreign objects (multiple faces)
                if (faces.length > 1) {
                    this.foreignObjectDetected = true;
                    this.showError("Phát hiện nhiều khuôn mặt hoặc vật thể lạ. Vui lòng chỉ để một khuôn mặt trong khung hình.");
                    this.resetProgress();
                    if (this.voiceEnabled && !this.isSpeaking) {
                        this.speak("Phát hiện vật thể lạ. Vui lòng chỉ để khuôn mặt trong khung hình.");
                    }
                } else {
                    this.foreignObjectDetected = false;
                    this.hideMessages();
                    
                    // Check for covered face (hand over face)
                    const isFaceCovered = this.checkFaceCovered(face);
                    if (isFaceCovered) {
                        this.showError("Khuôn mặt bị che. Vui lòng để lộ toàn bộ khuôn mặt.");
                        this.resetProgress();
                        if (this.voiceEnabled && !this.isSpeaking) {
                            this.speak("Khuôn mặt bị che. Vui lòng để lộ toàn bộ khuôn mặt.");
                        }
                        return;
                    }
                    
                    // Check if face is valid
                    if (!faceValidation.isFullFace) {
                        let errorMsg = "Không nhận diện được đầy đủ khuôn mặt. ";
                        
                        if (!faceValidation.hasBothEyes) {
                            errorMsg += "Vui lòng để lộ cả hai mắt. ";
                        }
                        if (!faceValidation.hasNose) {
                            errorMsg += "Vui lòng để lộ mũi. ";
                        }
                        if (!faceValidation.hasMouth) {
                            errorMsg += "Vui lòng để lộ miệng. ";
                        }
                        
                        this.showError(errorMsg);
                        this.resetProgress();
                        
                        if (this.voiceEnabled && !this.isSpeaking) {
                            this.speak("Vui lòng để lộ toàn bộ khuôn mặt bao gồm mắt, mũi và miệng");
                        }
                    } else {
                        this.onFaceDetectionResult(isFaceCentered);
                    }
                }
            } else {
                this.foreignObjectDetected = false;
                this.resetFaceValidation();
                this.hideMessages();
                this.onFaceDetectionResult(false);
            }
        } catch (error) {
            console.error('Face detection error:', error);
        }
        
        this.animationFrameId = requestAnimationFrame(detectFaces);
    };
    
    this.animationFrameId = requestAnimationFrame(detectFaces);
}
```

**Đặc điểm quan trọng:**
- Sử dụng `requestAnimationFrame` để tối ưu performance
- Throttle detection với `detectionInterval` (mặc định 200ms)
- Xử lý async/await để không block UI thread

---

## 3. Phân Tích Các Phương Thức Kiểm Tra Chất Lượng Khuôn Mặt

### 3.1 `checkFacePosition()` - Kiểm Tra Vị Trí Khuôn Mặt

```javascript:979:1049:d:/Exe101/face-auth-library-main/face-auth.js
checkFacePosition(face) {
    const boundingBox = face.boundingBox;
    const videoWidth = this.video.videoWidth;
    const videoHeight = this.video.videoHeight;
    
    const faceCenterX = (boundingBox.topLeft[0] + boundingBox.bottomRight[0]) / 2;
    const faceCenterY = (boundingBox.topLeft[1] + boundingBox.bottomRight[1]) / 2;
    
    const videoCenterX = videoWidth / 2;
    const videoCenterY = videoHeight / 2;
    
    const distanceX = Math.abs(faceCenterX - videoCenterX);
    const distanceY = Math.abs(faceCenterY - videoCenterY);
    
    const faceWidth = boundingBox.bottomRight[0] - boundingBox.topLeft[0];
    const faceHeight = boundingBox.bottomRight[1] - boundingBox.topLeft[1];
    const faceSize = Math.max(faceWidth, faceHeight);
    const minSize = Math.min(videoWidth, videoHeight) * this.config.minFaceSize;
    const maxSize = Math.min(videoWidth, videoHeight) * this.config.maxFaceSize;
    
    const isCentered = distanceX < videoWidth * this.config.centerThreshold && 
                      distanceY < videoHeight * this.config.centerThreshold &&
                      faceSize > minSize && 
                      faceSize < maxSize;
    
    let statusMessage = '';
    let voiceMessage = '';
    
    if (this.foreignObjectDetected) {
        this.faceMask.className = 'face-auth-mask error';
        statusMessage = 'Vui lòng chỉ để khuôn mặt trong khung hình';
    } else if (!this.faceValidationChecks.isFullFace) {
        this.faceMask.className = 'face-auth-mask error';
        statusMessage = 'Vui lòng để lộ toàn bộ khuôn mặt';
    } else if (isCentered && faceSize > minSize && faceSize < maxSize) {
        this.faceMask.className = 'face-auth-mask good';
        statusMessage = 'Khuôn mặt đã ở vị trí tốt. Giữ nguyên...';
    } else if (distanceX < videoWidth * this.config.warningThreshold && 
              distanceY < videoHeight * this.config.warningThreshold) {
        this.faceMask.className = 'face-auth-mask warning';
        
        if (faceSize < minSize) {
            statusMessage = 'Hãy tiến lại gần hơn.';
            voiceMessage = 'Hãy tiến lại gần hơn một chút';
        } else if (faceSize > maxSize) {
            statusMessage = 'Hãy lùi ra xa hơn.';
            voiceMessage = 'Hãy lùi ra xa hơn một chút';
        } else {
            statusMessage = 'Hãy di chuyển khuôn mặt vào giữa khung.';
            voiceMessage = 'Hãy di chuyển khuôn mặt vào giữa khung hình';
        }
    } else {
        this.faceMask.className = 'face-auth-mask error';
        statusMessage = 'Đưa khuôn mặt vào khung hình.';
        voiceMessage = 'Xin hãy đưa khuôn mặt vào trong khung hình';
    }
    
    if (statusMessage !== this.lastStatus) {
        this.setStatus(statusMessage);
        this.lastStatus = statusMessage;
        
        if (this.voiceEnabled && voiceMessage && voiceMessage !== this.lastVoiceMessage && 
            !this.isSpeaking && !this.foreignObjectDetected) {
            this.speak(voiceMessage);
            this.lastVoiceMessage = voiceMessage;
        }
    }
    
    return isCentered && faceSize > minSize && faceSize < maxSize && 
           !this.foreignObjectDetected && this.faceValidationChecks.isFullFace;
}
```

**Chức năng:**
- ✅ Tính toán tâm khuôn mặt và so sánh với tâm video
- ✅ Kiểm tra kích thước khuôn mặt (min: 30%, max: 60% của video)
- ✅ Phân loại trạng thái: `good`, `warning`, `error`
- ✅ Cập nhật UI mask với màu sắc tương ứng
- ✅ Phát hướng dẫn bằng giọng nói khi cần điều chỉnh

**Config mặc định:**
```javascript
minFaceSize: 0.3,        // 30% kích thước video
maxFaceSize: 0.6,        // 60% kích thước video
centerThreshold: 0.15,    // 15% tolerance cho vị trí trung tâm
warningThreshold: 0.25    // 25% tolerance cho cảnh báo
```

### 3.2 `validateFace()` - Xác Thực Đầy Đủ Khuôn Mặt

```javascript:943:968:d:/Exe101/face-auth-library-main/face-auth.js
validateFace(face) {
    this.resetFaceValidation();
    
    const landmarks = face.keypoints || face.scaledMesh || [];
    
    const leftEyeIndices = [33, 133, 160, 159, 158, 144, 145, 153];
    const rightEyeIndices = [362, 263, 387, 386, 385, 373, 374, 380];
    const noseIndices = [1, 2, 98, 327];
    const mouthIndices = [13, 14, 78, 308, 78, 95, 88, 178];
    
    this.faceValidationChecks.hasBothEyes = (
        leftEyeIndices.some(index => landmarks[index]) && 
        rightEyeIndices.some(index => landmarks[index])
    );
    
    this.faceValidationChecks.hasNose = noseIndices.some(index => landmarks[index]);
    this.faceValidationChecks.hasMouth = mouthIndices.some(index => landmarks[index]);
    
    this.faceValidationChecks.isFullFace = (
        this.faceValidationChecks.hasBothEyes && 
        this.faceValidationChecks.hasNose && 
        this.faceValidationChecks.hasMouth
    );
    
    return this.faceValidationChecks;
}
```

**Chức năng:**
- ✅ Kiểm tra sự tồn tại của **cả hai mắt** (left & right eye landmarks)
- ✅ Kiểm tra sự tồn tại của **mũi** (nose landmarks)
- ✅ Kiểm tra sự tồn tại của **miệng** (mouth landmarks)
- ✅ Trả về `isFullFace: true` chỉ khi tất cả đều được phát hiện

**Landmark Indices:**
- **Left Eye**: 33, 133, 160, 159, 158, 144, 145, 153
- **Right Eye**: 362, 263, 387, 386, 385, 373, 374, 380
- **Nose**: 1, 2, 98, 327
- **Mouth**: 13, 14, 78, 308, 78, 95, 88, 178

### 3.3 `checkFaceCovered()` - Kiểm Tra Khuôn Mặt Bị Che

```javascript:913:941:d:/Exe101/face-auth-library-main/face-auth.js
checkFaceCovered(face) {
    const landmarks = face.keypoints || face.scaledMesh || [];
    
    const leftEyeIndices = [33, 133, 160, 159, 158, 144, 145, 153];
    const rightEyeIndices = [362, 263, 387, 386, 385, 373, 374, 380];
    const noseIndices = [1, 2, 98, 327];
    const mouthIndices = [13, 14, 78, 308, 78, 95, 88, 178];
    
    const leftEyeCount = leftEyeIndices.filter(index => landmarks[index]).length;
    const rightEyeCount = rightEyeIndices.filter(index => landmarks[index]).length;
    const noseCount = noseIndices.filter(index => landmarks[index]).length;
    const mouthCount = mouthIndices.filter(index => landmarks[index]).length;
    
    if (leftEyeCount < 3 || rightEyeCount < 3 || noseCount < 2 || mouthCount < 3) {
        return true;
    }
    
    const boundingBox = face.boundingBox;
    if (boundingBox) {
        const faceWidth = boundingBox.bottomRight[0] - boundingBox.topLeft[0];
        const faceHeight = boundingBox.bottomRight[1] - boundingBox.topLeft[1];
        
        if (faceWidth < 100 || faceHeight < 100 || faceWidth/faceHeight < 0.5 || faceWidth/faceHeight > 2) {
            return true;
        }
    }
    
    return false;
}
```

**Chức năng:**
- ✅ Đếm số lượng landmarks được phát hiện cho từng phần khuôn mặt
- ✅ Kiểm tra nếu số lượng landmarks quá ít → khuôn mặt bị che
- ✅ Kiểm tra tỷ lệ khung hình (aspect ratio) của bounding box
- ✅ Trả về `true` nếu phát hiện khuôn mặt bị che

**Ngưỡng kiểm tra:**
- Left eye: < 3 landmarks → bị che
- Right eye: < 3 landmarks → bị che
- Nose: < 2 landmarks → bị che
- Mouth: < 3 landmarks → bị che
- Face size: < 100px hoặc aspect ratio không hợp lý → bị che

---

## 4. UI Popup với Hướng Dẫn, Progress Bar và Voice Feedback

### 4.1 Cấu Trúc DOM

```javascript:77:156:d:/Exe101/face-auth-library-main/face-auth.js
createPopupStructure() {
    const overlay = document.createElement('div');
    overlay.className = 'face-auth-overlay';
    overlay.id = 'faceAuthOverlay';
    
    const popup = document.createElement('div');
    popup.className = 'face-auth-popup';
    popup.id = 'faceAuthPopup';
    popup.innerHTML = `
        <div class="face-auth-header">
            <div>
                <div class="face-auth-title">Xác Thực Khuôn Mặt</div>
                <div class="face-auth-subtitle">Hệ thống sẽ hướng dẫn bạn định vị khuôn mặt</div>
            </div>
            <div class="face-auth-header-controls">
                <button class="face-auth-voice-toggle" id="faceAuthVoiceToggle" title="Bật/Tắt giọng nói">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                        <line x1="12" y1="19" x2="12" y2="23"></line>
                        <line x1="8" y1="23" x2="16" y2="23"></line>
                    </svg>
                </button>
                <button class="face-auth-close-btn" id="faceAuthCloseBtn">×</button>
            </div>
        </div>
        <div class="face-auth-body">
            <div class="face-auth-loading-container" id="faceAuthLoadingModels">
                <div class="face-auth-spinner"></div>
                <h3>Đang tải hệ thống</h3>
                <p>Xin đợi một lát...</p>
            </div>

            <div id="faceAuthCameraContent" class="face-auth-hidden">
                <div class="face-auth-content">
                    <div class="face-auth-video-container">
                        <video class="face-auth-video" id="faceAuthVideo" autoplay playsinline></video>
                        <div class="face-auth-video-overlay">
                            <div class="face-auth-mask" id="faceAuthMask"></div>
                        </div>
                    </div>

                    <div class="face-auth-sidebar">
                        <div class="face-auth-instructions">
                            <ul>
                                <li>Giữ khuôn mặt ở giữa khung hình</li>
                                <li>Đảm bảo ánh sáng đầy đủ và rõ ràng</li>
                                <li>Giữ nguyên tư thế khi hệ thống đang xác thực</li>
                            </ul>
                        </div>

                        <div class="face-auth-status-container">
                            <div class="face-auth-status-text" id="faceAuthStatusText">Đang khởi tạo camera...</div>
                            <div class="face-auth-progress-container">
                                <div class="face-auth-progress-bar">
                                    <div class="face-auth-progress-fill" id="faceAuthProgressFill"></div>
                                </div>
                                <div class="face-auth-progress-text" id="faceAuthProgressText">0%</div>
                            </div>
                        </div>

                        <div class="face-auth-error-message" id="faceAuthErrorMessage"></div>
                        <div class="face-auth-success-message" id="faceAuthSuccessMessage"></div>
                    </div>
                </div>
            </div>
        </div>
    `;

    const canvas = document.createElement('canvas');
    canvas.id = 'faceAuthCanvas';
    canvas.className = 'face-auth-hidden';

    document.body.appendChild(overlay);
    document.body.appendChild(popup);
    document.body.appendChild(canvas);

    // Inject styles
    this.injectStyles();
}
```

### 4.2 Progress Bar Logic

```javascript:1176:1230:d:/Exe101/face-auth-library-main/face-auth.js
onFaceDetectionResult(centered) {
    if (this.isCapturing || this.foreignObjectDetected || !this.faceValidationChecks.isFullFace) return;
    
    if (centered && !this.isCentered) {
        this.isCentered = true;
        
        if (!this.progressInterval) {
            this.progressInterval = setInterval(() => this.increaseProgress(), this.config.progressIntervalTime);
        }
        
        if (this.voiceEnabled && !this.isSpeaking) {
            this.speak("Tốt lắm! Giữ nguyên tư thế");
        }
    } else if (!centered && this.isCentered) {
        this.isCentered = false;
        this.resetProgress();
    }
}

increaseProgress() {
    if (!this.isCentered) {
        this.resetProgress();
        return;
    }

    if (this.progress < 100) {
        this.progress += this.config.progressStep;
        this.updateProgressUI();
        
        if (this.progress === 30) {
            this.setStatus('Đang xác thực...');
            if (this.voiceEnabled && !this.isSpeaking) {
                this.speak("Đang xác thực khuôn mặt");
            }
        } else if (this.progress === 60) {
            this.setStatus('Sắp xong rồi...');
            if (this.voiceEnabled && !this.isSpeaking) {
                this.speak("Sắp xong rồi, cố gắng giữ nguyên tư thế");
            }
        } else if (this.progress === 85) {
            this.setStatus('Cố đừng rời camera...');
            if (this.voiceEnabled && !this.isSpeaking) {
                this.speak("Cố gắng đừng rời camera");
            }
        }
    } else {
        clearInterval(this.progressInterval);
        this.progressInterval = null;
        this.setStatus('Tuyệt quá!');
        if (this.voiceEnabled && !this.isSpeaking) {
            this.speak("Tuyệt quá! Xác thực thành công. Cảm ơn quý khách");
        }
        this.captureImage();
    }
}
```

**Đặc điểm:**
- ✅ Progress chỉ tăng khi khuôn mặt ở vị trí tốt (`isCentered === true`)
- ✅ Reset progress ngay lập tức nếu khuôn mặt rời khỏi vị trí tốt
- ✅ Voice feedback tại các mốc: 30%, 60%, 85%, 100%
- ✅ Tự động capture ảnh khi đạt 100%

### 4.3 Voice Feedback Tiếng Việt

```javascript:1124:1173:d:/Exe101/face-auth-library-main/face-auth.js
speak(text) {
    // Nếu đang tắt tiếng thì thôi
    if (!this.voiceEnabled) return;
    if (!('speechSynthesis' in window)) return;

    // Hủy mọi câu đang queue để tránh bị kẹt, sau đó nói câu mới
    try {
        window.speechSynthesis.cancel();
    } catch (e) {
        console.warn('Cancel speech error:', e);
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 0.9;

    // Nếu lúc init đã chọn được voice tiếng Việt thì dùng
    if (this.viVoice) {
        utterance.voice = this.viVoice;
        utterance.lang = this.viVoice.lang;
    } else {
        // Fallback: cố tìm lại 1 lần
        const voices = window.speechSynthesis.getVoices();
        const viVoice = voices.find(v =>
            v.lang.toLowerCase().includes('vi') ||
            v.name.toLowerCase().includes('vietnam')
        );
        if (viVoice) {
            utterance.voice = viVoice;
            utterance.lang = viVoice.lang;
        }
    }

    this.isSpeaking = true;

    utterance.onend = () => {
        this.isSpeaking = false;
        console.log('Speech finished:', text);
    };

    utterance.onerror = (e) => {
        this.isSpeaking = false;
        console.error('Speech error:', e);
    };

    console.log('Speaking:', text);
    window.speechSynthesis.speak(utterance);
}
```

**Đặc điểm:**
- ✅ Sử dụng Web Speech API (`speechSynthesis`)
- ✅ Ưu tiên tìm voice tiếng Việt (`vi-VN`)
- ✅ Fallback sang tiếng Anh nếu không có voice tiếng Việt
- ✅ Hủy các câu đang queue trước khi nói câu mới
- ✅ Quản lý state `isSpeaking` để tránh overlap

**Voice Initialization:**

```javascript:533:566:d:/Exe101/face-auth-library-main/face-auth.js
initVoice() {
    // Nếu browser không hỗ trợ thì tắt luôn
    if (!('speechSynthesis' in window)) {
        console.warn('Speech synthesis not supported');
        this.voiceEnabled = false;
        if (this.voiceToggle) {
            this.voiceToggle.style.display = 'none';
        }
        return;
    }

    // Gọi trước 1 lần để "wake up" voice list (trick cho Chrome)
    try {
        window.speechSynthesis.getVoices();
    } catch (e) {
        console.warn('Cannot pre-load voices:', e);
    }

    const pickVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        if (!voices || !voices.length) return;

        // Ưu tiên tiếng Việt
        this.viVoice =
            voices.find(v => v.lang.toLowerCase().startsWith('vi')) ||
            voices.find(v => v.lang.toLowerCase().startsWith('en')) ||
            voices[0];

        console.log('Selected voice:', this.viVoice && this.viVoice.name);
    };

    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;
}
```

---

## 5. So Sánh với Implementation Hiện Tại

### 5.1 FaceRegistrationPage.tsx (Hiện Tại)

**Đặc điểm:**
- ❌ **Không có face detection**: Chỉ chụp ảnh thủ công khi người dùng bấm nút
- ❌ **Không có validation**: Không kiểm tra chất lượng khuôn mặt trước khi chụp
- ❌ **Không có real-time feedback**: Không có hướng dẫn vị trí khuôn mặt
- ❌ **Không có voice guidance**: Không có hướng dẫn bằng giọng nói
- ❌ **Manual capture**: Người dùng phải tự chụp 5-7 ảnh
- ✅ **Simple UI**: Giao diện đơn giản với Card component
- ✅ **Multiple images**: Hỗ trợ chụp nhiều ảnh (5-7 ảnh)

**Code hiện tại:**

```typescript:12:73:d:\OJT\SmartAttendance\frontend\src\components\dashboard\pages\FaceRegistrationPage.tsx
const FaceRegistrationPage: React.FC = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraReady(true);
      }
    } catch (error) {
      toast.error("Không thể truy cập camera. Vui lòng cấp quyền camera.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  };

  const capturePhoto = useCallback((): string | null => {
    if (!videoRef.current || !cameraReady) return null;
    const canvas = document.createElement("canvas");
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.8);
  }, [cameraReady]);

  const handleCapture = () => {
    if (capturedImages.length >= MAX_IMAGES) {
      toast.warning(`Tối đa ${MAX_IMAGES} ảnh được phép.`);
      return;
    }
    const photo = capturePhoto();
    if (photo) {
      setCapturedImages((prev) => [...prev, photo]);
      toast.success(`Đã chụp ảnh ${capturedImages.length + 1}/${MAX_IMAGES}`);
    }
  };
```

### 5.2 Face-Auth-Library (Tham Khảo)

**Đặc điểm:**
- ✅ **Real-time face detection**: Sử dụng TensorFlow.js + MediaPipe FaceMesh
- ✅ **Face validation**: Kiểm tra đầy đủ mắt, mũi, miệng
- ✅ **Position checking**: Kiểm tra vị trí và kích thước khuôn mặt
- ✅ **Covered face detection**: Phát hiện khuôn mặt bị che
- ✅ **Voice guidance**: Hướng dẫn bằng giọng nói tiếng Việt
- ✅ **Progress bar**: Hiển thị tiến trình xác thực
- ✅ **Auto capture**: Tự động chụp khi đạt điều kiện
- ✅ **Visual feedback**: Mask overlay với màu sắc trạng thái

### 5.3 Bảng So Sánh Chi Tiết

| Tính năng | FaceRegistrationPage.tsx | face-auth-library |
|-----------|---------------------------|-------------------|
| **Face Detection** | ❌ Không có | ✅ TensorFlow.js + MediaPipe |
| **Real-time Validation** | ❌ Không có | ✅ Kiểm tra liên tục |
| **Position Check** | ❌ Không có | ✅ `checkFacePosition()` |
| **Face Quality Check** | ❌ Không có | ✅ `validateFace()` |
| **Covered Face Detection** | ❌ Không có | ✅ `checkFaceCovered()` |
| **Voice Guidance** | ❌ Không có | ✅ Tiếng Việt |
| **Progress Bar** | ❌ Không có | ✅ 0-100% với milestones |
| **Visual Feedback** | ❌ Chỉ video | ✅ Mask overlay + màu sắc |
| **Auto Capture** | ❌ Manual | ✅ Tự động khi đạt điều kiện |
| **Multiple Faces Detection** | ❌ Không có | ✅ Phát hiện nhiều khuôn mặt |
| **Error Messages** | ⚠️ Toast only | ✅ Toast + Voice + UI |
| **UI/UX** | ⚠️ Basic | ✅ Professional với animations |

---

## 6. Khuyến Nghị Cải Thiện

### 6.1 Tích Hợp TensorFlow.js vào FaceRegistrationPage

**Bước 1: Cài đặt dependencies**

```bash
npm install @tensorflow/tfjs @tensorflow-models/face-landmarks-detection
```

**Bước 2: Tạo hook cho face detection**

```typescript
// hooks/useFaceDetection.ts
import { useEffect, useRef, useState } from 'react';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import '@tensorflow/tfjs';

export const useFaceDetection = (videoRef: React.RefObject<HTMLVideoElement>) => {
  const [model, setModel] = useState<faceLandmarksDetection.FaceLandmarksDetector | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [faceDetected, setFaceDetected] = useState(false);
  const [facePosition, setFacePosition] = useState<'good' | 'warning' | 'error'>('error');
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    loadModel();
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const loadModel = async () => {
    try {
      const loadedModel = await faceLandmarksDetection.load(
        faceLandmarksDetection.SupportedPackages.mediapipeFacemesh,
        { maxFaces: 1, shouldLoadIrisModel: false }
      );
      setModel(loadedModel);
      setIsModelLoading(false);
    } catch (error) {
      console.error('Failed to load face detection model:', error);
      setIsModelLoading(false);
    }
  };

  const detectFaces = async () => {
    if (!model || !videoRef.current) return;

    const faces = await model.estimateFaces({
      input: videoRef.current,
      returnTensors: false,
      flipHorizontal: false,
      predictIrises: false,
    });

    if (faces.length > 0) {
      setFaceDetected(true);
      // Implement position checking logic here
      // Similar to checkFacePosition() from face-auth-library
    } else {
      setFaceDetected(false);
      setFacePosition('error');
    }

    animationFrameRef.current = requestAnimationFrame(detectFaces);
  };

  useEffect(() => {
    if (model && videoRef.current && !isModelLoading) {
      detectFaces();
    }
  }, [model, isModelLoading]);

  return {
    model,
    isModelLoading,
    faceDetected,
    facePosition,
  };
};
```

**Bước 3: Tích hợp vào component**

```typescript
// FaceRegistrationPage.tsx
import { useFaceDetection } from '@/hooks/useFaceDetection';

const FaceRegistrationPage: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { faceDetected, facePosition, isModelLoading } = useFaceDetection(videoRef);
  
  // ... rest of the code
};
```

### 6.2 Thêm Voice Guidance

```typescript
// utils/voiceFeedback.ts
export const useVoiceFeedback = () => {
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speak = useCallback((text: string) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    utterance.rate = 1.0;
    utterance.volume = 0.9;

    const voices = window.speechSynthesis.getVoices();
    const viVoice = voices.find(v => 
      v.lang.toLowerCase().includes('vi') || 
      v.name.toLowerCase().includes('vietnam')
    );
    
    if (viVoice) {
      utterance.voice = viVoice;
    }

    setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [voiceEnabled]);

  return { speak, voiceEnabled, setVoiceEnabled, isSpeaking };
};
```

### 6.3 Thêm Progress Bar và Visual Feedback

```typescript
// components/FaceCaptureProgress.tsx
import { useEffect, useState } from 'react';

interface FaceCaptureProgressProps {
  isFaceCentered: boolean;
  onComplete: () => void;
}

export const FaceCaptureProgress: React.FC<FaceCaptureProgressProps> = ({
  isFaceCentered,
  onComplete,
}) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isFaceCentered) {
      setProgress(0);
      return;
    }

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          onComplete();
          return 100;
        }
        return prev + 1;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isFaceCentered, onComplete]);

  return (
    <div className="space-y-2">
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div
          className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-sm text-center text-gray-400">{progress}%</p>
    </div>
  );
};
```

---

## 7. Kết Luận

### Ưu Điểm của face-auth-library:

1. **Comprehensive Face Validation**: Kiểm tra đầy đủ các yếu tố chất lượng khuôn mặt
2. **Real-time Feedback**: Phản hồi tức thời giúp người dùng điều chỉnh vị trí
3. **Voice Guidance**: Hướng dẫn bằng giọng nói tiếng Việt rất thân thiện
4. **Professional UI**: Giao diện đẹp với animations và visual feedback
5. **Auto Capture**: Tự động chụp khi đạt điều kiện, giảm lỗi người dùng

### Nhược Điểm của Implementation Hiện Tại:

1. **Không có validation**: Có thể chụp ảnh khuôn mặt không đạt chất lượng
2. **Manual process**: Người dùng phải tự chụp nhiều lần
3. **Không có feedback**: Không biết khuôn mặt có đúng vị trí hay không
4. **UX kém**: Không có hướng dẫn rõ ràng

### Khuyến Nghị:

1. **Tích hợp TensorFlow.js** để có face detection real-time
2. **Thêm các phương thức validation** từ face-auth-library
3. **Implement voice guidance** để cải thiện UX
4. **Thêm progress bar** và visual feedback
5. **Cân nhắc sử dụng face-auth-library** như một dependency hoặc tham khảo để implement tương tự

---

## 8. Tài Liệu Tham Khảo

- [TensorFlow.js Documentation](https://www.tensorflow.org/js)
- [MediaPipe FaceMesh](https://google.github.io/mediapipe/solutions/face_mesh.html)
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [face-auth-library GitHub](https://github.com/fdhhhdjd/face-auth-library)

