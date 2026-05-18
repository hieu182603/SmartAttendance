import React, { createContext, useContext, useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { socketService } from '../services/socket.service';

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
    socket: null,
    isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { token } = useAuth();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (!token) {
            // No token = logout: disconnect socket
            socketService.disconnect();
            setSocket(null);
            setIsConnected(false);
            return;
        }

        // Connect with token
        const newSocket = socketService.connect(token);
        setSocket(newSocket);

        // Track connection state
        const handleConnect = () => setIsConnected(true);
        const handleDisconnect = () => setIsConnected(false);

        newSocket.on('connect', handleConnect);
        newSocket.on('disconnect', handleDisconnect);

        // Set initial state
        setIsConnected(newSocket.connected);

        return () => {
            newSocket.off('connect', handleConnect);
            newSocket.off('disconnect', handleDisconnect);
        };
    }, [token]);

    // Cleanup on unmount (app close)
    useEffect(() => {
        return () => {
            socketService.disconnect();
        };
    }, []);

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
};
