import { Platform } from 'react-native';

// Get API URL from environment variable
// Expo uses EXPO_PUBLIC_ prefix for public env vars
const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL || 'https://smartattendance-backend.fly.dev/api';

// Socket.IO connects to the server root (without /api suffix)
const getSocketUrl = () => {
  const url = BACKEND_URL.replace(/\/api\/?$/, '');
  return url;
};

// Platform-specific API URL (can override for different platforms if needed)
const getApiUrl = () => {
  // Use environment variable for all platforms
  return BACKEND_URL;
};

export const API_URL = getApiUrl();
export const SOCKET_URL = getSocketUrl();
export const AUTH_endpoints = {
  LOGIN: "/auth/login",
  REGISTER: "/auth/register",
  ME: "/auth/me",
};
