// src/App.tsx
import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Navigation from './components/Navigation';
import PublicAuthView from './components/PublicAuthView';
import { AthleteProfile, AuthProviderSettings } from './types/auth.types';
import { User } from './types';
import { userApi } from './services/api';
import { ProfileTab } from './components/ProfileTab';
import { StatsTab } from './components/StatsTab';
import { TeamChat } from './components/TeamChat';
import { DashboardTab } from './components/DashboardTab';
import { EmailVerifypopup } from './components/EmailVerifypopup';
import { authService } from './services/authService';
import { NotificationDrawer } from './components/NotificationDrawer';
import type { AppNotification, HighlightClip, SportType, CourtPOI } from './types';
import {
  fetchNotifications,
  markAllNotificationsRead,
  deleteNotificationAPI,
  clearAllNotificationsAPI,
  updateNotificationStatus,
} from './services/notification.service';
import { getSocket } from './services/socket';
import { PickupGamesTab } from './components/PickupGamesTab';
import { X } from 'lucide-react';
import WarmupView from './components/WarmupView';
import { fetchXpSummary, type XpSummary } from './services/challenge.service';
import { SocialFeedView } from './components/SocialFeedView';

import {
  fetchAthleteHighlights,
  createHighlightAPI,
} from './services/highlight.service';

import { Achievements } from './components/Achievements';
import { UploadHighlightModal } from './components/UploadHighlightModal';
import { awardXpAPI } from './services/xp.service';
import { fetchLeaderboardAthletes } from './services/leaderboard.service';
import { LeaderboardView } from './components/LeaderboardView';

/* ═══════════════════════════════════════════
   ✅ TOURNAMENTS VIEW IMPORT
   ═══════════════════════════════════════════ */
import { TournamentsView } from './components/TournamentsView';

/* ═══════════════════════════════════════════
   ✅ NEW: COURTS TAB IMPORT (Court Map module)
   ═══════════════════════════════════════════ */
