# 🚀 Hướng Dẫn Deploy Fly.io Thủ Công

## 🎯 **Tổng Quan Kiến Trúc**

Dự án sử dụng **monorepo** với 3 services:
- **Frontend**: React/Vite (Vercel)
- **Backend**: Node.js/Express (Fly.io)
- **AI Service**: Python/FastAPI (Fly.io)

**Lợi ích monorepo:**
- ✅ Code management dễ dàng
- ✅ Consistent versioning
- ✅ Shared configurations
- ✅ Easy cross-service development

---

## 📋 **Bước 1: Cài đặt Fly CLI**

### Windows:
1. Tải installer từ: https://fly.io/docs/flyctl/install/
2. Chạy file `.exe` và cài đặt
3. Mở PowerShell mới và test:
```powershell
fly --version
```

### Linux/Mac:
```bash
curl -L https://fly.io/install.sh | sh
```

---

## 🔐 **Bước 2: Đăng nhập Fly.io**

```bash
fly auth login
```
- Sẽ mở browser để login
- Chọn tài khoản GitHub/GitLab hoặc email

---

## 📱 **Bước 3: Deploy AI Service**

### Từ thư mục ai-service:

```bash
cd ai-service

# Tạo app mới (chỉ chạy lần đầu)
fly launch --name smartattendance-ai --region sin --no-deploy

# Deploy
fly deploy
```

### Cấu hình khi được hỏi:
- **App Name**: `smartattendance-ai`
- **Region**: Singapore (`sin`)
- **Organization**: Chọn organization của bạn
- **Skip PostgreSQL**: Có (không cần database)

---

## 💾 **Bước 4: Tạo Persistent Volume**

```bash
# Tạo volume 1GB cho models
fly volumes create ai_models --size 1 --region sin

# Deploy lại để mount volume
fly deploy
```

---

## ✅ **Bước 5: Kiểm tra Deploy**

```bash
# Check status
fly status

# Xem logs
fly logs

# Lấy URL của app
fly status --json | jq -r '.Hostname'
```

---

## 🏥 **Bước 6: Test AI Service**

```bash
# Thay YOUR_APP_URL bằng URL thực tế
curl https://YOUR_APP_URL/face/health

# Test với Swagger UI
# Mở: https://YOUR_APP_URL/docs
```

---

## 📊 **Monitoring**

```bash
# Xem metrics
fly metrics

# Check logs real-time
fly logs -f

# Scale nếu cần
fly scale count 2  # Scale lên 2 instances
```

---

## ⚙️ **Cấu hình Nâng cao**

### Auto-scaling:
```bash
fly autoscale set min=1 max=3
```

### Custom domain:
```bash
fly certs add yourdomain.com
```

### Environment variables:
```bash
fly secrets set API_KEY=your_key_here
```

---

## 🆘 **Troubleshooting**

### Build fails:
```bash
fly logs --app smartattendance-ai
```

### Service không start:
```bash
# Check environment
fly ssh console

# Trong container:
python --version
pip list
python run.py  # Test manual
```

### Memory issues:
```bash
# Upgrade VM
fly scale memory 4096  # 4GB RAM
```

---

## 💰 **Cost Estimation**

- **Free tier**: 3 shared VMs
- **Your config**: ~$8/month (2GB RAM, 1 CPU)
- **Monitor usage**: `fly dashboard`

---

## 🎯 **Quick Commands**

```bash
# Deploy changes
fly deploy

# View logs
fly logs -f

# SSH into app
fly ssh console

# Restart app
fly restart

# Delete app (nếu cần)
fly apps destroy smartattendance-ai
```
