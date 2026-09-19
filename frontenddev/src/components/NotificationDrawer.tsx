// components/NotificationDrawer.tsx
import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  X,
  Zap,
  Trophy,
  Users,
  CheckCheck,
  UserCheck,
  UserX,
  AlertTriangle,
  Search,
  SearchX,
  BellOff,
  Clock,
} from 'lucide-react';
import type { AppNotification } from '../types/notification.types';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkAllRead: () => void;
  onClearAllNotifications?: () => void;
  onDismissNotification?: (id: string) => void;
  onAcceptFriendRequest?: (notifId: string, senderName?: string) => void;
  onDeclineFriendRequest?: (notifId: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllRead,
  onClearAllNotifications,
  onDismissNotification,
  onAcceptFriendRequest,
  onDeclineFriendRequest,
}) => {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<
    'all' | 'game_invites' | 'social' | 'system'
  >('all');
  const [filteredNotifications, setFilteredNotifications] = useState<
    AppNotification[]
  >([]);

  /* ─── Normalize createdAt → timestamp ms ─── */
  const getCreatedMs = (n: AppNotification): number => {
    if (typeof n.createdAt === 'number') return n.createdAt;
    if (typeof n.createdAt === 'string')
      return new Date(n.createdAt).getTime();
    if (n.timestamp) return new Date(n.timestamp).getTime();
    return 0;
  };

  /* ─── Filter 24h notifications ─── */
  const active24hNotifications = useMemo(() => {
    const now = Date.now();
    return notifications.filter((n) => {
      const created = getCreatedMs(n);
      if (!created || isNaN(created)) return true;
      return (now - created) / (1000 * 60 * 60) <= 24;
    });
  }, [notifications]);

  /* ─── Apply search + category filters ─── */
  useEffect(() => {
    let list = active24hNotifications;

    if (selectedCategory === 'game_invites') {
      list = list.filter((n) => n.type === 'game_invite');
    } else if (selectedCategory === 'social') {
      list = list.filter(
        (n) => n.type === 'friend_request' || n.type === 'chat_mention'
      );
    } else if (selectedCategory === 'system') {
      list = list.filter(
        (n) =>
          n.type !== 'game_invite' &&
          n.type !== 'friend_request' &&
          n.type !== 'chat_mention'
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (n) =>
          n.title?.toLowerCase().includes(q) ||
          n.message?.toLowerCase().includes(q) ||
          n.senderName?.toLowerCase().includes(q)
      );
    }

    // ✅ Sort by newest first
    list = [...list].sort((a, b) => getCreatedMs(b) - getCreatedMs(a));

    setFilteredNotifications(list);
  }, [searchQuery, selectedCategory, active24hNotifications]);

  /* ─── Relative time ─── */
  const getRelativeTime = (n: AppNotification): string => {
    const created = getCreatedMs(n);
    if (!created || isNaN(created)) return n.timestamp ?? 'Just now';

    const now = Date.now();
    const diff = Math.floor((now - created) / 1000);

    if (diff < 0) return 'Just now';
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  /* ─── Icon + styling per type (DYNAMIC) ─── */
  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'game_invite':
        return {
          icon: <Trophy className="w-4 h-4" />,
          accent: 'text-amber-300',
          iconColor: 'text-amber-400',
          unreadBg:
            'bg-gradient-to-r from-amber-950/60 via-indigo-900/90 to-indigo-900/90',
          unreadBorder: 'border-amber-400/60',
        };
      case 'friend_request':
        return {
          icon: <Users className="w-4 h-4" />,
          accent: 'text-lime-300',
          iconColor: 'text-lime-400',
          unreadBg: 'bg-indigo-900/90',
          unreadBorder: 'border-lime-400/50',
        };
      case 'achievement':
      case 'badge':
        return {
          icon: <Trophy className="w-4 h-4" />,
          accent: 'text-amber-300',
          iconColor: 'text-amber-400',
          unreadBg:
            'bg-gradient-to-r from-amber-950/80 via-indigo-900/90 to-purple-950/80',
          unreadBorder: 'border-amber-400/70',
        };
      case 'chat_mention':
        return {
          icon: <Bell className="w-4 h-4" />,
          accent: 'text-cyan-300',
          iconColor: 'text-cyan-400',
          unreadBg: 'bg-indigo-900/90',
          unreadBorder: 'border-cyan-400/50',
        };
      default:
        return {
          icon: <Zap className="w-4 h-4" />,
          accent: 'text-lime-400',
          iconColor: 'text-lime-400',
          unreadBg: 'bg-indigo-900/90',
          unreadBorder: 'border-lime-400/40',
        };
    }
  };

  /* ─── Render single notification card ─── */
  const renderCard = (n: AppNotification) => {
    const isFriendReq = n.type === 'friend_request';
    const style = getTypeStyle(n.type);
    const relTime = getRelativeTime(n);

    return (
      <motion.div
        key={n.id}
        layout
        initial={{ opacity: 0, y: 12, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, x: 30, scale: 0.92 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className={`p-3.5 rounded-2xl border text-xs transition relative group ${
          n.read
            ? 'bg-indigo-900/30 border-white/10 text-indigo-200/60'
            : `${style.unreadBg} ${style.unreadBorder} text-white font-semibold shadow-md`
        }`}
      >
        <div className="flex items-center justify-between mb-1 pr-6">
          <span
            className={`font-black italic uppercase flex items-center space-x-1 ${
              n.read ? 'text-indigo-300' : style.accent
            }`}
          >
            <span className={style.iconColor}>{style.icon}</span>
            <span>{n.title}</span>
          </span>
          <span className="text-[10px] bg-indigo-950/80 text-lime-300 border border-lime-400/30 px-1.5 py-0.5 rounded font-mono font-bold flex items-center space-x-1 shrink-0">
            <Clock className="w-2.5 h-2.5 text-lime-400 inline mr-0.5" />
            <span>{relTime}</span>
          </span>
        </div>

        {/* Dismiss */}
        <button
          type="button"
          onClick={() => onDismissNotification?.(n.id)}
          title="Clear notification"
          className="absolute top-2.5 right-2.5 p-1 text-indigo-400 hover:text-rose-400 hover:bg-white/10 rounded-lg transition cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Sender + message */}
        {isFriendReq && n.senderAvatar ? (
          <div className="flex items-start space-x-2.5 my-2">
            <img
              src={n.senderAvatar}
              alt={n.senderName || 'Athlete'}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-lime-400/40 shrink-0"
            />
            <p className="leading-relaxed flex-1">
              <strong>{n.senderName}</strong> {n.message}
            </p>
          </div>
        ) : (
          <p className="leading-relaxed my-1">{n.message}</p>
        )}

        {/* Friend request buttons */}
        {isFriendReq && (
          <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between">
            {n.status === 'accepted' ? (
              <span className="text-[11px] text-lime-300 font-bold flex items-center">
                <UserCheck className="w-3.5 h-3.5 mr-1" /> Request Accepted &
                Connected
              </span>
            ) : n.status === 'declined' ? (
              <span className="text-[11px] text-rose-400 font-bold flex items-center">
                <UserX className="w-3.5 h-3.5 mr-1" /> Request Declined
              </span>
            ) : (
              <div className="flex items-center space-x-2 w-full justify-end">
                <button
                  type="button"
                  onClick={() => onDeclineFriendRequest?.(n.id)}
                  className="px-3 py-1 bg-indigo-950 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold rounded-lg transition cursor-pointer"
                >
                  Decline
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onAcceptFriendRequest?.(n.id, n.senderName ?? undefined)
                  }
                  className="px-3 py-1 bg-lime-400 hover:bg-lime-300 text-black text-[10px] font-black italic uppercase rounded-lg shadow-md transition flex items-center space-x-1 cursor-pointer"
                >
                  <UserCheck className="w-3 h-3" />
                  <span>Accept & Connect</span>
                </button>
              </div>
            )}
          </div>
        )}
      </motion.div>
    );
  };

  /* ─── Count unread for badge ─── */
  const unreadCount = filteredNotifications.filter((n) => !n.read).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          id="notification-drawer-overlay-root"
          className="fixed inset-0 z-50 overflow-hidden pointer-events-auto"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 bg-indigo-950/70 backdrop-blur-md"
          />

          {/* Drawer */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 pointer-events-none">
            <motion.div
              initial={{ x: '100%', opacity: 0.7 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0.7 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-screen max-w-sm pointer-events-auto"
            >
              <div
                id="notification-drawer-panel"
                className="w-full bg-indigo-950 text-white h-full border-l border-white/10 shadow-2xl flex flex-col justify-between p-6 space-y-4 overflow-hidden"
              >
                {/* Header */}
                <div className="space-y-3 pb-3 border-b border-white/10 shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-xl bg-lime-400/20 border border-lime-400/30 flex items-center justify-center text-lime-400 relative">
                        <Bell className="w-4 h-4 text-lime-400 animate-pulse" />
                        {unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border border-indigo-950">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        )}
                      </div>
                      <h3 className="font-black italic uppercase text-white text-base tracking-tight">
                        Push & Geo Notifications
                      </h3>
                    </div>
                    <button
                      onClick={onClose}
                      className="p-1.5 text-indigo-200 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-indigo-300/70 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search notifications..."
                      className="w-full bg-indigo-900/80 border border-white/10 rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder-indigo-300/60 focus:outline-none focus:border-lime-400/60 transition"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-indigo-300 hover:text-white cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Category pills */}
                  <div className="flex items-center space-x-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'game_invites', label: 'Invites' },
                      { id: 'social', label: 'Social' },
                      { id: 'system', label: 'System' },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.id as any)}
                        className={`px-2.5 py-1 rounded-lg transition font-black italic uppercase text-[10px] whitespace-nowrap shrink-0 cursor-pointer ${
                          selectedCategory === cat.id
                            ? 'bg-lime-400 text-black shadow-md shadow-lime-400/10'
                            : 'bg-indigo-900/60 text-indigo-200 hover:text-white border border-white/10'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Flat List — No Grouping */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {filteredNotifications.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.25 }}
                      className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 my-auto"
                    >
                      <div className="w-16 h-16 rounded-full bg-indigo-900/80 flex items-center justify-center border border-white/10 shadow-xl">
                        {searchQuery || selectedCategory !== 'all' ? (
                          <SearchX className="w-8 h-8 text-amber-400" />
                        ) : (
                          <BellOff className="w-8 h-8 text-indigo-300" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <h4 className="font-black italic text-sm text-white uppercase tracking-wide">
                          {searchQuery || selectedCategory !== 'all'
                            ? 'No Matching Notifications'
                            : 'No Notifications Right Now'}
                        </h4>
                        <p className="text-xs text-indigo-200/70 max-w-xs font-medium leading-relaxed">
                          {searchQuery || selectedCategory !== 'all'
                            ? `No notifications found matching "${searchQuery}" in category "${selectedCategory}".`
                            : "You're all caught up! Pickup game callouts, friend requests, court alerts, and tournament updates will appear right here."}
                        </p>
                      </div>

                      {(searchQuery || selectedCategory !== 'all') && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            setSelectedCategory('all');
                          }}
                          className="px-3.5 py-1.5 bg-indigo-900 hover:bg-indigo-800 text-lime-300 border border-lime-400/30 text-xs font-black italic uppercase rounded-xl transition cursor-pointer"
                        >
                          Clear Search & Filters
                        </button>
                      )}

                      {!searchQuery && selectedCategory === 'all' && (
                        <div className="pt-2 px-3 py-2 bg-indigo-900/60 rounded-xl border border-white/10 text-[11px] text-lime-300 font-mono font-bold flex items-center space-x-2">
                          <Zap className="w-3.5 h-3.5 text-lime-400 animate-bounce" />
                          <span>Live Geo-Alerts Active</span>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <AnimatePresence mode="popLayout">
                      {filteredNotifications.map(renderCard)}
                    </AnimatePresence>
                  )}
                </div>

                {/* Footer */}
                <div className="pt-3 border-t border-white/10 space-y-2 shrink-0">
                  {showClearConfirm ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="bg-rose-950/90 border border-rose-500/50 p-3.5 rounded-2xl text-xs space-y-2.5"
                    >
                      <div className="flex items-center space-x-2 text-rose-300 font-extrabold">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                        <span>Confirm Clear All Notifications?</span>
                      </div>
                      <p className="text-[11px] text-rose-100/80 leading-relaxed font-medium">
                        This will remove all active game invites, friend
                        requests, and system alerts from your drawer. This
                        cannot be undone.
                      </p>
                      <div className="flex items-center space-x-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowClearConfirm(false)}
                          className="flex-1 py-1.5 bg-indigo-950 hover:bg-indigo-900 text-indigo-200 font-bold rounded-xl text-xs border border-white/10 transition cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onClearAllNotifications?.();
                            setShowClearConfirm(false);
                          }}
                          className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-black italic uppercase text-xs rounded-xl shadow-md transition cursor-pointer"
                        >
                          Confirm Clear
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={onMarkAllRead}
                        disabled={active24hNotifications.length === 0}
                        className="w-full py-2 bg-indigo-900 hover:bg-indigo-800 disabled:opacity-40 text-white border border-white/10 font-black italic uppercase text-xs rounded-xl flex items-center justify-center space-x-1.5 transition cursor-pointer"
                      >
                        <CheckCheck className="w-4 h-4 text-lime-400" />
                        <span>Mark All Read</span>
                      </button>

                      {onClearAllNotifications && (
                        <button
                          type="button"
                          onClick={() => setShowClearConfirm(true)}
                          disabled={active24hNotifications.length === 0}
                          className="w-full py-2 bg-rose-950/60 hover:bg-rose-900/80 disabled:opacity-40 text-rose-200 border border-rose-500/30 font-black italic uppercase text-xs rounded-xl flex items-center justify-center space-x-1.5 transition cursor-pointer"
                        >
                          <X className="w-4 h-4 text-rose-400" />
                          <span>Clear All Notifications</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default NotificationDrawer;