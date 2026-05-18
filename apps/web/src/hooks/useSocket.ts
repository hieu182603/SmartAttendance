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
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: true,
    })

    // Connection event handlers
    socket.on('connect', () => {
      if (import.meta.env.DEV) {
        console.log('[Socket] Connected successfully')
      }
    })

    socket.on('disconnect', (reason) => {
      if (import.meta.env.DEV) {
        console.log('[Socket] Disconnected:', reason)
      }
    })

    socket.on('connect_error', (error) => {
      // Log error để debug nhưng không throw
      if (import.meta.env.DEV) {
        console.warn('[Socket] Connection error:', error.message)
        console.warn('[Socket] Attempting to connect to:', SOCKET_URL)
        console.warn('[Socket] Make sure backend server is running on port 4000')
      }
    })

    socket.on('reconnect_attempt', () => {
      if (import.meta.env.DEV) {
        console.log('[Socket] Attempting to reconnect...')
      }
    })

    socket.on('reconnect', (attemptNumber) => {
      if (import.meta.env.DEV) {
        console.log('[Socket] Reconnected after', attemptNumber, 'attempts')
      }
    })

    socket.on('reconnect_failed', () => {
      if (import.meta.env.DEV) {
        console.error('[Socket] Reconnection failed. Please check if backend server is running.')
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

