import { AlertTriangle, Home } from 'lucide-react';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRoleBasePath, UserRole, type UserRoleType } from '../utils/roles';

export default function UnauthorizedPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const basePath = getRoleBasePath((user?.role as UserRoleType) || UserRole.EMPLOYEE);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="text-center space-y-4 max-w-md p-6">
        <AlertTriangle className="h-16 w-16 text-[var(--warning)] mx-auto" />
        <h1 className="text-2xl font-bold text-[var(--text-main)]">
          Không có quyền truy cập
        </h1>
        <p className="text-[var(--text-sub)]">
          Bạn không có quyền truy cập trang này. Vui lòng liên hệ quản trị viên nếu bạn cần quyền truy cập.
        </p>
        <Button onClick={() => navigate(basePath)}>
          <Home className="h-4 w-4 mr-2" />
          Về trang chủ
        </Button>
      </div>
    </div>
  );
}

