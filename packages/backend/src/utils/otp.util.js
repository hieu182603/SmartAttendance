const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;

/**
 * Generate random OTP code
 * @param {number} length - OTP length (default 6)
 * @returns {string} OTP code
 */
export const generateOTP = (length = OTP_LENGTH) => {
    const digits = "0123456789";
    let otp = "";

    for (let i = 0; i < length; i++) {
        otp += digits[Math.floor(Math.random() * 10)];
    }

    return otp;
};

/**
 * Generate OTP expiry date
 * @param {number} minutes - Minutes until expiry (default 10)
 * @returns {Date} Expiry date
 */
export const generateOTPExpiry = (minutes = OTP_EXPIRY_MINUTES) => {
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + minutes);
    return expiry;
};

/**
 * Check if OTP is expired
 * @param {Date} expiryDate - Expiry date
 * @returns {boolean} True if expired
 */
export const isOTPExpired = (expiryDate) => {
    if (!expiryDate) return true;
    return new Date() > new Date(expiryDate);
};

/**
 * Compare OTP codes
 * @param {string} inputOTP - User input OTP
 * @param {string} storedOTP - Stored OTP
 * @returns {boolean} True if match
 */
export const compareOTP = (inputOTP, storedOTP) => {
    if (!inputOTP || !storedOTP) return false;
    return inputOTP.trim() === storedOTP.trim();
};
