import nodemailer from "nodemailer";

const maskEmail = (email = "") => {
    if (!email?.includes("@")) return "unknown";
    const [localPart, domain] = email.split("@");
    const safeLocal =
        localPart.length <= 2
            ? `${localPart[0] || "*"}*`
            : `${localPart.slice(0, 2)}***`;
    return `${safeLocal}@${domain}`;
};

const createTransporter = () => {
    const emailConfig = {
        host: process.env.EMAIL_HOST || "smtp.gmail.com",
        port: Number.parseInt(process.env.EMAIL_PORT || "587", 10),
        secure: process.env.EMAIL_SECURE === "true",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    };

    if (!emailConfig.auth.user || !emailConfig.auth.pass) {
        throw new Error("Email credentials (EMAIL_USER and EMAIL_PASS) are required to send emails. Please configure them in your .env file.");
    }

    return nodemailer.createTransport(emailConfig);
};

/**
 * Send OTP email
 * @param {string} to - Recipient email
 * @param {string} otp - OTP code
 * @param {string} name - Recipient name (optional)
 * @returns {Promise<Object>} Send result
 */
export const sendOTPEmail = async (to, otp, name = "User") => {
    // Check if email credentials are configured
    const hasEmailConfig = process.env.EMAIL_USER && process.env.EMAIL_PASS;

    // Only use dev mode if explicitly set OR if no email config is available
    // If email config exists, try to send real email even in development
    const isDevModeOnly = process.env.EMAIL_DEV_MODE === "true" || !hasEmailConfig;

    if (isDevModeOnly) {
        console.log("\n" + "=".repeat(60));
        console.log("📧 [DEV MODE] OTP Email (Not sent - Development mode)");
        console.log("=".repeat(60));
        console.log(`To: ${maskEmail(to)}`);
        console.log(`Name: ${name}`);
        console.log("OTP: [REDACTED]");
        console.log(`Expires in: 10 minutes`);
        console.log("=".repeat(60) + "\n");
        return { success: true, messageId: "dev-mode", devMode: true };
    }

    try {
        const transporter = createTransporter();

        const mailOptions = {
            from: `"SmartAttendance" <${process.env.EMAIL_USER || "noreply@smartattendance.com"}>`,
            to: to,
            subject: "Verify Your Email - AttendanceSmart",
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                        .otp-box { background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
                        .otp-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; }
                        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>AttendanceSmart</h1>
                        </div>
                        <div class="content">
                            <h2>Hello ${name}!</h2>
                            <p>Thank you for registering with SmartAttendance. Please verify your email address by entering the OTP code below:</p>
                            
                            <div class="otp-box">
                                <div class="otp-code">${otp}</div>
                            </div>
                            
                            <p>This code will expire in <strong>10 minutes</strong>.</p>
                            <p>If you didn't create an account, please ignore this email.</p>
                        </div>
                        <div class="footer">
                            <p>&copy; ${new Date().getFullYear()} SmartAttendance. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: `
                Hello ${name}!
                
                Thank you for registering with SmartAttendance. Please verify your email address by entering the OTP code below:
                
                ${otp}
                
                This code will expire in 10 minutes.
                
                If you didn't create an account, please ignore this email.
                
                © ${new Date().getFullYear()} SmartAttendance. All rights reserved.
            `
        };

        const info = await transporter.sendMail(mailOptions);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        // Không log OTP để tránh lộ thông tin nhạy cảm trong log.
        console.error("❌ Error sending OTP email:", error.message);
        console.log("\n" + "=".repeat(60));
        console.log("⚠️  Email không gửi được, OTP đã được tạo an toàn trong hệ thống.");
        console.log(`📧 Email: ${maskEmail(to)}`);
        console.log("🔑 OTP: [REDACTED]");
        console.log("=".repeat(60) + "\n");

        // Trả về success để không làm fail registration
        return { success: false, messageId: null, error: error.message };
    }
};

/**
 * Send reset password OTP email
 * @param {string} to - Recipient email
 * @param {string} otp - OTP code
 * @param {string} name - Recipient name (optional)
 * @returns {Promise<Object>} Send result
 */
