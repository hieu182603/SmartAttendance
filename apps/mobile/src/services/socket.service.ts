import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../constants/api';

class SocketService {
    private socket: Socket | null = null;
    private token: string | null = null;

    /**
     * Connect to Socket.IO server with JWT token
     */
    connect(token: string): Socket {
        // If already connected with same token, return existing socket
        if (this.socket?.connected && this.token === token) {
            return this.socket;
        }

        // Disconnect existing socket if any
        this.disconnect();

        this.token = token;

        console.log('[Socket] Connecting to:', SOCKET_URL);

        this.socket = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 10,
            reconnectionDelayMax: 5000,
            timeout: 20000,
            autoConnect: true,
        });

        // Connection event handlers
        this.socket.on('connect', () => {
            console.log('[Socket] Connected successfully, id:', this.socket?.id);
        });

        this.socket.on('disconnect', (reason) => {
            console.log('[Socket] Disconnected:', reason);
        });

        this.socket.on('connect_error', (error) => {
            console.warn('[Socket] Connection error:', error.message);
        });

        this.socket.on('reconnect_attempt', (attempt) => {
            console.log('[Socket] Reconnect attempt:', attempt);
        });

        this.socket.on('reconnect', (attempt) => {
            console.log('[Socket] Reconnected after', attempt, 'attempts');
        });

        this.socket.on('reconnect_failed', () => {
            console.error('[Socket] Reconnection failed');
        });

        return this.socket;
    }

    /**
     * Disconnect from Socket.IO server
     */
    disconnect(): void {
        if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.disconnect();
            this.socket = null;
            this.token = null;
            console.log('[Socket] Disconnected and cleaned up');
        }
    }

    /**
     * Get the current socket instance
     */
    getSocket(): Socket | null {
        return this.socket;
    }

    /**
     * Check if socket is connected
     */
    isConnected(): boolean {
        return this.socket?.connected ?? false;
    }
}

// Export singleton instance
export const socketService = new SocketService();
