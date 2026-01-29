import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { adminAuthService, AdminRole } from '../services/admin.service';
import type { Admin } from '../services/admin.service';

interface AdminAuthContextType {
  admin: Admin | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => void;
  hasRole: (roles: AdminRole | AdminRole[]) => boolean;
  canManageAdmins: boolean;
  canEditQuestions: boolean;
  canPublishQuestions: boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if admin is already logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('admin_access_token');
      if (token) {
        try {
          const adminData = await adminAuthService.getCurrentAdmin();
          setAdmin(adminData);
          localStorage.setItem('admin_user', JSON.stringify(adminData));
        } catch (error) {
          console.error('Failed to fetch admin', error);
          localStorage.removeItem('admin_access_token');
          localStorage.removeItem('admin_refresh_token');
          localStorage.removeItem('admin_user');
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    const response = await adminAuthService.login(credentials);
    const { admin: adminData, tokens } = response.data;

    localStorage.setItem('admin_access_token', tokens.access_token);
    localStorage.setItem('admin_refresh_token', tokens.refresh_token);
    localStorage.setItem('admin_user', JSON.stringify(adminData));
    setAdmin(adminData);
  };

  const logout = useCallback(() => {
    adminAuthService.logout().catch(console.error);
    setAdmin(null);
  }, []);

  const hasRole = useCallback(
    (roles: AdminRole | AdminRole[]): boolean => {
      if (!admin) return false;
      const roleArray = Array.isArray(roles) ? roles : [roles];
      return roleArray.includes(admin.role);
    },
    [admin]
  );

  // Permission helpers
  const canManageAdmins = admin?.role === AdminRole.SUPER_ADMIN;
  const canEditQuestions =
    admin?.role === AdminRole.SUPER_ADMIN || admin?.role === AdminRole.CONTENT_ADMIN;
  const canPublishQuestions =
    admin?.role === AdminRole.SUPER_ADMIN || admin?.role === AdminRole.CONTENT_ADMIN;

  return (
    <AdminAuthContext.Provider
      value={{
        admin,
        isAuthenticated: !!admin,
        isLoading,
        login,
        logout,
        hasRole,
        canManageAdmins,
        canEditQuestions,
        canPublishQuestions,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};
