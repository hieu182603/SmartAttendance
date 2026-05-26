import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from '@/context/AuthContext'

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export function useSocket(): Socket | null {
  const { token } = useAuth()
  const [socket, setSocket] = useState<Socket | null>(null)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        if (socketRef.current.connected) {
          socketRef.current.disconnect()
        } else {
          socketRef.current.close()
        }
        socketRef.current = null
      }
      setSocket(null)
      return
    }

    if (socketRef.current?.connected) {
      return
    }

    const instance = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: true,
    })

    socketRef.current = instance
    setSocket(instance)

    if (import.meta.env.DEV) {
      instance.on('connect', () => console.log('[Socket] Connected successfully'))
      instance.on('disconnect', (reason) => console.log('[Socket] Disconnected:', reason))
      instance.on('connect_error', (error) => {
        console.warn('[Socket] Connection error:', error.message)
        console.warn('[Socket] Attempting to connect to:', SOCKET_URL)
      })
    }

    return () => {
      if (socketRef.current) {
        if (socketRef.current.connected) {
          socketRef.current.disconnect()
        } else {
          socketRef.current.close()
        }
        socketRef.current = null
      }
      setSocket(null)
    }
  }, [token])

  return socket
}
