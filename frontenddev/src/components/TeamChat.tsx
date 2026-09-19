// components/TeamChat.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  Hash,
  Phone,
  Send,
  Paperclip,
  Smile,
  Mic,
  CheckCheck,
  UserPlus,
  Trash2,
  Loader2,
  X,
  Image as ImageIcon,
  UserCheck,
  UserX,
  Clock,
  Square,
} from 'lucide-react';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import toast from 'react-hot-toast';
import {
  fetchConversations,
  fetchMessages,
  markAsReadAPI,
  fetchAthletesForChat,
  getOrCreateDirectAPI,
  uploadFile,
} from '../services/chat.service';
import { getSocket } from '../services/socket';
import type { Conversation, Message, AthleteListItem } from '../types/chat.types';
import type { AthleteProfile } from '../types/auth.types';
import type { FriendStatusType } from '../types/chat.types';
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  getFriendStatus,
} from '../services/friendship.service';

interface TeamChatProps {
  athlete: AthleteProfile | null;
  targetUser?: AthleteProfile | null;
  onTargetUserHandled?: () => void;
}

const QUICK_REPLIES = [
  'Free to play today? 🔥',
  'On my way! ⚡',
  'Running 5 mins late 🏃',
  'Great game! 💯',
  'What court? 📍',
];

/* ═══════════════════════════════════════════
   SMART DATE/TIME HELPERS
   ═══════════════════════════════════════════ */

const isSameDay = (a: Date, b: Date): boolean => {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
};

const formatMessageTime = (dateStr: string): string => {
  try {
    const d = new Date(dateStr);
    const now = new Date();

    if (isNaN(d.getTime())) return '';

    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    const timeStr = d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    if (diffMins < 0) return timeStr;
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    if (isSameDay(d, now)) return timeStr;

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (isSameDay(d, yesterday)) return `Yesterday, ${timeStr}`;

    if (diffDays < 7) {
      const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
      return `${weekday}, ${timeStr}`;
    }

    if (d.getFullYear() === now.getFullYear()) {
      const dateShort = d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      return `${dateShort}, ${timeStr}`;
    }

    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
};

const formatDateDivider = (dateStr: string): string => {
  try {
    const d = new Date(dateStr);
    const now = new Date();

    if (isNaN(d.getTime())) return '';

    if (isSameDay(d, now)) return 'Today';

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (isSameDay(d, yesterday)) return 'Yesterday';

    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 7 || d.getFullYear() === now.getFullYear()) {
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });
    }

    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
};

const shouldShowDateDivider = (
  currentMsg: Message,
  prevMsg: Message | undefined
): boolean => {
  if (!prevMsg) return true;
  try {
    const currentDate = new Date(currentMsg.createdAt);
    const prevDate = new Date(prevMsg.createdAt);
    if (isNaN(currentDate.getTime()) || isNaN(prevDate.getTime())) return false;
    return !isSameDay(currentDate, prevDate);
  } catch {
    return false;
  }
};

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */

export const TeamChat: React.FC<TeamChatProps> = ({
  athlete,
  targetUser,
  onTargetUserHandled,
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'direct' | 'channels'>('all');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState('');
  const [allAthletes, setAllAthletes] = useState<AthleteListItem[]>([]);
  const [loadingAthletes, setLoadingAthletes] = useState(false);
  const [creatingChat, setCreatingChat] = useState(false);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [uploadingVoice, setUploadingVoice] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const athleteId = athlete?.id ?? null;
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  const [friendStatuses, setFriendStatuses] = useState<
    Record<string, FriendStatusType>
  >({});
  const [processingFriend, setProcessingFriend] = useState<string | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'default';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const [deletingConv, setDeletingConv] = useState(false);

  const showConfirm = (options: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'default';
    onConfirm: () => void;
  }) => {
    setConfirmModal({
      isOpen: true,
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      variant: 'default',
      ...options,
    });
  };

  const closeConfirm = () => {
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
  };

  /* ═══════════════════════════════════════════
     ✅ NEW: INITIAL ONLINE USERS FETCH
     Har 60s mein refresh bhi karega as backup
     ═══════════════════════════════════════════ */
  useEffect(() => {
    if (!athleteId) return;

    const API =
      import.meta.env?.VITE_API_URL ?? 'http://localhost:3001/api';

    let cancelled = false;

    const fetchOnlineUsers = async () => {
      try {
        const res = await fetch(`${API}/leaderboard/online-users`);
        const json = await res.json();
        if (!cancelled && json.success && Array.isArray(json.data)) {
          setOnlineUsers(new Set(json.data));
        }
      } catch (err) {
        console.warn('⚠️ fetchOnlineUsers failed:', err);
      }
    };

    fetchOnlineUsers();
    const interval = setInterval(fetchOnlineUsers, 60_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [athleteId]);

  /* ─── Load conversations ─── */
  useEffect(() => {
    if (!athleteId) {
      setLoadingConversations(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        setLoadingConversations(true);
        const data = await fetchConversations(athleteId);
        if (!cancelled) {
          setConversations(data);
          if (data.length > 0 && !activeId) setActiveId(data[0].id);
        }
      } catch (err) {
        console.error('❌ Load conversations:', err);
        if (!cancelled) toast.error('Failed to load conversations');
      } finally {
        if (!cancelled) setLoadingConversations(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [athleteId]);

  /* ═══════════════════════════════════════════
     ✅ AUTO-OPEN DM WITH targetUser
     ═══════════════════════════════════════════ */
  useEffect(() => {
    if (!targetUser || !athleteId) return;

    let cancelled = false;

    const openDM = async () => {
      try {
        console.log('📨 Opening DM with:', targetUser.name);

        const existing = conversations.find((conv) => {
          if (conv.type !== 'direct') return false;
          return conv.otherAthleteId === targetUser.id;
        });

        if (existing) {
          console.log('✅ Existing DM found:', existing.id);
          if (!cancelled) setActiveId(existing.id);
          onTargetUserHandled?.();
          return;
        }

        console.log('🆕 Creating new DM with:', targetUser.name);
        setCreatingChat(true);

        const conversation = await getOrCreateDirectAPI(athleteId, targetUser.id);

        const allConvs = await fetchConversations(athleteId);

        if (!cancelled) {
          setConversations(allConvs);
          setActiveId(conversation.id);
          toast.success(`Chat with ${targetUser.name} opened 💬`);
        }

        onTargetUserHandled?.();
      } catch (err) {
        console.error('❌ Open DM failed:', err);
        if (!cancelled) {
          toast.error(
            err instanceof Error ? err.message : 'Failed to open chat'
          );
        }
        onTargetUserHandled?.();
      } finally {
        if (!cancelled) setCreatingChat(false);
      }
    };

    openDM();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetUser?.id, athleteId]);

  /* ─── Load messages ─── */
  useEffect(() => {
    if (!activeId || !athleteId) return;

    let cancelled = false;

    const load = async () => {
      try {
        setLoadingMessages(true);
        const data = await fetchMessages(activeId, athleteId);
        if (!cancelled) setMessages(data);
        await markAsReadAPI(activeId, athleteId);

        const socket = getSocket();
        socket.emit('conversation:join', activeId);
      } catch (err) {
        console.error('❌ Load messages:', err);
        if (!cancelled) toast.error('Failed to load messages');
      } finally {
        if (!cancelled) setLoadingMessages(false);
      }
    };

    load();

    return () => {
      cancelled = true;
      const socket = getSocket();
      socket.emit('conversation:leave', activeId);
    };
  }, [activeId, athleteId]);

  /* ═══════════════════════════════════════════
     ✅ SOCKET SETUP (with presence:identify)
     ═══════════════════════════════════════════ */
  useEffect(() => {
    if (!athleteId) return;

    const socket = getSocket();
    socket.emit('user:join', athleteId);
    // ✅ NEW: identify presence so backend marks you Online
    socket.emit('presence:identify', athleteId);

    const handleNewMessage = (msg: Message) => {
      if (msg.conversationId === activeId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;

          const isDuplicateOptimistic = prev.some((m) => {
            if (m.senderId !== msg.senderId) return false;
            if (m.text !== msg.text) return false;
            const mTime = new Date(m.createdAt).getTime();
            const msgTime = new Date(msg.createdAt).getTime();
            return Math.abs(mTime - msgTime) < 5000;
          });

          if (isDuplicateOptimistic) {
            return prev.map((m) => {
              if (
                m.id.startsWith('temp-') &&
                m.senderId === msg.senderId &&
                m.text === msg.text
              ) {
                return { ...msg, isMe: msg.senderId === athleteId };
              }
              return m;
            });
          }

          return [...prev, { ...msg, isMe: msg.senderId === athleteId }];
        });
      }

      setConversations((prev) =>
        prev.map((c) =>
          c.id === msg.conversationId
            ? {
                ...c,
                lastMessage:
                  msg.messageType === 'image'
                    ? '📷 Image'
                    : msg.messageType === 'voice'
                    ? '🎤 Voice'
                    : msg.text,
                lastMessageAt: msg.createdAt,
              }
            : c
        )
      );
    };

    const handleConversationUpdated = (payload: any) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === payload.conversationId
            ? {
                ...c,
                lastMessage: payload.lastMessage,
                lastMessageAt: payload.lastMessageAt,
              }
            : c
        )
      );
    };

    const handleUserOnline = (payload: {
      athleteId: string;
      online: boolean;
    }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (payload.online) next.add(payload.athleteId);
        else next.delete(payload.athleteId);
        return next;
      });
    };

    /* ✅ NEW: Also listen for presence:update from Leaderboard socket */
    const handlePresenceUpdate = (payload: {
      athleteId: string;
      status: 'Online' | 'In-Game' | 'Away' | 'Offline';
    }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        const isOnline =
          payload.status === 'Online' || payload.status === 'In-Game';
        if (isOnline) next.add(payload.athleteId);
        else next.delete(payload.athleteId);
        return next;
      });
    };

    const handleFriendRequestReceived = (payload: {
      friendship: any;
      fromUserId: string;
    }) => {
      console.log('🤝 Friend request received:', payload);

      setFriendStatuses((prev) => ({
        ...prev,
        [payload.fromUserId]: 'pending_received',
      }));

      const name = payload.friendship?.friendName ?? 'Someone';
      toast.success(`🤝 ${name} sent you a friend request!`, {
        duration: 5000,
        position: 'top-right',
        style: {
          background: '#065f46',
          color: '#fff',
          border: '1px solid rgba(52, 211, 153, 0.3)',
        },
      });

      setPendingRequestsCount((c) => c + 1);
    };

    const handleFriendStatusUpdated = (payload: {
      otherUserId: string;
      status: 'none' | 'pending_sent' | 'pending_received' | 'accepted';
    }) => {
      console.log('🔄 Friend status updated:', payload);

      setFriendStatuses((prev) => ({
        ...prev,
        [payload.otherUserId]: payload.status,
      }));

      if (payload.status === 'accepted') {
        toast.success('🎉 You are now friends!', {
          duration: 4000,
          position: 'top-right',
        });
      }
    };

    const handleFriendAcceptedBy = (payload: { userId: string }) => {
      console.log('✅ Friend accepted by:', payload.userId);
    };

    const handleConversationDeleted = (payload: {
      conversationId: string;
      deletedBy: string;
    }) => {
      console.log('🗑️ Conversation deleted:', payload);

      setConversations((prev) => {
        const filtered = prev.filter((c) => c.id !== payload.conversationId);

        if (activeId === payload.conversationId) {
          setActiveId(filtered.length > 0 ? filtered[0].id : null);
          setMessages([]);
        }

        return filtered;
      });

      toast('Conversation was deleted by the other user', {
        icon: '🗑️',
        duration: 3000,
      });
    };

    socket.on('message:new', handleNewMessage);
    socket.on('conversation:updated', handleConversationUpdated);
    socket.on('user:online', handleUserOnline);
    socket.on('presence:update', handlePresenceUpdate); // ✅ NEW
    socket.on('friend:request_received', handleFriendRequestReceived);
    socket.on('friend:status_updated', handleFriendStatusUpdated);
    socket.on('friend:accepted_by', handleFriendAcceptedBy);
    socket.on('conversation:deleted', handleConversationDeleted);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('conversation:updated', handleConversationUpdated);
      socket.off('user:online', handleUserOnline);
      socket.off('presence:update', handlePresenceUpdate); // ✅ NEW
      socket.off('friend:request_received', handleFriendRequestReceived);
      socket.off('friend:status_updated', handleFriendStatusUpdated);
      socket.off('friend:accepted_by', handleFriendAcceptedBy);
      socket.off('conversation:deleted', handleConversationDeleted);
    };
  }, [athleteId, activeId]);

  /* ─── Auto-scroll ─── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* ─── Close emoji picker on outside click ─── */
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  /* ─── Cleanup voice ─── */
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl);
      }
    };
  }, [audioPreviewUrl]);

  /* ─── Load athletes ─── */
  useEffect(() => {
    if (!showNewChatModal || !athleteId) return;

    let cancelled = false;

    const load = async () => {
      try {
        setLoadingAthletes(true);
        const data = await fetchAthletesForChat(athleteId, newChatSearch);
        if (!cancelled) setAllAthletes(data);
      } catch (err) {
        console.error('❌ Load athletes:', err);
        if (!cancelled) toast.error('Failed to load athletes');
      } finally {
        if (!cancelled) setLoadingAthletes(false);
      }
    };

    const timer = setTimeout(load, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [showNewChatModal, newChatSearch, athleteId]);

  /* ─── Friend status load ─── */
  useEffect(() => {
    const otherId = conversations.find((c) => c.id === activeId)?.otherAthleteId;
    if (!activeId || !athleteId || !otherId) return;
    if (friendStatuses[otherId]) return;

    let cancelled = false;

    const load = async () => {
      try {
        const res = await getFriendStatus(athleteId, otherId);
        if (!cancelled) {
          setFriendStatuses((prev) => ({ ...prev, [otherId]: res.status }));
        }
      } catch (err) {
        console.error('❌ Friend status:', err);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [activeId, athleteId, conversations, friendStatuses]);

  /* ─── Load pending count ─── */
  useEffect(() => {
    if (!athleteId) return;

    const load = async () => {
      try {
        const res = await fetch(
          `${import.meta.env?.VITE_API_URL ?? 'http://localhost:3001/api'}/friends/pending?userId=${athleteId}`
        );
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setPendingRequestsCount(json.data.length);
        }
      } catch (err) {
        console.error('❌ Pending count:', err);
      }
    };

    load();
  }, [athleteId]);

  /* ═══════════════════════════════════════
     SEND TEXT
     ═══════════════════════════════════════ */
  const handleSend = useCallback(() => {
    if (!messageInput.trim() || !activeId || !athleteId) return;

    const text = messageInput.trim();
    setMessageInput('');

    const tempId = `temp-${Date.now()}`;

    const optimistic: Message = {
      id: tempId,
      conversationId: activeId,
      senderId: athleteId,
      senderName: athlete?.name ?? 'You',
      senderAvatar: athlete?.profilepicture ?? null,
      text,
      messageType: 'text',
      attachmentUrl: null,
      attachmentName: null,
      isRead: false,
      createdAt: new Date().toISOString(),
      isMe: true,
    };
    setMessages((prev) => [...prev, optimistic]);

    const socket = getSocket();
    socket.emit(
      'message:send',
      {
        conversationId: activeId,
        senderId: athleteId,
        text,
        messageType: 'text',
      },
      (realMessage: Message) => {
        if (!realMessage?.id) return;
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...realMessage, isMe: true } : m))
        );
      }
    );
  }, [messageInput, activeId, athleteId, athlete]);

  /* ═══════════════════════════════════════
     SEND IMAGE
     ═══════════════════════════════════════ */
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeId || !athleteId) return;

    e.target.value = '';

    if (!file.type.startsWith('image/')) {
      toast.error('Only images allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }

    try {
      setUploadingImage(true);
      const uploaded = await uploadFile(file);

      const tempId = `temp-${Date.now()}`;
      const optimistic: Message = {
        id: tempId,
        conversationId: activeId,
        senderId: athleteId,
        senderName: athlete?.name ?? 'You',
        senderAvatar: athlete?.profilepicture ?? null,
        text: '',
        messageType: 'image',
        attachmentUrl: uploaded.url,
        attachmentName: uploaded.name,
        isRead: false,
        createdAt: new Date().toISOString(),
        isMe: true,
      };
      setMessages((prev) => [...prev, optimistic]);

      const socket = getSocket();
      socket.emit(
        'message:send',
        {
          conversationId: activeId,
          senderId: athleteId,
          text: '',
          messageType: 'image',
          attachmentUrl: uploaded.url,
          attachmentName: uploaded.name,
        },
        (realMessage: Message) => {
          if (!realMessage?.id) return;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempId ? { ...realMessage, isMe: true } : m
            )
          );
        }
      );
    } catch (err) {
      console.error('❌ Upload failed:', err);
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingImage(false);
    }
  };

  /* ═══════════════════════════════════════
     VOICE RECORDING
     ═══════════════════════════════════════ */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';

      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, {
          type: mimeType || 'audio/webm',
        });
        setRecordingBlob(blob);
        setAudioPreviewUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);

      console.log('🎤 Recording started');
    } catch (err) {
      console.error('❌ Mic access denied:', err);
      toast.error('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      console.log('🛑 Recording stopped');
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setRecordingBlob(null);
    setAudioPreviewUrl(null);
    setRecordingTime(0);
    audioChunksRef.current = [];
  };

  const sendVoiceMessage = async () => {
    if (!recordingBlob || !activeId || !athleteId) return;

    try {
      setUploadingVoice(true);

      const ext = recordingBlob.type.includes('mp4') ? 'm4a' : 'webm';
      const file = new File([recordingBlob], `voice-${Date.now()}.${ext}`, {
        type: recordingBlob.type,
      });

      const uploaded = await uploadFile(file);

      const tempId = `temp-${Date.now()}`;
      const optimistic: Message = {
        id: tempId,
        conversationId: activeId,
        senderId: athleteId,
        senderName: athlete?.name ?? 'You',
        senderAvatar: athlete?.profilepicture ?? null,
        text: '',
        messageType: 'voice',
        attachmentUrl: uploaded.url,
        attachmentName: uploaded.name,
        isRead: false,
        createdAt: new Date().toISOString(),
        isMe: true,
      };
      setMessages((prev) => [...prev, optimistic]);

      const socket = getSocket();
      socket.emit(
        'message:send',
        {
          conversationId: activeId,
          senderId: athleteId,
          text: '',
          messageType: 'voice',
          attachmentUrl: uploaded.url,
          attachmentName: uploaded.name,
        },
        (realMessage: Message) => {
          if (!realMessage?.id) return;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempId ? { ...realMessage, isMe: true } : m
            )
          );
        }
      );

      setRecordingBlob(null);
      setAudioPreviewUrl(null);
      setRecordingTime(0);

      toast.success('Voice message sent 🎤');
    } catch (err) {
      console.error('❌ Voice send failed:', err);
      toast.error('Failed to send voice message');
    } finally {
      setUploadingVoice(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  /* ═══════════════════════════════════════
     EMOJI
     ═══════════════════════════════════════ */
  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setMessageInput((prev) => prev + emojiData.emoji);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /* ═══════════════════════════════════════
     START CHAT
     ═══════════════════════════════════════ */
  const handleStartNewChatWithAthlete = async (target: AthleteListItem) => {
    if (!athleteId || creatingChat) return;
    try {
      setCreatingChat(true);
      const conversation = await getOrCreateDirectAPI(athleteId, target.id);
      const allConvs = await fetchConversations(athleteId);
      setConversations(allConvs);
      setActiveId(conversation.id);
      setShowNewChatModal(false);
      setNewChatSearch('');
      toast.success(`Chat with ${target.name} opened`);
    } catch (err) {
      console.error('❌ Start chat:', err);
      toast.error('Failed to start chat');
    } finally {
      setCreatingChat(false);
    }
  };

  /* ═══════════════════════════════════════
     FRIEND ACTIONS
     ═══════════════════════════════════════ */
  const handleFriendAction = async () => {
    if (!athleteId || !activeConversation?.otherAthleteId) return;

    const otherId = activeConversation.otherAthleteId;
    const currentStatus = friendStatuses[otherId] ?? 'none';

    if (processingFriend === otherId) return;
    setProcessingFriend(otherId);

    const socket = getSocket();

    try {
      if (currentStatus === 'none') {
        socket.emit(
          'friend:request',
          { userId: athleteId, friendId: otherId },
          (res: any) => {
            if (res?.error) {
              toast.error(res.error);
              return;
            }
            setFriendStatuses((prev) => ({ ...prev, [otherId]: 'pending_sent' }));
            toast.success('Friend request sent! 🤝');
          }
        );
      } else if (currentStatus === 'pending_received') {
        socket.emit(
          'friend:accept',
          { userId: athleteId, friendId: otherId },
          (res: any) => {
            if (res?.error) {
              toast.error(res.error);
              return;
            }
            setFriendStatuses((prev) => ({ ...prev, [otherId]: 'accepted' }));
            setPendingRequestsCount((c) => Math.max(0, c - 1));
            toast.success('Friend request accepted! 🎉');
          }
        );
      } else if (currentStatus === 'pending_sent') {
        socket.emit(
          'friend:reject',
          { userId: athleteId, friendId: otherId },
          (res: any) => {
            if (res?.error) {
              toast.error(res.error);
              return;
            }
            setFriendStatuses((prev) => ({ ...prev, [otherId]: 'none' }));
            toast.success('Request cancelled');
          }
        );
      } else if (currentStatus === 'accepted') {
        showConfirm({
          title: 'Remove Friend?',
          message: `Are you sure you want to remove ${activeConversation.name} from your friends? You can always add them back later.`,
          confirmText: 'Remove',
          cancelText: 'Cancel',
          variant: 'danger',
          onConfirm: () => {
            socket.emit(
              'friend:remove',
              { userId: athleteId, friendId: otherId },
              (res: any) => {
                setProcessingFriend(null);
                if (res?.error) {
                  toast.error(res.error);
                  return;
                }
                setFriendStatuses((prev) => ({ ...prev, [otherId]: 'none' }));
                toast.success('Removed from friends');
              }
            );
            closeConfirm();
          },
        });
        return;
      }
    } catch (err) {
      console.error('❌ Friend action:', err);
      toast.error('Action failed');
    } finally {
      setProcessingFriend(null);
    }
  };

  /* ═══════════════════════════════════════
     DELETE CONVERSATION
     ═══════════════════════════════════════ */
  const handleDeleteConversation = () => {
    if (!activeConversation || !athleteId) return;

    showConfirm({
      title: 'Delete Conversation?',
      message: `Are you sure you want to delete this conversation with ${activeConversation.name}? All messages will be permanently removed.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
      onConfirm: () => {
        setDeletingConv(true);
        const socket = getSocket();

        socket.emit(
          'conversation:delete',
          {
            conversationId: activeConversation.id,
            athleteId,
          },
          (res: any) => {
            setDeletingConv(false);

            if (res?.error) {
              toast.error(res.error);
              return;
            }

            setConversations((prev) => {
              const filtered = prev.filter((c) => c.id !== activeConversation.id);
              setActiveId(filtered.length > 0 ? filtered[0].id : null);
              return filtered;
            });

            setMessages([]);

            toast.success('Conversation deleted 🗑️');
            closeConfirm();
          }
        );
      },
    });
  };

  const filteredConversations = conversations.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchesTab =
      activeTab === 'all' ||
      (activeTab === 'direct' && c.type === 'direct') ||
      (activeTab === 'channels' && c.type === 'group');
    return matchesSearch && matchesTab;
  });

  const activeConversation = conversations.find((c) => c.id === activeId);

  if (!athleteId) {
    return (
      <div className="text-white p-8 max-w-3xl mx-auto">
        <div className="bg-indigo-950/60 rounded-3xl border border-white/10 p-12 text-center">
          <h2 className="text-xl font-black italic uppercase mb-2">Please Log In</h2>
          <p className="text-indigo-300">You need to be logged in to use Team Chat.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="text-white p-4 md:p-6 max-w-7xl mx-auto space-y-4">
        {/* HEADER */}
        <div className="bg-indigo-950/60 rounded-3xl border border-white/10 p-5 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-lime-400 rounded-2xl">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22"
                viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                className="text-black">
                <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg md:text-xl font-black italic uppercase">
                  Playground League Chat
                </h1>
                <span className="px-2.5 py-1 bg-lime-400/20 text-lime-400 rounded-full text-[10px] font-black uppercase border border-lime-400/30">
                  Live • Active
                </span>
              </div>
              <p className="text-xs text-indigo-300 mt-0.5">
                Direct messages with community athletes & live court broadcast channels
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowNewChatModal(true)}
            className="px-4 py-2.5 bg-lime-400 hover:bg-lime-300 text-black font-black italic uppercase text-xs rounded-xl transition shadow-lg shadow-lime-400/20 flex items-center gap-2 relative"
          >
            <Plus className="w-4 h-4" /> New Chat
            {pendingRequestsCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-indigo-950">
                {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
              </span>
            )}
          </button>
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
          {/* SIDEBAR */}
          <div className="bg-indigo-950/60 rounded-3xl border border-white/10 p-4 flex flex-col max-h-[calc(100vh-180px)]">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations..."
                className="w-full bg-indigo-900/60 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-indigo-400/60 focus:border-lime-400 transition outline-none"
              />
            </div>

            <div className="flex items-center gap-2 mb-3">
              <button onClick={() => setActiveTab('all')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black italic uppercase ${
                  activeTab === 'all' ? 'bg-lime-400 text-black' : 'bg-indigo-900/60 text-indigo-300'
                }`}>
                All Chats
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                  activeTab === 'all' ? 'bg-black/20 text-black' : 'bg-indigo-800 text-indigo-300'
                }`}>
                  {conversations.length}
                </span>
              </button>
              <button onClick={() => setActiveTab('direct')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black italic uppercase ${
                  activeTab === 'direct' ? 'bg-lime-400 text-black' : 'bg-indigo-900/60 text-indigo-300'
                }`}>
                <Phone className="w-3.5 h-3.5" /> Direct
              </button>
              <button onClick={() => setActiveTab('channels')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black italic uppercase ${
                  activeTab === 'channels' ? 'bg-lime-400 text-black' : 'bg-indigo-900/60 text-indigo-300'
                }`}>
                <Hash className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {loadingConversations ? (
                <div className="flex flex-col items-center justify-center py-10 text-indigo-400">
                  <Loader2 className="w-6 h-6 animate-spin text-lime-400 mb-2" />
                  <p className="text-xs">Loading...</p>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="text-center py-10 text-indigo-400 text-xs">
                  No conversations yet. Click "New Chat" to start.
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isActive = conv.id === activeId;
                  /* ✅ FIX: Only use onlineUsers set, ignore conv.online */
                  const isOnline = onlineUsers.has(conv.otherAthleteId ?? '');
                  return (
                    <button key={conv.id} onClick={() => setActiveId(conv.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-2xl transition text-left ${
                        isActive
                          ? 'bg-lime-400/10 border-2 border-lime-400/60'
                          : 'bg-indigo-900/40 border-2 border-transparent hover:bg-indigo-900/60'
                      }`}>
                      <div className="relative flex-shrink-0">
                        <img src={conv.avatar ?? 'https://via.placeholder.com/48'}
                          alt={conv.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-white/10" />
                        {isOnline && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-lime-400 rounded-full border-2 border-indigo-950" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-sm font-black truncate">{conv.name}</span>
                            {conv.isPro && (
                              <span className="px-1.5 py-0.5 bg-amber-400 text-black text-[9px] font-black italic rounded">
                                PRO
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-indigo-400 font-medium whitespace-nowrap">
                            {conv.lastMessageAt
                              ? formatMessageTime(conv.lastMessageAt)
                              : ''}
                          </span>
                        </div>
                        <p className="text-xs text-indigo-300 truncate mt-0.5">
                          {conv.lastMessage ?? 'No messages yet'}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* MAIN CHAT */}
          <div className="bg-indigo-950/60 rounded-3xl border border-white/10 flex flex-col max-h-[calc(100vh-180px)]">
            {activeConversation ? (
              <>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <img src={activeConversation.avatar ?? 'https://via.placeholder.com/44'}
                      alt={activeConversation.name}
                      className="w-11 h-11 rounded-full object-cover border-2 border-white/10" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black">{activeConversation.name}</h3>
                        {/* ✅ FIX: Use onlineUsers only */}
                        {onlineUsers.has(activeConversation.otherAthleteId ?? '') && (
                          <span className="w-2 h-2 bg-lime-400 rounded-full" />
                        )}
                      </div>
                      <p className="text-xs text-indigo-400">
                        {/* ✅ FIX: Use onlineUsers only */}
                        {onlineUsers.has(activeConversation.otherAthleteId ?? '')
                          ? 'Online'
                          : 'Offline'}{' '}
                        • {athlete?.position ?? 'Athlete'} • {athlete?.primary_sport ?? 'Sport'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeConversation.otherAthleteId && (() => {
                      const status =
                        friendStatuses[activeConversation.otherAthleteId] ?? 'none';
                      const isBusy = processingFriend === activeConversation.otherAthleteId;

                      const config = {
                        none: {
                          label: 'Add Friend',
                          icon: <UserPlus className="w-3.5 h-3.5" />,
                          className: 'bg-indigo-900/60 hover:bg-indigo-800 text-indigo-300',
                        },
                        pending_sent: {
                          label: 'Request Sent',
                          icon: <Clock className="w-3.5 h-3.5" />,
                          className:
                            'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/30',
                        },
                        pending_received: {
                          label: 'Accept',
                          icon: <UserCheck className="w-3.5 h-3.5" />,
                          className: 'bg-lime-400 hover:bg-lime-300 text-black',
                        },
                        accepted: {
                          label: 'Friends',
                          icon: <UserCheck className="w-3.5 h-3.5" />,
                          className:
                            'bg-lime-400/20 hover:bg-rose-500/20 text-lime-400 hover:text-rose-400 border border-lime-400/30 hover:border-rose-400/30',
                        },
                        blocked: {
                          label: 'Blocked',
                          icon: <UserX className="w-3.5 h-3.5" />,
                          className: 'bg-red-500/20 text-red-300',
                        },
                      }[status];

                      return (
                        <button
                          onClick={handleFriendAction}
                          disabled={isBusy || status === 'blocked'}
                          className={`px-3 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 transition disabled:opacity-50 ${config.className}`}
                          title={
                            status === 'accepted'
                              ? 'Click to remove friend'
                              : status === 'pending_sent'
                              ? 'Click to cancel request'
                              : ''
                          }
                        >
                          {isBusy ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            config.icon
                          )}
                          {config.label}
                        </button>
                      );
                    })()}
                    <button
                      onClick={handleDeleteConversation}
                      disabled={deletingConv}
                      className="p-2 bg-indigo-900/60 hover:bg-rose-500/20 rounded-xl transition disabled:opacity-50"
                      title="Delete conversation"
                    >
                      {deletingConv ? (
                        <Loader2 className="w-4 h-4 text-rose-400 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 text-indigo-300 hover:text-rose-400" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {loadingMessages ? (
                    <div className="flex flex-col items-center justify-center py-10 text-indigo-400">
                      <Loader2 className="w-6 h-6 animate-spin text-lime-400 mb-2" />
                      <p className="text-xs">Loading messages...</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-10 text-indigo-400 text-xs">
                      No messages yet. Say hi! 👋
                    </div>
                  ) : (
                    messages.map((msg, index) => {
                      const prevMsg = index > 0 ? messages[index - 1] : undefined;
                      const showDivider = shouldShowDateDivider(msg, prevMsg);

                      return (
                        <React.Fragment key={msg.id}>
                          {showDivider && (
                            <div className="flex items-center justify-center my-3">
                              <div className="px-3 py-1 bg-indigo-900/70 border border-white/10 rounded-full">
                                <span className="text-[10px] font-black italic uppercase text-indigo-300 tracking-wider">
                                  {formatDateDivider(msg.createdAt)}
                                </span>
                              </div>
                            </div>
                          )}

                          <div
                            className={`flex items-end gap-2 ${
                              msg.isMe ? 'justify-end' : 'justify-start'
                            }`}
                          >
                            {!msg.isMe && (
                              <img src={msg.senderAvatar ?? 'https://via.placeholder.com/32'}
                                alt={msg.senderName}
                                className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                            )}
                            <div className="max-w-[70%]">
                              {!msg.isMe && (
                                <p className="text-[10px] font-black italic uppercase text-lime-400 mb-1 px-1">
                                  {msg.senderName}
                                </p>
                              )}
                              <div
                                className={`rounded-2xl overflow-hidden ${
                                  msg.isMe
                                    ? 'bg-lime-400 text-black rounded-br-sm'
                                    : 'bg-indigo-900/60 text-white rounded-bl-sm border border-white/10'
                                }`}
                              >
                                {msg.messageType === 'voice' && msg.attachmentUrl ? (
                                  <div className={`p-3 ${msg.isMe ? 'bg-lime-400' : 'bg-indigo-900/60'}`}>
                                    <div className="flex items-center gap-3 min-w-[220px]">
                                      <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                          msg.isMe ? 'bg-black/20' : 'bg-lime-400/20'
                                        }`}
                                      >
                                        <Mic className={`w-5 h-5 ${msg.isMe ? 'text-black' : 'text-lime-400'}`} />
                                      </div>
                                      <audio
                                        src={msg.attachmentUrl}
                                        controls
                                        className="h-8 w-full"
                                        style={{ minWidth: 180 }}
                                      />
                                    </div>
                                  </div>
                                ) : msg.messageType === 'image' && msg.attachmentUrl ? (
                                  <div>
                                    <img
                                      src={msg.attachmentUrl}
                                      alt="attachment"
                                      className="max-w-full max-h-72 object-cover cursor-pointer"
                                      onClick={() => window.open(msg.attachmentUrl!, '_blank')}
                                    />
                                  </div>
                                ) : (
                                  <p className="text-sm font-semibold px-4 pt-3">{msg.text}</p>
                                )}

                                <div
                                  className={`flex items-center justify-end gap-1 px-4 pb-2 pt-1 ${
                                    msg.isMe ? 'text-black/60' : 'text-indigo-400'
                                  }`}
                                  title={new Date(msg.createdAt).toLocaleString('en-US')}
                                >
                                  <span className="text-[10px] font-medium">
                                    {formatMessageTime(msg.createdAt)}
                                  </span>
                                  {msg.isMe && <CheckCheck className="w-3 h-3" />}
                                </div>
                              </div>
                            </div>
                            {msg.isMe && (
                              <img src={msg.senderAvatar ?? 'https://via.placeholder.com/32'}
                                alt={msg.senderName}
                                className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                            )}
                          </div>
                        </React.Fragment>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Replies */}
                <div className="px-4 py-2 border-t border-white/10 flex items-center gap-2 overflow-x-auto">
                  <span className="text-[10px] font-black italic uppercase text-lime-400 flex-shrink-0">
                    Quick:
                  </span>
                  {QUICK_REPLIES.map((reply) => (
                    <button key={reply}
                      onClick={() => setMessageInput(reply)}
                      className="flex-shrink-0 px-3 py-1.5 bg-indigo-900/60 hover:bg-indigo-800 border border-white/10 rounded-full text-xs font-semibold text-indigo-200 whitespace-nowrap">
                      {reply}
                    </button>
                  ))}
                </div>

                {/* Input */}
                <div className="p-4 border-t border-white/10">
                  {recordingBlob && audioPreviewUrl && !isRecording && (
                    <div className="mb-3 p-3 bg-indigo-900/60 rounded-xl border border-lime-400/30 flex items-center gap-3">
                      <audio src={audioPreviewUrl} controls className="flex-1 h-10 rounded-lg" />
                      <span className="text-xs font-mono text-lime-400">
                        {formatDuration(recordingTime)}
                      </span>
                      <button
                        onClick={cancelRecording}
                        className="p-2 bg-rose-500/20 hover:bg-rose-500/30 rounded-lg text-rose-300"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <button
                        onClick={sendVoiceMessage}
                        disabled={uploadingVoice}
                        className="p-2 bg-lime-400 hover:bg-lime-300 text-black rounded-lg disabled:opacity-50"
                        title="Send voice"
                      >
                        {uploadingVoice ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  )}

                  {isRecording && (
                    <div className="mb-3 p-3 bg-rose-500/10 rounded-xl border border-rose-500/40 flex items-center gap-3">
                      <span className="w-3 h-3 bg-rose-500 rounded-full animate-pulse" />
                      <span className="text-xs font-black italic uppercase text-rose-300">
                        Recording... {formatDuration(recordingTime)}
                      </span>
                      <div className="flex-1" />
                      <button
                        onClick={cancelRecording}
                        className="px-3 py-1.5 bg-indigo-900/60 hover:bg-indigo-800 rounded-lg text-xs font-bold text-indigo-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={stopRecording}
                        className="px-3 py-1.5 bg-rose-500 hover:bg-rose-400 rounded-lg text-xs font-black italic uppercase text-white flex items-center gap-1.5"
                      >
                        <Square className="w-3 h-3" fill="white" /> Stop
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <div className="relative" ref={emojiPickerRef}>
                      <button
                        onClick={() => setShowEmojiPicker((v) => !v)}
                        className={`p-2.5 rounded-xl transition flex-shrink-0 ${
                          showEmojiPicker
                            ? 'bg-lime-400 text-black'
                            : 'bg-indigo-900/60 hover:bg-indigo-800'
                        }`}
                      >
                        <Smile className={`w-4 h-4 ${showEmojiPicker ? 'text-black' : 'text-indigo-300'}`} />
                      </button>

                      {showEmojiPicker && (
                        <div className="absolute bottom-14 left-0 z-50">
                          <EmojiPicker
                            onEmojiClick={handleEmojiClick}
                            theme={'dark' as any}
                            width={320}
                            height={400}
                            searchDisabled={false}
                            skinTonesDisabled
                            previewConfig={{ showPreview: false }}
                          />
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage || isRecording}
                      className="p-2.5 bg-indigo-900/60 hover:bg-indigo-800 rounded-xl flex-shrink-0 disabled:opacity-50"
                    >
                      {uploadingImage ? (
                        <Loader2 className="w-4 h-4 text-lime-400 animate-spin" />
                      ) : (
                        <ImageIcon className="w-4 h-4 text-indigo-300" />
                      )}
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />

                    {isRecording ? (
                      <button
                        onClick={stopRecording}
                        className="p-2.5 bg-rose-500 hover:bg-rose-400 rounded-xl flex-shrink-0 animate-pulse"
                        title="Stop recording"
                      >
                        <Square className="w-4 h-4 text-white" fill="white" />
                      </button>
                    ) : (
                      <button
                        onClick={startRecording}
                        disabled={uploadingVoice || recordingBlob !== null}
                        className="p-2.5 bg-indigo-900/60 hover:bg-indigo-800 rounded-xl flex-shrink-0 disabled:opacity-50"
                        title="Record voice message"
                      >
                        <Mic className="w-4 h-4 text-indigo-300" />
                      </button>
                    )}

                    <input
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={`Message ${activeConversation.name}...`}
                      className="flex-1 bg-indigo-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-indigo-400/60 focus:border-lime-400 transition outline-none"
                    />

                    <button
                      onClick={handleSend}
                      disabled={!messageInput.trim()}
                      className="px-4 py-2.5 bg-lime-400 hover:bg-lime-300 text-black font-black italic uppercase text-xs rounded-xl shadow-lg shadow-lime-400/20 flex items-center gap-2 disabled:opacity-50 flex-shrink-0"
                    >
                      Send <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                <div className="p-4 bg-indigo-800/40 rounded-3xl mb-3 border border-white/10">
                  <Search className="w-8 h-8 text-indigo-400" />
                </div>
                <h3 className="text-base font-black italic uppercase text-indigo-300 mb-1">
                  No Conversation Selected
                </h3>
                <p className="text-xs text-indigo-400/80 max-w-xs">
                  Choose a conversation from the sidebar or click "New Chat" to start.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* NEW CHAT MODAL */}
        {showNewChatModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-indigo-950 border-2 border-lime-400/40 rounded-3xl p-5 max-w-lg w-full shadow-2xl space-y-4 text-white">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-lime-400 text-black flex items-center justify-center font-black">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-black italic uppercase text-sm text-white">
                      Start a New Conversation
                    </h4>
                    <p className="text-[11px] text-indigo-300/70">
                      Select an athlete from the community to message
                    </p>
                  </div>
                </div>
                <button type="button"
                  onClick={() => {
                    setShowNewChatModal(false);
                    setNewChatSearch('');
                  }}
                  className="p-1 text-indigo-300 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-indigo-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search athlete by name, handle, sport, school..."
                  value={newChatSearch}
                  onChange={(e) => setNewChatSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 bg-indigo-900 text-white text-xs font-semibold rounded-2xl border border-white/10 outline-none focus:ring-2 focus:ring-lime-400 placeholder:text-indigo-300/50"
                />
                {newChatSearch && (
                  <button type="button"
                    onClick={() => setNewChatSearch('')}
                    className="absolute right-2.5 top-3 text-indigo-300 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="overflow-y-auto space-y-1.5 max-h-72 pr-1">
                {loadingAthletes || creatingChat ? (
                  <div className="flex flex-col items-center justify-center py-10 text-indigo-400">
                    <Loader2 className="w-6 h-6 animate-spin text-lime-400 mb-2" />
                    <p className="text-xs">
                      {creatingChat ? 'Opening chat...' : 'Loading athletes...'}
                    </p>
                  </div>
                ) : allAthletes.length === 0 ? (
                  <div className="p-6 text-center text-xs text-indigo-300/70">
                    {newChatSearch
                      ? `No athletes found matching "${newChatSearch}"`
                      : 'No other athletes yet.'}
                  </div>
                ) : (
                  allAthletes.map((ath) => {
                    const isOnline = onlineUsers.has(ath.id);
                    return (
                      <button key={ath.id} type="button"
                        onClick={() => handleStartNewChatWithAthlete(ath)}
                        disabled={creatingChat}
                        className="w-full p-2.5 rounded-2xl bg-indigo-900/60 hover:bg-indigo-900 text-white border border-white/5 hover:border-lime-400/50 transition flex items-center justify-between group disabled:opacity-50">
                        <div className="flex items-center space-x-3 truncate">
                          <div className="relative shrink-0">
                            {ath.avatar ? (
                              <img src={ath.avatar} alt={ath.name}
                                className="w-10 h-10 rounded-full object-cover ring-1 ring-white/10" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-lime-400 text-black flex items-center justify-center font-bold text-xs">
                                {ath.name.charAt(0)}
                              </div>
                            )}
                            {isOnline && (
                              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-lime-400 border border-indigo-950" />
                            )}
                          </div>
                          <div className="truncate text-left min-w-0">
                            <div className="flex items-center space-x-1.5">
                              <p className="text-xs font-black truncate text-white group-hover:text-lime-300">
                                {ath.name}
                              </p>
                              {ath.isPro && (
                                <span className="text-[9px] font-mono px-1 rounded bg-lime-400/20 text-lime-300">
                                  PRO
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-indigo-300/80 truncate">
                              {ath.position || 'Athlete'} • {ath.primarySport || 'Basketball'}
                              {ath.schoolOrLeague ? ` • ${ath.schoolOrLeague}` : ''}
                            </p>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase italic bg-indigo-950 text-lime-400 border border-lime-400/20 group-hover:bg-lime-400 group-hover:text-black transition shrink-0 ml-2">
                          Message 💬
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CONFIRM MODAL */}
      {confirmModal.isOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fadeIn"
          onClick={closeConfirm}
        >
          <div
            className={`bg-indigo-950 rounded-3xl p-1.5 max-w-lg w-full shadow-2xl animate-scaleUp border-2 ${
              confirmModal.variant === 'danger'
                ? 'border-rose-500/60'
                : confirmModal.variant === 'warning'
                ? 'border-amber-400/60'
                : 'border-lime-400/60'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-indigo-950/95 rounded-[1.4rem] p-5 relative">
              <button
                type="button"
                onClick={closeConfirm}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-indigo-900/80 text-indigo-300 hover:text-white hover:bg-indigo-800 transition"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-start gap-4">
                <div className="relative flex-shrink-0">
                  <div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center border-2 ${
                      confirmModal.variant === 'danger'
                        ? 'bg-gradient-to-br from-rose-500/40 to-rose-600/30 border-rose-400/50'
                        : confirmModal.variant === 'warning'
                        ? 'bg-gradient-to-br from-amber-400/40 to-amber-500/30 border-amber-400/50'
                        : 'bg-gradient-to-br from-lime-400/40 to-emerald-500/30 border-lime-400/50'
                    }`}
                  >
                    {confirmModal.variant === 'danger' ? (
                      <Trash2 className="w-7 h-7 text-rose-300" strokeWidth={2.5} />
                    ) : confirmModal.variant === 'warning' ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28"
                        viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                        className="text-amber-300">
                        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                        <path d="M12 9v4" />
                        <path d="M12 17h.01" />
                      </svg>
                    ) : (
                      <UserCheck className="w-7 h-7 text-lime-300" strokeWidth={2.5} />
                    )}
                  </div>
                  <span
                    className={`absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center border-2 border-indigo-950 ${
                      confirmModal.variant === 'danger'
                        ? 'bg-rose-500'
                        : confirmModal.variant === 'warning'
                        ? 'bg-amber-400'
                        : 'bg-lime-400'
                    }`}
                  >
                    {confirmModal.variant === 'danger' ? (
                      <X className="w-3 h-3 text-white" strokeWidth={3} />
                    ) : confirmModal.variant === 'warning' ? (
                      <span className="text-black text-xs font-black">!</span>
                    ) : (
                      <CheckCheck className="w-3 h-3 text-black" strokeWidth={3} />
                    )}
                  </span>
                </div>

                <div className="flex-1 min-w-0 pr-8">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black italic uppercase border ${
                        confirmModal.variant === 'danger'
                          ? 'bg-rose-500/15 text-rose-300 border-rose-400/30'
                          : confirmModal.variant === 'warning'
                          ? 'bg-amber-400/15 text-amber-300 border-amber-400/30'
                          : 'bg-lime-400/15 text-lime-300 border-lime-400/30'
                      }`}
                    >
                      {confirmModal.variant === 'danger' ? (
                        <>
                          <Trash2 className="w-3 h-3" />
                          Remove Friend
                        </>
                      ) : confirmModal.variant === 'warning' ? (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12"
                            viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                            <path d="M12 9v4" />
                            <path d="M12 17h.01" />
                          </svg>
                          Warning
                        </>
                      ) : (
                        <>
                          <CheckCheck className="w-3 h-3" />
                          Confirm
                        </>
                      )}
                    </span>

                    <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-black italic uppercase bg-amber-400/15 text-amber-300 border border-amber-400/30">
                      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11"
                        viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2v20M2 12h20" />
                      </svg>
                      Action Required
                    </span>
                  </div>

                  <h3 className="text-lg font-black italic uppercase text-white leading-tight">
                    {confirmModal.title}
                  </h3>
                  <p className="text-xs text-indigo-300 font-semibold mt-1 leading-relaxed">
                    {confirmModal.message}
                  </p>

                  <div className="flex items-center gap-2 mt-3 text-xs font-bold text-lime-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"
                      viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      className="flex-shrink-0">
                      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                    </svg>
                    <span className="italic">
                      {confirmModal.variant === 'danger'
                        ? 'This action cannot be undone'
                        : 'Click confirm to proceed'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-5 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={closeConfirm}
                  className="flex-1 py-3 bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 font-black italic uppercase text-xs rounded-2xl transition"
                >
                  {confirmModal.cancelText ?? 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={confirmModal.onConfirm}
                  className={`flex-1 py-3 font-black italic uppercase text-xs rounded-2xl transition shadow-lg flex items-center justify-center gap-2 ${
                    confirmModal.variant === 'danger'
                      ? 'bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white shadow-rose-500/30'
                      : confirmModal.variant === 'warning'
                      ? 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black shadow-amber-400/30'
                      : 'bg-gradient-to-r from-lime-400 to-emerald-400 hover:from-lime-300 hover:to-emerald-300 text-black shadow-lime-400/30'
                  }`}
                >
                  {confirmModal.variant === 'danger' && (
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                  )}
                  {confirmModal.confirmText ?? 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TeamChat;