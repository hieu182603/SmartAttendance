import nodemailer from "nodemailer";

const createTransporter = () => {
    const emailConfig = {
        host: process.env.EMAIL_HOST || "smtp.gmail.com",
        port: parseInt(process.env.EMAIL_PORT || "587"),
        secure: process.env.EMAIL_SECURE === "true",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    };

    if (!emailConfig.auth.user || !emailConfig.auth.pass) {
        console.warn("⚠️ Email config not found. Using test account (emails won't be sent).");
        return nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            auth: {
                user: "test@ethereal.email",
                pass: "test"
            }
        });
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
    try {
        const transporter = createTransporter();

        const mailOptions = {
            from: `"SmartAttendance" <${process.env.EMAIL_USER || "noreply@smartattendance.com"}>`,
            to: to,
            subject: "Verify Your Email - SmartAttendance",
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
                            <h1>SmartAttendance</h1>
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
        console.log("✅ OTP email sent:", info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error("❌ Error sending OTP email:", error);
        throw new Error("Failed to send OTP email");
    }
};

/**
 * Verify email transporter connection
 * @returns {Promise<boolean>} True if connection successful
 */
export const verifyEmailConnection = async () => {
    try {
        const transporter = createTransporter();
        await transporter.verify();
        console.log("✅ Email server is ready");
        return true;
    } catch (error) {
        console.error("❌ Email server connection failed:", error);
        return false;
    }
};

