import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  Crown,
  User,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  UserCheck,
  Lock,
  ArrowRight,
  Sparkles,
  Info
} from 'lucide-react';
import { UserProfile, UserRole, UserSession } from '../types';
import { fetchAllProfiles, updateUserRoleInDb } from '../lib/supabase';

interface UserRoleManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserSession | null;
  onRoleChanged?: (userId: string, newRole: UserRole) => void;
}

export const UserRoleManagementModal: React.FC<UserRoleManagementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onRoleChanged,
}) => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadProfiles();
    }
  }, [isOpen]);

  const loadProfiles = async () => {
    setLoading(true);
    try {
      const data = await fetchAllProfiles();
      setProfiles(data);
    } catch (e) {
      console.error('Error loading profiles:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRole = async (profile: UserProfile) => {
    const newRole: UserRole = profile.role === 'admin' ? 'user' : 'admin';
    setUpdatingId(profile.id);
    setStatusMessage(null);

    const result = await updateUserRoleInDb(profile.id, newRole);
    if (result.success) {
      setProfiles((prev) =>
        prev.map((p) => (p.id === profile.id ? { ...p, role: newRole, updatedAt: new Date().toISOString() } : p))
      );
      setStatusMessage({
        type: 'success',
        text: `Updated role for ${profile.email} to ${newRole === 'admin' ? 'Admin' : 'Standard User'}.`,
      });
      if (onRoleChanged) {
        onRoleChanged(profile.id, newRole);
      }
    } else {
      setStatusMessage({
        type: 'error',
        text: result.error || 'Failed to update user role in database.',
      });
    }
    setUpdatingId(null);
  };

  if (!isOpen) return null;

  const filteredProfiles = profiles.filter(
    (p) =>
      p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.fullName && p.fullName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div
      id="modal-user-management-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm transition-all"
    >
      <div
        id="modal-user-management-container"
        className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 bg-slate-50/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  User Role & Access Control Management
                </h2>
                <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                  Admin Only
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                View registered user profiles, change role permissions, and audit system access
              </p>
            </div>
          </div>

          <button
            id="btn-close-user-management"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Status notification */}
        {statusMessage && (
          <div
            className={`mx-6 mt-4 flex items-center gap-2 rounded-xl p-3 text-xs ${
              statusMessage.type === 'success'
                ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Search & Stats Bar */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-3 dark:border-slate-800">
          <div className="relative flex-1 max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users by name or email..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:border-indigo-400 dark:focus:bg-slate-900"
            />
          </div>

          <button
            onClick={loadProfiles}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Roles Table */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">User Profile</th>
                  <th className="px-4 py-3">Current Role</th>
                  <th className="px-4 py-3">Access Scope</th>
                  <th className="px-4 py-3 text-right">Role Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredProfiles.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                      {loading ? 'Loading user profiles...' : 'No user profiles found matching query.'}
                    </td>
                  </tr>
                ) : (
                  filteredProfiles.map((p) => {
                    const isAdmin = p.role === 'admin';
                    const isSelf = currentUser?.id === p.id || currentUser?.email === p.email;

                    return (
                      <tr
                        key={p.id}
                        className="transition hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`flex h-8 w-8 items-center justify-center rounded-lg font-bold text-xs ${
                                isAdmin
                                  ? 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
                                  : 'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400'
                              }`}
                            >
                              {isAdmin ? <Crown className="h-4 w-4" /> : <User className="h-4 w-4" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900 dark:text-slate-100">
                                  {p.fullName || p.email.split('@')[0]}
                                </span>
                                {isSelf && (
                                  <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                                    You
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-400">{p.email}</span>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                              isAdmin
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {isAdmin ? <Crown className="h-3 w-3" /> : <User className="h-3 w-3" />}
                            {isAdmin ? 'Admin' : 'Standard User'}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400">
                          {isAdmin ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                              Full Dashboard & Analytics
                            </span>
                          ) : (
                            <span className="text-slate-500">
                              Personal Notes, Tasks & Logs only
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          <button
                            id={`btn-toggle-role-${p.id}`}
                            onClick={() => handleToggleRole(p)}
                            disabled={updatingId === p.id}
                            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold shadow-xs transition ${
                              isAdmin
                                ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                : 'border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300'
                            }`}
                          >
                            {updatingId === p.id ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : isAdmin ? (
                              <>
                                <User className="h-3 w-3" />
                                <span>Demote to User</span>
                              </>
                            ) : (
                              <>
                                <Crown className="h-3 w-3" />
                                <span>Promote to Admin</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* RBAC Summary Card */}
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-xs dark:border-slate-800 dark:bg-slate-850/60">
            <div className="flex items-start gap-2.5">
              <Info className="h-4 w-4 shrink-0 text-indigo-500 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  Role-Based Access Control (RBAC) Permissions Matrix
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <div className="rounded-xl border border-amber-200/60 bg-amber-500/5 p-2.5">
                    <span className="font-bold text-amber-700 dark:text-amber-400">👑 Admin Role:</span>
                    <ul className="list-disc list-inside mt-1 space-y-0.5">
                      <li>Full Executive Dashboard & Chart Analytics</li>
                      <li>View and manage all system data & users</li>
                      <li>Export global workspace datasets</li>
                    </ul>
                  </div>
                  <div className="rounded-xl border border-indigo-200/60 bg-indigo-500/5 p-2.5">
                    <span className="font-bold text-indigo-700 dark:text-indigo-400">👤 Standard User Role:</span>
                    <ul className="list-disc list-inside mt-1 space-y-0.5">
                      <li>Personal Space: Create, View, Delete own items</li>
                      <li>Row Level Security (RLS) restricts access</li>
                      <li>Admin dashboards & metrics disabled/hidden</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
