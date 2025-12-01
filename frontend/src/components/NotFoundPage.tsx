import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, ArrowLeft, SearchX } from 'lucide-react';
import { Button } from './ui/button';
import { useAuth } from '../context/AuthContext';
import { getRoleBasePath, type UserRoleType } from '../utils/roles';

export default function NotFoundPage() {
  const { t } = useTranslation(['common']);
  const navigate = useNavigate();
  const { token, user } = useAuth();

  // Get home path - if authenticated, go to role's dashboard, otherwise landing page
  const getHomePath = () => {
    if (token && user?.role) {
      return getRoleBasePath(user.role as UserRoleType);
    }
    return '/';
  };

  const homePath = getHomePath();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-900 flex items-center justify-center p-4 overflow-hidden relative">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-300/30 dark:bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-300/30 dark:bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-indigo-300/30 dark:bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      <div className="max-w-2xl w-full text-center relative z-10">
        {/* 404 Animation Container */}
        <div className="relative mb-8">
          {/* Large 404 Text */}
          <div className="text-[200px] font-bold leading-none bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 dark:from-purple-400 dark:via-pink-400 dark:to-indigo-400 bg-clip-text text-transparent animate-gradient select-none">
            404
          </div>

          {/* Floating Icon */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-full p-6 shadow-2xl animate-float">
              <SearchX className="w-16 h-16 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        {/* Error Message */}
        <div className="space-y-4 mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            {t('common:notFound.title')}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-md mx-auto">
            {t('common:notFound.description')}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            size="lg"
            className="group relative overflow-hidden border-2 border-purple-300 dark:border-purple-700 hover:border-purple-500 dark:hover:border-purple-500 transition-all duration-300 min-w-[180px]"
          >
            <span className="absolute inset-0 bg-purple-100 dark:bg-purple-900/30 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300"></span>
            <ArrowLeft className="mr-2 h-5 w-5 relative z-10" />
            <span className="relative z-10">{t('common:notFound.goBack')}</span>
          </Button>

          <Button
            onClick={() => navigate(homePath)}
            size="lg"
            className="group relative overflow-hidden bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 dark:from-purple-500 dark:to-pink-500 dark:hover:from-purple-600 dark:hover:to-pink-600 transition-all duration-300 shadow-lg hover:shadow-xl min-w-[180px]"
          >
            <span className="absolute inset-0 bg-white/20 transform translate-x-full group-hover:translate-x-0 transition-transform duration-300"></span>
            <Home className="mr-2 h-5 w-5 relative z-10" />
            <span className="relative z-10">{t('common:notFound.goHome')}</span>
          </Button>
        </div>

        {/* Additional Help Text */}
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('common:notFound.contactSupport')}{' '}
            <a
              href="mailto:support@smartattendance.com"
              className="text-purple-600 dark:text-purple-400 hover:underline font-medium"
            >
              {t('common:notFound.contactLink')}
            </a>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes gradient {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .delay-1000 {
          animation-delay: 1s;
        }

        .delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </div>
  );
}
