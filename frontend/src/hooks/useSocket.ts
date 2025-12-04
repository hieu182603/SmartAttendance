import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from '@/context/AuthContext'

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export function useSocket() {
  const { token } = useAuth()
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!token) {
      return
    }

    // Initialize socket connection
    const socket = io(SOCKET_URL, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    })

    socketRef.current = socket

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [token])

  return socketRef.current
}

