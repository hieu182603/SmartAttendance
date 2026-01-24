import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export function useSocket() {
  const { token } = useAuth()
  const location = useLocation()
  const socketRef = useRef<any | null>(null)
  const isConnectingRef = useRef(false)

  // Only connect on dashboard routes
  const shouldConnect = token && (
    location.pathname.startsWith('/employee') ||
    location.pathname.startsWith('/manager') ||
    location.pathname.startsWith('/hr') ||
    location.pathname.startsWith('/admin')
  )

  useEffect(() => {
    // If should not connect, disconnect any existing socket
    if (!shouldConnect) {
      if (socketRef.current) {
        if (import.meta.env.DEV) {
          console.log('[Socket] Disconnecting - not on dashboard route')
        }
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

    // Dynamically import socket.io-client only when needed
    const initSocket = async () => {
      try {
        const { io } = await import('socket.io-client')
        
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
      } catch (error) {
        console.error('[Socket] Error loading socket.io-client:', error)
        isConnectingRef.current = false
      }
    }

    initSocket()

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
  }, [token, shouldConnect])

  return socketRef.current
}

