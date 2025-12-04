import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from '@/context/AuthContext'

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export function useSocket() {
  const { token } = useAuth()
  const socketRef = useRef<Socket | null>(null)
  const isConnectingRef = useRef(false)

  useEffect(() => {
    if (!token) {
      // Cleanup existing socket if token is removed
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      isConnectingRef.current = false
      return
    }

    // Tránh tạo socket duplicate trong React Strict Mode
    if (socketRef.current?.connected) {
      return
    }

    isConnectingRef.current = true

    // Initialize socket connection
    const socket = io(SOCKET_URL, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      autoConnect: true,
    })

    // Suppress connection errors trong development (do React Strict Mode)
    socket.on('connect_error', (error) => {
      // Chỉ log trong development, không throw error
      if (import.meta.env.DEV) {
        // Silent - đây là expected behavior với React Strict Mode
      }
    })

    socketRef.current = socket

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        // Chỉ disconnect nếu socket đã connected
        if (socketRef.current.connected) {
          socketRef.current.disconnect()
        } else {
          // Nếu chưa connected, đóng ngay để tránh warning
          socketRef.current.close()
        }
        socketRef.current = null
      }
      isConnectingRef.current = false
    }
  }, [token])

  return socketRef.current
}

