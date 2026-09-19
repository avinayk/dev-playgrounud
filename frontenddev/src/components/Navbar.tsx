// components/Navbar.tsx - Updated with getLevelInfo
import React, { useState, useEffect } from 'react';
import {
  Bell,
  Moon,
  Sun,
  ChevronDown,
  Sparkles,
  UserCheck,
  LogOut,
  LayoutDashboard,
  Trophy,
} from 'lucide-react';
import { getLevelInfo } from '../utils/leveling';   // ✅ NEW import

interface NavbarProps {
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  isLoggedIn?: boolean;
  userName?: string;
  primarySport?: string;
  userAvatar?: string;
  userLevel?: number;            // ✅ Keep as fallback
  userValueXp?: number;          // ✅ NEW: preferred XP source
  onLogin?: () => void;
  onLogout?: () => void;
  onRegister?: () => void;
  onProfile?: () => void;
  onNotifications?: () => void;
  onDashboard?: () => void;
  unreadNotificationCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  isDarkMode,
  setIsDarkMode,
  isLoggedIn = false,
  userName = 'User',
  primarySport,
  userAvatar,
  userLevel = 1,
  userValueXp,                          // ✅ NEW
  onLogin,
  onLogout,
  onRegister,
  onProfile,
  onNotifications,
  onDashboard,
  unreadNotificationCount = 0,
}) => {
  const [isSportDropdownOpen, setIsSportDropdownOpen] = useState(false);
  const [selectedSport, setSelectedSport] = useState(
    primarySport || '🏐 Volleyball'
  );

  /* ═══════════════════════════════════════════
     ✅ NEW: Local user mirror (same as Navigation.tsx)
     ═══════════════════════════════════════════ */
  const [localUser, setLocalUser] = useState<any>(() => {
    try {
      const raw = localStorage.getItem('playground_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  /* ═══════════════════════════════════════════
     ✅ NEW: Sync localStorage if userValueXp prop changes
     ═══════════════════════════════════════════ */
  useEffect(() => {
    if (typeof userValueXp === 'number') {
      setLocalUser((prev: any) => ({
        ...(prev || {}),
        valuexp: userValueXp,
      }));
    }
  }, [userValueXp]);

  /* ═══════════════════════════════════════════
     ✅ NEW: Listen for XP updates dispatched anywhere in the app
     ═══════════════════════════════════════════ */
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      console.log('🎯 [Navbar] XP updated:', detail);
      setLocalUser((prev: any) => ({ ...(prev || {}), ...detail }));
    };
    window.addEventListener('user:xp-updated', handler);
    return () => window.removeEventListener('user:xp-updated', handler);
  }, []);

  /* ═══════════════════════════════════════════
     ✅ NEW: Derive level from valuexp (same logic as Navigation.tsx)
     ═══════════════════════════════════════════ */
  const derivedXp =
    localUser?.valuexp ??
    localUser?.xp ??
    userValueXp ??
    0;

  const levelInfo = getLevelInfo(derivedXp);

  // ✅ Use derived level if available, fallback to prop
  const displayLevel = levelInfo?.level ?? userLevel;

  const sports = [
    '🏐 Volleyball',
    '🏀 Basketball',
    '⚽ Soccer',
    '🏈 Football',
    '⚾ Baseball',
    '🥎 Softball',
    '🏓 Pickleball',
    '🎾 Tennis',
  ];

  const handleSportSelect = (sport: string) => {
    setSelectedSport(sport);
    setIsSportDropdownOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-indigo-950/95 dark:bg-indigo-950/95 border-b border-white/10 text-white transition-colors overflow-x-clip max-w-full">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between min-w-0">
        {/* Logo */}
        <button
          onClick={onProfile}
          className="flex items-center space-x-1.5 sm:space-x-3 shrink-0 text-left focus:outline-none"
        >
          <div className="bg-lime-400 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-xl text-black font-black italic text-xs sm:text-lg tracking-tighter shadow-md shadow-lime-400/20">
            <span className="hidden sm:inline">PLAYGROUND</span>
            <span className="sm:hidden">PLAYGROUND</span>
          </div>
          <div>
            <div className="flex items-center space-x-1 sm:space-x-2">
              <span className="font-black italic text-xs sm:text-lg tracking-tight text-white">
                <span className="hidden xs:inline sm:inline">LEAGUE</span>
                <span className="text-lime-400">.PRO</span>
              </span>
            </div>
            <p className="text-[11px] text-indigo-200/70 font-semibold hidden sm:block">
              High School & College Athlete Stats & Pickup
            </p>
          </div>
        </button>

        {/* Sport Filter Dropdown */}
        <div className="relative mx-1 sm:mx-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsSportDropdownOpen(!isSportDropdownOpen)}
            className="relative flex items-center space-x-1.5 px-2.5 py-1.5 bg-indigo-900/80 hover:bg-indigo-800 text-lime-300 border rounded-xl shadow-md text-xs font-black italic uppercase transition duration-200 hover:scale-[1.02] active:scale-95 border-lime-400/40"
            title="Quick-switch primary sport filter across stats, tournaments & leaderboards"
          >
            <span className="text-sm sm:text-base shrink-0">
              {selectedSport.split(' ')[0]}
            </span>
            <span className="hidden sm:inline tracking-tight">
              {selectedSport.split(' ').slice(1).join(' ')}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 text-indigo-200 ${
                isSportDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {isSportDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-indigo-900 rounded-xl shadow-lg border border-white/10 py-1 z-50">
              {sports.map((sport) => (
                <button
                  key={sport}
                  onClick={() => handleSportSelect(sport)}
                  className={`w-full px-4 py-2 text-left text-xs font-semibold hover:bg-indigo-800 transition flex items-center space-x-2 ${
                    selectedSport === sport ? 'text-lime-400' : 'text-white'
                  }`}
                >
                  <span>{sport.split(' ')[0]}</span>
                  <span>{sport.split(' ').slice(1).join(' ')}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-4 shrink-0">
          <button className="hidden sm:flex items-center space-x-2 bg-indigo-900/60 hover:bg-indigo-900 px-3 py-1.5 rounded-full border border-white/10 transition"><div className="w-5 h-5 rounded-full bg-lime-400 text-black flex items-center justify-center font-black text-xs"><Trophy className="  text-dark-400 p-1" />
              </div><span className="text-xs font-black italic text-lime-400 uppercase">LVL {levelInfo.level}</span><div className="w-16 bg-indigo-950 rounded-full h-2 overflow-hidden p-0.5 border border-white/10"><div className="bg-lime-400 h-full rounded-full transition-all duration-500" style={{ width: `${levelInfo.progressPct}%` }}></div></div></button>
          {/* Dark Mode Toggle (commented out as in original) */}
          {/* <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-1.5 sm:p-2 rounded-xl text-indigo-200 hover:text-white hover:bg-indigo-900/60 transition"
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-lime-400" />
            ) : (
              <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-300" />
            )}
          </button> */}

          {isLoggedIn && (
            <button
              onClick={onNotifications}
              className="p-1.5 sm:p-2 rounded-xl text-indigo-200 hover:text-white hover:bg-indigo-900/60 transition relative"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />

              {/* ✅ Badge — sirf jab unread hon */}
              {unreadNotificationCount > 0 && (
                <>
                  {/* Option A: Small red dot (1 unread) */}
                  {unreadNotificationCount === 1 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-indigo-950 animate-pulse" />
                  )}

                  {/* Option B: Count badge (2+ unread) */}
                  {unreadNotificationCount > 1 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-indigo-950">
                      {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                    </span>
                  )}
                </>
              )}
            </button>
          )}

          {/* Auth Buttons */}
          <div className="flex items-center space-x-1 sm:space-x-2 pl-1 sm:pl-2 border-l border-white/10">
            {!isLoggedIn ? (
              <>
                <button
                  onClick={onRegister}
                  className="flex items-center space-x-1 px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[10px] sm:text-xs font-black uppercase italic bg-lime-400 hover:bg-lime-300 text-black transition shadow-md shadow-lime-400/20"
                  title="Open Public Registration Page"
                >
                  <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span className="hidden xs:inline">REGISTER</span>
                  <span className="xs:hidden">REG</span>
                </button>
                <button
                  onClick={onLogin}
                  className="flex items-center space-x-1 px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[10px] sm:text-xs font-black uppercase italic bg-indigo-900 hover:bg-indigo-800 border border-white/10 text-indigo-200 transition"
                  title="Open Public Sign In Page"
                >
                  <UserCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span className="hidden xs:inline">SIGN IN</span>
                  <span className="xs:hidden">LOGIN</span>
                </button>
              </>
            ) : (
              <>
                {/* Dashboard Button */}
                {onDashboard && (
                  <button
                    onClick={onDashboard}
                    className="p-1.5 sm:p-2 rounded-xl text-indigo-200 hover:text-white hover:bg-indigo-900/60 transition"
                    title="Dashboard"
                  >
                    <LayoutDashboard className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                )}

                {/* ✅ UPDATED: Profile Avatar with correct LEVEL + XP */}
                <button
                  onClick={onProfile}
                  className="flex items-center space-x-1.5 p-1 pr-2 rounded-2xl bg-indigo-900/60 hover:bg-indigo-800 transition border border-white/10"
                  title={`Level ${displayLevel} • ${levelInfo?.levelTitle || 'Rookie'} • ${derivedXp.toLocaleString()} XP`}
                >
                  {userAvatar ? (
                    <img
                      src={userAvatar}
                      alt={userName}
                      className="w-8 h-8 rounded-xl object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-lime-400/20 flex items-center justify-center">
                      <span className="text-sm font-bold text-lime-400">
                        {userName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}

                  {/* ✅ Text section with correct level + XP */}
                  <div className="hidden sm:block text-left">
                    <p className="text-white text-xs font-bold leading-tight truncate max-w-[100px]">
                      {userName}
                    </p>
                    <div className="flex items-center space-x-1">
                      <Trophy className="w-3 h-3 text-lime-400 shrink-0" />
                      <p className="text-lime-400 text-[10px] font-black leading-tight">
                        Lv. {displayLevel}
                      </p>
                      {/* <span className="text-indigo-400 text-[10px]">•</span> */}
                      {/* <p className="text-indigo-300 text-[10px] font-semibold leading-tight">
                        {derivedXp.toLocaleString()} XP
                      </p> */}
                    </div>
                  </div>
                </button>

                {/* Logout */}
                <button
                  onClick={onLogout}
                  className="flex items-center space-x-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-black uppercase italic bg-rose-500/20 hover:bg-rose-500 hover:text-white border border-rose-500/40 text-rose-300 transition"
                  aria-label="Logout"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" />
                  <span className="hidden sm:inline">LOG OUT</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;