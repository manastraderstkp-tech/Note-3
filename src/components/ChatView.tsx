import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Users,
  User,
  Crown,
  Search,
  Paperclip,
  Smile,
  X,
  Reply,
  Trash2,
  Copy,
  Download,
  Image as ImageIcon,
  Check,
  CheckCheck,
  Sparkles,
  RefreshCw,
  MoreVertical,
  Shield,
  FileText,
  Clock,
  Phone,
  Radio,
  CornerDownRight,
  SmilePlus,
  Circle,
  ExternalLink
} from 'lucide-react';
import { UserSession, ChatMessage, ChatUser, MessageReaction, UserRole } from '../types';
import {
  fetchWorkspaceChatUsers,
  fetchChatMessages,
  sendChatMessage,
  deleteChatMessage,
  toggleChatMessageReaction,
  uploadChatAttachment,
  subscribeToWorkspaceChat
} from '../lib/supabase';

interface ChatViewProps {
  currentUser: UserSession | null;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  onOpenAuth?: (mode?: 'signin' | 'signup') => void;
}

const COMMON_EMOJIS = ['👍', '❤️', '🔥', '👏', '😂', '🎉', '🚀', '🙌', '🙏', '✨', '💡', '✅'];

export const ChatView: React.FC<ChatViewProps> = ({
  currentUser,
  onShowToast,
  onOpenAuth
}) => {
  const [activeRecipientId, setActiveRecipientId] = useState<string>('general'); // 'general' or target user id
  const [usersList, setUsersList] = useState<ChatUser[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [messageText, setMessageText] = useState<string>('');
  const [searchUserQuery, setSearchUserQuery] = useState<string>('');
  const [searchChatText, setSearchChatText] = useState<string>('');
  const [showSearchInChat, setShowSearchInChat] = useState<boolean>(false);
  
  // Reply State
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);

  // Attachment State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState<boolean>(false);

  // Emoji Popover
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [emojiTargetMessageId, setEmojiTargetMessageId] = useState<string | null>(null);

  // Mobile sidebar toggle
  const [mobileShowSidebar, setMobileShowSidebar] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch Users List
  const loadUsers = async () => {
    try {
      const fetched = await fetchWorkspaceChatUsers();
      setUsersList(fetched);
    } catch (e) {
      console.warn('Failed to load users:', e);
    }
  };

  // 2. Fetch Messages for active channel
  const loadMessages = async (recipientId: string) => {
    setLoading(true);
    try {
      const { messages: fetched } = await fetchChatMessages(
        currentUser?.id || 'demo-user',
        recipientId
      );
      setMessages(fetched);
    } catch (e) {
      console.warn('Failed to load messages:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    loadMessages(activeRecipientId);
  }, [activeRecipientId, currentUser?.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // 3. Realtime Subscription Setup
  useEffect(() => {
    const unsubscribe = subscribeToWorkspaceChat(
      (newMsg) => {
        // Only append if belongs to current conversation
        const isCurrentGeneral = activeRecipientId === 'general' && (!newMsg.receiverId || newMsg.receiverId === 'general');
        const isCurrentDirect =
          activeRecipientId !== 'general' &&
          ((newMsg.senderId === currentUser?.id && newMsg.receiverId === activeRecipientId) ||
            (newMsg.senderId === activeRecipientId && newMsg.receiverId === currentUser?.id));

        if (isCurrentGeneral || isCurrentDirect) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        } else {
          // Notify toast for messages in other channels if from someone else
          if (newMsg.senderId !== currentUser?.id) {
            onShowToast(`New message from ${newMsg.senderName}: "${newMsg.content.substring(0, 30)}..."`, 'info');
          }
        }
      },
      (updatedMsg) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
        );
      },
      (deletedId) => {
        setMessages((prev) => prev.filter((m) => m.id !== deletedId));
      },
      (activePresenceIds) => {
        setOnlineUserIds(activePresenceIds);
      },
      currentUser
    );

    return () => {
      unsubscribe();
    };
  }, [activeRecipientId, currentUser]);

  // Handle File selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      onShowToast('File size must be under 15MB', 'error');
      return;
    }

    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setFilePreviewUrl(url);
    } else {
      setFilePreviewUrl(null);
    }
  };

  const handleClearSelectedFile = () => {
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setSelectedFile(null);
    setFilePreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle Sending Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!currentUser) {
      onShowToast('कृपया च्याट गर्न पहिला Sign In गर्नुहोस् (Please sign in to chat)', 'info');
      onOpenAuth?.('signin');
      return;
    }

    const trimmed = messageText.trim();
    if (!trimmed && !selectedFile) {
      return;
    }

    setIsSending(true);

    try {
      let attachmentUrl: string | undefined = undefined;
      let attachmentName: string | undefined = undefined;
      let attachmentType: 'image' | 'file' | undefined = undefined;

      if (selectedFile) {
        setIsUploadingAttachment(true);
        const uploadRes = await uploadChatAttachment(selectedFile, currentUser.id);
        if (uploadRes.publicUrl) {
          attachmentUrl = uploadRes.publicUrl;
          attachmentName = uploadRes.fileName;
          attachmentType = uploadRes.fileType;
        } else if (uploadRes.error) {
          onShowToast(`Attachment upload error: ${uploadRes.error}`, 'error');
        }
        setIsUploadingAttachment(false);
      }

      const newMsg: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        senderId: currentUser.id,
        senderName: currentUser.fullName || currentUser.email.split('@')[0],
        senderEmail: currentUser.email,
        senderAvatar: currentUser.avatarUrl,
        senderRole: currentUser.role || 'user',
        receiverId: activeRecipientId === 'general' ? 'general' : activeRecipientId,
        content: trimmed || (selectedFile ? `Shared a ${attachmentType === 'image' ? 'photo' : 'file'}` : ''),
        attachmentUrl,
        attachmentName,
        attachmentType,
        replyToId: replyingTo ? replyingTo.id : null,
        replyToSnippet: replyingTo ? replyingTo.content.substring(0, 80) : null,
        replyToSender: replyingTo ? replyingTo.senderName : null,
        reactions: [],
        createdAt: new Date().toISOString(),
      };

      // Optimistic update
      setMessages((prev) => [...prev, newMsg]);
      setMessageText('');
      setReplyingTo(null);
      handleClearSelectedFile();

      await sendChatMessage(newMsg);
    } catch (err: any) {
      console.error('Error sending message:', err);
      onShowToast('Failed to send message', 'error');
    } finally {
      setIsSending(false);
      setIsUploadingAttachment(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleDelete = async (msgId: string) => {
    if (!currentUser) return;
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
    const res = await deleteChatMessage(msgId, currentUser.id);
    if (!res.success && res.error) {
      onShowToast(`Delete error: ${res.error}`, 'error');
    } else {
      onShowToast('Message deleted', 'info');
    }
  };

  const handleToggleReaction = async (msgId: string, emoji: string) => {
    if (!currentUser) {
      onShowToast('Please sign in to react to messages', 'info');
      return;
    }

    // Optimistic reaction update
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        const reactions = m.reactions ? [...m.reactions] : [];
        const idx = reactions.findIndex((r) => r.emoji === emoji);
        if (idx !== -1) {
          const r = { ...reactions[idx] };
          if (r.userIds.includes(currentUser.id)) {
            r.userIds = r.userIds.filter((uid) => uid !== currentUser.id);
            r.count = r.userIds.length;
            if (r.count === 0) reactions.splice(idx, 1);
            else reactions[idx] = r;
          } else {
            r.userIds.push(currentUser.id);
            r.count = r.userIds.length;
            reactions[idx] = r;
          }
        } else {
          reactions.push({ emoji, count: 1, userIds: [currentUser.id] });
        }
        return { ...m, reactions };
      })
    );

    setShowEmojiPicker(false);
    setEmojiTargetMessageId(null);

    await toggleChatMessageReaction(msgId, emoji, currentUser.id);
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    onShowToast('Message copied to clipboard', 'info');
  };

  // Filter users
  const otherUsers = usersList.filter(
    (u) => u.id !== currentUser?.id
  );

  const filteredUsers = otherUsers.filter(
    (u) =>
      u.fullName.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchUserQuery.toLowerCase())
  );

  // Active recipient details
  const activeRecipientUser =
    activeRecipientId === 'general'
      ? null
      : usersList.find((u) => u.id === activeRecipientId) || {
          id: activeRecipientId,
          fullName: 'Workspace Member',
          email: '',
          role: 'user' as UserRole,
        };

  // Filter messages by search within conversation
  const displayedMessages = messages.filter((m) => {
    if (!searchChatText.trim()) return true;
    return (
      m.content.toLowerCase().includes(searchChatText.toLowerCase()) ||
      m.senderName.toLowerCase().includes(searchChatText.toLowerCase())
    );
  });

  return (
    <div className="flex h-[calc(100vh-8.5rem)] w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
      {/* ----------------------------------------------------------------- */}
      {/* Left Sidebar: Channels & Users Directory */}
      {/* ----------------------------------------------------------------- */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-80 flex-col border-r border-slate-200 bg-slate-50/95 transition-transform duration-300 md:static md:flex md:translate-x-0 dark:border-slate-800 dark:bg-slate-900/95 ${
          mobileShowSidebar ? 'translate-x-0 flex' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Workspace Chat</h2>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Realtime Active</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                loadUsers();
                loadMessages(activeRecipientId);
                onShowToast('Chat synced', 'info');
              }}
              title="Refresh users and messages"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={() => setMobileShowSidebar(false)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 md:hidden dark:hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* User Search Input */}
        <div className="p-3 border-b border-slate-200/60 dark:border-slate-800/60">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search team members..."
              value={searchUserQuery}
              onChange={(e) => setSearchUserQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Directory List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Public Group Channel */}
          <div>
            <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Public Channels (सार्वजनिक)
            </div>
            <button
              onClick={() => {
                setActiveRecipientId('general');
                setMobileShowSidebar(false);
              }}
              className={`group flex w-full items-center justify-between rounded-2xl p-2.5 transition-all ${
                activeRecipientId === 'general'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-semibold'
                  : 'text-slate-700 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800/70'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl font-bold transition-all ${
                    activeRecipientId === 'general'
                      ? 'bg-white/20 text-white'
                      : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300'
                  }`}
                >
                  <Users className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold leading-tight">General Team Room</p>
                  <p
                    className={`text-[11px] truncate max-w-[130px] ${
                      activeRecipientId === 'general' ? 'text-indigo-100' : 'text-slate-400'
                    }`}
                  >
                    All workspace members
                  </p>
                </div>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  activeRecipientId === 'general'
                    ? 'bg-white/25 text-white'
                    : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                All
              </span>
            </button>
          </div>

          {/* Direct 1-on-1 Messages */}
          <div>
            <div className="flex items-center justify-between px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              <span>Direct Messages ({otherUsers.length})</span>
            </div>

            {filteredUsers.length === 0 ? (
              <div className="p-4 text-center rounded-2xl border border-dashed border-slate-200 bg-white/50 dark:border-slate-800 dark:bg-slate-800/30">
                <User className="h-6 w-6 mx-auto text-slate-300 dark:text-slate-600 mb-1" />
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">No other users found</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  New users will automatically appear here once registered.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredUsers.map((user) => {
                  const isActive = activeRecipientId === user.id;
                  const isOnline = onlineUserIds.includes(user.id);

                  return (
                    <button
                      key={user.id}
                      onClick={() => {
                        setActiveRecipientId(user.id);
                        setMobileShowSidebar(false);
                      }}
                      className={`group flex w-full items-center justify-between rounded-2xl p-2.5 transition-all ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-semibold'
                          : 'text-slate-700 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800/70'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Avatar */}
                        <div className="relative shrink-0">
                          {user.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt={user.fullName}
                              className="h-9 w-9 rounded-xl object-cover border border-white/20 shadow-sm"
                            />
                          ) : (
                            <div
                              className={`flex h-9 w-9 items-center justify-center rounded-xl font-bold text-xs ${
                                isActive
                                  ? 'bg-white/20 text-white'
                                  : 'bg-gradient-to-tr from-slate-200 to-slate-300 text-slate-700 dark:from-slate-700 dark:to-slate-800 dark:text-slate-200'
                              }`}
                            >
                              {user.fullName.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          {/* Online Dot */}
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 ${
                              isOnline ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                            }`}
                          />
                        </div>

                        {/* Name & Email */}
                        <div className="text-left min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold leading-tight truncate">
                              {user.fullName}
                            </p>
                            {user.role === 'admin' && (
                              <Crown className={`h-3 w-3 shrink-0 ${isActive ? 'text-amber-300' : 'text-amber-500'}`} />
                            )}
                          </div>
                          <p
                            className={`text-[11px] truncate max-w-[130px] ${
                              isActive ? 'text-indigo-100' : 'text-slate-400 dark:text-slate-500'
                            }`}
                          >
                            {user.email}
                          </p>
                        </div>
                      </div>

                      {/* Status indicator */}
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : isOnline
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
                            : 'text-slate-400'
                        }`}
                      >
                        {isOnline ? 'Online' : 'Offline'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Current User footer snippet */}
        {currentUser && (
          <div className="p-3 border-t border-slate-200/80 bg-white/70 dark:border-slate-800 dark:bg-slate-900/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                {currentUser.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.fullName || currentUser.email}
                    className="h-8 w-8 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 text-xs font-bold">
                    {(currentUser.fullName || currentUser.email).substring(0, 2).toUpperCase()}
                  </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border border-white dark:border-slate-900" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  {currentUser.fullName || currentUser.email.split('@')[0]}
                </p>
                <span className="inline-block text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  You (Active)
                </span>
              </div>
            </div>
            {currentUser.role === 'admin' && (
              <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-600 dark:text-amber-400">
                ADMIN
              </span>
            )}
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Right Main Chat Container */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex flex-1 flex-col h-full bg-slate-50/50 dark:bg-slate-950/50">
        {/* Chat Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 bg-white px-4 sm:px-6 py-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileShowSidebar(true)}
              className="rounded-xl p-1.5 text-slate-500 hover:bg-slate-100 md:hidden dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <Users className="h-5 w-5" />
            </button>

            {/* Conversation Title */}
            {activeRecipientId === 'general' ? (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 font-bold">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      General Team Room (सार्वजनिक)
                    </h3>
                    <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                      All Users Space
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {usersList.length} workspace members registered • Instant realtime sync
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="relative">
                  {activeRecipientUser?.avatarUrl ? (
                    <img
                      src={activeRecipientUser.avatarUrl}
                      alt={activeRecipientUser.fullName}
                      className="h-10 w-10 rounded-2xl object-cover border border-slate-200 dark:border-slate-700"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 text-white font-bold text-xs">
                      {activeRecipientUser?.fullName.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 ${
                      onlineUserIds.includes(activeRecipientId)
                        ? 'bg-emerald-500'
                        : 'bg-slate-400'
                    }`}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {activeRecipientUser?.fullName}
                    </h3>
                    {activeRecipientUser?.role === 'admin' ? (
                      <span className="flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                        <Crown className="h-3 w-3" /> Admin
                      </span>
                    ) : (
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        Direct 1-on-1
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {onlineUserIds.includes(activeRecipientId) ? 'Active now' : 'Offline'} • {activeRecipientUser?.email}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSearchInChat((prev) => !prev)}
              className={`rounded-xl p-2 transition ${
                showSearchInChat
                  ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400'
                  : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800'
              }`}
              title="Search conversation"
            >
              <Search className="h-4 w-4" />
            </button>
            <button
              onClick={() => loadMessages(activeRecipientId)}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
              title="Reload messages"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Search Bar within current Chat */}
        {showSearchInChat && (
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 flex items-center justify-between dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search messages in this conversation..."
                value={searchChatText}
                onChange={(e) => setSearchChatText(e.target.value)}
                className="w-full bg-transparent text-xs text-slate-800 focus:outline-none dark:text-slate-200"
                autoFocus
              />
            </div>
            <button
              onClick={() => {
                setShowSearchInChat(false);
                setSearchChatText('');
              }}
              className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              Cancel
            </button>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* Messages Feed Area */}
        {/* ----------------------------------------------------------------- */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <RefreshCw className="h-4 w-4 animate-spin text-indigo-500" />
                <span>Loading messages...</span>
              </div>
            </div>
          ) : displayedMessages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center p-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 mb-4 shadow-sm">
                <MessageSquare className="h-8 w-8" />
              </div>
              <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
                {activeRecipientId === 'general'
                  ? 'Welcome to General Team Chat!'
                  : `Conversation with ${activeRecipientUser?.fullName}`}
              </h4>
              <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
                {activeRecipientId === 'general'
                  ? 'All users registered in this workspace can see and reply here in real-time. Start by saying hello!'
                  : 'Direct private conversation. Only you and this user can read these messages.'}
              </p>

              {/* Quick greetings suggestion chips */}
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {['Namaste team! 🙏', 'Good day everyone 👋', 'Any updates on the project? 🚀', 'Available for discussion! 💡'].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => {
                      setMessageText(preset);
                      textareaRef.current?.focus();
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm hover:border-indigo-500 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-400 dark:hover:text-indigo-400"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            displayedMessages.map((msg, index) => {
              const isMine = msg.senderId === currentUser?.id;
              const formattedTime = new Date(msg.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={msg.id}
                  className={`group relative flex gap-3 ${
                    isMine ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  {/* Sender Avatar */}
                  <div className="shrink-0 pt-0.5">
                    {msg.senderAvatar ? (
                      <img
                        src={msg.senderAvatar}
                        alt={msg.senderName}
                        className="h-8 w-8 rounded-xl object-cover shadow-sm"
                      />
                    ) : (
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-xl font-bold text-xs ${
                          isMine
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {msg.senderName.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Message Bubble Container */}
                  <div className={`flex flex-col max-w-[78%] sm:max-w-[70%] ${isMine ? 'items-end' : 'items-start'}`}>
                    {/* Header (Sender Name & Role for other users) */}
                    {!isMine && (
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {msg.senderName}
                        </span>
                        {msg.senderRole === 'admin' && (
                          <span className="flex items-center gap-0.5 rounded px-1.5 py-0.2 bg-amber-500/10 text-[9px] font-bold text-amber-600 dark:text-amber-400">
                            <Crown className="h-2.5 w-2.5" /> Admin
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">
                          {formattedTime}
                        </span>
                      </div>
                    )}

                    {/* Quoted / Reply Snippet Banner */}
                    {msg.replyToSnippet && (
                      <div
                        className={`mb-1 flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 border-l-4 border-indigo-500 bg-slate-100/90 dark:bg-slate-800/80 ${
                          isMine ? 'rounded-tr-none' : 'rounded-tl-none'
                        }`}
                      >
                        <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                        <div className="truncate">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {msg.replyToSender || 'Reply'}:
                          </span>{' '}
                          <span className="italic">{msg.replyToSnippet}</span>
                        </div>
                      </div>
                    )}

                    {/* Main Content Bubble */}
                    <div
                      className={`relative rounded-2xl px-4 py-2.5 text-sm shadow-sm transition-all ${
                        isMine
                          ? 'bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white rounded-tr-none'
                          : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100'
                      }`}
                    >
                      {/* Image Attachment */}
                      {msg.attachmentUrl && msg.attachmentType === 'image' && (
                        <div className="mb-2 overflow-hidden rounded-xl">
                          <a
                            href={msg.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block group/img"
                          >
                            <img
                              src={msg.attachmentUrl}
                              alt={msg.attachmentName || 'Shared image'}
                              className="max-h-60 max-w-full rounded-xl object-cover transition-transform group-hover/img:scale-105"
                            />
                          </a>
                        </div>
                      )}

                      {/* File Attachment */}
                      {msg.attachmentUrl && msg.attachmentType === 'file' && (
                        <a
                          href={msg.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`mb-2 flex items-center gap-3 rounded-xl p-2.5 text-xs font-semibold transition ${
                            isMine
                              ? 'bg-white/15 text-white hover:bg-white/25'
                              : 'bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          <FileText className="h-5 w-5 shrink-0" />
                          <div className="truncate flex-1">
                            <p className="truncate">{msg.attachmentName || 'Document Attachment'}</p>
                            <p className="text-[10px] opacity-75">Click to view/download</p>
                          </div>
                          <Download className="h-4 w-4 shrink-0 opacity-80" />
                        </a>
                      )}

                      {/* Text Content */}
                      <p className="whitespace-pre-wrap break-words leading-relaxed">
                        {msg.content}
                      </p>

                      {/* Mine Time + Status checkmarks */}
                      {isMine && (
                        <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-indigo-200">
                          <span>{formattedTime}</span>
                          <CheckCheck className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </div>

                    {/* Emoji Reactions Bar */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {msg.reactions.map((r, rIdx) => {
                          const userHasReacted = currentUser?.id && r.userIds.includes(currentUser.id);
                          return (
                            <button
                              key={rIdx}
                              onClick={() => handleToggleReaction(msg.id, r.emoji)}
                              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold transition border ${
                                userHasReacted
                                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300'
                                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                              }`}
                            >
                              <span>{r.emoji}</span>
                              <span className="text-[10px]">{r.count}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Hover Floating Actions Menu */}
                    <div
                      className={`absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-2 py-1 shadow-md z-10 ${
                        isMine ? 'right-full mr-2' : 'left-full ml-2'
                      }`}
                    >
                      {/* React Button */}
                      <button
                        onClick={() => {
                          setEmojiTargetMessageId(emojiTargetMessageId === msg.id ? null : msg.id);
                        }}
                        className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-amber-500 dark:hover:bg-slate-700"
                        title="React with emoji"
                      >
                        <SmilePlus className="h-3.5 w-3.5" />
                      </button>

                      {/* Reply Button */}
                      <button
                        onClick={() => {
                          setReplyingTo(msg);
                          textareaRef.current?.focus();
                        }}
                        className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-700"
                        title="Reply to message"
                      >
                        <Reply className="h-3.5 w-3.5" />
                      </button>

                      {/* Copy Button */}
                      <button
                        onClick={() => handleCopyText(msg.content)}
                        className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700"
                        title="Copy message"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>

                      {/* Delete Button (If author or admin) */}
                      {(isMine || currentUser?.role === 'admin') && (
                        <button
                          onClick={() => handleDelete(msg.id)}
                          className="rounded-full p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950"
                          title="Delete message"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Quick Inline Emoji Picker for this message */}
                    {emojiTargetMessageId === msg.id && (
                      <div className="absolute top-8 z-30 flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-800">
                        {COMMON_EMOJIS.slice(0, 7).map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => handleToggleReaction(msg.id, emoji)}
                            className="rounded-lg p-1.5 text-base hover:bg-slate-100 hover:scale-125 transition-transform dark:hover:bg-slate-700"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Composer / Input Bar */}
        {/* ----------------------------------------------------------------- */}
        <div className="border-t border-slate-200/80 bg-white p-3 sm:p-4 dark:border-slate-800 dark:bg-slate-900">
          {/* Active Reply Banner */}
          {replyingTo && (
            <div className="mb-2 flex items-center justify-between rounded-xl bg-indigo-50/80 px-3 py-2 text-xs text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-200 border-l-4 border-indigo-500">
              <div className="flex items-center gap-2 truncate">
                <Reply className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                <span className="font-semibold">Replying to {replyingTo.senderName}:</span>
                <span className="truncate italic text-slate-500 dark:text-slate-400">
                  {replyingTo.content.substring(0, 60)}
                </span>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-indigo-100 hover:text-slate-700 dark:hover:bg-indigo-900"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Selected Attachment Preview */}
          {selectedFile && (
            <div className="mb-2 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center gap-2.5">
                {filePreviewUrl ? (
                  <img
                    src={filePreviewUrl}
                    alt="Preview"
                    className="h-10 w-10 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    <FileText className="h-5 w-5" />
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-xs">
                    {selectedFile.name}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {(selectedFile.size / 1024).toFixed(1)} KB • Ready to send
                  </p>
                </div>
              </div>
              <button
                onClick={handleClearSelectedFile}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-rose-600 dark:hover:bg-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Emoji Popover */}
          {showEmojiPicker && (
            <div className="mb-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-800 dark:bg-slate-800 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300">
                <span>Select Emoji</span>
                <button
                  onClick={() => setShowEmojiPicker(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-6 sm:grid-cols-12 gap-1">
                {COMMON_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      setMessageText((prev) => prev + emoji);
                      setShowEmojiPicker(false);
                      textareaRef.current?.focus();
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-lg hover:bg-slate-100 hover:scale-125 transition-transform dark:hover:bg-slate-700"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={handleSendMessage} className="flex items-end gap-2">
            {/* Attachment Button */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.txt,.zip"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
              title="Attach photo or file"
            >
              <Paperclip className="h-4 w-4" />
            </button>

            {/* Emoji Trigger Button */}
            <button
              type="button"
              onClick={() => setShowEmojiPicker((prev) => !prev)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-amber-500 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
              title="Emojis"
            >
              <Smile className="h-4 w-4" />
            </button>

            {/* Textarea */}
            <div className="relative flex-1">
              <textarea
                ref={textareaRef}
                rows={1}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  currentUser
                    ? activeRecipientId === 'general'
                      ? 'Message #general team room... (Enter to send, Shift+Enter for new line)'
                      : `Message ${activeRecipientUser?.fullName}...`
                    : 'Please sign in to join the conversation...'
                }
                disabled={!currentUser}
                className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-900"
              />
            </div>

            {/* Send Button */}
            <button
              type="submit"
              disabled={(!messageText.trim() && !selectedFile) || isSending || isUploadingAttachment}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20 transition-all hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
              title="Send Message"
            >
              {isSending || isUploadingAttachment ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
