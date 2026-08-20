import React, { useState } from 'react';
import {
  User,
  Mail,
  Shield,
  KeyRound,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Clock,
  FileText,
  CheckSquare,
  FolderOpen,
  Save,
  Lock,
  Loader2,
  Crown,
  LogOut,
  AlertCircle,
  Database,
  Calendar
} from 'lucide-react';
import { UserSession, MetricStats } from '../types';
import { getStoredSupabaseConfig } from '../lib/supabase';

interface AccountViewProps {
  currentUser: UserSession | null;
  stats: MetricStats;
  onUpdateProfile: (updated: { fullName: string }) => Promise<{ success: boolean; error?: string }>;
  onChangePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  onDeleteAccount: () => Promise<{ success: boolean; error?: string }>;
  onSignOut: () => void;
  onOpenAuth: (mode?: 'signin' | 'signup') => void;
  onOpenSqlModal: () => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const AccountView: React.FC<AccountViewProps> = ({
  currentUser,
  stats,
  onUpdateProfile,
  onChangePassword,
  onDeleteAccount,
  onSignOut,
  onOpenAuth,
  onOpenSqlModal,
  onShowToast,
}) => {
  const { isConfigured } = getStoredSupabaseConfig();

  // Profile Edit State
  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Password Change State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Delete Account Confirmation State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Update local state if currentUser changes
  React.useEffect(() => {
    if (currentUser?.fullName) {
      setFullName(currentUser.fullName);
    }
  }, [currentUser]);

  const getInitials = (name?: string, email?: string) => {
    if (name && name.trim()) {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return name.substring(0, 2).toUpperCase();
    }
    if (email) return email.substring(0, 2).toUpperCase();
    return 'WS';
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!fullName.trim()) {
      onShowToast('Please provide a valid display name.', 'error');
      return;
    }

    setIsUpdatingProfile(true);
    try {
      const res = await onUpdateProfile({ fullName: fullName.trim() });
      if (res.success) {
        onShowToast('Profile name updated successfully!', 'success');
      } else {
        onShowToast(res.error || 'Failed to update profile name.', 'error');
      }
    } catch (err: any) {
      onShowToast(err?.message || 'An unexpected error occurred.', 'error');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await onChangePassword(newPassword);
      if (res.success) {
        onShowToast('Password changed successfully!', 'success');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordError(res.error || 'Failed to change password.');
        onShowToast(res.error || 'Failed to change password.', 'error');
      }
    } catch (err: any) {
      setPasswordError(err?.message || 'Failed to change password.');
      onShowToast(err?.message || 'Failed to update password.', 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleExecuteDeleteAccount = async () => {
    if (deleteConfirmationText !== 'DELETE') {
      onShowToast('Please type "DELETE" exactly to confirm.', 'error');
      return;
    }

    setIsDeletingAccount(true);
    try {
      const res = await onDeleteAccount();
      if (res.success) {
        onShowToast('Your account and associated workspace data have been deleted.', 'success');
        setShowDeleteConfirm(false);
      } else {
        onShowToast(res.error || 'Failed to delete account.', 'error');
      }
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to delete account.', 'error');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center min-h-[60vh]">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 mb-4 shadow-sm">
          <User className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Account Not Signed In</h2>
        <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
          Sign in or create an account to view and manage your profile, customize your credentials, and securely manage your workspace data.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <button
            id="btn-account-view-signin"
            onClick={() => onOpenAuth('signin')}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition active:scale-95"
          >
            Sign In
          </button>
          <button
            id="btn-account-view-signup"
            onClick={() => onOpenAuth('signup')}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition active:scale-95"
          >
            Create Account
          </button>
        </div>
      </div>
    );
  }

  const memberSince = currentUser.createdAt
    ? new Date(currentUser.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Active Space';

  return (
    <div className="space-y-6 pb-12">
      {/* Page Title & Breadcrumb */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          My Account
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage your personal profile, credentials, security, and workspace data.
        </p>
      </div>

      {/* Main Profile Header Card */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition-all dark:border-slate-800 dark:bg-slate-900">
        <div className="h-28 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 sm:h-32 relative">
          <div className="absolute right-4 top-4 flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold shadow-xs ${
                currentUser.role === 'admin'
                  ? 'bg-amber-400/90 text-amber-950 backdrop-blur-xs'
                  : 'bg-white/90 text-indigo-950 backdrop-blur-xs'
              }`}
            >
              {currentUser.role === 'admin' ? (
                <>
                  <Crown className="h-3.5 w-3.5" />
                  <span>Admin Privileges</span>
                </>
              ) : (
                <>
                  <User className="h-3.5 w-3.5" />
                  <span>Standard User</span>
                </>
              )}
            </span>
          </div>
        </div>

        <div className="relative px-6 pb-6 pt-0">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 sm:-mt-14 mb-4">
            <div className="flex items-end gap-4">
              <div className="flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-3xl bg-slate-900 text-2xl sm:text-3xl font-black text-white shadow-xl ring-4 ring-white dark:ring-slate-900">
                {getInitials(currentUser.fullName, currentUser.email)}
              </div>
              <div className="mb-1 min-w-0">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white truncate">
                  {currentUser.fullName || currentUser.email.split('@')[0]}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span>{currentUser.email}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 sm:pt-0">
              <button
                id="btn-account-signout"
                onClick={onSignOut}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-semibold">
                <FileText className="h-3.5 w-3.5 text-amber-500" />
                <span>Notes</span>
              </div>
              <p className="mt-1 text-lg font-black text-slate-900 dark:text-white">
                {stats.totalNotes}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-semibold">
                <CheckSquare className="h-3.5 w-3.5 text-indigo-500" />
                <span>Tasks Finished</span>
              </div>
              <p className="mt-1 text-lg font-black text-slate-900 dark:text-white">
                {stats.completedTasks}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-semibold">
                <Clock className="h-3.5 w-3.5 text-emerald-500" />
                <span>Hours Logged</span>
              </div>
              <p className="mt-1 text-lg font-black text-slate-900 dark:text-white">
                {stats.totalHoursWeek.toFixed(1)}h
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-semibold">
                <Calendar className="h-3.5 w-3.5 text-purple-500" />
                <span>Member Since</span>
              </div>
              <p className="mt-1 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                {memberSince}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Edit Profile Form */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              <Edit3 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Edit Profile Details
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Update your display name across notes and tasks
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Display Name
              </label>
              <div className="relative">
                <input
                  id="input-account-fullname"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your Full Name..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={currentUser.email}
                disabled
                className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-sm text-slate-500 cursor-not-allowed dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Email is managed through authentication security provider.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                id="btn-account-save-profile"
                type="submit"
                disabled={isUpdatingProfile}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition active:scale-95"
              >
                {isUpdatingProfile ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save Profile</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Change Password
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Update credentials for email & password login
              </p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                New Password
              </label>
              <input
                id="input-account-new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 focus:border-violet-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Confirm New Password
              </label>
              <input
                id="input-account-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type new password..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 focus:border-violet-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            {passwordError && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-2.5 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                id="btn-account-change-password"
                type="submit"
                disabled={isChangingPassword || !newPassword}
                className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-violet-700 disabled:opacity-50 transition active:scale-95"
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="h-4 w-4" />
                    <span>Update Password</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Account Info & Security Details */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Shield className="h-4 w-4 text-emerald-500" />
          <span>Security & Environment Architecture</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-850">
            <p className="font-bold text-slate-800 dark:text-slate-200">Account ID (UID)</p>
            <p className="mt-1 font-mono text-[11px] text-slate-500 dark:text-slate-400 break-all select-all">
              {currentUser.id}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-850">
            <p className="font-bold text-slate-800 dark:text-slate-200">Database Connection</p>
            <p className="mt-1 text-slate-500 dark:text-slate-400">
              {isConfigured ? 'Supabase PostgreSQL Cloud' : 'Browser User Space'}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-850">
            <p className="font-bold text-slate-800 dark:text-slate-200">Role-Based Access (RBAC)</p>
            <p className="mt-1 text-slate-500 dark:text-slate-400">
              {currentUser.role === 'admin'
                ? 'Full administrative control & user role editor'
                : 'Standard isolated personal space'}
            </p>
          </div>
        </div>
      </div>

      {/* Danger Zone: Delete Account */}
      <div className="overflow-hidden rounded-3xl border border-rose-200 bg-rose-50/40 p-6 dark:border-rose-900/50 dark:bg-rose-950/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="text-base font-bold">Danger Zone: Delete Account</h3>
            </div>
            <p className="mt-1 text-xs text-rose-600/80 dark:text-rose-300/70 max-w-xl">
              Permanently delete your profile and wipe all associated notes, tasks, work logs, files, folders, and market portfolio records. This action cannot be undone.
            </p>
          </div>

          <button
            id="btn-account-open-delete"
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="shrink-0 flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-rose-700 transition active:scale-95"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete Account</span>
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs transition-opacity"
            onClick={() => !isDeletingAccount && setShowDeleteConfirm(false)}
          />
          <div className="relative w-full max-w-md rounded-3xl border border-rose-200 bg-white p-6 shadow-2xl dark:border-rose-900/80 dark:bg-slate-900 z-10 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-950/80">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  Delete Account Permanently?
                </h4>
                <p className="text-xs text-rose-600 dark:text-rose-400">
                  This action is irreversible.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 mb-4">
              All your records ({stats.totalNotes} notes, {stats.completedTasks + stats.pendingTasks + stats.inProgressTasks} tasks, work logs, files, and portfolio) associated with <span className="font-bold">{currentUser.email}</span> will be permanently erased.
            </p>

            <div className="mb-4 space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Type <span className="font-mono text-rose-600 dark:text-rose-400">DELETE</span> to confirm:
              </label>
              <input
                id="input-account-confirm-delete"
                type="text"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder="Type DELETE..."
                className="w-full rounded-xl border border-rose-300 bg-rose-50/50 px-3 py-2 text-xs font-mono font-bold text-rose-900 focus:border-rose-500 focus:outline-none dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeletingAccount}
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmationText('');
                }}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                id="btn-account-confirm-delete-action"
                type="button"
                disabled={isDeletingAccount || deleteConfirmationText !== 'DELETE'}
                onClick={handleExecuteDeleteAccount}
                className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50 transition"
              >
                {isDeletingAccount ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    <span>Confirm Delete Account</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
