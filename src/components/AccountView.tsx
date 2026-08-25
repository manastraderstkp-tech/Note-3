import React, { useState, useRef } from 'react';
import {
  User,
  Mail,
  Phone,
  Camera,
  Upload,
  Image as ImageIcon,
  KeyRound,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  CheckSquare,
  Save,
  Lock,
  Loader2,
  Crown,
  LogOut,
  AlertCircle,
  Calendar,
  X,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { UserSession, MetricStats } from '../types';
import { uploadUserAvatar } from '../lib/supabase';

interface AccountViewProps {
  currentUser: UserSession | null;
  stats: MetricStats;
  onUpdateProfile: (updated: { fullName?: string; phoneNumber?: string; avatarUrl?: string }) => Promise<{ success: boolean; error?: string }>;
  onChangePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  onDeleteAccount: () => Promise<{ success: boolean; error?: string }>;
  onSignOut: () => void;
  onOpenAuth: (mode?: 'signin' | 'signup') => void;
  onOpenSqlModal: () => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const PRESET_AVATARS = [
  { id: 'av1', label: 'Executive Blue', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80' },
  { id: 'av2', label: 'Creative Purple', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80' },
  { id: 'av3', label: 'Modern Emerald', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80' },
  { id: 'av4', label: 'Tech Slate', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80' },
  { id: 'av5', label: 'Energetic Amber', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80' },
  { id: 'av6', label: 'Minimal Indigo', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80' },
];

export const AccountView: React.FC<AccountViewProps> = ({
  currentUser,
  stats,
  onUpdateProfile,
  onChangePassword,
  onDeleteAccount,
  onSignOut,
  onOpenAuth,
  onShowToast,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile Edit State
  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState(currentUser?.phoneNumber || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Avatar Picker Modal/State
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [isProcessingImage, setIsProcessingImage] = useState(false);

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
    if (currentUser) {
      setFullName(currentUser.fullName || '');
      setPhoneNumber(currentUser.phoneNumber || '');
      setAvatarUrl(currentUser.avatarUrl || '');
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onShowToast('Please select a valid image file (JPEG, PNG, WEBP).', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      onShowToast('Image size should be less than 5MB.', 'error');
      return;
    }

    setIsProcessingImage(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        // Compress / resize image using HTML5 canvas
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const maxDim = 320;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          let optimizedDataUrl = result;
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          }

          // Try uploading to Supabase storage immediately
          if (currentUser?.id) {
            try {
              const uploadRes = await uploadUserAvatar(currentUser.id, optimizedDataUrl);
              if (uploadRes.publicUrl) {
                setAvatarUrl(uploadRes.publicUrl);
                setShowAvatarPicker(false);
                setIsProcessingImage(false);
                onShowToast('Photo uploaded to Supabase Storage. Click "Save Profile" to finish.', 'success');
                return;
              }
            } catch (err) {
              console.warn('Storage upload during pick fallback to dataUrl:', err);
            }
          }

          setAvatarUrl(optimizedDataUrl);
          setShowAvatarPicker(false);
          setIsProcessingImage(false);
          onShowToast('Photo selected. Click "Save Profile" to save.', 'info');
        };
        img.onerror = () => {
          setAvatarUrl(result);
          setShowAvatarPicker(false);
          setIsProcessingImage(false);
        };
        img.src = result;
      }
    };
    reader.onerror = () => {
      onShowToast('Failed to read image file.', 'error');
      setIsProcessingImage(false);
    };
    reader.readAsDataURL(file);
  };

  const handleApplyCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customImageUrl.trim()) return;
    setAvatarUrl(customImageUrl.trim());
    setCustomImageUrl('');
    setShowAvatarPicker(false);
    onShowToast('Profile photo link applied. Click "Save Profile" to save changes.', 'info');
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl('');
    setShowAvatarPicker(false);
    onShowToast('Profile picture removed. Click "Save Profile" to save changes.', 'info');
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
      const res = await onUpdateProfile({
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        avatarUrl: avatarUrl.trim(),
      });
      if (res.success) {
        onShowToast('Profile details updated successfully!', 'success');
      } else {
        onShowToast(res.error || 'Failed to update profile details.', 'error');
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
        onShowToast('Your account and workspace data have been completely deleted.', 'success');
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
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          My Account
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage your personal profile, profile picture, contact number, and security credentials.
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
              {/* Profile Avatar with Camera Trigger */}
              <div className="relative group">
                <div className="flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-3xl bg-slate-900 text-2xl sm:text-3xl font-black text-white shadow-xl ring-4 ring-white dark:ring-slate-900 overflow-hidden">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={fullName || 'Profile Avatar'}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <span>{getInitials(fullName || currentUser.fullName, currentUser.email)}</span>
                  )}
                </div>

                <button
                  id="btn-change-avatar-banner"
                  type="button"
                  onClick={() => setShowAvatarPicker(true)}
                  className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md hover:bg-indigo-700 ring-2 ring-white dark:ring-slate-900 transition active:scale-95"
                  title="Change profile picture"
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>

              <div className="mb-1 min-w-0">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white truncate">
                  {fullName || currentUser.fullName || currentUser.email.split('@')[0]}
                </h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1.5 truncate">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span>{currentUser.email}</span>
                  </span>
                  {(phoneNumber || currentUser.phoneNumber) && (
                    <span className="flex items-center gap-1.5 truncate font-medium text-slate-700 dark:text-slate-300">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                      <span>{phoneNumber || currentUser.phoneNumber}</span>
                    </span>
                  )}
                </div>
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
                <span>Pending Tasks</span>
              </div>
              <p className="mt-1 text-lg font-black text-slate-900 dark:text-white">
                {stats.pendingTasks + stats.inProgressTasks}
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
                Update your display name, contact number, and profile picture
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            {/* Profile Picture Controls in Edit Form */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Profile Picture
              </label>
              <div className="flex items-center gap-4 p-3 rounded-2xl border border-slate-100 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-850/60">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-900 font-bold text-white shadow-sm overflow-hidden ring-2 ring-white dark:ring-slate-800">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar Preview"
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="text-base font-black">
                      {getInitials(fullName || currentUser.fullName, currentUser.email)}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    id="btn-open-avatar-picker"
                    type="button"
                    onClick={() => setShowAvatarPicker(true)}
                    className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition active:scale-95"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    <span>{avatarUrl ? 'Change Picture' : 'Add Picture'}</span>
                  </button>

                  {avatarUrl && (
                    <button
                      id="btn-remove-avatar"
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Display Name */}
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

            {/* Contact / Phone Number */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Contact Number
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Phone className="h-4 w-4" />
                </div>
                <input
                  id="input-account-phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+977 98XXXXXXXX / Phone Number"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <p className="mt-1 text-[11px] text-indigo-600 dark:text-indigo-400 flex items-center gap-1 font-medium">
                <CheckCircle2 className="h-3 w-3 inline" />
                <span>Supabase Authentication (User Phone) र Profiles database मा सेभ हुनेछ।</span>
              </p>
            </div>

            {/* Email Address (Read-only) */}
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

      {/* Danger Zone: Delete Account */}
      <div className="overflow-hidden rounded-3xl border border-rose-200 bg-rose-50/40 p-6 dark:border-rose-900/50 dark:bg-rose-950/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="text-base font-bold">Danger Zone: Delete Account</h3>
            </div>
            <p className="mt-1 text-xs text-rose-600/80 dark:text-rose-300/70 max-w-xl">
              Permanently delete your profile and wipe all associated notes, tasks, files, and folder records. This action cannot be undone.
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

      {/* Profile Picture / Avatar Picker Modal */}
      {showAvatarPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs transition-opacity"
            onClick={() => setShowAvatarPicker(false)}
          />
          <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 z-10 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                  <Camera className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Choose Profile Picture
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Upload your own photo or pick from preset avatars
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAvatarPicker(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 pt-4">
              {/* Option 1: File Upload */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Upload From Computer / Phone
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={isProcessingImage}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 p-6 text-center hover:bg-indigo-50/80 dark:border-indigo-900/60 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 transition group cursor-pointer"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 group-hover:scale-110 dark:bg-indigo-900 dark:text-indigo-300 transition-transform">
                    {isProcessingImage ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <Upload className="h-6 w-6" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                      Click to Browse or Take Photo
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      PNG, JPG, WEBP • Supabase Storage मा अपलोड भई Auth UID को अगाडि Avatar मा देखिनेछ
                    </p>
                  </div>
                </button>
              </div>

              {/* Option 2: Curated Preset Avatars */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Preset Avatar Gallery
                  </label>
                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                    Instant Select
                  </span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {PRESET_AVATARS.map((av) => (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => {
                        setAvatarUrl(av.url);
                        setShowAvatarPicker(false);
                        onShowToast(`Selected ${av.label}. Click "Save Profile" to keep it.`, 'info');
                      }}
                      className={`relative aspect-square overflow-hidden rounded-2xl border-2 transition hover:scale-105 active:scale-95 group ${
                        avatarUrl === av.url
                          ? 'border-indigo-600 ring-2 ring-indigo-600/30'
                          : 'border-slate-200 hover:border-indigo-400 dark:border-slate-700'
                      }`}
                    >
                      <img
                        src={av.url}
                        alt={av.label}
                        className="h-full w-full object-cover"
                      />
                      {avatarUrl === av.url && (
                        <div className="absolute inset-0 bg-indigo-600/30 flex items-center justify-center">
                          <CheckCircle2 className="h-5 w-5 text-white drop-shadow-md" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Option 3: Direct Web Image URL */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Or Paste Direct Image Link (URL)
                </label>
                <form onSubmit={handleApplyCustomUrl} className="flex gap-2">
                  <input
                    type="url"
                    value={customImageUrl}
                    onChange={(e) => setCustomImageUrl(e.target.value)}
                    placeholder="https://example.com/my-photo.jpg"
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                  <button
                    type="submit"
                    disabled={!customImageUrl.trim()}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-700 dark:hover:bg-slate-600 transition"
                  >
                    Apply URL
                  </button>
                </form>
              </div>

              {/* Clear / Reset option */}
              {avatarUrl && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Want to reset back to initial letters?
                  </span>
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Remove Profile Photo</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
              All your records ({stats.totalNotes} notes, {stats.completedTasks + stats.pendingTasks + stats.inProgressTasks} tasks, files, and folders) associated with <span className="font-bold">{currentUser.email}</span> will be permanently erased.
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
