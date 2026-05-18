import { UserRole } from './index';

export interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    avatar?: string;
    department?: {
        id: string;
        name: string;
    } | string; // Allow string for flexibility or object
    isActive: boolean;
    employeeId?: string;
    position?: string;
    phone?: string;
}

export interface AuthResponse {
    user: User;
    token: string;
    refreshToken?: string;
}