import { CourtsTab } from './components/CourtsTab';
import { PALETTES } from './components/ProfileTab';
function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('auth');
  const [activePalette, setActivePalette] = useState<string>(() => {
    try {
      return localStorage.getItem('active_palette') || 'midnight_chrome';
    } catch {
      return 'midnight_chrome';
    }
  });
  // Athlete state
  const [athlete, setAthlete] = useState<AthleteProfile | null>(null);
  const [isAuthInitializing, setIsAuthInitializing] = useState(false);
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [showVerificationBanner, setShowVerificationBanner] = useState(false);
  const [isHostGameModalOpen, setIsHostGameModalOpen] = useState(false);
  const [gamesRefreshKey, setGamesRefreshKey] = useState(0);

  // NOTIFICATIONS STATE
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [xpSummary, setXpSummary] = useState<XpSummary | null>(null);
  const [chatTargetUser, setChatTargetUser] = useState<AthleteProfile | null>(null);

  // UPLOAD HIGHLIGHT MODAL STATE
  const [isUploadHighlightOpen, setIsUploadHighlightOpen] = useState(false);
  const [uploadPresetTitle, setUploadPresetTitle] = useState<string | undefined>();
  const [uploadPresetSport, setUploadPresetSport] = useState<SportType | undefined>();

  // ALL ATHLETES STATE
  const [leaderboardAthletes, setLeaderboardAthletes] = useState<AthleteProfile[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);

  // ✅ athleteId derived
  const athleteId = athlete?.id ?? null;

  // PICKUP GAMES STATE
  const [pickupGames, setPickupGames] = useState<any[]>([]);

  // PRO CHECKOUT MODAL STATE
  const [isProCheckoutOpen, setIsProCheckoutOpen] = useState(false);
  const [proCheckoutMessage, setProCheckoutMessage] = useState<string>('');

  /* ═══════════════════════════════════════════
     ✅ COURTS STATE (for Court Map + Tournaments)
     ═══════════════════════════════════════════ */
  const [courts, setCourts] = useState<CourtPOI[]>([]);

  /* ═══════════════════════════════════════════
     ✅ NEW: FAVORITE COURTS STATE (Court Map)
     ═══════════════════════════════════════════ */
  const [favoriteCourtIds, setFavoriteCourtIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('playground_favorite_courts');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Auth provider settings
  const authProviderSettings: AuthProviderSettings = {
    googleEnabled: true,
    facebookEnabled: true,
    appleEnabled: true,
    allowedEmailDomains: [],
    providerOrder: ['google', 'facebook', 'apple'],
  };

  // Apply dark mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);
  // ⭐ ⭐ ⭐ YE ADD KARO — Global Palette Applier ⭐ ⭐ ⭐
  useEffect(() => {
    const palette =
      PALETTES.find((p) => p.id === activePalette) || PALETTES[0];

    const root = document.documentElement;
    root.style.setProperty('--palette-bg', palette.colors.bg);
    root.style.setProperty('--palette-card', palette.colors.card);
    root.style.setProperty('--palette-accent1', palette.colors.accent1);
    root.style.setProperty('--palette-accent2', palette.colors.accent2);

    // Also store in localStorage so it persists
    try {
      localStorage.setItem('active_palette', activePalette);
    } catch {}

    console.log('🎨 Palette applied:', palette.id, palette.colors);
  }, [activePalette]);
  /* ═══════════════════════════════════════════
     ✅ FETCH COURTS FROM MYSQL
     ═══════════════════════════════════════════ */
  useEffect(() => {
    let cancelled = false;

    const loadCourts = async () => {
      try {
        const API =
          import.meta.env?.VITE_API_URL ?? 'http://localhost:3001/api';
        const res = await fetch(`${API}/courts`);
        const json = await res.json();

        if (cancelled) return;

        if (json.success && Array.isArray(json.data)) {
          console.log('✅ Loaded courts:', json.data.length);
          setCourts(json.data);
        } else {
          setCourts([]);
        }
      } catch (err) {
        console.error('❌ Load courts failed:', err);
        if (!cancelled) setCourts([]);
      }
    };

    loadCourts();
    return () => {
      cancelled = true;
    };
  }, []);

  // FETCH PICKUP GAMES
  useEffect(() => {
    let cancelled = false;

    const loadGames = async () => {
      try {
        const API =
          import.meta.env?.VITE_API_URL ?? 'http://localhost:3001/api';
        const res = await fetch(`${API}/pickup-games`);
        const json = await res.json();

        if (cancelled) return;

        if (json.success && Array.isArray(json.data)) {
          console.log('✅ Loaded pickup games:', json.data.length);
          setPickupGames(json.data);
        } else {
          setPickupGames([]);
        }
      } catch (err) {
        console.error('❌ Load pickup games failed:', err);
        if (!cancelled) setPickupGames([]);
      }
    };

    loadGames();
    return () => {
      cancelled = true;
    };
  }, [athleteId, gamesRefreshKey]);

  // LOAD HIGHLIGHTS FROM DATABASE on login
  useEffect(() => {
    if (!athleteId) return;

    let cancelled = false;

    const loadHighlights = async () => {
      try {
        console.log('🎬 Loading highlights for:', athleteId);
        const clips = await fetchAthleteHighlights(athleteId, {
          sport: 'all',
          limit: 50,
        });

        if (cancelled) return;

        const formattedClips: HighlightClip[] = clips.map((c) => ({
          id: c.id,
          title: c.title,
          sport: c.sport as SportType,
          videoUrl: c.videoUrl,
          thumbnailUrl: c.thumbnailUrl || '',
          durationSeconds: c.durationSeconds,
          createdAt: c.createdAt,
          views: c.views,
          likes: c.likes,
          description: c.description,
        }));

        setAthlete((prev) =>
          prev ? { ...prev, highlights: formattedClips } : prev
        );
      } catch (err) {
        console.error('❌ Load highlights failed:', err);
      }
    };

    loadHighlights();
    return () => {
      cancelled = true;
    };
  }, [athleteId]);

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true);
      try {
        const token = authService.getToken();
        const savedUser = authService.getCurrentUser();

        if (token && savedUser) {
          const result = await authService.verifyToken();

          if (result.valid && result.athlete) {
            setAthlete(result.athlete);
            setIsLoggedIn(true);
            setActiveTab('dashboard');

            if (result.athlete.emailVerified) {
              setIsEmailVerified(true);
              setShowVerificationBanner(false);
            } else {
              setIsEmailVerified(false);
              setShowVerificationBanner(true);
            }
          } else {
            await authService.logout();
            setAthlete(null);
            setIsLoggedIn(false);
            setActiveTab('auth');
          }
        } else {
          setAthlete(null);
          setIsLoggedIn(false);
          setActiveTab('auth');
        }
      } catch (error) {
        setAthlete(null);
        setIsLoggedIn(false);
        setActiveTab('auth');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // INITIAL NOTIFICATION LOAD
  useEffect(() => {
    if (!athleteId) {
      setNotifications([]);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const data = await fetchNotifications(athleteId);
        if (!cancelled) setNotifications(data);
      } catch (err) {
        console.error('❌ Load notifications:', err);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [athleteId]);

  // SOCKET LISTENERS — NOTIFICATIONS
  useEffect(() => {
    if (!athleteId) return;

    const socket = getSocket();
    socket.emit('user:join', athleteId);

    const handleNotificationNew = (raw: any) => {
      const newNotif: AppNotification = {
        id: raw.id,
        type: raw.type,
        title: raw.title,
        message: raw.message,
        senderId: raw.sender_id,
        senderName: raw.sender_name ?? null,
        senderAvatar: raw.sender_avatar ?? null,
        referenceId: raw.reference_id,
        actionUrl: raw.action_url,
        status: raw.status,
        read: raw.is_read === 1,
        createdAt: raw.created_at,
      };

      setNotifications((prev) => {
        if (prev.some((n) => n.id === newNotif.id)) return prev;
        return [newNotif, ...prev];
      });
    };

    const handleNotificationRead = (payload: { notificationId: string }) => {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === payload.notificationId ? { ...n, read: true } : n
        )
      );
    };

    const handleNotificationsCleared = () => {
      setNotifications([]);
    };

    socket.on('notification:new', handleNotificationNew);
    socket.on('notification:read', handleNotificationRead);
    socket.on('notifications:cleared', handleNotificationsCleared);

    return () => {
      socket.off('notification:new', handleNotificationNew);
      socket.off('notification:read', handleNotificationRead);
      socket.off('notifications:cleared', handleNotificationsCleared);
    };
  }, [athleteId]);

  // ═══════════════════════════════════════════
  // NOTIFICATION HANDLERS
  // ═══════════════════════════════════════════
  const handleMarkAllRead = async () => {
    if (!athleteId) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await markAllNotificationsRead(athleteId);
    } catch (err) {
      console.error('❌ markAllRead:', err);
    }
  };

  const handleClearAllNotifications = async () => {
    if (!athleteId) return;
    setNotifications([]);
    try {
      await clearAllNotificationsAPI(athleteId);
    } catch (err) {
      console.error('❌ clearAll:', err);
    }
  };

  const handleDismissNotification = async (id: string) => {
    if (!athleteId) return;
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await deleteNotificationAPI(id, athleteId);
    } catch (err) {
      console.error('❌ dismiss:', err);
    }
  };

  const handleAcceptFriendRequest = async (
    notifId: string,
    senderName?: string
  ) => {
    if (!athleteId) return;

    const notif = notifications.find((n) => n.id === notifId);
    if (!notif) return;

    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notifId ? { ...n, status: 'accepted', read: true } : n
      )
    );

    try {
      await updateNotificationStatus(notifId, athleteId, 'accepted');

      if (notif.senderId) {
        const socket = getSocket();
        socket.emit(
          'friend:accept',
          { userId: athleteId, friendId: notif.senderId },
          (res: any) => {
            if (res?.error) console.error('❌ Friend accept:', res.error);
          }
        );
      }
    } catch (err) {
      console.error('❌ handleAcceptFriendRequest:', err);
    }
  };

  const handleDeclineFriendRequest = async (notifId: string) => {
    if (!athleteId) return;

    const notif = notifications.find((n) => n.id === notifId);
    if (!notif) return;

    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notifId ? { ...n, status: 'declined', read: true } : n
      )
    );

    try {
      await updateNotificationStatus(notifId, athleteId, 'declined');

      if (notif.senderId) {
        const socket = getSocket();
        socket.emit(
          'friend:reject',
          { userId: athleteId, friendId: notif.senderId },
          (res: any) => {
            if (res?.error) console.error('❌ Friend reject:', res.error);
          }
        );
      }
    } catch (err) {
      console.error('❌ handleDeclineFriendRequest:', err);
    }
  };

  // AUTH HANDLERS
  const handleRegisterUser = (newUser: AthleteProfile) => {
    setAthlete(newUser);
    setIsLoggedIn(true);
    setActiveTab('dashboard');

    if (newUser.emailVerified) {
      setIsEmailVerified(true);
      setShowVerificationBanner(false);
    } else {
      setIsEmailVerified(false);
      setShowVerificationBanner(true);
    }
  };

  const handleLoginSuccess = (providerName: string, email?: string) => {
    const currentUser = authService.getCurrentUser();

    if (currentUser) {
      setAthlete(currentUser);
      setIsLoggedIn(true);
      setActiveTab('dashboard');

      if (currentUser.emailVerified) {
        setIsEmailVerified(true);
        setShowVerificationBanner(false);
      } else {
        setIsEmailVerified(false);
        setShowVerificationBanner(true);
      }
    } else {
      try {
        const userData = localStorage.getItem('playground_user');
        if (userData) {
          const parsedUser = JSON.parse(userData);
          setAthlete(parsedUser);
          setIsLoggedIn(true);
          setActiveTab('dashboard');

          if (parsedUser.emailVerified) {
            setIsEmailVerified(true);
            setShowVerificationBanner(false);
          } else {
            setIsEmailVerified(false);
            setShowVerificationBanner(true);
          }
        } else {
          setError('Failed to load user data. Please try again.');
          setAthlete(null);
          setIsLoggedIn(false);
          setActiveTab('auth');
        }
      } catch (error) {
        setError('Failed to load user data. Please try again.');
        setAthlete(null);
        setIsLoggedIn(false);
        setActiveTab('auth');
      }
    }
  };

  const handleSelectDemoAccount = (athleteId: string) => {
    const demoAthlete: AthleteProfile = {
      id: athleteId,
      name: 'Demo Player',
      handle: '@demoplayer',
      email: 'demo@playgrounds.app',
      avatar:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
      role: 'college',
      schoolOrLeague: 'State University',
      primarySport: 'basketball',
      position: 'SG',
      jerseyNumber: 23,
      registeredState: 'CA',
      registeredCity: 'Los Angeles',
      hasCompletedLocationOnboarding: true,
      bio: 'Demo athlete account for testing.',
      emailVerified: false,
      isVerified: true,
      isPro: false,
      isVerifiedPro: false,
      subscriptionTier: 'free',
      level: 3,
    };

    setAthlete(demoAthlete);
    setIsLoggedIn(true);
    setActiveTab('dashboard');
    setIsEmailVerified(false);
    setShowVerificationBanner(true);
    localStorage.setItem('athlete', JSON.stringify(demoAthlete));
  };

  const handleAuthModeChange = (mode: 'register' | 'login') => {
    setAuthMode(mode);
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setAthlete(null);
      setIsLoggedIn(false);
      setActiveTab('auth');
      setIsEmailVerified(false);
      setShowVerificationBanner(false);
      setNotifications([]);
      localStorage.removeItem('athlete');
      sessionStorage.clear();
    }
  };
    // ⭐ ⭐ ⭐ YE HANDLER ADD KARO ⭐ ⭐ ⭐
  const handleSelectPalette = (paletteId: string) => {
    console.log('🎨 Selecting palette:', paletteId);
    setActivePalette(paletteId);
  };

  // EMAIL VERIFICATION HANDLER
  const handleEmailVerified = () => {
    setIsEmailVerified(true);
    setShowVerificationBanner(false);

    if (athlete) {
      const updatedAthlete = {
        ...athlete,
        emailVerified: true,
      };
      setAthlete(updatedAthlete);
      localStorage.setItem('athlete', JSON.stringify(updatedAthlete));

      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        const updatedUser = {
          ...currentUser,
          emailVerified: true,
        };
        localStorage.setItem('playground_user', JSON.stringify(updatedUser));
      }
    }
  };

  // PRO CHECKOUT HANDLER
  const handleOpenProCheckout = (msg?: string) => {
    console.log('👑 Open Pro checkout:', msg);
    setProCheckoutMessage(msg || '');
    setIsProCheckoutOpen(true);
  };

  // JOIN GAME HANDLER
  const handleJoinGame = (gameId: string) => {
    console.log('🎮 Join game:', gameId);
    setActiveTab('pickup-games');
  };

  /* ═══════════════════════════════════════════
     ✅ TOURNAMENT → COURT MAP HANDLER
     ═══════════════════════════════════════════ */
  const handleSelectCourtOnMap = (courtId: string) => {
    console.log('🗺️ Navigate to court on map:', courtId);
    // Switch to Courts tab and let CourtMapView auto-select this court
    setActiveTab('courts');
    // Optional: pass selectedCourtId via context or state
    // For now, Courts tab will auto-select the first court
  };

  /* ═══════════════════════════════════════════
     ✅ NEW: COURT MAP HANDLERS
     ═══════════════════════════════════════════ */
  const handleHostAtCourt = (court: CourtPOI) => {
    console.log('🏀 Host game at court:', court.name);
    // Set the court context and open host modal
    setIsHostGameModalOpen(true);
    // Or navigate to pickup-games with court pre-filled
    // setActiveTab('pickup-games');
  };

  const handleTriggerGeofenceAlert = (court: CourtPOI) => {
    console.log('📡 Trigger geofence alert for:', court.name);
    // Show toast / notification for proximity alert
    // You can hook this to your notification system
  };

  const handleOpenCreatePark = () => {
    console.log('➕ Open create park modal');
    // Open create park modal
    // setIsCreateParkModalOpen(true);
  };

  const handleToggleFavoriteCourt = (courtId: string) => {
    setFavoriteCourtIds((prev) => {
      const isFav = prev.includes(courtId);
      const next = isFav ? prev.filter((id) => id !== courtId) : [...prev, courtId];
      try {
        localStorage.setItem('playground_favorite_courts', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleSelectAthleteFromMap = (athlete: AthleteProfile) => {
    setSelectedUser(athlete as any);
    setActiveTab('profile');
  };

  // LOAD XP SUMMARY
  const loadXpSummary = async () => {
    if (!athleteId) return;
    try {
      const summary = await fetchXpSummary(athleteId);
      setXpSummary(summary);
    } catch (err) {
      console.error('❌ Load XP summary:', err);
    }
  };

  useEffect(() => {
    loadXpSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athleteId]);

  // XP HANDLER
  const handleEarnXp = async (
    amount: number,
    source: string,
    referenceId?: string
  ) => {
    if (!athleteId) return;

    const previousXp = athlete?.valuexp ?? athlete?.xp ?? 0;

    setAthlete((prev) =>
      prev
        ? {
            ...prev,
            valuexp: (prev.valuexp ?? 0) + amount,
            xp: (prev.xp ?? 0) + amount,
          }
        : prev
    );

    window.dispatchEvent(
      new CustomEvent('user:xp-updated', {
        detail: {
          valuexp: previousXp + amount,
          xp: previousXp + amount,
        },
      })
    );

    try {
      const API = import.meta.env?.VITE_API_URL ?? 'http://localhost:3001/api';

      const res = await fetch(`${API}/xp/award`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          athleteId,
          amount,
          source,
          referenceId,
        }),
      });

      const json = await res.json();

      if (!json.success) throw new Error(json.message);

      const serverXp =
        json.data?.newXp ?? json.data?.valuexp ?? json.data?.totalXp;
      const serverLevel = json.data?.newLevel ?? json.data?.level;

      if (typeof serverXp === 'number') {
        setAthlete((prev) =>
          prev
            ? {
                ...prev,
                valuexp: serverXp,
                xp: serverXp,
                level: serverLevel ?? prev.level,
              }
            : prev
        );

        try {
          const raw = localStorage.getItem('playground_user');
          if (raw) {
            const stored = JSON.parse(raw);
            localStorage.setItem(
              'playground_user',
              JSON.stringify({
                ...stored,
                valuexp: serverXp,
                xp: serverXp,
                level: serverLevel ?? stored.level,
              })
            );
          }
        } catch {}

        window.dispatchEvent(
          new CustomEvent('user:xp-updated', {
            detail: {
              valuexp: serverXp,
              xp: serverXp,
              level: serverLevel,
            },
          })
        );
      }

      loadXpSummary();
    } catch (err) {
      console.error('❌ Failed to persist XP:', err);

      setAthlete((prev) =>
        prev
          ? {
              ...prev,
              valuexp: Math.max(0, (prev.valuexp ?? 0) - amount),
              xp: Math.max(0, (prev.xp ?? 0) - amount),
            }
          : prev
      );

      window.dispatchEvent(
        new CustomEvent('user:xp-updated', {
          detail: {
            valuexp: Math.max(0, previousXp),
            xp: Math.max(0, previousXp),
          },
        })
      );

      throw err;
    }
  };

  // SOCKET LISTENERS — XP
  useEffect(() => {
    if (!athleteId) return;

    const socket = getSocket();
    socket.emit('user:join', athleteId);

    const handleXpEarned = (payload: {
      athleteId: string;
      amount: number;
      source: string;
      newTotal: number;
    }) => {
      if (payload.athleteId !== athleteId) return;
      loadXpSummary();
    };

    const handleLevelUp = (payload: {
      athleteId: string;
      newLevel: number;
    }) => {
      if (payload.athleteId !== athleteId) return;
      loadXpSummary();
    };

    socket.on('xp:earned', handleXpEarned);
    socket.on('level:up', handleLevelUp);

    return () => {
      socket.off('xp:earned', handleXpEarned);
      socket.off('level:up', handleLevelUp);
    };
  }, [athleteId]);

  const [allAthletes, setAllAthletes] = useState<AthleteProfile[]>([]);

  const handleDirectMessageAthlete = (athlete: AthleteProfile) => {
    setChatTargetUser(athlete);
    setActiveTab('team-chat');
  };

  // UPLOAD HIGHLIGHT HANDLERS
  const handleOpenUploadModal = (
    presetTitle?: string,
    presetSport?: SportType
  ) => {
    setUploadPresetTitle(presetTitle);
    setUploadPresetSport(presetSport);
    setIsUploadHighlightOpen(true);
  };

  const [highlightsVersion, setHighlightsVersion] = useState(0);

  const handleAddHighlight = (clip: HighlightClip) => {
    setAthlete((prev) => {
      if (!prev) return prev;
      const existing = (prev as any).highlights || [];
      if (existing.some((h: any) => h.id === clip.id)) return prev;
      return {
        ...prev,
        highlights: [clip, ...existing],
      };
    });

    setHighlightsVersion((v) => v + 1);

    handleEarnXp(50, 'Published Highlight Clip', clip.id);
  };

  const [achievementsInitialTab, setAchievementsInitialTab] = useState<
    'showcase' | 'achievements' | 'reels' | 'challenges'
  >('showcase');

  const handleNavTabChange = (tabId: string) => {
    if (tabId === 'reelschallenge') {
      setAchievementsInitialTab('reels');
      setActiveTab('achievements');
    } else {
      setActiveTab(tabId);
    }
  };

  // FETCH LEADERBOARD ATHLETES
  useEffect(() => {
    if (activeTab !== 'leaderboard') return;
    if (!athleteId) return;

    let cancelled = false;
    setIsLoadingLeaderboard(true);

    (async () => {
      try {
        const data = await fetchLeaderboardAthletes(athleteId, 500);
        if (!cancelled) setLeaderboardAthletes(data);
      } catch (err) {
        console.error('❌ Load leaderboard failed:', err);
        if (!cancelled) setLeaderboardAthletes([]);
      } finally {
        if (!cancelled) setIsLoadingLeaderboard(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeTab, athleteId]);

  // FETCH ALL ATHLETES
  useEffect(() => {
    if (!athleteId) return;

    const load = async () => {
      try {
        const base =
          import.meta.env?.VITE_API_URL ?? 'http://localhost:3001/api';
        const url = `${base}/athletes?excludeId=${encodeURIComponent(athleteId)}`;

        const res = await fetch(url);
        const json = await res.json();

        if (json.success && Array.isArray(json.data)) {
          setAllAthletes(json.data);
        }
      } catch (err) {
        console.error('❌ Load athletes failed:', err);
      }
    };

    load();
  }, [athleteId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-indigo-950">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-lime-400 border-t-transparent"></div>
          <p className="text-white font-semibold text-sm">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <Navbar
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        isLoggedIn={isLoggedIn}
        userName={athlete?.name || 'Guest'}
        primarySport={athlete?.primary_sport || '🏐 Volleyball'}
        userAvatar={
          athlete?.profilepicture ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300'
        }
        userLevel={athlete?.level}
        userValueXp={athlete?.valuexp}
        onLogin={() => {
          setActiveTab('auth');
          setAuthMode('login');
        }}
        onLogout={handleLogout}
        onRegister={() => {
          setActiveTab('auth');
          setAuthMode('register');
        }}
        onProfile={() => setActiveTab('profile')}
        onNotifications={() => setIsNotificationDrawerOpen(true)}
        onDashboard={() => setActiveTab('dashboard')}
        unreadNotificationCount={notifications.filter((n) => !n.read).length}
      />

      {/* NOTIFICATION DRAWER */}
      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
        notifications={notifications}
        onMarkAllRead={handleMarkAllRead}
        onClearAllNotifications={handleClearAllNotifications}
        onDismissNotification={handleDismissNotification}
        onAcceptFriendRequest={handleAcceptFriendRequest}
        onDeclineFriendRequest={handleDeclineFriendRequest}
      />

      {/* UPLOAD HIGHLIGHT MODAL */}
      <UploadHighlightModal
        isOpen={isUploadHighlightOpen}
        onClose={() => setIsUploadHighlightOpen(false)}
        onAddHighlight={handleAddHighlight}
        athleteId={athleteId || ''}
        presetTitle={uploadPresetTitle}
        presetSport={uploadPresetSport}
      />

      {/* PRO CHECKOUT MODAL */}
      {isProCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-indigo-950 border border-amber-400/40 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-xl font-black italic uppercase text-white flex items-center gap-2">
              👑 Upgrade to PRO
            </h3>
            <p className="text-sm text-indigo-200 leading-relaxed">
              {proCheckoutMessage ||
                'Unlock advanced features with Playground PRO!'}
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIsProCheckoutOpen(false)}
                className="flex-1 py-2.5 bg-indigo-900 hover:bg-indigo-800 text-white rounded-xl font-bold text-sm transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setIsProCheckoutOpen(false);
                  setActiveTab('profile');
                }}
                className="flex-1 py-2.5 bg-lime-400 hover:bg-lime-300 text-black rounded-xl font-black uppercase text-sm transition"
              >
                Upgrade →
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row">
        <Navigation
          activeTab={activeTab as any}
          setActiveTab={handleNavTabChange as any}
          user={{
            id: athlete?.id || '1',
            name: athlete?.name || '',
            level: athlete?.level || 1,
            primary_sport: athlete?.primary_sport || '🏐 Volleyball',
            xp: (athlete as any)?.valuexp ?? 0,
            avatar:
              athlete?.avatar ||
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
          }}
          isLoggedIn={isLoggedIn}
          onOpenStatLog={() => console.log('Open stat log')}
          onOpenHostGame={() => console.log('Open host game')}
          onOpenReferralModal={() => console.log('Open referral modal')}
          unreadChatCount={0}
          pendingQueue={[]}
          isSyncing={false}
          syncProgress={{ current: 0, total: 0 }}
          isOnline={true}
        />

        <main className="flex-1 p-4 lg:p-6 bg-indigo-950/30 dark:bg-indigo-950/30 min-h-[calc(100vh-4rem)]">
          {/* EMAIL VERIFICATION BANNER */}
          {isLoggedIn && athlete && (
            <EmailVerifypopup
              userEmail={athlete.email}
              isVerified={isEmailVerified}
              onVerifiedSimulated={handleEmailVerified}
            />
          )}

          {error && (
            <div className="mb-4 p-4 bg-rose-500/20 border border-rose-500/40 rounded-2xl text-rose-200 text-sm">
              <div className="flex items-center justify-between">
                <span>{error}</span>
                <button
                  onClick={() => setError(null)}
                  className="text-rose-300 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {activeTab === 'auth' ? (
            <PublicAuthView
              user={athlete}
              isAuthInitializing={isAuthInitializing}
              initialAuthMode={authMode}
              authProviderSettings={authProviderSettings}
              onAuthModeChange={handleAuthModeChange}
              onRegisterUser={handleRegisterUser}
              onSelectDemoAccount={handleSelectDemoAccount}
              onLoginSuccess={handleLoginSuccess}
            />
          ) : activeTab === 'profile' ? (
            <ProfileTab
            athlete={selectedUser || athlete}
            allAthletes={allAthletes}
            onNavigateToDashboard={() => setActiveTab('dashboard')}
            onEditProfile={() => console.log('Edit profile')}
            // ⭐ ⭐ ⭐ YE 6 PROPS ADD KARO ⭐ ⭐ ⭐
            activePalette={activePalette}
            onSelectPalette={handleSelectPalette}
            pendingQueue={[]}
            onRetryQueueItem={(id) => console.log('Retry queue item:', id)}
            onClearSyncedQueue={() => console.log('Clear synced queue')}
            onSimulateOfflineAction={() => console.log('Simulate offline action')}
            onLogout={handleLogout}
            onNavigateToTab={(tab, target) => {
              setActiveTab(tab);
              if (target) setSelectedUser(target as any);
            }}
          />
          ) : activeTab === 'stats' ? (
            <StatsTab
              athlete={athlete}
              onNavigateToDashboard={() => setActiveTab('dashboard')}
              onEditProfile={() => console.log('Edit profile')}
            />
          ) : activeTab === 'dashboard' ? (
            <DashboardTab
              athlete={athlete}
              pickupGames={pickupGames}
              onOpenStatLog={() => setActiveTab('stats')}
              onStartGame={() => console.log('Start game')}
              onViewStats={() => setActiveTab('stats')}
              onViewHighlights={() => setActiveTab('achievements')}
              onNavigateToTab={(tab) => setActiveTab(tab)}
              onOpenProCheckout={handleOpenProCheckout}
              onJoinGame={handleJoinGame}
            />
          ) : activeTab === 'pickup-games' ? (
            <PickupGamesTab
              athlete={athlete}
              onHostGame={() => setIsHostGameModalOpen(true)}
              refreshKey={gamesRefreshKey}
              onStartGame={() => console.log('Start game')}
            />
          ) : activeTab === 'team-chat' ? (
            <TeamChat
              athlete={athlete}
              targetUser={chatTargetUser}
              onTargetUserHandled={() => setChatTargetUser(null)}
            />
          ) : activeTab === 'warmup' ? (
            athlete ? (
              <WarmupView
                user={{
                  ...athlete,
                  valuexp: xpSummary?.totalXp ?? athlete.valuexp,
                  level: xpSummary?.level ?? athlete.level,
                }}
                onEarnXp={handleEarnXp}
                onOpenStatLog={() => console.log('Open stat log')}
                onNavigateToAnalytics={() => console.log('Navigate to analytics')}
              />
            ) : (
              <div className="text-white p-8 text-center">
                <p className="text-indigo-300">Please log in to view warmups.</p>
              </div>
            )
          ) : activeTab === 'socialfeed' ? (
            athlete ? (
              <SocialFeedView
                user={athlete}
                allAthletes={allAthletes}
                onNavigateTab={setActiveTab}
                onSendFriendRequest={(player) => {
                  console.log('Friend request →', player);
                }}
                onDirectMessageAthlete={handleDirectMessageAthlete}
              />
            ) : (
              <div className="text-white p-8 text-center">
                <p className="text-indigo-300">
                  Please log in to view the social feed.
                </p>
              </div>
            )
          ) : activeTab === 'achievements' ? (
            athlete ? (
              <Achievements
                user={athlete}
                allAthletes={allAthletes}
                highlightsVersion={highlightsVersion}
                onUpdateProfile={(updated) =>
                  setAthlete((prev) => (prev ? { ...prev, ...updated } : prev))
                }
                onOpenUploadModal={handleOpenUploadModal}
                onOpenReels={() => setActiveTab('achievements')}
                onEarnXp={handleEarnXp}
                initialTab={achievementsInitialTab}
              />
            ) : (
              <div className="text-white p-8">Please log in</div>
            )
          ) : activeTab === 'leaderboard' ? (
            athlete ? (
              isLoadingLeaderboard ? (
                <div className="text-white p-8 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-lime-400 border-t-transparent mx-auto"></div>
                  <p className="text-indigo-300 mt-4">Loading leaderboard...</p>
                </div>
              ) : (
                <LeaderboardView
                  athletes={leaderboardAthletes}
                  currentUser={athlete}
                  onShareAthlete={(a) => {
                    console.log('Share athlete:', a);
                  }}
                  onSelectAthlete={(a) => {
                    setSelectedUser(a as any);
                    setActiveTab('profile');
                  }}
                  onUpdateUser={(updated) =>
                    setAthlete((prev) => (prev ? { ...prev, ...updated } : prev))
                  }
                />
              )
            ) : (
              <div className="text-white p-8">Please log in</div>
            )
          ) : activeTab === 'tournaments' ? (
            /* ═══════════════════════════════════════════
               TOURNAMENTS TAB
               ═══════════════════════════════════════════ */
            athlete ? (
              <TournamentsView
                courts={courts}
                user={athlete}
                onUpdateUser={(updated) =>
                  setAthlete((prev) => (prev ? { ...prev, ...updated } : prev))
                }
                onSelectCourtOnMap={handleSelectCourtOnMap}
              />
            ) : (
              <div className="text-white p-8 text-center">
                <p className="text-indigo-300">
                  Please log in to view tournaments.
                </p>
              </div>
            )
          ) : activeTab === 'courts' ? (
            /* ═══════════════════════════════════════════
               ✅ NEW: COURTS & MAPS TAB
               ═══════════════════════════════════════════ */
            athlete ? (
              <CourtsTab
                pickupGames={pickupGames}
                onHostAtCourt={handleHostAtCourt}
                onTriggerGeofenceAlert={handleTriggerGeofenceAlert}
                onOpenCreatePark={handleOpenCreatePark}
                favoriteCourtIds={favoriteCourtIds}
                onToggleFavoriteCourt={handleToggleFavoriteCourt}
                user={athlete}
                athletes={allAthletes}
                onSelectAthlete={handleSelectAthleteFromMap}
              />
            ) : (
              <div className="text-white p-8 text-center">
                <p className="text-indigo-300">
                  Please log in to view courts and maps.
                </p>
              </div>
            )
          ) : (
            <div className="text-white p-8">
              <h2 className="text-2xl font-bold">Coming Soon</h2>
              <p className="text-indigo-300 mt-2">
                This section is under development.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;