export const sendResetPasswordEmail = async (to, otp, name = "User") => {
    // Check if email credentials are configured
    const hasEmailConfig = process.env.EMAIL_USER && process.env.EMAIL_PASS;

    // Only use dev mode if explicitly set OR if no email config is available
    const isDevModeOnly = process.env.EMAIL_DEV_MODE === "true" || !hasEmailConfig;

    if (isDevModeOnly) {
        console.log("\n" + "=".repeat(60));
        console.log("📧 [DEV MODE] Reset Password OTP Email (Not sent - Development mode)");
        console.log("=".repeat(60));
        console.log(`To: ${maskEmail(to)}`);
        console.log(`Name: ${name}`);
        console.log("OTP: [REDACTED]");
        console.log(`Expires in: 10 minutes`);
        console.log("=".repeat(60) + "\n");
        return { success: true, messageId: "dev-mode", devMode: true };
    }

    try {
        const transporter = createTransporter();

        const mailOptions = {
            from: `"SmartAttendance" <${process.env.EMAIL_USER || "noreply@smartattendance.com"}>`,
            to: to,
            subject: "Reset Your Password - SmartAttendance",
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                        .otp-box { background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
                        .otp-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; }
                        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; border-radius: 4px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>SmartAttendance</h1>
                        </div>
                        <div class="content">
                            <h2>Hello ${name}!</h2>
                            <p>You have requested to reset your password. Please use the OTP code below to verify your identity:</p>
                            
                            <div class="otp-box">
                                <div class="otp-code">${otp}</div>
                            </div>
                            
                            <div class="warning">
                                <strong>⚠️ Security Notice:</strong> This code will expire in <strong>10 minutes</strong>. If you didn't request a password reset, please ignore this email and your password will remain unchanged.
                            </div>
                            
                            <p>After verifying the OTP, you will be able to set a new password for your account.</p>
                        </div>
                        <div class="footer">
                            <p>&copy; ${new Date().getFullYear()} SmartAttendance. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: `
                Hello ${name}!
                
                You have requested to reset your password. Please use the OTP code below to verify your identity:
                
                ${otp}
                
                This code will expire in 10 minutes. If you didn't request a password reset, please ignore this email and your password will remain unchanged.
                
                After verifying the OTP, you will be able to set a new password for your account.
                
                © ${new Date().getFullYear()} SmartAttendance. All rights reserved.
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Reset password OTP email sent:", info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error("❌ Error sending reset password OTP email:", error.message);
        console.log("\n" + "=".repeat(60));
        console.log("⚠️  Email không gửi được, OTP đã được tạo an toàn trong hệ thống.");
        console.log(`📧 Email: ${maskEmail(to)}`);
        console.log("🔑 OTP: [REDACTED]");
        console.log("=".repeat(60) + "\n");

        return { success: false, messageId: null, error: error.message };
    }
};

const PLAN_LABELS = { starter: "Starter", standard: "Standard", premium: "Premium" };
const CYCLE_LABELS = { monthly: "Hàng tháng", yearly: "Hàng năm" };

/**
 * Send payment confirmation email after successful plan upgrade.
 * @param {{ to: string, name: string, plan: string, billingCycle: string, amount: number, orderCode: number }} params
 */
export const sendPaymentConfirmationEmail = async ({ to, name, plan, billingCycle, amount, orderCode }) => {
    const hasEmailConfig = process.env.EMAIL_USER && process.env.EMAIL_PASS;
    const isDevMode = process.env.EMAIL_DEV_MODE === "true" || !hasEmailConfig;

    const planLabel = PLAN_LABELS[plan] ?? plan;
    const cycleLabel = CYCLE_LABELS[billingCycle] ?? billingCycle;
    const formattedAmount = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

    if (isDevMode) {
        console.log(`[DEV] Payment confirmation: ${maskEmail(to)} | ${planLabel} | ${cycleLabel} | ${formattedAmount}`);
        return { success: true, devMode: true };
    }

    try {
        const transporter = createTransporter();
        await transporter.sendMail({
            from: `"SmartAttendance" <${process.env.EMAIL_USER}>`,
            to,
            subject: `[SmartAttendance] Thanh toán thành công — Gói ${planLabel}`,
            html: `
                <!DOCTYPE html><html><head><meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #06b6d4, #3b82f6); color: white; padding: 28px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 28px; border-radius: 0 0 10px 10px; }
                    .info-box { background: white; border-left: 4px solid #06b6d4; padding: 16px; margin: 16px 0; border-radius: 4px; }
                    .footer { text-align: center; margin-top: 20px; color: #888; font-size: 12px; }
                </style></head>
                <body><div class="container">
                    <div class="header"><h1>SmartAttendance</h1><p>Thanh toán thành công!</p></div>
                    <div class="content">
                        <h2>Xin chào ${name}!</h2>
                        <p>Gói dịch vụ của công ty bạn đã được nâng cấp thành công.</p>
                        <div class="info-box">
                            <p><strong>Mã đơn hàng:</strong> #${orderCode}</p>
                            <p><strong>Gói:</strong> ${planLabel}</p>
                            <p><strong>Chu kỳ:</strong> ${cycleLabel}</p>
                            <p><strong>Số tiền:</strong> ${formattedAmount}</p>
                        </div>
                        <p>Cảm ơn bạn đã tin dùng SmartAttendance. Mọi thắc mắc vui lòng liên hệ bộ phận hỗ trợ.</p>
                    </div>
                    <div class="footer"><p>&copy; ${new Date().getFullYear()} SmartAttendance</p></div>
                </div></body></html>
            `,
        });
        return { success: true };
    } catch (error) {
        console.error("[email] sendPaymentConfirmationEmail failed:", error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Verify email transporter connection
 * @returns {Promise<boolean>} True if connection successful
 */
export const verifyEmailConnection = async () => {
    try {
        // Check if email config exists first
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.warn("⚠️ Email credentials not configured. Skipping email server verification.");
            return false;
        }

        const transporter = createTransporter();
        await transporter.verify();
        console.log("Email server is ready");
        return true;
    } catch (error) {
        console.error("❌ Email server connection failed:", error.message);
        return false;
    }
};

