/**
 * Utility to translate backend authentication error messages to localized strings.
 */
export const translateAuthError = (message: string, t: (key: string) => string): string => {
  if (!message) return '';

  const cleanMessage = message.trim();

  // Login Errors
  if (
    cleanMessage === 'Invalid credentials' || 
    cleanMessage === 'Invalid email or password'
  ) {
    return t('auth:login.invalidCredentials');
  }
  if (cleanMessage.includes('Email not verified')) {
    return t('auth:login.emailNotVerified');
  }

  // Register Errors
  if (
    cleanMessage === 'Email already registered' ||
    cleanMessage.includes('Không thể đăng ký với thông tin này')
  ) {
    return t('auth:register.emailAlreadyRegistered');
  }

  // OTP Verification Errors
  if (cleanMessage === 'Invalid OTP' || cleanMessage.includes('Mã OTP không hợp lệ')) {
    return t('auth:verifyOtp.otpInvalid');
  }
  if (cleanMessage === 'OTP expired' || cleanMessage.includes('OTP hết hạn')) {
    return t('auth:verifyOtp.otpExpired');
  }

  // General auth fallback translations if not match exactly
  if (cleanMessage.includes('Unauthorized') || cleanMessage.includes('401')) {
    return t('auth:login.invalidCredentials');
  }

  return message;
};
