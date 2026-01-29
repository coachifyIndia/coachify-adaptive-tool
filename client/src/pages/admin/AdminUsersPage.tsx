import { useEffect, useState } from 'react';
import {
  Plus,
  UserCog,
  Shield,
  ShieldCheck,
  ShieldAlert,
  MoreVertical,
  Trash2,
  Edit2,
  X,
  Check,
  AlertCircle,
} from 'lucide-react';
import {
  adminManagementService,
  AdminRole,
} from '../../services/admin.service';
import type { Admin } from '../../services/admin.service';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { cn } from '../../utils/cn';
import { useAdminAuth } from '../../context/AdminAuthContext';

const ROLE_CONFIG: Record<string, { label: string; icon: typeof Shield; color: string; bgColor: string }> = {
  [AdminRole.SUPER_ADMIN]: {
    label: 'Super Admin',
    icon: ShieldAlert,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
  },
  [AdminRole.CONTENT_ADMIN]: {
    label: 'Content Admin',
    icon: ShieldCheck,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  [AdminRole.REVIEWER]: {
    label: 'Reviewer',
    icon: Shield,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
};

interface CreateAdminForm {
  name: string;
  email: string;
  password: string;
  role: AdminRole;
}

export default function AdminUsersPage() {
  const { admin: currentAdmin } = useAdminAuth();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState<CreateAdminForm>({
    name: '',
    email: '',
    password: '',
    role: AdminRole.REVIEWER,
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await adminManagementService.getAdmins();
      setAdmins(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load admins');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAdmin = async () => {
    if (!createForm.name || !createForm.email || !createForm.password) {
      setCreateError('All fields are required');
      return;
    }

    try {
      setIsCreating(true);
      setCreateError(null);
      const newAdmin = await adminManagementService.createAdmin(createForm);
      setAdmins((prev) => [...prev, newAdmin]);
      setShowCreateModal(false);
      setCreateForm({ name: '', email: '', password: '', role: AdminRole.REVIEWER });
    } catch (err: any) {
      setCreateError(err.response?.data?.message || 'Failed to create admin');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateAdmin = async (adminId: string, updates: Partial<{ name: string; role: AdminRole; is_active: boolean }>) => {
    try {
      const updatedAdmin = await adminManagementService.updateAdmin(adminId, updates);
      setAdmins((prev) => prev.map((a) => (a.admin_id === adminId ? updatedAdmin : a)));
      setEditingAdmin(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update admin');
    }
  };

  const handleDeleteAdmin = async (adminId: string) => {
    if (!confirm('Are you sure you want to delete this admin?')) return;

    try {
      await adminManagementService.deleteAdmin(adminId);
      setAdmins((prev) => prev.filter((a) => a.admin_id !== adminId));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete admin');
    }
  };

  const handleToggleActive = async (admin: Admin) => {
    await handleUpdateAdmin(admin.admin_id, { is_active: !admin.is_active });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-red-500" />
        <span className="text-red-700">{error}</span>
        <Button variant="outline" size="sm" onClick={loadAdmins} className="ml-auto">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Admins</h1>
          <p className="text-gray-500 mt-1">Create and manage admin accounts</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Admin
        </Button>
      </div>

      {/* Admins List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Admin
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Login
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {admins.map((admin) => {
              const roleConfig = ROLE_CONFIG[admin.role] || ROLE_CONFIG[AdminRole.REVIEWER];
              const RoleIcon = roleConfig.icon;
              const isCurrentUser = admin.admin_id === currentAdmin?.admin_id;

              return (
                <tr key={admin.admin_id} className={cn(!admin.is_active && 'bg-gray-50 opacity-60')}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                        <UserCog className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {admin.name}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs text-indigo-600">(You)</span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500">{admin.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                        roleConfig.bgColor,
                        roleConfig.color
                      )}
                    >
                      <RoleIcon className="w-3.5 h-3.5" />
                      {roleConfig.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => !isCurrentUser && handleToggleActive(admin)}
                      disabled={isCurrentUser}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                        admin.is_active
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                        isCurrentUser && 'cursor-not-allowed opacity-50'
                      )}
                    >
                      {admin.is_active ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Active
                        </>
                      ) : (
                        <>
                          <X className="w-3.5 h-3.5" />
                          Inactive
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {admin.last_login
                      ? new Date(admin.last_login).toLocaleString()
                      : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {!isCurrentUser && (
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenu(openMenu === admin.admin_id ? null : admin.admin_id)}
                          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {openMenu === admin.admin_id && (
                          <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                            <button
                              onClick={() => {
                                setEditingAdmin(admin);
                                setOpenMenu(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                            >
                              <Edit2 className="w-4 h-4" />
                              Edit Role
                            </button>
                            <button
                              onClick={() => {
                                handleDeleteAdmin(admin.admin_id);
                                setOpenMenu(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {admins.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <UserCog className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No admins found</p>
          </div>
        )}
      </div>

      {/* Create Admin Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Create New Admin</h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateError(null);
                }}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {createError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-red-700">{createError}</span>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={createForm.name}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="John Doe"
                  className="h-10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="john@example.com"
                  className="h-10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <Input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Min 8 characters"
                  className="h-10"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Must contain uppercase, lowercase, number, and special character
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, role: e.target.value as AdminRole }))}
                  className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={AdminRole.REVIEWER}>Reviewer</option>
                  <option value={AdminRole.CONTENT_ADMIN}>Content Admin</option>
                  <option value={AdminRole.SUPER_ADMIN}>Super Admin</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateError(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateAdmin} disabled={isCreating} className="gap-2">
                {isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create Admin
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {editingAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Edit Role</h3>
              <button
                onClick={() => setEditingAdmin(null)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-600 mb-4">
                Change role for <strong>{editingAdmin.name}</strong>
              </p>
              <select
                defaultValue={editingAdmin.role}
                onChange={(e) => handleUpdateAdmin(editingAdmin.admin_id, { role: e.target.value as AdminRole })}
                className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value={AdminRole.REVIEWER}>Reviewer</option>
                <option value={AdminRole.CONTENT_ADMIN}>Content Admin</option>
                <option value={AdminRole.SUPER_ADMIN}>Super Admin</option>
              </select>
            </div>
            <div className="flex items-center justify-end p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <Button variant="outline" onClick={() => setEditingAdmin(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
