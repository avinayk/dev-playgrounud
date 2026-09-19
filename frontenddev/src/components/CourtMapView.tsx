import React, { useState, useEffect, useRef } from 'react';
import { CourtPOI, SportType, PickupGame, AthleteProfile } from '../types';
import { triggerHaptic } from '../utils/haptics';
import { CourtSpecificLeaderboard } from './CourtSpecificLeaderboard';
import { CourtStatusBadgeTooltip } from './common/CourtStatusBadgeTooltip';
import { sendRadarPingAPI } from '../services/courts.service';
import L from 'leaflet';
import {
  MapPin, Users, Zap, Sun, Flame, Search, CheckCircle2, AlertTriangle,
  Maximize2, Compass, Plus, Trophy, Filter, Layers, Activity, Sparkles,
  TrendingUp, RefreshCw, Check, Radio, Clock, QrCode, Camera, Scan, Bell,
  Send, X, ShieldCheck, Play, Pause, BarChart2, ChevronRight, Building2,
  TreePine, Droplet, Car, SlidersHorizontal, LogOut, Star, MessageSquare,
  ThumbsUp, Navigation, Heart,
} from 'lucide-react';

interface CourtMapViewProps {
  courts: CourtPOI[];
  pickupGames: PickupGame[];
  onHostAtCourt: (court: CourtPOI) => void;
  onTriggerGeofenceAlert: (court: CourtPOI) => void;
  onOpenCreatePark: () => void;
  favoriteCourtIds?: string[];
  onToggleFavoriteCourt?: (courtId: string) => void;
  user?: AthleteProfile;
  athletes?: AthleteProfile[];
  onSelectAthlete?: (athlete: AthleteProfile) => void;
}

export interface CourtHeatInfo {
  totalPlayers: number;
  maxCapacity: number;
  occupancyRatio: number;
  occupancyPct: number;
  heatLevel: 'empty' | 'moderate' | 'busy' | 'packed';
  colorHex: string;
  bgTailwind: string;
  borderTailwind: string;
  textTailwind: string;
  badgeBg: string;
  badgeText: string;
  glowClass: string;
  badgeLabel: string;
  badgeIcon: string;
  activeGamesCount: number;
}

export interface PopularityBadgeInfo {
  label: 'Hopping' | 'Active' | 'Quiet';
  labelWithEmoji: string;
  badgeStyle: string;
  badgeBgSolid: string;
  badgeTextColor: string;
  dotColor: string;
}

export const getPopularityBadge = (activePlayersNowCount: number): PopularityBadgeInfo => {
  if (activePlayersNowCount >= 8) {
    return {
      label: 'Hopping',
      labelWithEmoji: 'Hopping 🔥',
      badgeStyle: 'bg-rose-500/25 text-rose-300 border-rose-500/50 shadow-rose-500/20',
      badgeBgSolid: 'bg-rose-500 text-white',
      badgeTextColor: 'text-rose-400',
      dotColor: 'bg-rose-500',
    };
  }
  if (activePlayersNowCount >= 3) {
    return {
      label: 'Active',
      labelWithEmoji: 'Active ⚡',
      badgeStyle: 'bg-amber-400/25 text-amber-300 border-amber-400/50 shadow-amber-400/20',
      badgeBgSolid: 'bg-amber-400 text-black',
      badgeTextColor: 'text-amber-400',
      dotColor: 'bg-amber-400',
    };
  }
  return {
    label: 'Quiet',
    labelWithEmoji: 'Quiet 🌙',
    badgeStyle: 'bg-emerald-500/25 text-emerald-300 border-emerald-500/50 shadow-emerald-500/20',
    badgeBgSolid: 'bg-emerald-500 text-white',
    badgeTextColor: 'text-emerald-400',
    dotColor: 'bg-emerald-500',
  };
};

export const getCourtHeatInfo = (
  court: CourtPOI,
  pickupGames: PickupGame[],
  extraPlayers: number = 0,
  isCheckedIn: boolean = false
): CourtHeatInfo => {
  const courtGames = pickupGames.filter((g) => g.courtId === court.id);
  const gamePlayers = courtGames.reduce((acc, g) => acc + g.currentPlayers, 0);
  const totalPlayers =
    (court.activePlayersNow || 0) + gamePlayers + extraPlayers + (isCheckedIn ? 1 : 0);

  let maxCapacity = 16;
  if (court.sport === 'basketball') maxCapacity = 15;
  else if (court.sport === 'baseball' || court.sport === 'softball') maxCapacity = 24;
  else if (court.sport === 'soccer') maxCapacity = 22;
  else if (court.sport === 'pickleball') maxCapacity = 12;
  else if (court.sport === 'volleyball') maxCapacity = 12;

  const occupancyRatio = Math.min(1.2, totalPlayers / maxCapacity);
  const occupancyPct = Math.min(100, Math.round((totalPlayers / maxCapacity) * 100));

  if (occupancyPct >= 80 || totalPlayers >= 14) {
    return {
      totalPlayers, maxCapacity, occupancyRatio, occupancyPct,
      heatLevel: 'packed', colorHex: '#ef4444',
      bgTailwind: 'bg-rose-500', borderTailwind: 'border-rose-400',
      textTailwind: 'text-rose-400', badgeBg: 'bg-rose-500 text-white',
      badgeText: 'text-rose-300',
      glowClass: 'shadow-rose-500/50 ring-2 ring-rose-500 animate-pulse',
      badgeLabel: 'Packed / High Heat', badgeIcon: '🔴',
      activeGamesCount: courtGames.length,
    };
  }
  if (occupancyPct >= 50 || totalPlayers >= 8) {
    return {
      totalPlayers, maxCapacity, occupancyRatio, occupancyPct,
      heatLevel: 'busy', colorHex: '#f97316',
      bgTailwind: 'bg-orange-500', borderTailwind: 'border-orange-400',
      textTailwind: 'text-orange-400', badgeBg: 'bg-orange-500 text-white',
      badgeText: 'text-orange-300',
      glowClass: 'shadow-orange-500/40 ring-1 ring-orange-400',
      badgeLabel: 'Busy / Active', badgeIcon: '🟠',
      activeGamesCount: courtGames.length,
    };
  }
  if (occupancyPct >= 20 || totalPlayers >= 3) {
    return {
      totalPlayers, maxCapacity, occupancyRatio, occupancyPct,
      heatLevel: 'moderate', colorHex: '#facc15',
      bgTailwind: 'bg-amber-400', borderTailwind: 'border-amber-300',
      textTailwind: 'text-amber-400', badgeBg: 'bg-amber-400 text-black',
      badgeText: 'text-amber-300',
      glowClass: 'shadow-amber-400/30 ring-1 ring-amber-300',
      badgeLabel: 'Moderate Activity', badgeIcon: '🟡',
      activeGamesCount: courtGames.length,
    };
  }
  return {
    totalPlayers, maxCapacity, occupancyRatio, occupancyPct,
    heatLevel: 'empty', colorHex: '#22c55e',
    bgTailwind: 'bg-emerald-500', borderTailwind: 'border-emerald-400',
    textTailwind: 'text-emerald-400', badgeBg: 'bg-emerald-500 text-white',
    badgeText: 'text-emerald-300',
    glowClass: 'shadow-emerald-500/20 ring-1 ring-emerald-400/50',
    badgeLabel: 'Empty / Quiet', badgeIcon: '🟢',
    activeGamesCount: courtGames.length,
  };
};

