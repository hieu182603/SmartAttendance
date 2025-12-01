import { AlertTriangle, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRoleBasePath, UserRole, type UserRoleType } from '../utils/roles';

export default function UnauthorizedPage() {
  const { t } = useTranslation(['common']);
  const navigate = useNavigate();
  const { user } = useAuth();
  const basePath = getRoleBasePath((user?.role as UserRoleType) || UserRole.EMPLOYEE);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="text-center space-y-4 max-w-md p-6">
        <AlertTriangle className="h-16 w-16 text-[var(--warning)] mx-auto" />
        <h1 className="text-2xl font-bold text-[var(--text-main)]">
          {t('common:unauthorized.title')}
        </h1>
        <p className="text-[var(--text-sub)]">
          {t('common:unauthorized.description')}
        </p>
        <Button onClick={() => navigate(basePath)}>
          <Home className="h-4 w-4 mr-2" />
          {t('common:unauthorized.goHome')}
        </Button>
      </div>
    </div>
  );
}