export const CourtMapView: React.FC<CourtMapViewProps> = ({
  courts,
  pickupGames,
  onHostAtCourt,
  onTriggerGeofenceAlert,
  onOpenCreatePark,
  favoriteCourtIds = [],
  onToggleFavoriteCourt,
  user,
  athletes = [],
  onSelectAthlete,
}) => {
  const [selectedCourt, setSelectedCourt] = useState<CourtPOI | null>(courts[0] || null);
  const [activePopupCourtId, setActivePopupCourtId] = useState<string | null>(null);
  const [sportFilter, setSportFilter] = useState<SportType | 'all'>('all');
  const [surfaceFilter, setSurfaceFilter] = useState<string>('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [heatFilter, setHeatFilter] = useState<'all' | 'empty' | 'moderate' | 'busy' | 'packed'>('all');
  const [popularityFilter, setPopularityFilter] = useState<'all' | 'Hopping' | 'Active' | 'Quiet'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [checkedInCourts, setCheckedInCourts] = useState<string[]>([]);
  const [maxDistanceKm, setMaxDistanceKm] = useState<number>(25);
  const [isLeaderboardModalOpen, setIsLeaderboardModalOpen] = useState<boolean>(false);

  const [regionalFilter, setRegionalFilter] = useState<'my_city' | 'my_state' | 'all'>('all');
  const [customCityFilter, setCustomCityFilter] = useState<string>(user?.registeredCity || '');
  const [customStateFilter, setCustomStateFilter] = useState<string>(user?.registeredState || '');

  const [isNearMeActive, setIsNearMeActive] = useState<boolean>(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  const [mapMode, setMapMode] = useState<'openstreetmap' | 'grid'>('grid');
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);

  /* ═══════════════════════════════════════════
     ✅ RADAR STATE (NEW)
     ═══════════════════════════════════════════ */
  const [isRadarPinging, setIsRadarPinging] = useState(false);
  const [showRadarModal, setShowRadarModal] = useState(false);
  const [radarResults, setRadarResults] = useState<{
    notifiedCount: number;
    nearbyAthletes: Array<{
      id: string;
      name: string;
      avatar: string | null;
      distanceMeters: number;
    }>;
    courtName: string;
  } | null>(null);

  const calculateDistanceMiles = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3958.8;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  };

  const handleToggleNearMe = () => {
    triggerHaptic('medium');
    if (!isNearMeActive) {
      setIsLocating(true);
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserCoords({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
            setIsLocating(false);
            setIsNearMeActive(true);
            triggerHaptic('success');
          },
          (error) => {
            console.warn('Geolocation error:', error);
            setUserCoords({
              lat: courts[0]?.lat || 40.7128,
              lng: courts[0]?.lng || -74.006,
            });
            setIsLocating(false);
            setIsNearMeActive(true);
          },
          { timeout: 5000, enableHighAccuracy: true }
        );
      } else {
        setUserCoords({
          lat: courts[0]?.lat || 40.7128,
          lng: courts[0]?.lng || -74.006,
        });
        setIsNearMeActive(true);
      }
    } else {
      setIsNearMeActive(false);
    }
  };

  useEffect(() => {
    if (user?.registeredCity) setCustomCityFilter(user.registeredCity);
    if (user?.registeredState) setCustomStateFilter(user.registeredState);
  }, [user?.registeredCity, user?.registeredState]);

  const [locationTypeFilter, setLocationTypeFilter] = useState<'all' | 'indoor' | 'outdoor'>('all');
  const [lightingFilter, setLightingFilter] = useState<'all' | 'has_lights' | 'no_lights'>('all');
  const [rimFilter, setRimFilter] = useState<string>('all');
  const [waterFountainOnly, setWaterFountainOnly] = useState<boolean>(false);
  const [parkingOnly, setParkingOnly] = useState<boolean>(false);
  const [showAttributeFilterDrawer, setShowAttributeFilterDrawer] = useState<boolean>(false);
  const [showAdvancedSimulator, setShowAdvancedSimulator] = useState<boolean>(false);

  const activeAttributeFiltersCount =
    (locationTypeFilter !== 'all' ? 1 : 0) +
    (lightingFilter !== 'all' ? 1 : 0) +
    (rimFilter !== 'all' ? 1 : 0) +
    (waterFountainOnly ? 1 : 0) +
    (parkingOnly ? 1 : 0);

  const handleResetAttributeFilters = () => {
    setLocationTypeFilter('all');
    setLightingFilter('all');
    setRimFilter('all');
    setWaterFountainOnly(false);
    setParkingOnly(false);
  };

  const handleGetDirections = (court: CourtPOI, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const destination = encodeURIComponent(`${court.name}, ${court.address}`);
    const isAppleDevice =
      typeof navigator !== 'undefined' &&
      /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent);
    const directionsUrl = isAppleDevice
      ? `https://maps.apple.com/?daddr=${court.lat},${court.lng}&q=${destination}`
      : `https://www.google.com/maps/dir/?api=1&destination=${court.lat},${court.lng}&destination_place_id=${destination}`;
    window.open(directionsUrl, '_blank', 'noopener,noreferrer');
  };

  const [extraPlayersMap, setExtraPlayersMap] = useState<Record<string, number>>({});
  const [showHeatGlowOverlay, setShowHeatGlowOverlay] = useState(true);
  const [isLiveSimulationActive, setIsLiveSimulationActive] = useState<boolean>(false);
  const [timePreset, setTimePreset] = useState<'afternoon' | 'peak_rush' | 'morning_quiet'>('peak_rush');
  const [lastUpdatedTime, setLastUpdatedTime] = useState<Date>(new Date());

  const [liveHeatLogs, setLiveHeatLogs] = useState<
    Array<{ id: string; time: string; courtName: string; text: string; level: 'surge' | 'drop' | 'checkin' }>
  >([
    { id: '1', time: '13:04', courtName: 'Rucker Park', text: '🔥 Heat Surge: +4 athletes checked in for 5v5 pickup!', level: 'surge' },
    { id: '2', time: '13:02', courtName: 'Lincoln Park Courts', text: '⚡ 2 new players arrived at Pickleball Court 1', level: 'checkin' },
    { id: '3', time: '12:58', courtName: 'West 4th Courts', text: '👥 Game ended: 3 players left court', level: 'drop' },
  ]);

  useEffect(() => {
    if (!isLiveSimulationActive || courts.length === 0) return;
    const interval = setInterval(() => {
      const randomCourt = courts[Math.floor(Math.random() * courts.length)];
      const deltas = timePreset === 'peak_rush' ? [2, 3, 4, -1, 3] : [1, 2, -2, 1, -1];
      const delta = deltas[Math.floor(Math.random() * deltas.length)];
      setExtraPlayersMap((prev) => {
        const current = prev[randomCourt.id] || 0;
        const nextValue = Math.max(0, current + delta);
        return { ...prev, [randomCourt.id]: nextValue };
      });
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastUpdatedTime(new Date());
      let logText = '';
      let logType: 'surge' | 'drop' | 'checkin' = 'checkin';
      if (delta > 0) {
        logText = `🔥 Live Heat Change: +${delta} athlete${delta > 1 ? 's' : ''} arrived at ${randomCourt.name}!`;
        logType = delta >= 3 ? 'surge' : 'checkin';
      } else {
        logText = `📉 Heat Cool: ${Math.abs(delta)} player${Math.abs(delta) > 1 ? 's' : ''} left ${randomCourt.name}.`;
        logType = 'drop';
      }
      setLiveHeatLogs((prevLogs) => [
        { id: `log_${Date.now()}`, time: nowStr, courtName: randomCourt.name, text: logText, level: logType },
        ...prevLogs.slice(0, 5),
      ]);
    }, 5000);
    return () => clearInterval(interval);
  }, [isLiveSimulationActive, courts, timePreset]);

  const handleTriggerPeakSurge = () => {
    const updatedMap: Record<string, number> = { ...extraPlayersMap };
    courts.forEach((c) => {
      const surgeCount = Math.floor(Math.random() * 5) + 3;
      updatedMap[c.id] = (updatedMap[c.id] || 0) + surgeCount;
    });
    setExtraPlayersMap(updatedMap);
    setLastUpdatedTime(new Date());
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setLiveHeatLogs((prev) => [
      {
        id: `surge_${Date.now()}`,
        time: nowStr,
        courtName: 'All Venue Courts',
        text: '🚀 PEAK HOUR RUSH DETECTED: +25 Athletes checked in across city parks!',
        level: 'surge',
      },
      ...prev.slice(0, 5),
    ]);
  };

  const handleResetHeatSimulation = () => {
    setExtraPlayersMap({});
    setLastUpdatedTime(new Date());
  };

  /* ═══════════════════════════════════════════
     ✅ RADAR HANDLER (NEW)
     ═══════════════════════════════════════════ */
  const handleTriggerRadarPing = async () => {
    if (!selectedCourt) {
      setBroadcastNotification('⚠️ Please select a court first');
      setTimeout(() => setBroadcastNotification(null), 3000);
      return;
    }
    if (!user?.id) {
      setBroadcastNotification('⚠️ Please log in to use Radar');
      setTimeout(() => setBroadcastNotification(null), 3000);
      return;
    }

    triggerHaptic('medium');
    setIsRadarPinging(true);
    setBroadcastNotification(
      `📡 Broadcasting radar ping at ${selectedCourt.name}...`
    );

    try {
      const result = await sendRadarPingAPI(
        selectedCourt.id,
        user.id,
        `Player looking for a game at ${selectedCourt.name}!`
      );

      triggerHaptic('success');
      setIsRadarPinging(false);

      // Show results in modal
      setRadarResults({
        notifiedCount: result.notifiedCount,
        nearbyAthletes: result.nearbyAthletes || [],
        courtName: selectedCourt.name,
      });
      setShowRadarModal(true);

      // Toast
      setBroadcastNotification(
        result.notifiedCount > 0
          ? `📡 Radar ping sent to ${result.notifiedCount} nearby players! +10 XP`
          : `📡 Ping active — no players nearby right now. +10 XP`
      );
      setTimeout(() => setBroadcastNotification(null), 6000);

      // Log to live heat
      const nowStr = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      setLiveHeatLogs((prev) => [
        {
          id: `radar_${Date.now()}`,
          time: nowStr,
          courtName: selectedCourt.name,
          text: `📡 RADAR PING: ${user.name || 'You'} broadcasted to ${result.notifiedCount} nearby athletes!`,
          level: 'surge',
        },
        ...prev.slice(0, 8),
      ]);
    } catch (err: any) {
      console.error('❌ Radar ping failed:', err);
      triggerHaptic('error');
      setIsRadarPinging(false);
      setBroadcastNotification(
        `❌ Radar failed: ${err?.message || 'Try again'}`
      );
      setTimeout(() => setBroadcastNotification(null), 5000);
    }
  };

  const selectedCourtHeat = selectedCourt
    ? getCourtHeatInfo(
        selectedCourt,
        pickupGames,
        extraPlayersMap[selectedCourt.id] || 0,
        checkedInCourts.includes(selectedCourt.id)
      )
    : null;

  const selectedActiveCount = selectedCourt
    ? selectedCourt.activePlayersNow !== undefined
      ? selectedCourt.activePlayersNow + (extraPlayersMap[selectedCourt.id] || 0)
      : selectedCourtHeat?.totalPlayers || 0
    : 0;

  const selectedPopularity = getPopularityBadge(selectedActiveCount);

  const filteredCourts = courts.filter((court) => {
    const matchesSport = sportFilter === 'all' || court.sport === sportFilter;
    const matchesSurface =
      surfaceFilter === 'all' ||
      (court.surfaceType && court.surfaceType.toLowerCase().includes(surfaceFilter.toLowerCase()));
    const matchesSearch =
      court.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (court.address || '').toLowerCase().includes(searchQuery.toLowerCase());

    const heat = getCourtHeatInfo(
      court,
      pickupGames,
      extraPlayersMap[court.id] || 0,
      checkedInCourts.includes(court.id)
    );
    const matchesHeat = heatFilter === 'all' || heat.heatLevel === heatFilter;

    const activeCount =
      court.activePlayersNow !== undefined
        ? court.activePlayersNow + (extraPlayersMap[court.id] || 0)
        : heat.totalPlayers;
    const popularity = getPopularityBadge(activeCount);
    const matchesPopularity = popularityFilter === 'all' || popularity.label === popularityFilter;

    const matchesLocation =
      locationTypeFilter === 'all' ||
      (locationTypeFilter === 'indoor' && (court as any).isIndoor) ||
      (locationTypeFilter === 'outdoor' && !(court as any).isIndoor);

    const matchesLighting =
      lightingFilter === 'all' ||
      (lightingFilter === 'has_lights' && (court as any).lighting) ||
      (lightingFilter === 'no_lights' && !(court as any).lighting);

    const matchesRim =
      rimFilter === 'all' ||
      ((court as any).rimCondition &&
        (court as any).rimCondition.toLowerCase().includes(rimFilter.toLowerCase()));

    const matchesWater = !waterFountainOnly || (court as any).waterFountain === true;
    const matchesParking = !parkingOnly || (court as any).parkingAvailable === true;
    const matchesDistance = maxDistanceKm >= 50 || (court.distanceKm || 0) <= maxDistanceKm;

    let matchesRegion = true;
    if (regionalFilter === 'my_city' && customCityFilter) {
      const cityQuery = customCityFilter.toLowerCase().trim();
      const addr = (court.address || '').toLowerCase();
      const name = (court.name || '').toLowerCase();
      const cCity = (court.city || '').toLowerCase();
      matchesRegion = addr.includes(cityQuery) || name.includes(cityQuery) || cCity.includes(cityQuery);
    } else if (regionalFilter === 'my_state' && customStateFilter) {
      const stateQuery = customStateFilter.toLowerCase().trim();
      const addr = (court.address || '').toLowerCase();
      const cState = ((court as any).state || '').toLowerCase();
      matchesRegion = addr.includes(stateQuery) || cState === stateQuery;
    }

    if (isNearMeActive) {
      const uLat = userCoords?.lat || courts[0]?.lat || 40.7128;
      const uLng = userCoords?.lng || courts[0]?.lng || -74.006;
      const distMiles = calculateDistanceMiles(uLat, uLng, court.lat, court.lng);
      if (distMiles > 5.0) return false;
    }

    return (
      matchesRegion && matchesSport && matchesSurface && matchesSearch &&
      matchesHeat && matchesPopularity && matchesLocation && matchesLighting &&
      matchesRim && matchesWater && matchesParking && matchesDistance
    );
  });

  useEffect(() => {
    if (courts.length > 0 && !selectedCourt) {
      setSelectedCourt(courts[0]);
    }
  }, [courts, selectedCourt]);

  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [targetQrCourt, setTargetQrCourt] = useState<CourtPOI | null>(courts[0] || null);
  const [isSimulatingScan, setIsSimulatingScan] = useState(false);
  const [broadcastNotification, setBroadcastNotification] = useState<string | null>(null);

  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveTargetCourt, setLeaveTargetCourt] = useState<CourtPOI | null>(null);
  const [sessionIntensity, setSessionIntensity] = useState<'Casual' | 'Moderate' | 'High Intensity' | 'Pro Competitive'>('High Intensity');
  const [sessionRating, setSessionRating] = useState<number>(5);
  const [sessionReviewNote, setSessionReviewNote] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['Rims Clean', 'Great Competition']);
  const [checkoutToast, setCheckoutToast] = useState<string | null>(null);

  const handleCheckIn = (courtId: string) => {
    triggerHaptic('success');
    if (!checkedInCourts.includes(courtId)) {
      setCheckedInCourts([...checkedInCourts, courtId]);
    }
  };

  const handleOpenLeaveModal = (court: CourtPOI) => {
    triggerHaptic('medium');
    setLeaveTargetCourt(court);
    setIsLeaveModalOpen(true);
  };

  const toggleConditionTag = (tag: string) => {
    triggerHaptic('light');
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleExecuteCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveTargetCourt) return;
    triggerHaptic('warning');
    const court = leaveTargetCourt;
    setCheckedInCourts((prev) => prev.filter((id) => id !== court.id));
    setExtraPlayersMap((prev) => {
      const current = prev[court.id] || 0;
      return { ...prev, [court.id]: Math.max(0, current - 1) };
    });
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const tagSummary = selectedTags.length > 0 ? ` • ${selectedTags.join(', ')}` : '';
    setLiveHeatLogs((prev) => [
      {
        id: Date.now().toString(),
        time: nowStr,
        courtName: court.name,
        text: `🏁 Player checked out • Session: ${sessionIntensity} (${sessionRating}⭐)${tagSummary}`,
        level: 'drop',
      },
      ...prev.slice(0, 8),
    ]);
    setCheckoutToast(
      `🏁 Successfully checked out of ${court.name}! Real-time occupancy updated (-1 player). +25 XP Earned!`
    );
    setIsLeaveModalOpen(false);
    setLeaveTargetCourt(null);
    setSessionReviewNote('');
    setTimeout(() => setCheckoutToast(null), 6000);
  };

  const handleOpenQrScanner = (court?: CourtPOI) => {
    triggerHaptic('light');
    if (court) setTargetQrCourt(court);
    setIsQrModalOpen(true);
  };

  const handleExecuteQrCheckIn = (courtToScan: CourtPOI) => {
    triggerHaptic('medium');
    setIsSimulatingScan(true);
    setTimeout(() => {
      triggerHaptic('success');
      setIsSimulatingScan(false);
      if (!checkedInCourts.includes(courtToScan.id)) {
        setCheckedInCourts((prev) => [...prev, courtToScan.id]);
      }
      const courtGames = pickupGames.filter((g) => g.courtId === courtToScan.id);
      const notifiedCount =
        (courtToScan.activePlayersNow || 0) +
        courtGames.reduce((a, g) => a + g.currentPlayers, 0) +
        2;
      const message = `📡 BROADCAST SENT: Notified ${notifiedCount} players at ${courtToScan.name} of your arrival! +50 XP Earned`;
      setBroadcastNotification(message);
      setIsQrModalOpen(false);
      setTimeout(() => setBroadcastNotification(null), 7000);
    }, 1200);
  };

  const handleSimulateArrival = (courtId: string, delta: number) => {
    setExtraPlayersMap((prev) => {
      const current = prev[courtId] || 0;
      const updated = Math.max(0, current + delta);
      return { ...prev, [courtId]: updated };
    });
  };

  if (courts.length === 0) {
    return (
      <div className="p-12 text-center bg-indigo-950/50 rounded-3xl border border-white/10 text-white">
        <MapPin className="w-12 h-12 text-indigo-500 mx-auto mb-3" />
        <p className="text-sm font-bold">No courts available</p>
        <p className="text-xs text-indigo-300 mt-1">
          Add courts from MySQL to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-20 lg:pb-8 animate-fadeIn text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-indigo-900/60 p-5 sm:p-6 rounded-[2.5rem] border border-white/10 shadow-xl">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-lime-400/20 text-lime-400 rounded-xl border border-lime-400/30">
              <Compass className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black italic uppercase tracking-tight text-white flex items-center gap-2">
                <span>Court Map & Live Occupancy</span>
                <span className="px-2.5 py-0.5 bg-lime-400 text-black text-[10px] font-mono font-black rounded-full uppercase">
                  {filteredCourts.length} Courts
                </span>
              </h1>
              <p className="text-xs text-indigo-200/80 mt-0.5 font-medium">
                Tap pins to see live player counts, check in, or host games near you.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => { triggerHaptic('light'); setIsSidebarOpen(!isSidebarOpen); }}
            className={`px-3.5 py-2 rounded-xl font-black italic uppercase flex items-center space-x-1.5 text-xs transition tracking-wider border shadow-lg ${
              isSidebarOpen
                ? 'bg-lime-400 text-black border-lime-300 shadow-lime-400/20'
                : 'bg-indigo-950 hover:bg-indigo-900 text-lime-400 border-lime-400/40'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 stroke-[2.5]" />
            <span>{isSidebarOpen ? 'Filter: ON' : 'Filter'}</span>
          </button>

          <button
            type="button"
            onClick={handleToggleNearMe}
            className={`px-3.5 py-2 rounded-xl font-black italic uppercase flex items-center space-x-1.5 text-xs transition tracking-wider shadow-lg ${
              isNearMeActive
                ? 'bg-sky-400 text-black ring-2 ring-sky-300 shadow-sky-400/30'
                : 'bg-indigo-950 hover:bg-indigo-900 text-sky-300 border border-sky-400/40'
            }`}
          >
            <Navigation className={`w-4 h-4 ${isLocating ? 'animate-spin' : isNearMeActive ? 'fill-black' : ''}`} />
            <span>{isLocating ? 'Locating...' : isNearMeActive ? 'Near Me ✓' : 'Near Me (5 Mi)'}</span>
          </button>

          <button
            onClick={() => selectedCourt && handleOpenQrScanner(selectedCourt)}
            className="px-3.5 py-2 bg-lime-400 hover:bg-lime-300 text-black font-black italic rounded-xl flex items-center space-x-1.5 text-xs transition uppercase tracking-wider shadow-lg"
          >
            <QrCode className="w-4 h-4 stroke-[2.5]" />
            <span>Scan QR</span>
          </button>

          <button
            onClick={onOpenCreatePark}
            className="px-3.5 py-2 bg-indigo-950 hover:bg-indigo-900 text-indigo-200 border border-white/15 font-bold italic rounded-xl flex items-center space-x-1.5 text-xs transition uppercase"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>+ Add Park</span>
          </button>

          {/* ✅ RADAR BUTTON — Wired */}
          <button
            onClick={handleTriggerRadarPing}
            disabled={isRadarPinging || !selectedCourt}
            className={`px-3.5 py-2 rounded-xl font-bold italic flex items-center space-x-1.5 text-xs transition uppercase border ${
              isRadarPinging
                ? 'bg-rose-500/20 border-rose-400/60 text-rose-200 cursor-wait'
                : 'bg-indigo-950 hover:bg-indigo-900 text-rose-300 border-rose-500/40 disabled:opacity-50'
            }`}
            title={selectedCourt ? `Send radar ping at ${selectedCourt.name}` : 'Select a court first'}
          >
            {isRadarPinging ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-rose-400 border-t-transparent animate-spin" />
                <span>Pinging...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 text-rose-400 animate-pulse" />
                <span>Radar</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Broadcast Toast */}
      {broadcastNotification && (
        <div className="bg-gradient-to-r from-lime-400 via-emerald-400 to-lime-500 text-black p-3.5 rounded-2xl font-extrabold shadow-2xl flex items-center justify-between border-2 border-white/40">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 bg-black/10 rounded-xl">
              <Bell className="w-4 h-4 text-black animate-spin" />
            </div>
            <p className="text-xs font-black italic">{broadcastNotification}</p>
          </div>
          <button onClick={() => setBroadcastNotification(null)} className="p-1 rounded-xl hover:bg-black/10 text-black">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Checkout Toast */}
      {checkoutToast && (
        <div className="bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 text-white p-3.5 rounded-2xl font-extrabold shadow-2xl flex items-center justify-between border-2 border-white/40">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 bg-white/20 rounded-xl">
              <LogOut className="w-4 h-4 text-white" />
            </div>
            <p className="text-xs font-black italic">{checkoutToast}</p>
          </div>
          <button onClick={() => setCheckoutToast(null)} className="p-1 rounded-xl hover:bg-white/10 text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {isSidebarOpen && (
          <aside className="w-full lg:w-80 shrink-0 bg-indigo-950/90 backdrop-blur-xl p-5 rounded-[2.5rem] border border-white/10 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-lime-400/20 text-lime-400 rounded-xl border border-lime-400/30">
                  <SlidersHorizontal className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-xs font-black italic uppercase tracking-wider text-white">
                    Court Filters
                  </h3>
                  <p className="text-[10px] text-indigo-300 font-medium">
                    Showing {filteredCourts.length} of {courts.length} venues
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-wider text-lime-400 font-mono block">
                Primary Sport
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'all', label: 'All Sports', icon: '🌐' },
                  { id: 'basketball', label: 'Basketball', icon: '🏀' },
                  { id: 'soccer', label: 'Soccer', icon: '⚽' },
                  { id: 'baseball', label: 'Baseball', icon: '⚾' },
                  { id: 'softball', label: 'Softball', icon: '🥎' },
                  { id: 'pickleball', label: 'Pickleball', icon: '🏓' },
                  { id: 'volleyball', label: 'Volleyball', icon: '🏐' },
                ].map((sp) => {
                  const isActive = sportFilter === sp.id;
                  return (
                    <button
                      key={sp.id}
                      type="button"
                      onClick={() => { triggerHaptic('light'); setSportFilter(sp.id as any); }}
                      className={`p-2 rounded-xl text-xs font-black italic uppercase transition-all flex items-center space-x-1.5 border text-left ${
                        isActive
                          ? 'bg-lime-400 text-black border-lime-300 shadow-md'
                          : 'bg-indigo-900/60 text-indigo-200 border-white/10 hover:bg-indigo-800'
                      }`}
                    >
                      <span>{sp.icon}</span>
                      <span className="truncate">{sp.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-wider text-lime-400 font-mono block">
                Heat Level
              </label>
              <div className="grid grid-cols-2 gap-1">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'empty', label: '🟢 Empty' },
                  { id: 'moderate', label: '🟡 Mod' },
                  { id: 'busy', label: '🟠 Busy' },
                  { id: 'packed', label: '🔴 Packed' },
                ].map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => { triggerHaptic('light'); setHeatFilter(h.id as any); }}
                    className={`p-2 rounded-xl text-[10px] font-black uppercase transition border ${
                      heatFilter === h.id
                        ? 'bg-lime-400 text-black border-lime-300'
                        : 'bg-indigo-900/60 text-indigo-200 border-white/10'
                    }`}
                  >
                    {h.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 bg-indigo-900/40 rounded-2xl border border-white/10 text-[11px] space-y-1">
              <div className="flex items-center justify-between font-bold text-white">
                <span>Filtered Venues</span>
                <span className="px-2 py-0.5 bg-lime-400 text-black font-mono font-black rounded-md text-[10px]">
                  {filteredCourts.length}
                </span>
              </div>
            </div>
          </aside>
        )}

        <div className="flex-1 w-full min-w-0 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-indigo-950 rounded-[2.5rem] overflow-hidden border border-white/10 shadow-xl p-4">
              <div className="z-10 flex flex-col space-y-2 bg-indigo-900/95 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 shadow-xl mb-4">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-indigo-300/60" />
                  <input
                    type="text"
                    placeholder="Search court name, street address, or park..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-indigo-950 text-white text-xs rounded-xl border border-white/10 outline-none focus:ring-1 focus:ring-lime-400"
                  />
                </div>
              </div>

              <div className="relative py-4 px-2 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto">
                {filteredCourts.map((court) => {
                  const isSelected = selectedCourt?.id === court.id;
                  const isCheckedIn = checkedInCourts.includes(court.id);
                  const extraPlayers = extraPlayersMap[court.id] || 0;
                  const heat = getCourtHeatInfo(court, pickupGames, extraPlayers, isCheckedIn);
                  const activeCount =
                    court.activePlayersNow !== undefined
                      ? court.activePlayersNow + extraPlayers
                      : heat.totalPlayers;
                  const popularity = getPopularityBadge(activeCount);

                  let svgPinFill = '#22c55e';
                  if (heat.occupancyPct >= 80 || heat.totalPlayers >= 14) svgPinFill = '#ef4444';
                  else if (heat.occupancyPct >= 35 || heat.totalPlayers >= 5) svgPinFill = '#f59e0b';

                  const sportEmoji =
                    court.sport === 'basketball'
                      ? '🏀'
                      : court.sport === 'baseball'
                      ? '⚾'
                      : court.sport === 'softball'
                      ? '🥎'
                      : court.sport === 'pickleball'
                      ? '🏓'
                      : court.sport === 'soccer'
                      ? '⚽'
                      : '🏐';

                  return (
                    <button
                      key={court.id}
                      type="button"
                      onClick={() => {
                        setSelectedCourt(court);
                        setActivePopupCourtId(court.id);
                      }}
                      className={`p-3 rounded-2xl border-2 text-left transition-all ${
                        isSelected
                          ? 'bg-indigo-900/95 border-lime-400 ring-2 ring-lime-400/30 shadow-2xl'
                          : 'bg-indigo-950/90 border-white/15 hover:border-white/40 shadow-lg'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-2xl">{sportEmoji}</span>
                          <div className="min-w-0">
                            <h4 className="font-extrabold text-xs text-white truncate">
                              {court.name}
                            </h4>
                            <p className="text-[10px] text-indigo-300 truncate">
                              {court.address}
                            </p>
                          </div>
                        </div>
                        <span
                          className="px-2 py-0.5 text-[10px] font-black rounded-full shrink-0"
                          style={{ backgroundColor: svgPinFill + '33', color: svgPinFill }}
                        >
                          {heat.totalPlayers}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
                        <CourtStatusBadgeTooltip status={court.status || 'verified'} showText={true} />
                        <span className={`text-[9px] font-black uppercase italic px-2 py-0.5 rounded-full border ${popularity.badgeStyle}`}>
                          {popularity.labelWithEmoji}
                        </span>
                      </div>
                    </button>
                  );
                })}

                {filteredCourts.length === 0 && (
                  <div className="col-span-full p-8 text-center bg-indigo-950/60 rounded-2xl border border-dashed border-white/20">
                    <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                    <p className="text-xs text-indigo-300">No courts match filters</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-indigo-900/60 p-5 rounded-[2.5rem] border border-white/10 shadow-xl flex flex-col justify-between space-y-6">
              {selectedCourt ? (
                <>
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-black italic uppercase text-white">
                          {selectedCourt.name}
                        </h3>
                        <p className="text-xs text-indigo-300 flex items-center gap-1 mt-1">
                          <MapPin className="w-3.5 h-3.5 text-lime-400" />
                          {selectedCourt.address}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onToggleFavoriteCourt?.(selectedCourt.id)}
                        className={`p-2 rounded-xl border transition ${
                          favoriteCourtIds.includes(selectedCourt.id)
                            ? 'bg-rose-500/20 text-rose-400 border-rose-500/50'
                            : 'bg-indigo-950 text-indigo-300 border-white/10'
                        }`}
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            favoriteCourtIds.includes(selectedCourt.id) ? 'fill-rose-500' : ''
                          }`}
                        />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-indigo-950 border border-white/10">
                        <span className="text-[10px] text-indigo-300/60 font-black uppercase block">
                          Sport
                        </span>
                        <span className="font-bold text-white capitalize">{selectedCourt.sport}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-indigo-950 border border-white/10">
                        <span className="text-[10px] text-indigo-300/60 font-black uppercase block">
                          Rating
                        </span>
                        <span className="font-bold text-amber-300">⭐ {selectedCourt.rating}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-indigo-950 border border-white/10">
                        <span className="text-[10px] text-indigo-300/60 font-black uppercase block">
                          City
                        </span>
                        <span className="font-bold text-white truncate">
                          {(selectedCourt as any).city || '—'}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-indigo-950 border border-white/10">
                        <span className="text-[10px] text-indigo-300/60 font-black uppercase block">
                          State
                        </span>
                        <span className="font-bold text-white">
                          {(selectedCourt as any).state || '—'}
                        </span>
                      </div>
                    </div>

                    {selectedCourtHeat && (
                      <div className="p-3 bg-indigo-950 rounded-2xl border border-white/10 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-black italic uppercase text-white">
                            Live Occupancy
                          </span>
                          <span className={`font-black uppercase ${selectedCourtHeat.textTailwind}`}>
                            {selectedCourtHeat.badgeLabel}
                          </span>
                        </div>
                        <div className="w-full bg-indigo-900 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${selectedCourtHeat.bgTailwind} transition-all`}
                            style={{ width: `${selectedCourtHeat.occupancyPct}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-indigo-300">
                          <span>{selectedCourtHeat.totalPlayers} active</span>
                          <span>Max {selectedCourtHeat.maxCapacity}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 pt-3 border-t border-white/10">
                    <button
                      onClick={() => handleGetDirections(selectedCourt)}
                      className="w-full py-2.5 px-4 bg-sky-500 hover:bg-sky-400 text-black font-black italic text-xs uppercase rounded-2xl shadow-lg flex items-center justify-center space-x-2"
                    >
                      <Navigation className="w-4 h-4" />
                      <span>Get Directions</span>
                    </button>

                    <button
                      onClick={() => handleOpenQrScanner(selectedCourt)}
                      className="w-full py-2.5 px-4 bg-lime-400 hover:bg-lime-300 text-black font-black italic text-xs uppercase rounded-2xl shadow-lg flex items-center justify-center space-x-2"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>
                        {checkedInCourts.includes(selectedCourt.id) ? 'Re-Scan QR' : 'Check In'}
                      </span>
                    </button>

                    <button
                      onClick={() => setIsLeaderboardModalOpen(true)}
                      className="w-full py-2.5 px-4 bg-amber-400 hover:bg-amber-300 text-black font-black italic text-xs uppercase rounded-2xl shadow-lg flex items-center justify-center space-x-2"
                    >
                      <Trophy className="w-4 h-4" />
                      <span>Court Leaderboard</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <Compass className="w-10 h-10 text-indigo-500 mx-auto mb-3" />
                  <p className="text-xs text-indigo-300">Select a court to view details</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard Modal */}
      {isLeaderboardModalOpen && selectedCourt && (
        <CourtSpecificLeaderboard
          court={selectedCourt}
          athletes={athletes}
          onSelectAthlete={(ath) => {
            onSelectAthlete?.(ath);
            setIsLeaderboardModalOpen(false);
          }}
          onClose={() => setIsLeaderboardModalOpen(false)}
          isModal={true}
        />
      )}

      {/* QR Modal */}
      {isQrModalOpen && targetQrCourt && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-indigo-950 border border-lime-400/40 w-full max-w-lg rounded-[2.5rem] p-6 shadow-2xl relative space-y-5 text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2.5 bg-lime-400 text-black rounded-2xl">
                  <QrCode className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black italic uppercase">
                  Court QR Check-In
                </h3>
              </div>
              <button
                onClick={() => setIsQrModalOpen(false)}
                className="p-2 bg-indigo-900 rounded-xl text-indigo-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-black rounded-3xl overflow-hidden border-2 border-indigo-800 aspect-video flex items-center justify-center">
              <div className="w-32 h-32 bg-white p-2 rounded-xl">
                <svg className="w-full h-full text-black" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm0 10h8v8H2v-8zm2 2v4h4v-4H4zm10-14h8v8h-8V2zm2 2v4h4V4h-4zm-2 10h2v2h-2v-2zm4 0h2v2h-2v-2zm-2 2h2v2h-2v-2zm4 0h2v2h-2v-2z" />
                </svg>
              </div>
            </div>

            <button
              onClick={() => handleExecuteQrCheckIn(targetQrCourt)}
              disabled={isSimulatingScan}
              className="w-full py-3.5 px-4 bg-lime-400 hover:bg-lime-300 text-black font-black italic text-sm uppercase rounded-2xl shadow-xl flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isSimulatingScan ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>Scan & Check-In (+50 XP)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ✅ RADAR RESULTS MODAL (NEW) */}
      {showRadarModal && radarResults && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-indigo-950 border-2 border-rose-500/60 w-full max-w-lg rounded-[2.5rem] p-6 shadow-2xl space-y-5 text-white relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between border-b border-white/10 pb-4 relative z-10">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-rose-500 rounded-2xl shadow-lg">
                  <Zap className="w-6 h-6 text-white animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg font-black italic uppercase text-white">
                    Radar Ping Sent 📡
                  </h3>
                  <p className="text-xs text-indigo-300 font-mono">
                    {radarResults.courtName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRadarModal(false)}
                className="p-2 text-indigo-300 hover:text-white rounded-xl hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 bg-gradient-to-r from-rose-950 via-indigo-950 to-rose-950 rounded-2xl border border-rose-400/40 text-center space-y-2 relative z-10">
              <div className="text-5xl font-black italic text-rose-400">
                {radarResults.notifiedCount}
              </div>
              <p className="text-xs font-black uppercase tracking-wider text-rose-200">
                {radarResults.notifiedCount === 1
                  ? 'Player Notified Nearby'
                  : 'Players Notified Nearby'}
              </p>
              <p className="text-[10px] text-indigo-300 font-mono">
                Within 5 km • Real-time notifications dispatched
              </p>
            </div>

            {radarResults.nearbyAthletes.length > 0 && (
              <div className="space-y-2 relative z-10">
                <span className="text-[10px] font-black uppercase tracking-wider text-lime-400">
                  Athletes In Range
                </span>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {radarResults.nearbyAthletes.slice(0, 10).map((ath) => (
                    <div
                      key={ath.id}
                      className="p-2.5 bg-indigo-900/60 rounded-xl border border-white/5 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2.5">
                        {ath.avatar ? (
                          <img
                            src={ath.avatar}
                            alt={ath.name}
                            className="w-8 h-8 rounded-full border border-white/20"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-lime-400/20 border border-lime-400/40 flex items-center justify-center text-lime-300 font-black text-xs">
                            {ath.name?.charAt(0) || '?'}
                          </div>
                        )}
                        <div>
                          <span className="text-xs font-bold text-white block">
                            {ath.name}
                          </span>
                          <span className="text-[10px] text-indigo-300 font-mono">
                            {(ath.distanceMeters / 1000).toFixed(1)} km away
                          </span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 bg-lime-400/20 text-lime-300 text-[9px] font-black uppercase rounded-full border border-lime-400/40">
                        Notified ✓
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {radarResults.nearbyAthletes.length === 0 && (
              <div className="p-4 bg-amber-400/10 border border-amber-400/30 rounded-2xl text-center space-y-1 relative z-10">
                <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
                <p className="text-xs font-bold text-amber-300">
                  No players online nearby right now
                </p>
                <p className="text-[10px] text-indigo-300">
                  Your ping stays active for 30 mins.
                </p>
              </div>
            )}

            <div className="p-3 bg-lime-400/10 border border-lime-400/40 rounded-2xl flex items-center justify-between relative z-10">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-lime-400 animate-pulse" />
                <div>
                  <span className="text-xs font-black text-lime-300 block">
                    +10 XP Awarded
                  </span>
                  <span className="text-[10px] text-indigo-300 font-mono">
                    Radar Broadcast Bonus
                  </span>
                </div>
              </div>
              <span className="px-3 py-1 bg-lime-400 text-black text-[10px] font-black uppercase rounded-full">
                Reward
              </span>
            </div>

            <button
              onClick={() => setShowRadarModal(false)}
              className="w-full py-3 bg-rose-500 hover:bg-rose-600 text-white font-black italic uppercase text-sm rounded-2xl shadow-xl transition relative z-10"
            >
              Got It 👌
            </button>
          </div>
        </div>
      )}

      {/* Leave Modal */}
      {isLeaveModalOpen && leaveTargetCourt && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-indigo-950 border-2 border-rose-500/60 w-full max-w-lg rounded-[2.5rem] p-6 shadow-2xl space-y-5 text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-rose-500 rounded-2xl">
                  <LogOut className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black italic uppercase">Check-Out Session</h3>
              </div>
              <button
                onClick={() => setIsLeaveModalOpen(false)}
                className="p-1.5 rounded-full bg-indigo-900 text-indigo-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteCheckout} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'Casual', label: 'Casual', color: 'border-emerald-400' },
                  { key: 'Moderate', label: 'Moderate', color: 'border-amber-400' },
                  { key: 'High Intensity', label: 'High Intensity', color: 'border-orange-400' },
                  { key: 'Pro Competitive', label: 'Pro Competitive', color: 'border-rose-500' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setSessionIntensity(item.key as any)}
                    className={`p-3 rounded-2xl border text-xs font-bold ${
                      sessionIntensity === item.key
                        ? `${item.color} bg-indigo-900 ring-2`
                        : 'bg-indigo-900/60 border-white/10'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-center space-x-2 py-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setSessionRating(star)}
                  >
                    <Star
                      className={`w-7 h-7 ${
                        star <= sessionRating ? 'text-amber-400 fill-amber-400' : 'text-indigo-800'
                      }`}
                    />
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {['Rims Clean', 'Great Competition', 'Packed Run', 'Courts Dry', 'Lights ON'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleConditionTag(tag)}
                    className={`px-3 py-1 rounded-xl text-[10px] font-extrabold uppercase ${
                      selectedTags.includes(tag)
                        ? 'bg-lime-400 text-black'
                        : 'bg-indigo-900/80 text-indigo-300'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <textarea
                value={sessionReviewNote}
                onChange={(e) => setSessionReviewNote(e.target.value)}
                placeholder="Session notes..."
                rows={2}
                className="w-full bg-indigo-900/90 border border-white/15 rounded-xl p-3 text-xs text-white"
              />

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsLeaveModalOpen(false)}
                  className="flex-1 py-3 bg-indigo-900 text-indigo-200 rounded-2xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-rose-500 text-white rounded-2xl text-xs font-black uppercase"
                >
                  Confirm Check-Out
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};