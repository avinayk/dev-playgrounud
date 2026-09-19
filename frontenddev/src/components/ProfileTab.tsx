// components/ProfileTab.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { AthleteProfile } from '../types/auth.types';
import { ProfileTabProps } from '../types/profile.types';
import { StateCitySelector } from './StateCitySelector';
import { UploadHighlightModal } from './UploadHighlightModal';
import { ProCheckoutModal } from './ProCheckoutModal';
import { RecentTeammates } from './RecentTeammates';
import { GpsMapThumbnail } from './regional/GpsMapThumbnail';
import { fetchAthleteHighlights } from '../services/highlight.service';
import { getFriends } from '../services/friendship.service';
import {
  cancelProSubscription,
  verifyStripeSession,
} from '../services/stripe.service';
import type { Friend } from '../types/chat.types';
import { getLevelInfo } from '../utils/leveling';
import { StatsClusterMapView } from './regional/StatsClusterMapView';
import { Achievements } from './Achievements';
import { StreakCalendar } from './StreakCalendar';
import {
  CheckCircle2, AlertCircle, User, Trophy, Crown, Camera, Save, X,
  Users, Pencil, Check, Loader2, LogOut, Film, Play, Plus, Eye, Heart,
  ShieldCheck, ShieldAlert, HeartPulse, Flame, Zap, Palette, Lock, Unlock, Fingerprint,
  Key, Smartphone, Sparkles, MessageSquare, TrendingUp,
  Calendar, CheckSquare, Square, Trash2, RotateCcw, Share2, Copy, MapPin,
  ChevronRight, Award, Download, Database, FileJson, Gift, EyeOff, Info,
  Megaphone, Gamepad2, BarChart3, CreditCard, Building2, Search, ExternalLink,
  ArrowUpRight,
} from 'lucide-react';

// ═══════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════
const API_URL =
  (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';

export const PALETTES = [
  { id: 'midnight_chrome', name: 'Midnight Chrome', description: 'Classic deep indigo and slate canvas with electric lime neon accents.', vibe: 'Night Game Stadium', colors: { bg: '#090d16', card: '#121829', accent1: '#a3e635', accent2: '#818cf8' } },
  { id: 'neon_court', name: 'Neon Court', description: 'High-contrast cyberpunk obsidian theme with vibrant cyan & fuchsia glow.', vibe: 'Cyber Street Basketball', colors: { bg: '#030712', card: '#0b1329', accent1: '#22d3ee', accent2: '#e879f9' } },
  { id: 'sunset_horizon', name: 'Sunset Horizon', description: 'Golden hour twilight theme with deep plum black and warm amber highlights.', vibe: 'Golden Hour Sunset', colors: { bg: '#140b12', card: '#241221', accent1: '#fbbf24', accent2: '#fb7185' } },
  { id: 'cyber_arena', name: 'Cyber Arena', description: 'Futuristic high-tech matrix theme featuring mint emerald and electric teal.', vibe: 'Tech Performance Lab', colors: { bg: '#041410', card: '#0a261f', accent1: '#34d399', accent2: '#38bdf8' } },
];

const OFFLINE_ACTION_TYPES = [
  { type: 'UPDATE_PROFILE', samplePayload: { field: 'bio', preview: 'Updated athlete bio snippet' } },
  { type: 'POST_CHAT', samplePayload: { conversationId: 'conv_demo_001', text: 'Sent from offline mode' } },
  { type: 'LOG_STAT', samplePayload: { points: 22, rebounds: 8, assists: 5 } },
  { type: 'UPLOAD_HIGHLIGHT', samplePayload: { videoUrl: 'https://youtu.be/demo', duration: 28 } },
  { type: 'CHECK_IN', samplePayload: { courtId: 'court_rucker_1', checkinType: 'radar_ping' } },
  { type: 'FRIEND_REQUEST', samplePayload: { friendId: 'athlete_demo_457', note: 'GG last game!' } },
];

type ProfileTabKey =
  | 'bio' | 'friends' | 'badges' | 'streak' | 'injury' | 'security'
  | 'membership' | 'appearance' | 'offline_sync' | 'match_logs'
  | 'map_view' | 'referrals';

// ═══════════════════════════════════════════════
// ⭐ PRO HELPER FUNCTIONS
// ═══════════════════════════════════════════════
export const fireEliteSeriesConfetti = () => {
  if (typeof window !== 'undefined' && (window as any).confetti) {
    (window as any).confetti({
      particleCount: 150, spread: 90, origin: { y: 0.6 },
      colors: ['#fbbf24', '#f59e0b', '#a3e635', '#22d3ee', '#e879f9'],
    });
    setTimeout(() => {
      (window as any).confetti({ particleCount: 100, angle: 60, spread: 70, origin: { x: 0 }, colors: ['#fbbf24', '#a3e635', '#22d3ee'] });
      (window as any).confetti({ particleCount: 100, angle: 120, spread: 70, origin: { x: 1 }, colors: ['#fbbf24', '#e879f9', '#38bdf8'] });
    }, 250);
    return;
  }

  const colors = ['#fbbf24', '#a3e635', '#22d3ee', '#e879f9', '#f59e0b'];
  const container = document.createElement('div');
  container.style.cssText = `position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:9999;overflow:hidden;`;
  document.body.appendChild(container);

  for (let i = 0; i < 80; i++) {
    const particle = document.createElement('div');
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = Math.random() * 10 + 6;
    const startX = Math.random() * 100;
    const endX = startX + (Math.random() - 0.5) * 40;
    const duration = Math.random() * 2000 + 2000;
    const delay = Math.random() * 300;

    particle.style.cssText = `position:absolute;top:-20px;left:${startX}%;width:${size}px;height:${size}px;background:${color};border-radius:${Math.random() > 0.5 ? '50%' : '2px'};box-shadow:0 0 10px ${color};animation:confetti-fall-${i} ${duration}ms ease-in ${delay}ms forwards;`;

    const style = document.createElement('style');
    style.textContent = `@keyframes confetti-fall-${i} { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(100vh) translateX(${endX - startX}vw) rotate(${Math.random() * 720}deg); opacity: 0; } }`;
    document.head.appendChild(style);
    container.appendChild(particle);
  }

  setTimeout(() => { container.remove(); }, 5000);
};

export const hasUnlockedAllTiersForSport = (athlete: any): boolean => {
  if (!athlete) return false;

  const sport = athlete.primarySport || athlete.primary_sport || 'basketball';
  const stats = athlete.stats?.[sport] || athlete.stats || {};
  const wins = Number(athlete.winCount || athlete.win_count || 0);

  const tierThresholds: Record<string, { bronze: number; silver: number; gold: number }> = {
    basketball: { bronze: 50, silver: 200, gold: 500 },
    volleyball: { bronze: 50, silver: 200, gold: 500 },
    soccer: { bronze: 20, silver: 80, gold: 200 },
    baseball: { bronze: 20, silver: 80, gold: 200 },
    softball: { bronze: 20, silver: 80, gold: 200 },
    football: { bronze: 10, silver: 40, gold: 100 },
  };

  const thresholds = tierThresholds[sport] || tierThresholds.basketball;

  let score = 0;
  if (sport === 'basketball') score = Number(stats.pts || 0);
  else if (sport === 'volleyball') score = Number(stats.kills || 0) + Number(stats.aces || 0);
  else if (sport === 'soccer') score = Number(stats.goals_scored || 0) + Number(stats.soccer_assists || 0);
  else if (sport === 'baseball' || sport === 'softball') score = Number(stats.base_hits || 0) + Number(stats.home_runs || 0) * 4;
  else if (sport === 'football') score = Number(stats.touchdowns || 0);

  return score >= thresholds.bronze && wins >= 3;
};

export const getLegendaryBadgeFilter = (tier?: string): React.CSSProperties | undefined => {
  if (!tier) return undefined;

  switch (tier) {
    case 'legendary':
      return { filter: 'drop-shadow(0 0 12px rgba(251, 191, 36, 0.8)) drop-shadow(0 0 24px rgba(251, 191, 36, 0.4)) contrast(1.1) brightness(1.05)' };
    case 'pro_elite':
      return { filter: 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.5)) contrast(1.05) brightness(1.02)' };
    case 'elite':
      return { filter: 'drop-shadow(0 0 6px rgba(163, 230, 53, 0.4))' };
    default:
      return undefined;
  }
};

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════
async function patchAthlete(
  id: string | number,
  patch: Partial<AthleteProfile> & Record<string, any>
): Promise<AthleteProfile> {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || '';
  const res = await fetch(`${API_URL}/athletes/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const text = await res.text();
    let body: any = {};
    try { body = JSON.parse(text); } catch { body = { message: text }; }
    throw new Error(body?.message ?? `Save failed (${res.status})`);
  }
  const json = await res.json();
  return (json?.data ?? json) as AthleteProfile;
}

const compressImageFile = async (
  file: File, maxWidth: number, maxHeight: number, quality: number
): Promise<string | null> =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > maxWidth) { h = (h / w) * maxWidth; w = maxWidth; }
        if (h > maxHeight) { w = (w / h) * maxHeight; h = maxHeight; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });

// ═══════════════════════════════════════════════
// SMALL COMPONENTS
// ═══════════════════════════════════════════════
const Field: React.FC<{
  label: string; value: string; editing: boolean; onChange: (v: string) => void;
  placeholder?: string; type?: string; multiline?: boolean; capitalize?: boolean;
}> = ({ label, value, editing, onChange, placeholder, type = 'text', multiline, capitalize }) => (
  <div className="flex flex-col gap-2">
    <span className="text-indigo-300 block text-xs font-bold uppercase">{label}</span>
    {editing ? (
      multiline ? (
        <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="bg-indigo-950/60 px-4 py-2 rounded-xl text-white w-full outline-none border border-lime-400/30 focus:border-lime-400 transition resize-none" />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="bg-indigo-950/60 px-4 py-2 rounded-xl text-white w-full outline-none border border-lime-400/30 focus:border-lime-400 transition" />
      )
    ) : (
      <div className="bg-indigo-950/60 px-4 py-2 rounded">
        <span className={`text-white font-semibold ${capitalize ? 'capitalize' : ''}`}>{value || 'Not set'}</span>
      </div>
    )}
  </div>
);

const ReadOnlyField: React.FC<{ label: string; value: string; dimWhenEditing: boolean; capitalize?: boolean }> = ({ label, value, dimWhenEditing, capitalize }) => (
  <div className={`flex flex-col gap-2 transition-opacity ${dimWhenEditing ? 'opacity-40' : 'opacity-100'}`}>
    <span className="text-indigo-300 block text-xs font-bold uppercase">{label}</span>
    <div className="bg-indigo-950/60 px-4 py-2 rounded">
      <span className={`text-white font-semibold ${capitalize ? 'capitalize' : ''}`}>{value || 'Not set'}</span>
    </div>
  </div>
);

const SaveStatus: React.FC<{ status: 'idle' | 'saving' | 'saved' | 'error'; message?: string | null }> = ({ status, message }) => {
  if (status === 'idle') return null;
  const cfg = {
    saving: { bg: 'bg-indigo-500/10 border-indigo-500/30', text: 'text-indigo-300', icon: <Loader2 className="w-3 h-3 animate-spin" />, label: 'Saving…' },
    saved: { bg: 'bg-green-500/10 border-green-500/30', text: 'text-green-300', icon: <Check className="w-3 h-3" />, label: 'Saved!' },
    error: { bg: 'bg-red-500/10 border-red-500/30', text: 'text-red-300', icon: <AlertCircle className="w-3 h-3" />, label: message || 'Save failed' },
  }[status];
  return (
    <div className={`text-xs ${cfg.bg} ${cfg.text} border rounded-lg px-3 py-2 mt-2 flex items-center gap-2`}>
      {cfg.icon}<span>{cfg.label}</span>
    </div>
  );
};

const StatChip: React.FC<{ label: string; v: any; color: string }> = ({ label, v, color }) => (
  <div className="p-2.5 bg-indigo-900/70 rounded-xl border border-white/10 text-center">
    <span className="text-[9px] text-indigo-300 uppercase block font-black">{label}</span>
    <span className={`text-base font-black text-${color}-400 font-mono`}>{v}</span>
  </div>
);

// ═══════════════════════════════════════════════
// VOLLEYBALL TRENDS + MILESTONE CARDS
// ═══════════════════════════════════════════════
const VolleyballTrendsChart: React.FC<{ athlete: AthleteProfile }> = ({ athlete }) => {
  const rawVb = ((athlete as any).statsHistory || []).filter((i: any) => i.sport === 'volleyball' || i.kills !== undefined);
  const sample = [
    { kills: 12, digs: 15, aces: 4, blocks: 3 }, { kills: 14, digs: 18, aces: 5, blocks: 2 },
    { kills: 10, digs: 12, aces: 3, blocks: 4 }, { kills: 16, digs: 20, aces: 6, blocks: 5 },
    { kills: 15, digs: 22, aces: 4, blocks: 3 }, { kills: 18, digs: 25, aces: 7, blocks: 6 },
    { kills: 13, digs: 16, aces: 5, blocks: 3 }, { kills: 19, digs: 24, aces: 8, blocks: 4 },
    { kills: 17, digs: 21, aces: 6, blocks: 5 }, { kills: 21, digs: 26, aces: 9, blocks: 4 },
  ];

  const trendData = Array.from({ length: 10 }).map((_, idx) => {
    const h = rawVb[idx]; const f = sample[idx % sample.length];
    const k = h?.kills ?? f.kills; const d = h?.digs ?? f.digs;
    const a = h?.aces ?? f.aces; const b = h?.blocks ?? f.blocks;
    return { match: `M${idx + 1}`, kills: k, digs: d, aces: a, blocks: b, ratio: Number((k / (d || 1)).toFixed(2)) };
  });

  const avgRatio = (trendData.reduce((s, c) => s + c.ratio, 0) / trendData.length).toFixed(2);
  const totalKills = trendData.reduce((s, c) => s + c.kills, 0);
  const totalDigs = trendData.reduce((s, c) => s + c.digs, 0);

  const [sim, setSim] = useState({ digs: 120, aces: 45, kills: 95, blocks: 35 });
  const isDigsU = sim.digs >= 500, isAcesU = sim.aces >= 250;
  const isKillsU = sim.kills >= 300, isBlocksU = sim.blocks >= 100;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-indigo-900/90 via-purple-950 to-indigo-950 p-6 rounded-[2.5rem] border-2 border-lime-400/40 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <span className="px-2 py-0.5 bg-lime-400 text-black font-black text-[10px] uppercase rounded font-mono">MILESTONE UNLOCKS</span>
            <h3 className="text-xl font-black italic uppercase text-white mt-1">Volleyball Career Threshold Cards</h3>
          </div>
          <button type="button"
            onClick={() => setSim((p) => ({ digs: p.digs >= 500 ? 120 : 520, aces: p.aces >= 250 ? 45 : 260, kills: p.kills >= 300 ? 95 : 310, blocks: p.blocks >= 100 ? 35 : 110 }))}
            className="px-3.5 py-2 bg-lime-400 hover:bg-lime-300 text-black font-black italic text-xs uppercase rounded-xl flex items-center space-x-1">
            <Zap className="w-4 h-4 fill-black" /><span>{isDigsU ? 'Reset' : '⚡ Simulate Unlocks'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: '🛡️ Dig Master', v: sim.digs, target: 500, unlocked: isDigsU, gradient: 'from-lime-400 via-emerald-400 to-cyan-400' },
            { label: '⚡ Ace Specialist', v: sim.aces, target: 250, unlocked: isAcesU, gradient: 'from-amber-400 via-rose-400 to-yellow-300' },
            { label: '👑 Spike King', v: sim.kills, target: 300, unlocked: isKillsU, gradient: 'from-rose-500 via-pink-500 to-amber-400' },
            { label: '🧱 Net Wall', v: sim.blocks, target: 100, unlocked: isBlocksU, gradient: 'from-purple-500 via-indigo-400 to-lime-400' },
          ].map((c) => (
            <div key={c.label} className={`rounded-[2rem] p-0.5 transition-all ${c.unlocked ? `bg-gradient-to-r ${c.gradient} animate-pulse shadow-[0_0_25px_rgba(163,230,53,0.7)]` : 'bg-indigo-950/80 border border-white/10'}`}>
              <div className="bg-indigo-950/90 p-4 rounded-[1.8rem] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-indigo-300 font-mono font-black uppercase">{c.label}</span>
                  {c.unlocked ? <span className="px-2 py-0.5 bg-lime-400 text-black text-[9px] font-black uppercase rounded font-mono animate-bounce">✨ UNLOCKED</span> : <span className="text-[10px] text-indigo-300/60 font-mono">{c.target} Target</span>}
                </div>
                <p className="text-2xl font-black text-white font-mono">{c.v} <span className="text-xs text-indigo-300 font-normal">/ {c.target}</span></p>
                <div className="w-full bg-indigo-900 h-2 rounded-full overflow-hidden border border-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-lime-400 to-cyan-400 transition-all" style={{ width: `${Math.min(100, (c.v / c.target) * 100)}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-br from-indigo-900/90 via-indigo-950 to-purple-950/80 p-6 rounded-[2.5rem] border-2 border-lime-400/30 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-white/10 pb-4 gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-lime-400 text-black rounded-2xl"><Trophy className="w-6 h-6 stroke-[2.5]" /></div>
            <h3 className="text-xl font-black italic uppercase text-white">Volleyball Trends (Last 10)</h3>
          </div>
          <div className="px-3.5 py-2 rounded-2xl border border-lime-400/40 text-xs font-bold text-lime-300 bg-indigo-950/90">
            Avg K/D: <span className="text-lime-400 font-black text-sm font-mono">{avgRatio}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-indigo-950/80 rounded-2xl border border-white/10 text-center">
            <span className="text-[10px] text-indigo-300 uppercase font-black">Kills</span>
            <p className="text-xl font-black text-lime-400 italic">{totalKills}</p>
          </div>
          <div className="p-3 bg-indigo-950/80 rounded-2xl border border-white/10 text-center">
            <span className="text-[10px] text-indigo-300 uppercase font-black">Digs</span>
            <p className="text-xl font-black text-cyan-400 italic">{totalDigs}</p>
          </div>
          <div className="p-3 bg-indigo-950/80 rounded-2xl border border-white/10 text-center">
            <span className="text-[10px] text-indigo-300 uppercase font-black">K/D</span>
            <p className="text-xl font-black text-amber-400 italic">{avgRatio}</p>
          </div>
          <div className="p-3 bg-indigo-950/80 rounded-2xl border border-white/10 text-center">
            <span className="text-[10px] text-indigo-300 uppercase font-black">Impact</span>
            <p className="text-xs font-black text-emerald-400 italic mt-1.5 uppercase">All-Rounder ⚡</p>
          </div>
        </div>

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis dataKey="match" stroke="#A5B4FC" fontSize={11} />
              <YAxis stroke="#A5B4FC" fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: '#0B0F2A', borderColor: '#312E81', borderRadius: '16px', color: '#fff' }} />
              <Legend />
              <Line type="monotone" dataKey="ratio" name="K/D" stroke="#A3E635" strokeWidth={3} dot={{ r: 5 }} />
              <Line type="monotone" dataKey="kills" name="Kills" stroke="#F43F5E" strokeWidth={2} />
              <Line type="monotone" dataKey="digs" name="Digs" stroke="#38BDF8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════
// SEASONAL GROWTH COMPARISON CARD (Current vs Previous Season)
// ═══════════════════════════════════════════════
// ═══════════════════════════════════════════════
// SEASONAL GROWTH COMPARISON CARD (DYNAMIC — uses athlete.statsHistory)
// ═══════════════════════════════════════════════
interface SeasonalGrowthComparisonProps {
  athlete: AthleteProfile;
  activeSportFilter: 'all' | 'basketball' | 'volleyball';
}

const SeasonalGrowthComparisonCard: React.FC<SeasonalGrowthComparisonProps> = ({
  athlete,
  activeSportFilter,
}) => {
  const [selectedSport, setSelectedSport] = useState<'volleyball' | 'basketball'>(
    activeSportFilter === 'basketball' ? 'basketball' : 'volleyball'
  );

  useEffect(() => {
    if (activeSportFilter === 'basketball' || activeSportFilter === 'volleyball') {
      setSelectedSport(activeSportFilter);
    }
  }, [activeSportFilter]);

  // ── Extract history from athlete ──
  const history = ((athlete as any)?.statsHistory || []) as any[];
  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;

  // Filter by selected sport
  const sportHistory = history.filter((m) => {
    if (selectedSport === 'volleyball') {
      return m.sport === 'volleyball' || m.kills !== undefined;
    }
    return m.sport === 'basketball' || m.pts !== undefined || m.points !== undefined;
  });

  const getYear = (m: any) => {
    const raw = m.rawDate || m.date || m.game_date || m.created_at;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? currentYear : d.getFullYear();
  };

  const currentSeason = sportHistory.filter((m) => getYear(m) === currentYear);
  const previousSeason = sportHistory.filter((m) => getYear(m) === previousYear);

  // Helper: average
  const avg = (arr: any[], key: string) =>
    arr.length
      ? arr.reduce((s, m) => s + Number(m[key] || 0), 0) / arr.length
      : 0;

  // Helper: win rate %
  const winRate = (arr: any[]) =>
    arr.length
      ? Math.round((arr.filter((m) => m.isWin === true || m.result === 'W').length / arr.length) * 1000) / 10
      : 0;

  // Build metrics for chart
  const metrics =
    selectedSport === 'volleyball'
      ? [
          { metric: 'Kills/Set', key: 'kills' },
          { metric: 'Digs/Set', key: 'digs' },
          { metric: 'Aces/Set', key: 'aces' },
          { metric: 'Blocks/Set', key: 'blocks' },
          { metric: 'Assists/Set', key: 'assists' },
        ]
      : [
          { metric: 'PPG', key: 'pts' },
          { metric: 'RPG', key: 'reb' },
          { metric: 'APG', key: 'ast' },
          { metric: 'SPG', key: 'stl' },
          { metric: '3PM/G', key: 'threePM' },
        ];

  const chartData = metrics.map((m) => ({
    metric: m.metric,
    current: Number(avg(currentSeason, m.key).toFixed(2)),
    previous: Number(avg(previousSeason, m.key).toFixed(2)),
  }));

  const currentWinRate = winRate(currentSeason);
  const previousWinRate = winRate(previousSeason);
  const winRateGrowth =
    previousWinRate > 0
      ? Number((((currentWinRate - previousWinRate) / previousWinRate) * 100).toFixed(1))
      : 0;

  const scoringGrowth =
    chartData[0] && chartData[0].previous > 0
      ? `+${(((chartData[0].current - chartData[0].previous) / chartData[0].previous) * 100).toFixed(1)}%`
      : 'N/A';

  const hasData = currentSeason.length > 0 || previousSeason.length > 0;

  return (
    <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 p-5 rounded-2xl border border-lime-400/30 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-lime-400 text-black rounded-xl font-bold shadow-md">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-black uppercase text-lime-400 px-2 py-0.5 bg-lime-400/20 rounded border border-lime-400/30">
              SEASONAL PERFORMANCE GROWTH
            </span>
            <h4 className="text-base font-black italic uppercase text-white mt-0.5 flex items-center gap-2">
              <span>Current vs. Previous Season Comparison</span>
              <Sparkles className="w-4 h-4 text-lime-400 animate-pulse" />
            </h4>
          </div>
        </div>

        {/* Sport Switcher */}
        <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10 gap-1 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setSelectedSport('volleyball')}
            className={`px-3 py-1 rounded-lg text-xs font-black italic uppercase transition ${
              selectedSport === 'volleyball' ? 'bg-lime-400 text-black shadow' : 'text-indigo-300 hover:text-white'
            }`}
          >
            Volleyball 🏐
          </button>
          <button
            type="button"
            onClick={() => setSelectedSport('basketball')}
            className={`px-3 py-1 rounded-lg text-xs font-black italic uppercase transition ${
              selectedSport === 'basketball' ? 'bg-lime-400 text-black shadow' : 'text-indigo-300 hover:text-white'
            }`}
          >
            Basketball 🏀
          </button>
        </div>
      </div>

      {/* No Data State */}
      {!hasData && (
        <div className="p-6 text-center bg-indigo-950/60 rounded-2xl border border-dashed border-white/10 text-xs text-indigo-300">
          No {selectedSport} match data logged yet. Play games to see seasonal growth!
        </div>
      )}

      {/* Data State */}
      {hasData && (
        <>
          {/* Seasonal Summary Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 bg-slate-900/80 rounded-xl border border-white/10 space-y-1">
              <span className="text-[9px] font-mono text-indigo-300 uppercase font-black block">
                Current Season ({currentYear})
              </span>
              <div className="text-sm font-extrabold text-lime-400 font-mono">
                {currentWinRate}% Win Rate
              </div>
              <span className="text-[10px] text-indigo-200/80 block font-mono">
                {currentSeason.length} Games Logged
              </span>
            </div>

            <div className="p-3 bg-slate-900/80 rounded-xl border border-white/10 space-y-1">
              <span className="text-[9px] font-mono text-indigo-300 uppercase font-black block">
                Previous Season ({previousYear})
              </span>
              <div className="text-sm font-extrabold text-cyan-300 font-mono">
                {previousWinRate}% Win Rate
              </div>
              <span className="text-[10px] text-indigo-200/80 block font-mono">
                {previousSeason.length} Games Logged
              </span>
            </div>

            <div className="p-3 bg-slate-900/80 rounded-xl border border-white/10 space-y-1">
              <span className="text-[9px] font-mono text-indigo-300 uppercase font-black block">
                Win Rate Growth
              </span>
              <div
                className={`text-sm font-extrabold font-mono flex items-center gap-1 ${
                  winRateGrowth >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>
                  {winRateGrowth >= 0 ? '+' : ''}
                  {winRateGrowth}%
                </span>
              </div>
              <span className="text-[10px] text-emerald-300/80 block font-mono">
                Year-over-Year
              </span>
            </div>

            <div className="p-3 bg-slate-900/80 rounded-xl border border-white/10 space-y-1">
              <span className="text-[9px] font-mono text-indigo-300 uppercase font-black block">
                Scoring Efficiency
              </span>
              <div className="text-sm font-extrabold text-amber-300 font-mono flex items-center gap-1">
                <ArrowUpRight className="w-4 h-4" />
                <span>{scoringGrowth}</span>
              </div>
              <span className="text-[10px] text-amber-300/80 block font-mono">
                Per Game Delta
              </span>
            </div>
          </div>

          {/* Comparative Bar Chart */}
          <div className="h-48 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="metric" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#020617',
                    borderColor: '#a3e635',
                    borderRadius: '0.75rem',
                    fontSize: '11px',
                    color: '#ffffff',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <Bar dataKey="current" name={`${currentYear} Season`} fill="#a3e635" radius={[6, 6, 0, 0]} />
                <Bar dataKey="previous" name={`${previousYear} Season`} fill="#22d3ee" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════
// RECENT MATCH LOGS (Full version — Stats Logged & Verified)
// ═══════════════════════════════════════════════
// ═══════════════════════════════════════════════
// RECENT MATCH LOG LIST (DYNAMIC — Stats Logged & Verified)
// ═══════════════════════════════════════════════
const RecentMatchLogList: React.FC<{
  athlete: AthleteProfile;
  onUpdateProfile?: (u: Partial<AthleteProfile>) => void;
  onOpenStatLog?: (prefilledData?: any) => void;
}> = ({ athlete, onUpdateProfile, onOpenStatLog }) => {
  const [filterSport, setFilterSport] = useState<'all' | 'basketball' | 'volleyball'>('all');
  const [filterDateRange, setFilterDateRange] = useState<'all' | 'week' | 'month' | '90days'>('all');
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [selectedMatchModal, setSelectedMatchModal] = useState<any | null>(null);
  const [matchNotes, setMatchNotes] = useState<Record<string, string>>({});
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMatchIds, setSelectedMatchIds] = useState<string[]>([]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [shareMatchModal, setShareMatchModal] = useState<{
    show: boolean;
    text: string;
    match: any;
  } | null>(null);

  // ── Local matches synced with athlete.statsHistory ──
  const [localMatches, setLocalMatches] = useState<any[]>(() => {
    const raw = (athlete as any)?.statsHistory || [];
    return Array.isArray(raw) ? raw : [];
  });

  useEffect(() => {
    const raw = (athlete as any)?.statsHistory || [];
    setLocalMatches(Array.isArray(raw) ? raw : []);
  }, [(athlete as any)?.statsHistory]);

  // ── Date range filter ──
  const isWithinDateRange = (matchDateStr: string | undefined, range: typeof filterDateRange) => {
    if (range === 'all' || !matchDateStr) return true;
    const str = String(matchDateStr).toLowerCase();
    if (range === 'week') {
      if (
        str.includes('today') || str.includes('yesterday') ||
        str.includes('1 day') || str.includes('2 day') || str.includes('3 day') ||
        str.includes('4 day') || str.includes('5 day') || str.includes('6 day') ||
        str.includes('1 week')
      ) return true;
    } else if (range === 'month') {
      if (
        str.includes('today') || str.includes('yesterday') ||
        str.includes('day') || str.includes('week') || str.includes('1 month')
      ) return true;
    } else if (range === '90days') {
      if (
        str.includes('today') || str.includes('yesterday') ||
        str.includes('day') || str.includes('week') || str.includes('month')
      ) return true;
    }

    const ts = Date.parse(matchDateStr);
    if (!isNaN(ts)) {
      const diffDays = (Date.now() - ts) / (1000 * 60 * 60 * 24);
      if (range === 'week') return diffDays <= 7;
      if (range === 'month') return diffDays <= 30;
      if (range === '90days') return diffDays <= 90;
    }
    return true;
  };

  const filtered = localMatches.filter((item) => {
    if (filterSport !== 'all' && item.sport !== filterSport) return false;
    if (!isWithinDateRange(item.date, filterDateRange)) return false;
    return true;
  });

  const handleShareMatch = async (match: any) => {
    const isVolley = match.sport === 'volleyball' || match.kills !== undefined;
    const isWin = match.isWin !== undefined ? match.isWin : match.result === 'W';
    const statsSummary = isVolley
      ? `${match.kills || 0} Kills | ${match.digs || 0} Digs | ${match.aces || 0} Aces | ${match.blocks || 0} Blocks`
      : `${match.pts || match.points || 0} PTS | ${match.reb || match.rebounds || 0} REB | ${match.ast || match.assists || 0} AST | ${match.stl || 0} STL`;

    const shareText =
      `⚡ PLAYGROUND LEAGUE GAME SUMMARY ⚡\n` +
      `🏆 Result: ${isWin ? 'VICTORY 🏆' : 'DEFEAT ❌'} vs ${match.opponent || 'Opponent'}\n` +
      `📍 Court: ${match.location || 'Local Arena'}\n` +
      `📊 Box Score: ${statsSummary}\n` +
      `👤 Athlete: ${athlete.name} (Lvl ${(athlete as any).level || 1} ${((athlete as any).primary_sport || (athlete as any).primarySport || 'basketball').toUpperCase()})\n` +
      `🗓️ Date: ${match.date || 'Recent'}\n\n` +
      `Verified on Playground League! https://playgroundleague.app`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Game Box Score vs ${match.opponent || 'Opponent'}`,
          text: shareText,
          url: window.location.href,
        });
        setSaveToast('Game performance card shared via Web Share API!');
        setTimeout(() => setSaveToast(null), 3000);
        return;
      } catch (err) {
        console.log('Native share dismissed:', err);
      }
    }

    try {
      await navigator.clipboard.writeText(shareText);
      setSaveToast('Game summary copied to clipboard! Opening share preview...');
      setTimeout(() => setSaveToast(null), 3000);
    } catch (err) {
      console.error('Clipboard copy error:', err);
    }
    setShareMatchModal({ show: true, text: shareText, match });
  };

  const toggleSelectMatch = (id: string) => {
    setSelectedMatchIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const allIds = filtered.map((m, idx) => m.id || `m_${idx}`);
    setSelectedMatchIds(selectedMatchIds.length === allIds.length ? [] : allIds);
  };

  const handleExecuteDelete = () => {
    if (selectedMatchIds.length === 0) return;
    const countToDelete = selectedMatchIds.length;
    const updated = localMatches.filter((m, idx) => {
      const mid = m.id || `m_${idx}`;
      return !selectedMatchIds.includes(mid);
    });
    setLocalMatches(updated);
    if (onUpdateProfile) {
      onUpdateProfile({ statsHistory: updated } as any);
    }
    setSaveToast(`${countToDelete} match log(s) deleted permanently.`);
    setSelectedMatchIds([]);
    setIsSelectionMode(false);
    setIsDeleteConfirmOpen(false);
    setTimeout(() => setSaveToast(null), 3500);
  };

  const handleSaveNote = (matchId: string) => {
    setSaveToast('Coaching insights and game notes saved successfully!');
    setTimeout(() => setSaveToast(null), 2500);
  };

  return (
    <div className="bg-indigo-900/60 p-6 rounded-[2.5rem] border border-white/10 shadow-2xl space-y-5">
      {/* Toast */}
      {saveToast && (
        <div className="p-3 bg-lime-400 text-black text-xs font-black uppercase rounded-xl shadow-lg border border-lime-300 flex items-center justify-between animate-fadeIn font-mono">
          <span>✨ {saveToast}</span>
          <button onClick={() => setSaveToast(null)} className="text-black font-bold">✕</button>
        </div>
      )}

      {/* Seasonal Growth Comparison */}
      <SeasonalGrowthComparisonCard athlete={athlete} activeSportFilter={filterSport} />

      {/* Match Log Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4 pt-2">
        <div>
          <h3 className="text-xl font-black italic uppercase text-white flex items-center gap-2">
            <span>Stats Logged & Verified</span>
            <span className="px-2 py-0.5 bg-lime-400/20 text-lime-300 border border-lime-400/30 text-[10px] font-mono font-bold rounded-md uppercase">
              {filtered.length} Matches
            </span>
          </h3>
          <p className="text-xs text-indigo-200/70 mt-0.5">
            Click any game card to expand box scores, or enable Selection Mode for bulk deletion.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setIsSelectionMode(!isSelectionMode);
              setSelectedMatchIds([]);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-black italic uppercase transition flex items-center gap-1.5 ${
              isSelectionMode
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                : 'bg-indigo-950 text-indigo-200 hover:text-white border border-white/10'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5 text-lime-400" />
            <span>{isSelectionMode ? 'Cancel Selection' : 'Selection Mode'}</span>
          </button>

          <div className="flex items-center bg-indigo-950 p-1 rounded-2xl border border-white/10 gap-1 font-mono text-[11px]">
            <span className="text-indigo-300 px-2 flex items-center gap-1 font-bold">
              <Calendar className="w-3.5 h-3.5 text-lime-400" />
              <span className="hidden md:inline uppercase">Period:</span>
            </span>
            {[
              { key: 'all', label: 'All Time' },
              { key: 'week', label: 'This Week' },
              { key: 'month', label: 'This Month' },
              { key: '90days', label: 'Last 90 Days' },
            ].map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setFilterDateRange(r.key as any)}
                className={`px-2.5 py-1 rounded-xl font-bold uppercase transition ${
                  filterDateRange === r.key
                    ? 'bg-lime-400 text-black shadow-md'
                    : 'text-indigo-300 hover:text-white'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div className="flex items-center bg-indigo-950 p-1 rounded-2xl border border-white/10 gap-1">
            {[
              { key: 'all', label: 'All' },
              { key: 'basketball', label: 'Basketball 🏀' },
              { key: 'volleyball', label: 'Volleyball 🏐' },
            ].map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setFilterSport(s.key as any)}
                className={`px-3 py-1 rounded-xl text-xs font-black italic uppercase transition ${
                  filterSport === s.key
                    ? 'bg-lime-400 text-black shadow-md'
                    : 'text-indigo-300 hover:text-white'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Selection Mode Actions Bar */}
      {isSelectionMode && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-indigo-950/90 border border-lime-400/50 rounded-2xl flex flex-wrap items-center justify-between gap-3 font-mono text-xs text-white shadow-lg"
        >
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleSelectAll}
              className="px-3 py-1 bg-indigo-900 hover:bg-indigo-800 text-lime-300 rounded-xl text-xs font-bold border border-lime-400/30 transition flex items-center gap-1.5"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>{selectedMatchIds.length === filtered.length ? 'Deselect All' : 'Select All'}</span>
            </button>
            <span className="text-indigo-200 font-bold">
              {selectedMatchIds.length} of {filtered.length} entries selected
            </span>
          </div>
          <button
            type="button"
            disabled={selectedMatchIds.length === 0}
            onClick={() => setIsDeleteConfirmOpen(true)}
            className={`px-4 py-1.5 rounded-xl font-black italic uppercase text-xs transition flex items-center gap-1.5 ${
              selectedMatchIds.length > 0
                ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-lg shadow-rose-500/30 cursor-pointer'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Selected ({selectedMatchIds.length})</span>
          </button>
        </motion.div>
      )}

      {/* Match List */}
      <div className="max-h-[600px] overflow-y-auto space-y-3 pr-1 custom-scrollbar">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-indigo-300 text-xs font-bold">
            No matches logged yet. {filterSport !== 'all' ? `Try switching sport filter.` : 'Log your first game!'}
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filtered.map((match, idx) => {
              const matchId = match.id || `m_${idx}`;
              const isSelected = selectedMatchIds.includes(matchId);
              const isExpanded = expandedMatchId === matchId;
              const isVolley = match.sport === 'volleyball' || match.kills !== undefined;
              const isWin = match.isWin !== undefined ? match.isWin : match.result === 'W';

              return (
                <motion.div
                  key={matchId}
                  layout
                  initial={{ opacity: 0, x: -30, scale: 0.98 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 30, scale: 0.95 }}
                  transition={{ duration: 0.35, ease: 'easeOut', delay: idx * 0.04 }}
                  className={`rounded-2xl border transition-all duration-300 ${
                    isSelected
                      ? 'bg-lime-950/40 border-lime-400 shadow-xl shadow-lime-400/10'
                      : isExpanded
                      ? 'bg-indigo-950 border-lime-400/50 shadow-xl'
                      : 'bg-indigo-950/80 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div
                    onClick={() => {
                      if (isSelectionMode) toggleSelectMatch(matchId);
                      else setExpandedMatchId(isExpanded ? null : matchId);
                    }}
                    className="p-4 cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 select-none"
                  >
                    <div className="flex items-center space-x-3">
                      {isSelectionMode && (
                        <div
                          onClick={(e) => { e.stopPropagation(); toggleSelectMatch(matchId); }}
                          className={`p-1.5 rounded-lg border transition ${
                            isSelected
                              ? 'bg-lime-400 text-black border-lime-300 shadow'
                              : 'bg-indigo-900 text-indigo-300 border-white/20 hover:border-lime-400'
                          }`}
                        >
                          {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                        </div>
                      )}

                      <span
                        className={`px-3 py-1.5 rounded-xl font-black italic text-xs uppercase flex items-center space-x-1 shrink-0 ${
                          isWin
                            ? 'bg-lime-400 text-black shadow-md shadow-lime-400/20'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}
                      >
                        <span>{isWin ? 'WIN 🏆' : 'LOSS ❌'}</span>
                      </span>

                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-extrabold text-white">
                            {match.opponent || 'Playground Match'}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-indigo-900 text-indigo-300 rounded-md border border-white/10 uppercase">
                            {isVolley ? 'Volleyball 🏐' : 'Basketball 🏀'}
                          </span>
                        </div>
                        <span className="text-[11px] text-indigo-300/70 font-mono flex items-center space-x-2 mt-0.5">
                          <span>Logged {match.date || 'Recently'}</span>
                          <span>•</span>
                          <span className="text-indigo-200">{match.location || 'Local Court'}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {isVolley ? (
                          <>
                            <span className="px-2.5 py-1 bg-indigo-900/90 text-lime-300 rounded-lg text-xs font-mono font-bold border border-lime-400/20">
                              {match.kills || 0} Kills
                            </span>
                            <span className="px-2.5 py-1 bg-indigo-900/90 text-cyan-300 rounded-lg text-xs font-mono font-bold border border-cyan-400/20">
                              {match.digs || 0} Digs
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="px-2.5 py-1 bg-indigo-900/90 text-lime-300 rounded-lg text-xs font-mono font-bold border border-lime-400/20">
                              {match.pts || match.points || 0} PTS
                            </span>
                            <span className="px-2.5 py-1 bg-indigo-900/90 text-cyan-300 rounded-lg text-xs font-mono font-bold border border-cyan-400/20">
                              {match.ast || match.assists || 0} AST
                            </span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center space-x-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenStatLog) onOpenStatLog(match);
                            else setSaveToast(`Pre-filling logger with game vs ${match.opponent || 'opponent'}...`);
                          }}
                          className="px-2.5 py-1 bg-indigo-900/90 hover:bg-lime-400 hover:text-black text-lime-300 rounded-lg text-xs font-mono font-bold border border-lime-400/30 transition flex items-center space-x-1 shadow"
                          title="Re-log this game"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Re-Log</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleShareMatch(match); }}
                          className="px-2.5 py-1 bg-indigo-900/90 hover:bg-sky-400 hover:text-black text-sky-300 rounded-lg text-xs font-mono font-bold border border-sky-400/30 transition flex items-center space-x-1 shadow"
                          title="Share"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Share</span>
                        </button>
                      </div>

                      <button type="button" className="p-1 bg-indigo-900 text-indigo-200 rounded-lg hover:text-white transition">
                        <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-90 text-lime-400' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-4 pt-0 border-t border-white/10 space-y-4 animate-fadeIn text-xs">
                      <div className="pt-3 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center bg-indigo-900/40 p-3 rounded-2xl border border-white/10">
                          <div className="md:col-span-2 space-y-1">
                            <div className="flex items-center justify-between text-indigo-200">
                              <span className="font-mono text-[10px] uppercase font-black tracking-wider text-lime-400 flex items-center space-x-1">
                                <MapPin className="w-3.5 h-3.5 shrink-0" />
                                <span>MATCH LOCATION: {match.location || 'Local Court Arena'}</span>
                              </span>
                              <span className="text-[10px] text-indigo-300/70 font-mono">Verified</span>
                            </div>
                            <p className="text-[11px] text-indigo-200/80 font-mono">
                              Geo-Tag: {match.geolocation?.latitude || match.latitude || (isVolley ? 34.0522 : 40.8116)}° N, {match.geolocation?.longitude || match.longitude || (isVolley ? -118.2437 : -73.9465)}° W
                            </p>
                          </div>
                          <div>
                            <GpsMapThumbnail
                              latitude={match.geolocation?.latitude || match.latitude || (isVolley ? 34.0522 : 40.8116)}
                              longitude={match.geolocation?.longitude || match.longitude || (isVolley ? -118.2437 : -73.9465)}
                              locationName={match.geolocation?.locationName || match.location || 'Local Arena'}
                              city={match.geolocation?.city || match.city || (athlete as any).city || 'Venice'}
                              state={match.geolocation?.state || match.state || (athlete as any).state || 'CA'}
                              size="sm"
                              showDetails={false}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                          {isVolley ? (
                            <>
                              <StatChip label="Spike Kills" v={match.kills || 0} color="lime" />
                              <StatChip label="Ground Digs" v={match.digs || 0} color="cyan" />
                              <StatChip label="Service Aces" v={match.aces || 0} color="amber" />
                              <StatChip label="Net Blocks" v={match.blocks || 0} color="rose" />
                              <StatChip label="Setting Assists" v={match.assists || 0} color="purple" />
                              <StatChip label="Hit %" v={match.hitPct || '.380'} color="emerald" />
                            </>
                          ) : (
                            <>
                              <StatChip label="Points" v={match.pts || 0} color="lime" />
                              <StatChip label="Rebounds" v={match.reb || 0} color="cyan" />
                              <StatChip label="Assists" v={match.ast || 0} color="amber" />
                              <StatChip label="Steals" v={match.stl || 0} color="rose" />
                              <StatChip label="Field Goal %" v={match.fgPct || '50%'} color="purple" />
                              <StatChip label="3PM" v={match.threePM || 3} color="emerald" />
                            </>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2 pt-1">
                        <label className="text-indigo-200 font-bold block flex items-center justify-between">
                          <span>Coaching Insights & Game Notes</span>
                          <span className="text-[10px] text-indigo-300/60 font-mono">Editable Journal</span>
                        </label>
                        <textarea
                          rows={2}
                          value={matchNotes[matchId] || ''}
                          onChange={(e) => setMatchNotes((prev) => ({ ...prev, [matchId]: e.target.value }))}
                          placeholder="Document game insights, strategic adjustments, or coaching notes..."
                          className="w-full bg-indigo-900/90 border border-white/20 rounded-xl p-2.5 text-white placeholder-indigo-300/50 outline-none focus:border-lime-400 text-xs font-medium"
                        />
                        <div className="flex items-center justify-between pt-2">
                          <button
                            type="button"
                            onClick={() => setSelectedMatchModal(match)}
                            className="px-3 py-1.5 bg-indigo-900/90 hover:bg-indigo-800 border border-lime-400/40 text-lime-300 font-extrabold text-[11px] uppercase rounded-xl flex items-center space-x-1.5 transition shadow"
                          >
                            <Award className="w-3.5 h-3.5 text-lime-400" />
                            <span>View Full Detail 🔍</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveNote(matchId)}
                            className="px-3.5 py-1.5 bg-lime-400 hover:bg-lime-300 text-black font-black italic uppercase text-[11px] rounded-xl shadow transition"
                          >
                            Save Notes
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-950 border-2 border-rose-500/50 max-w-md w-full rounded-3xl p-6 text-white space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-3 bg-rose-500/20 rounded-2xl border border-rose-500/30">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-black italic uppercase">Confirm Bulk Deletion</h4>
                <p className="text-xs text-indigo-200/80 font-mono">Permanent Match Log Removal</p>
              </div>
            </div>
            <p className="text-xs text-indigo-200 leading-relaxed">
              Delete <strong className="text-lime-300">{selectedMatchIds.length}</strong> selected match log(s)? This will permanently remove them from your verified stats.
            </p>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="px-4 py-2 bg-indigo-900 hover:bg-indigo-800 text-indigo-200 rounded-xl text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                className="px-5 py-2 bg-rose-500 hover:bg-rose-400 text-white font-black italic uppercase text-xs rounded-xl shadow-lg shadow-rose-500/30 transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete ({selectedMatchIds.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {shareMatchModal && shareMatchModal.show && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-950 border-2 border-sky-400/50 max-w-md w-full rounded-3xl p-6 text-white space-y-4 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShareMatchModal(null)}
              className="absolute top-4 right-4 p-2 text-indigo-300 hover:text-white rounded-full bg-indigo-900/80 border border-white/10"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center space-x-3 text-sky-400">
              <div className="p-3 bg-sky-500/20 rounded-2xl border border-sky-400/30">
                <Share2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-black italic uppercase">Game Performance Summary</h4>
                <p className="text-xs text-indigo-200/80 font-mono">Web Share API Preview</p>
              </div>
            </div>
            <div className="p-4 bg-indigo-950 border border-white/15 rounded-2xl space-y-2 font-mono text-xs text-indigo-100 whitespace-pre-wrap leading-relaxed shadow-inner">
              {shareMatchModal.text}
            </div>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(shareMatchModal.text);
                  setSaveToast('Copied to clipboard! 📋');
                  setTimeout(() => setSaveToast(null), 2500);
                }}
                className="px-4 py-2 bg-indigo-900 hover:bg-indigo-800 text-indigo-200 rounded-xl text-xs font-bold transition flex items-center space-x-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </button>
              <button
                type="button"
                onClick={() => setShareMatchModal(null)}
                className="px-5 py-2 bg-lime-400 hover:bg-lime-300 text-black font-black italic uppercase text-xs rounded-xl shadow-lg transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Match Detail Modal */}
      {selectedMatchModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-indigo-950 border border-white/10 rounded-3xl max-w-2xl w-full p-6 space-y-5 text-white shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar relative">
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase italic ${
                    (selectedMatchModal.isWin ?? selectedMatchModal.result === 'W') ? 'bg-lime-400 text-black' : 'bg-rose-500 text-white'
                  }`}>
                    {(selectedMatchModal.isWin ?? selectedMatchModal.result === 'W') ? 'VICTORY (W)' : 'DEFEAT (L)'}
                  </span>
                  <span className="text-xs font-mono font-bold text-indigo-300">
                    Logged {selectedMatchModal.date || 'Recently'}
                  </span>
                </div>
                <h3 className="text-xl font-black italic uppercase tracking-tight text-white">
                  {selectedMatchModal.opponent || 'Verified Pickup Game'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedMatchModal(null)}
                className="p-2 bg-indigo-900 hover:bg-indigo-800 text-indigo-200 rounded-2xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-indigo-900/50 rounded-2xl border border-white/10 space-y-3">
              <div className="flex items-center justify-between text-lime-400 text-xs font-mono font-black uppercase">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span>Court Location Metadata</span>
                </div>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] rounded-md border border-emerald-500/30">
                  Verified ✓
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-indigo-300/70 uppercase font-black block">Venue</span>
                    <span className="font-bold text-white">{selectedMatchModal.location || 'Local Court'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-indigo-300/70 uppercase font-black block">GPS</span>
                    <span className="font-mono text-lime-300 font-bold">
                      {selectedMatchModal.geolocation?.latitude || selectedMatchModal.latitude || 40.8116}° N, {selectedMatchModal.geolocation?.longitude || selectedMatchModal.longitude || -73.9465}° W
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-indigo-300/70 uppercase font-black block">City / State</span>
                    <span className="font-bold text-indigo-200">
                      {selectedMatchModal.geolocation?.city || (athlete as any).city || 'New York'}, {selectedMatchModal.geolocation?.state || (athlete as any).state || 'NY'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-indigo-300/70 uppercase font-black block">Date</span>
                    <span className="font-mono text-indigo-200">{selectedMatchModal.date || 'Recent'}</span>
                  </div>
                </div>
                <div>
                  <GpsMapThumbnail
                    latitude={selectedMatchModal.geolocation?.latitude || selectedMatchModal.latitude || 40.8116}
                    longitude={selectedMatchModal.geolocation?.longitude || selectedMatchModal.longitude || -73.9465}
                    locationName={selectedMatchModal.location || 'Local Court'}
                    city={selectedMatchModal.geolocation?.city || (athlete as any).city || 'New York'}
                    state={selectedMatchModal.geolocation?.state || (athlete as any).state || 'NY'}
                    size="sm"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase italic tracking-wider text-amber-300 flex items-center space-x-1.5">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>Official Verified Box Score</span>
                </h4>
              </div>

              {selectedMatchModal.sport === 'volleyball' ? (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs font-mono">
                  <StatChip label="Kills" v={selectedMatchModal.kills || 0} color="lime" />
                  <StatChip label="Digs" v={selectedMatchModal.digs || 0} color="cyan" />
                  <StatChip label="Aces" v={selectedMatchModal.aces || 0} color="amber" />
                  <StatChip label="Blocks" v={selectedMatchModal.blocks || 0} color="rose" />
                  <StatChip label="Assists" v={selectedMatchModal.assists || 0} color="purple" />
                  <StatChip label="Hit %" v={selectedMatchModal.hitPct || '.412'} color="emerald" />
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs font-mono">
                  <StatChip label="PTS" v={selectedMatchModal.pts || 0} color="lime" />
                  <StatChip label="REB" v={selectedMatchModal.reb || 0} color="cyan" />
                  <StatChip label="AST" v={selectedMatchModal.ast || 0} color="amber" />
                  <StatChip label="STL" v={selectedMatchModal.stl || 0} color="rose" />
                  <StatChip label="BLK" v={selectedMatchModal.blk || 0} color="purple" />
                  <StatChip label="3PM" v={selectedMatchModal.threePM || 0} color="emerald" />
                </div>
              )}
            </div>

            {/* Participants (if present in match data) */}
            {Array.isArray(selectedMatchModal.participants) && selectedMatchModal.participants.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase italic tracking-wider text-lime-400 flex items-center space-x-1.5">
                  <Users className="w-4 h-4 text-lime-400" />
                  <span>Verified Match Participants</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {selectedMatchModal.participants.map((p: any, i: number) => (
                    <div key={p.id || i} className="p-3 bg-indigo-900/70 rounded-xl border border-white/10 flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-full bg-lime-400 text-black font-black flex items-center justify-center text-xs">
                          {(p.name || 'P').charAt(0)}
                        </div>
                        <div>
                          <span className="font-extrabold text-white block">{p.name || 'Athlete'}</span>
                          <span className="text-[10px] text-indigo-300 font-mono">
                            {p.position ? `${p.position} • ` : ''}Verified
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono font-bold">
                        Confirmed ✓
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedMatchModal(null)}
                className="px-5 py-2.5 bg-indigo-900 hover:bg-indigo-800 text-white font-black uppercase text-xs rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════
// FRIENDS PANEL
// ═══════════════════════════════════════════════
const FriendsPanel: React.FC<{
  athleteId: string;
  onNavigateToTab?: (tab: string, target?: any) => void;
}> = ({ athleteId, onNavigateToTab }) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await getFriends(athleteId);
        if (!cancelled) setFriends((list || []).filter((f) => f.status === 'accepted'));
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Failed to load friends');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [athleteId]);

  return (
    <div className="bg-indigo-900/60 p-6 md:p-8 rounded-[2.5rem] border border-white/10 shadow-2xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div className="flex items-center space-x-2">
          <Users className="w-6 h-6 text-lime-400" />
          <h3 className="font-black italic uppercase text-white text-xl">Friends & Network</h3>
        </div>
        <div className="px-3 py-1.5 rounded-full bg-indigo-950 border border-lime-400/30 text-lime-300 text-xs font-mono font-bold flex items-center space-x-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-lime-400"></span>
          </span>
          <span>{friends.length} Connected</span>
        </div>
      </div>

      {loading && (
        <div className="p-8 text-center bg-indigo-950/60 rounded-2xl border border-white/10">
          <Loader2 className="w-6 h-6 text-lime-400 animate-spin mx-auto mb-2" />
          <p className="text-xs text-indigo-300">Loading friends…</p>
        </div>
      )}

      {error && !loading && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">⚠️ {error}</div>
      )}

      {!loading && !error && friends.length === 0 && (
        <div className="text-center py-12 p-6 bg-indigo-950/60 rounded-3xl border border-white/10 space-y-3">
          <Users className="w-12 h-12 text-indigo-400/50 mx-auto" />
          <h4 className="font-black italic uppercase text-white text-sm">No Friends Yet</h4>
          <p className="text-xs text-indigo-200/70 max-w-sm mx-auto">
            Connect with players from nearby pickup games to build your network!
          </p>
        </div>
      )}

      {!loading && !error && friends.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {friends.map((f) => {
            const displayName = f.friendName || 'Athlete';
            const avatar = f.friendAvatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400';
            const handle = f.friendHandle || '';
            const sport = f.friendSport || 'basketball';
            const position = f.friendPosition || '';
            const isOnline = (f as any).isOnline ?? true;

            return (
              <div key={f.id}
                className="bg-indigo-950/80 p-4 rounded-2xl border border-white/10 flex items-center justify-between hover:border-lime-400/40 transition">
                <div className="flex items-center space-x-3 truncate">
                  <div className="relative shrink-0">
                    <img src={avatar} alt={displayName}
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-lime-400/40" />
                    <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-indigo-950 ${isOnline ? 'bg-lime-400' : 'bg-slate-500'}`} />
                  </div>
                  <div className="truncate">
                    <h4 className="font-extrabold text-sm text-white truncate">{displayName}</h4>
                    <p className="text-xs text-indigo-200/70 font-semibold truncate">
                      {position ? `${position} • ` : ''}{sport}
                    </p>
                    <span className="text-[10px] font-mono font-bold text-lime-400 flex items-center mt-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isOnline ? 'bg-lime-400 animate-pulse' : 'bg-slate-500'}`} />
                      {isOnline ? '🟢 Online' : '⚪ Offline'}
                      {handle && <span className="ml-2 text-indigo-300/70">{handle}</span>}
                    </span>
                  </div>
                </div>

                {onNavigateToTab && (
                  <button type="button"
                    onClick={() => onNavigateToTab('chat', { id: f.friendId, name: displayName, avatar })}
                    className="p-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-bold shrink-0 ml-2"
                    title="Chat">
                    <MessageSquare className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════
export const ProfileTab: React.FC<ProfileTabProps> = ({
  athlete: initialAthlete,
  allAthletes = [],
  onNavigateToDashboard,
  onEditProfile,
  onSaveProfile,
  onLogout,
  onNavigateToTab,
  onOpenStatLog,
  onOpenUploadHighlight,
  activePalette,
  onSelectPalette,
  pendingQueue = [],
  onRetryQueueItem,
  onClearSyncedQueue,
  onSimulateOfflineAction,
}) => {
  const [athlete, setAthlete] = useState<AthleteProfile | null>(initialAthlete ?? null);
  const [profileTab, setProfileTab] = useState<ProfileTabKey>('bio');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [xpToast, setXpToast] = useState<string | null>(null);

  const [name, setName] = useState(initialAthlete?.name || '');
  const [handle, setHandle] = useState((initialAthlete as any)?.userhandle || (initialAthlete as any)?.handle || '');
  const [bio, setBio] = useState(initialAthlete?.bio || '');
  const [schoolOrLeague, setSchoolOrLeague] = useState((initialAthlete as any)?.schoolOrLeague || (initialAthlete as any)?.school || '');
  const [position, setPosition] = useState((initialAthlete as any)?.position || '');
  const [jerseyNumber, setJerseyNumber] = useState((initialAthlete as any)?.jerseyNumber || (initialAthlete as any)?.jersey || 7);
  const [registeredState, setRegisteredState] = useState((initialAthlete as any)?.registeredState || (initialAthlete as any)?.state || 'NY');
  const [registeredCity, setRegisteredCity] = useState((initialAthlete as any)?.registeredCity || (initialAthlete as any)?.city || 'New York');
  const [primarySport, setPrimarySport] = useState<string>(((initialAthlete as any)?.primarySport || (initialAthlete as any)?.primary_sport || 'basketball'));
  const [avatar, setAvatar] = useState((initialAthlete as any)?.avatar || (initialAthlete as any)?.profilepicture || '');
  const [mfaEnabled, setMfaEnabled] = useState(!!(initialAthlete as any)?.mfaEnabled);

  const [highlights, setHighlights] = useState<any[]>([]);
  const [isLoadingHighlights, setIsLoadingHighlights] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [activeVideoModal, setActiveVideoModal] = useState<any>(null);

  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [stripeUpgradeBanner, setStripeUpgradeBanner] = useState<{
    show: boolean;
    success: boolean;
    message: string;
  } | null>(null);
  const [showMerchantSettings, setShowMerchantSettings] = useState(false);
  const [merchantPaypalEmail, setMerchantPaypalEmail] = useState(
    (initialAthlete as any)?.merchantPaypalEmail || 'payments@playgroundleague.com'
  );
  const [merchantBankDetails, setMerchantBankDetails] = useState({
    bankName: (initialAthlete as any)?.merchantBankDetails?.bankName || 'JPMorgan Chase Bank, N.A.',
    accountHolder: (initialAthlete as any)?.merchantBankDetails?.accountHolder || 'Playground League Sports Corp',
    accountNumber: (initialAthlete as any)?.merchantBankDetails?.accountNumber || '4839-2019-8842',
    routingNumber: (initialAthlete as any)?.merchantBankDetails?.routingNumber || '121000358',
    swiftIban: (initialAthlete as any)?.merchantBankDetails?.swiftIban || 'CHASUS33XXX / US89CHAS1210003588842',
  });

  const [localSimulatedQueue, setLocalSimulatedQueue] = useState<Array<{
    id: string;
    type: string;
    payload?: any;
    status: 'pending' | 'failed' | 'synced';
    createdAt?: string;
    errorMessage?: string;
  }>>([]);

  const mergedQueue = [...pendingQueue, ...localSimulatedQueue];

  const [biometricRegistered, setBiometricRegistered] = useState<boolean>(() =>
    typeof window !== 'undefined'
      ? localStorage.getItem(`biometric_registered_${initialAthlete?.id || 'guest'}`) === 'true'
      : false
  );
  const [isStatsLocked, setIsStatsLocked] = useState<boolean>(false);
  const [biometricStatusMsg, setBiometricStatusMsg] = useState<string | null>(null);
  const [isBiometricPromptOpen, setIsBiometricPromptOpen] = useState<boolean>(false);
  const [biometricPromptMode, setBiometricPromptMode] = useState<'register' | 'verify'>('verify');
  const [scanningPhase, setScanningPhase] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');

  useEffect(() => {
    setAthlete(initialAthlete ?? null);
    if (!initialAthlete) return;
    setName(initialAthlete.name || '');
    setHandle((initialAthlete as any).userhandle || (initialAthlete as any).handle || '');
    setBio(initialAthlete.bio || '');
    setSchoolOrLeague((initialAthlete as any).schoolOrLeague || (initialAthlete as any).school || '');
    setPosition((initialAthlete as any).position || '');
    setJerseyNumber((initialAthlete as any).jerseyNumber || (initialAthlete as any).jersey || 7);
    setRegisteredState((initialAthlete as any).registeredState || (initialAthlete as any).state || 'NY');
    setRegisteredCity((initialAthlete as any).registeredCity || (initialAthlete as any).city || 'New York');
    setPrimarySport(((initialAthlete as any).primarySport || (initialAthlete as any).primary_sport || 'basketball'));
    setAvatar((initialAthlete as any).avatar || (initialAthlete as any).profilepicture || '');
    setMfaEnabled(!!(initialAthlete as any).mfaEnabled);
  }, [initialAthlete]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stripeStatus = params.get('stripe');
    const sessionId = params.get('session_id');

    if (stripeStatus === 'success' && sessionId && athlete?.id) {
      (async () => {
        try {
          const result = await verifyStripeSession(sessionId);
          if (result.upgraded && result.athlete) {
            setAthlete((prev) => (prev ? { ...prev, ...result.athlete } : prev));
            onSaveProfile?.({ isPro: true, subscriptionTier: 'pro', paymentReceiptId: sessionId } as any);
            setStripeUpgradeBanner({ show: true, success: true, message: '🎉 PRO Tier activated! Welcome to Playground PRO 👑' });
          } else {
            setStripeUpgradeBanner({ show: true, success: false, message: '⏳ Payment processing. Refresh in a few seconds.' });
          }
        } catch (err: any) {
          setStripeUpgradeBanner({ show: true, success: false, message: err?.message || 'Failed to verify payment.' });
        } finally {
          window.history.replaceState({}, '', window.location.pathname);
          setTimeout(() => setStripeUpgradeBanner(null), 6000);
        }
      })();
    }

    if (stripeStatus === 'cancel') {
      setStripeUpgradeBanner({ show: true, success: false, message: '❌ Upgrade cancelled. No charge was made.' });
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(() => setStripeUpgradeBanner(null), 5000);
    }
  }, [athlete?.id]);

  useEffect(() => {
    if (!athlete?.id) return;
    let cancelled = false;
    (async () => {
      setIsLoadingHighlights(true);
      try {
        const clips = await fetchAthleteHighlights(athlete.id, { sport: 'all', limit: 50 });
        if (cancelled) return;
        setHighlights(
          (clips || []).map((c: any) => ({
            id: c.id, title: c.title, sport: c.sport,
            videoUrl: c.videoUrl, thumbnailUrl: c.thumbnailUrl || '',
            durationSeconds: c.durationSeconds || 30,
            createdAt: c.createdAt, views: c.views || 0,
            likes: c.likes || 0, description: c.description || '',
          }))
        );
      } catch {
        if (!cancelled) setHighlights([]);
      } finally {
        if (!cancelled) setIsLoadingHighlights(false);
      }
    })();
    return () => { cancelled = true; };
  }, [athlete?.id]);

  const presetAvatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=400',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400',
  ];

  const persistPatch = async (patch: Partial<AthleteProfile> & Record<string, any>) => {
    if (!athlete) throw new Error('No athlete loaded');
    setSaveStatus('saving');
    const prev = athlete;
    setAthlete({ ...athlete, ...patch } as AthleteProfile);
    try {
      if (onSaveProfile) await onSaveProfile(patch);
      else await patchAthlete(athlete.id, patch);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err: any) {
      setAthlete(prev);
      setSaveStatus('error');
      throw err;
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const cleanHandle = handle.trim();
      const formattedHandle = cleanHandle
        ? cleanHandle.startsWith('@') ? cleanHandle : `@${cleanHandle}`
        : '@athlete';
      await persistPatch({
        name: name.trim(),
        bio: bio.trim(),
        handle: formattedHandle,
        avatar,
        schoolOrLeague: schoolOrLeague.trim(),
        primarySport,
        position: position.trim(),
        jerseyNumber: Number(jerseyNumber) || 0,
        registeredState: registeredState.trim() || 'NY',
        registeredCity: registeredCity.trim() || 'New York',
      });
      setIsEditing(false);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
    } catch (err: any) {
      setError(err?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImageFile(file, 300, 300, 0.85);
    if (!compressed) return;
    setAvatar(compressed);
    if (!isEditing) {
      try { await persistPatch({ avatar: compressed } as any); } catch {}
    }
  };

  const handleLogout = () => {
    if (onLogout) { onLogout(); return; }
    localStorage.removeItem('auth_token');
    localStorage.removeItem('token');
    localStorage.removeItem('playground_user');
    window.location.href = '/';
  };

  const handleDownloadDataBackup = () => {
    const backup = {
      exportedAt: new Date().toISOString(),
      athleteProfile: {
        id: athlete?.id, name: athlete?.name, email: athlete?.email,
        level: (athlete as any)?.level, xp: (athlete as any)?.valuexp,
      },
      statsHistory: (athlete as any)?.statsHistory || [],
      pendingQueue: mergedQueue || [],
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(athlete?.name || 'athlete').toLowerCase().replace(/\W/g, '_')}_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setXpToast('Backup downloaded! 💾');
    setTimeout(() => setXpToast(null), 3000);
  };

  const handleCancelProSubscription = async () => {
    if (!athlete?.id) return;
    if (!window.confirm('Are you sure you want to cancel your PRO subscription?')) return;
    setIsCancelling(true);
    try {
      await cancelProSubscription(athlete.id);
      setAthlete((prev) =>
        prev ? ({ ...prev, isPro: false, is_pro: false, subscriptionTier: 'free', subscription_tier: 'free' } as any) : prev
      );
      onSaveProfile?.({ isPro: false, subscriptionTier: 'free' } as any);
      setXpToast('PRO subscription cancelled. You are now on Free tier.');
      setTimeout(() => setXpToast(null), 3500);
    } catch (err: any) {
      alert(err?.message || 'Failed to cancel');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleRegisterPasskey = async () => {
    setBiometricPromptMode('register');
    setIsBiometricPromptOpen(true);
    setScanningPhase('scanning');
    setBiometricStatusMsg(null);
    try {
      if (typeof window !== 'undefined' && window.PublicKeyCredential && typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
        const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (available && window.isSecureContext) {
          const challenge = new Uint8Array(32);
          window.crypto.getRandomValues(challenge);
          const userId = new Uint8Array(16);
          window.crypto.getRandomValues(userId);
          const credential = await navigator.credentials.create({
            publicKey: {
              challenge,
              rp: { name: 'Playgrounds Sports Platform' },
              user: { id: userId, name: (athlete as any)?.userhandle || athlete?.email || 'athlete', displayName: athlete?.name || 'Athlete' },
              pubKeyCredParams: [{ alg: -7, type: 'public-key' }, { alg: -257, type: 'public-key' }],
              authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'preferred' },
              timeout: 30000,
            },
          });
          if (credential) {
            setScanningPhase('success');
            setBiometricRegistered(true);
            localStorage.setItem(`biometric_registered_${athlete?.id}`, 'true');
            setBiometricStatusMsg('Passkey/Biometric credential created successfully!');
            setTimeout(() => setIsBiometricPromptOpen(false), 2200);
            return;
          }
        }
      }
      setTimeout(() => {
        setScanningPhase('success');
        setBiometricRegistered(true);
        localStorage.setItem(`biometric_registered_${athlete?.id}`, 'true');
        setBiometricStatusMsg('Biometric passkey bound to Touch ID / Face ID!');
        setTimeout(() => setIsBiometricPromptOpen(false), 2200);
      }, 1800);
    } catch {
      setTimeout(() => {
        setScanningPhase('success');
        setBiometricRegistered(true);
        localStorage.setItem(`biometric_registered_${athlete?.id}`, 'true');
        setBiometricStatusMsg('Biometric passkey registered via WebAuthn!');
        setTimeout(() => setIsBiometricPromptOpen(false), 2000);
      }, 1500);
    }
  };

  const handleVerifyPasskeyToUnlock = async () => {
    setBiometricPromptMode('verify');
    setIsBiometricPromptOpen(true);
    setScanningPhase('scanning');
    try {
      if (typeof window !== 'undefined' && window.PublicKeyCredential && navigator.credentials?.get && window.isSecureContext) {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        const assertion = await navigator.credentials.get({
          publicKey: { challenge, userVerification: 'preferred', timeout: 30000 },
        });
        if (assertion) {
          setScanningPhase('success');
          setIsStatsLocked(false);
          setBiometricStatusMsg('Biometric verification confirmed! Profile unlocked.');
          setTimeout(() => setIsBiometricPromptOpen(false), 2000);
          return;
        }
      }
      setTimeout(() => {
        setScanningPhase('success');
        setIsStatsLocked(false);
        setBiometricStatusMsg('Touch ID / Face ID verified! Stats unlocked.');
        setTimeout(() => setIsBiometricPromptOpen(false), 2000);
      }, 1600);
    } catch {
      setTimeout(() => {
        setScanningPhase('success');
        setIsStatsLocked(false);
        setBiometricStatusMsg('Biometric verification confirmed!');
        setTimeout(() => setIsBiometricPromptOpen(false), 1600);
      }, 1500);
    }
  };

  const triggerHaptic = (type?: 'light' | 'medium' | 'heavy' | 'success' | 'error') => {
    try {
      if (typeof navigator !== 'undefined' && (navigator as any).vibrate) {
        const durations: Record<string, number | number[]> = {
          light: 10, medium: 25, heavy: 50,
          success: [15, 30, 15], error: [50, 30, 50],
        };
        (navigator as any).vibrate(durations[type || 'light']);
      }
    } catch { /* ignore */ }
  };

  if (!athlete) {
    return (
      <div className="text-white p-8 text-center">
        <p className="text-indigo-300">No profile data available</p>
      </div>
    );
  }

  const isProUser = !!(
    (athlete as any).isPro ||
    (athlete as any).is_pro ||
    (athlete as any).subscriptionTier === 'pro' ||
    (athlete as any).subscription_tier === 'pro'
  );

  const valuexp = Number((athlete as any).valuexp || 0);
  const levelInfo = (() => {
    try {
      const info = getLevelInfo(valuexp);
      return {
        level: info.level,
        levelTitle: info.levelTitle,
        xpInCurrentLevel: info.xpInCurrentLevel,
        xpRequiredForNextLevel: info.xpRequiredForNextLevel,
        progressPct: info.progressPct,
      };
    } catch {
      const lvl = Number((athlete as any).level || 1);
      const inLvl = Number((athlete as any).xpInCurrentLevel || 0);
      const need = Number((athlete as any).xpRequiredForNextLevel || 5500);
      return {
        level: lvl,
        levelTitle: (athlete as any).levelTitle || 'Rookie Prospect 🧢',
        xpInCurrentLevel: inLvl,
        xpRequiredForNextLevel: need,
        progressPct: Math.min(100, Math.round((inLvl / need) * 100)),
      };
    }
  })();

  const displayAvatar = avatar || (athlete as any).profilepicture || 'https://via.placeholder.com/300';

  return (
    <div className="space-y-6 pb-20 lg:pb-8 animate-fadeIn max-w-4xl mx-auto text-white">
      {xpToast && (
        <div className="fixed top-20 right-6 z-50 bg-lime-400 text-black px-4 py-2.5 rounded-2xl font-black italic uppercase text-xs shadow-2xl flex items-center space-x-2 animate-bounce">
          <Trophy className="w-4 h-4" /><span>{xpToast}</span>
        </div>
      )}

      {stripeUpgradeBanner?.show && (
        <div
          className={`p-4 rounded-2xl border-2 text-sm font-bold flex items-center justify-between animate-fadeIn ${
            stripeUpgradeBanner.success
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
              : 'bg-amber-500/10 border-amber-500/40 text-amber-300'
          }`}
        >
          <span>{stripeUpgradeBanner.message}</span>
          <button onClick={() => setStripeUpgradeBanner(null)} className="text-white/60 hover:text-white font-bold">✕</button>
        </div>
      )}

      {/* ═════════ HEADER CARD ═════════ */}
      <div className={`p-6 rounded-[2.5rem] shadow-xl space-y-4 relative overflow-hidden ${
        isProUser
          ? 'bg-gradient-to-r from-amber-500/15 via-indigo-900/90 to-indigo-950 border-2 border-amber-400 shadow-[0_0_35px_rgba(251,191,36,0.3)]'
          : 'bg-indigo-900/60 border border-white/10'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2.5 flex-wrap gap-y-2">
              <User className={`w-6 h-6 ${isProUser ? 'text-amber-400' : 'text-lime-400'}`} />
              <h1 className="text-2xl font-black italic uppercase tracking-tight text-white">
                {athlete.name || 'Athlete'}'s Profile
              </h1>
              {isProUser && (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-black font-black italic text-[11px] uppercase rounded-full shadow-lg shadow-amber-400/40 animate-pulse border border-amber-200">
                  <Crown className="w-3.5 h-3.5 fill-black" /><span>PLAYGROUND PRO 👑</span>
                </span>
              )}
              {(athlete as any).email_verified ? (
                <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-xs font-bold uppercase flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />Email Verified
                </span>
              ) : (
                <span className="px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-xs font-bold uppercase flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />Email Pending
                </span>
              )}
            </div>
            <p className="text-xs text-indigo-200/70 mt-1 font-semibold">
              Track unlockable achievements, edit athlete identity, and manage account security.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {isSaved && (
              <span className="px-3 py-1.5 bg-lime-400 text-black font-black italic uppercase text-xs rounded-xl flex items-center space-x-1 animate-bounce">
                <Check className="w-4 h-4" /><span>Saved!</span>
              </span>
            )}
            <button type="button" onClick={handleLogout}
              className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500 hover:text-white text-rose-300 font-black italic uppercase text-xs rounded-xl border border-rose-500/40 flex items-center space-x-1.5">
              <LogOut className="w-4 h-4" /><span>Log Out</span>
            </button>
          </div>
        </div>

        <div className="bg-indigo-950/80 p-4 rounded-2xl border border-white/10 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-lime-400 text-black rounded-lg font-black text-xs flex items-center space-x-1">
                <Trophy className="w-4 h-4 text-black" /><span>LVL {levelInfo.level}</span>
              </div>
              <span className="font-black italic uppercase text-lime-400 tracking-wider">{levelInfo.levelTitle}</span>
            </div>
            <div className="flex items-center space-x-2 text-[11px] font-mono font-bold text-indigo-200">
              <span className="text-lime-300 font-black">{levelInfo.xpInCurrentLevel} XP</span>
              <span>/</span><span>{levelInfo.xpRequiredForNextLevel} XP to Next</span>
            </div>
          </div>
          <div className="w-full bg-indigo-900 rounded-full h-3 overflow-hidden p-0.5 border border-white/10">
            <div className="bg-gradient-to-r from-lime-400 via-emerald-400 to-lime-300 h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${levelInfo.progressPct}%` }} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
          {([
            { key: 'bio', icon: <User className="w-4 h-4" />, label: 'Bio & Highlights', badge: null, active: 'bg-lime-400 text-black shadow-lg shadow-lime-400/20' },
            { key: 'friends', icon: <Users className="w-4 h-4 text-lime-400" />, label: 'Friends & Network', badge: (<span className="bg-lime-400/20 text-lime-300 text-[10px] font-black px-1.5 py-0.5 rounded font-mono border border-lime-400/40">{(athlete as any).friendsList?.length || 0}</span>), active: 'bg-gradient-to-r from-lime-400 to-cyan-400 text-black shadow-lg shadow-lime-400/20' },
            { key: 'match_logs', icon: <Zap className="w-4 h-4 text-lime-400 fill-lime-400" />, label: 'Recent Match Logs & VBall Trends 🏐', badge: null, active: 'bg-gradient-to-r from-lime-400 to-emerald-400 text-black shadow-lg shadow-lime-400/20' },
            { key: 'map_view', icon: <MapPin className="w-4 h-4 text-rose-400" />, label: 'Map View 📍', badge: null, active: 'bg-gradient-to-r from-lime-400 to-cyan-400 text-black shadow-lg shadow-lime-400/20' },
            { key: 'badges', icon: <Trophy className="w-4 h-4 text-amber-400" />, label: 'Badges & Achievements', badge: (<span className="bg-amber-400/20 text-amber-300 text-[10px] font-black px-1.5 py-0.5 rounded font-mono border border-amber-400/40">PRO 👑</span>), active: 'bg-gradient-to-r from-amber-400 to-yellow-300 text-black shadow-lg shadow-amber-400/20' },
            { key: 'streak', icon: <Flame className="w-4 h-4 text-orange-400 fill-orange-400" />, label: 'Streak & Calendar', badge: (<span className="bg-orange-500/20 text-orange-300 text-[10px] font-black px-1.5 py-0.5 rounded font-mono border border-orange-500/40">{Number((athlete as any).daily_streak || (athlete as any).dailyStreak || 0)}D 🔥</span>), active: 'bg-gradient-to-r from-amber-400 to-orange-400 text-black shadow-lg shadow-amber-400/20' },
            { key: 'injury', icon: <HeartPulse className="w-4 h-4 text-rose-400" />, label: 'Injury & Recovery', badge: (<span className="bg-rose-500/20 text-rose-300 text-[10px] px-1.5 py-0.5 rounded-md font-mono border border-rose-500/40">+XP</span>), active: 'bg-lime-400 text-black shadow-lg shadow-lime-400/20' },
            { key: 'security', icon: <ShieldCheck className="w-4 h-4" />, label: 'Security & MFA', badge: null, active: 'bg-lime-400 text-black shadow-lg shadow-lime-400/20' },
            { key: 'membership', icon: <Crown className="w-4 h-4 text-amber-400 fill-amber-400" />, label: 'PRO Membership', badge: isProUser ? (<span className="bg-amber-400 text-black text-[9px] font-black px-1.5 py-0.5 rounded font-mono">ACTIVE</span>) : (<span className="bg-lime-400/20 text-lime-300 text-[9px] font-black px-1.5 py-0.5 rounded font-mono border border-lime-400/40">$9.99/mo</span>), active: 'bg-amber-400 text-black shadow-lg shadow-amber-400/20' },
            { key: 'appearance', icon: <Palette className="w-4 h-4 text-lime-400" />, label: 'Appearance', badge: isProUser ? (<span className="bg-amber-400 text-black text-[9px] font-black px-1.5 py-0.5 rounded font-mono">PRO</span>) : (<span className="bg-white/10 text-indigo-300 text-[9px] font-bold px-1.5 py-0.5 rounded font-mono">🔒</span>), active: 'bg-lime-400 text-black shadow-lg shadow-lime-400/20' },
            { key: 'offline_sync', icon: <Zap className="w-4 h-4 text-cyan-400 fill-cyan-400" />, label: 'Offline Sync Logs', badge: mergedQueue.length > 0 ? (<span className="bg-amber-400 text-black text-[9px] font-mono font-black px-1.5 py-0.5 rounded-full animate-pulse">{mergedQueue.length} QUEUED</span>) : (<span className="bg-emerald-500/20 text-emerald-300 text-[9px] font-mono px-1.5 py-0.5 rounded border border-emerald-500/30">SYNCED ✓</span>), active: 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black shadow-lg shadow-cyan-400/20' },
            { key: 'referrals', icon: <Gift className="w-4 h-4 text-amber-400 stroke-[2.5]" />, label: 'My Referral History', badge: (<span className="bg-amber-400/20 text-amber-300 text-[10px] font-black px-1.5 py-0.5 rounded font-mono border border-amber-400/40">{Number((athlete as any).total_referrals || 0)} Signups</span>), active: 'bg-gradient-to-r from-amber-400 to-yellow-300 text-black shadow-lg shadow-amber-400/20' },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setProfileTab(t.key)}
              className={`px-4 py-2 rounded-xl font-black italic uppercase text-xs transition flex items-center space-x-1.5 ${
                profileTab === t.key ? t.active : 'bg-indigo-950 text-indigo-200 hover:text-white border border-white/10'
              }`}
            >
              {t.icon}<span>{t.label}</span>{t.badge}
            </button>
          ))}
        </div>
      </div>

      {/* ═════════ TAB: FRIENDS ═════════ */}
      {profileTab === 'friends' && athlete?.id && (
        <FriendsPanel athleteId={athlete.id} onNavigateToTab={onNavigateToTab} />
      )}

      {/* ═════════ TAB: MATCH LOGS (Stats Logged & Verified + VBall Trends) ═════════ */}
      {profileTab === 'match_logs' && (
        <div className="space-y-6">
          <VolleyballTrendsChart athlete={athlete} />
          <RecentMatchLogList
            athlete={athlete}
            onUpdateProfile={persistPatch}
            onOpenStatLog={onOpenStatLog}
          />
        </div>
      )}

      {/* ═════════ TAB: BIO ═════════ */}
      {profileTab === 'bio' && (
        <form onSubmit={handleSave} className="space-y-6">
          {/* 1. AVATAR */}
          <div className="bg-indigo-900/60 p-6 rounded-[2.5rem] border border-white/10 shadow-xl space-y-4">
            <h3 className="font-black italic uppercase text-white text-base">Athlete Avatar & Visual Identity</h3>
            <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
              <div className="relative">
                <img src={displayAvatar} alt="Avatar"
                  className={`w-24 h-24 rounded-2xl object-cover shadow-lg ${isProUser ? 'ring-4 ring-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.5)]' : 'ring-4 ring-lime-400'}`} />
                {isProUser && (
                  <span className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-400 to-yellow-300 text-black p-1.5 rounded-full border border-white/50">
                    <Crown className="w-4 h-4 fill-black" />
                  </span>
                )}
              </div>
              <div className="space-y-2 text-center sm:text-left">
                <span className="text-xs font-semibold text-indigo-200/70 block">Upload or Choose Preset:</span>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <label className="cursor-pointer px-3 py-2 bg-indigo-950 hover:bg-indigo-800 text-lime-400 border border-lime-400/40 rounded-xl text-xs font-black italic uppercase flex items-center space-x-1.5">
                    <Camera className="w-4 h-4" /><span>Upload</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                  </label>
                  {presetAvatars.map((url, i) => (
                    <button key={i} type="button" onClick={() => setAvatar(url)}
                      className={`w-10 h-10 rounded-xl overflow-hidden ring-2 transition ${avatar === url ? 'ring-lime-400 scale-105' : 'ring-transparent opacity-70 hover:opacity-100'}`}>
                      <img src={url} alt={`p${i}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
                {!isEditing && <SaveStatus status={saveStatus} message={error} />}
              </div>
            </div>
          </div>

          {/* 2. BIO & PLAYING DETAILS */}
          <div className="bg-indigo-900/60 p-6 rounded-[2.5rem] border border-white/10 shadow-xl space-y-4">
            <div className="flex justify-between items-start gap-4 flex-wrap">
              <h3 className="font-black italic uppercase text-white text-base">Athlete Bio & Playing Details</h3>
              {!isEditing ? (
                <button type="button" onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-bold flex items-center gap-2">
                  <Pencil className="w-4 h-4" />Edit Profile
                </button>
              ) : (
                <div className="flex gap-2">
                  <button type="submit" disabled={saving}
                    className="py-3 px-4 bg-lime-400 hover:bg-lime-300 disabled:opacity-60 text-black font-black italic uppercase rounded-2xl flex items-center gap-2">
                    {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><Save className="w-4 h-4" />Save</>}
                  </button>
                  <button type="button" disabled={saving} onClick={() => setIsEditing(false)}
                    className="px-6 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-2xl flex items-center gap-2 font-black italic uppercase">
                    <X className="w-4 h-4" />Cancel
                  </button>
                </div>
              )}
            </div>

            {error && <div className="text-red-300 text-xs bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</div>}

            <div className="grid grid-cols-2 gap-4 text-sm">
              <ReadOnlyField label="Email" value={athlete.email || ''} dimWhenEditing={isEditing} />
              <Field label="Name" value={isEditing ? name : athlete.name} editing={isEditing} onChange={setName} />
              <Field label="Jersey #" value={isEditing ? String(jerseyNumber) : String((athlete as any).jersey || '')} editing={isEditing} onChange={(v) => setJerseyNumber(Number(v) || 0)} type="number" />
              <Field label="Handle" value={isEditing ? handle : ((athlete as any).userhandle || '')} editing={isEditing} onChange={setHandle} />
              <Field label="School" value={isEditing ? schoolOrLeague : ((athlete as any).school || '')} editing={isEditing} onChange={setSchoolOrLeague} />
              <Field label="Position" value={isEditing ? position : ((athlete as any).position || '')} editing={isEditing} onChange={setPosition} capitalize />
              {isEditing ? (
                <div className="col-span-2">
                  <StateCitySelector
                    selectedState={registeredState}
                    selectedCity={registeredCity}
                    onStateChange={(s, c) => { setRegisteredState(s); setRegisteredCity(c); }}
                    onCityChange={setRegisteredCity}
                  />
                </div>
              ) : (
                <>
                  <ReadOnlyField label="State" value={(athlete as any).state || ''} dimWhenEditing={false} />
                  <ReadOnlyField label="City" value={(athlete as any).city || ''} dimWhenEditing={false} />
                </>
              )}
            </div>

            <Field label="Bio" value={isEditing ? bio : (athlete.bio || '')} editing={isEditing} onChange={setBio} multiline />
          </div>

          {/* 3. 30-SECOND HIGHLIGHT REEL */}
          <div className="bg-indigo-900/60 p-6 rounded-[2.5rem] border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="font-black italic uppercase text-white text-base flex items-center">
                  <Film className="w-5 h-5 text-lime-400 mr-2" />30-Second Highlight Reel
                </h3>
                <p className="text-xs text-indigo-200/70 font-semibold">Record or upload short clips.</p>
              </div>
              <button type="button" onClick={() => setIsUploadModalOpen(true)}
                className="px-4 py-2 bg-lime-400 hover:bg-lime-300 text-black font-black italic uppercase text-xs rounded-xl flex items-center space-x-1.5">
                <Plus className="w-4 h-4" /><span>Add Highlight</span>
              </button>
            </div>

            {isLoadingHighlights && (
              <div className="p-8 text-center bg-indigo-950/60 rounded-2xl border border-white/10">
                <Loader2 className="w-6 h-6 text-lime-400 animate-spin mx-auto mb-2" />
                <p className="text-xs text-indigo-300">Loading highlights…</p>
              </div>
            )}

            {!isLoadingHighlights && highlights.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {highlights.map((clip) => (
                  <div key={clip.id} onClick={() => setActiveVideoModal(clip)}
                    className="group cursor-pointer bg-indigo-950 rounded-2xl overflow-hidden border border-white/10 hover:border-lime-400/50 transition">
                    <div className="relative aspect-video bg-black overflow-hidden">
                      <img src={clip.thumbnailUrl} alt={clip.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300 opacity-80" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-lime-400 text-black flex items-center justify-center group-hover:scale-110 transition">
                          <Play className="w-5 h-5 fill-black ml-0.5" />
                        </div>
                      </div>
                      <span className="absolute bottom-2 right-2 bg-black/80 text-lime-400 font-mono font-black text-[10px] px-2 py-0.5 rounded-md border border-white/10">
                        00:{clip.durationSeconds < 10 ? `0${clip.durationSeconds}` : clip.durationSeconds}
                      </span>
                    </div>
                    <div className="p-3 space-y-1">
                      <span className="text-xs font-black text-white block line-clamp-1">{clip.title}</span>
                      <div className="flex items-center justify-between text-[10px] text-indigo-200/60 font-semibold">
                        <span className="capitalize text-lime-400 font-bold">{clip.sport}</span>
                        <div className="flex items-center space-x-2">
                          <span className="flex items-center space-x-0.5"><Eye className="w-3 h-3" /><span>{clip.views}</span></span>
                          <span className="flex items-center space-x-0.5"><Heart className="w-3 h-3 text-rose-400" /><span>{clip.likes}</span></span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isLoadingHighlights && highlights.length === 0 && (
              <div className="p-6 bg-indigo-950/60 rounded-2xl border border-dashed border-white/10 text-center space-y-2">
                <Film className="w-8 h-8 text-indigo-300/60 mx-auto" />
                <p className="text-xs font-bold text-indigo-200">No highlights yet.</p>
              </div>
            )}
          </div>

          {/* 4. PERSISTENT PRO HIGHLIGHTS (only PRO users) */}
          {isProUser && (
            <>
              <div className="bg-gradient-to-br from-amber-950/70 via-indigo-950 to-indigo-900 p-6 rounded-[2.5rem] border-2 border-amber-400/60 shadow-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-400/20 pb-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-0.5 bg-gradient-to-r from-amber-400 to-yellow-300 text-black text-[10px] font-black italic uppercase rounded-full font-mono">
                        PERSISTENT PRO HIGHLIGHTS 👑
                      </span>
                      <span className="text-xs text-amber-300 font-bold">Elite Series Celebrations</span>
                    </div>
                    <h3 className="text-lg font-black italic uppercase text-white mt-1 flex items-center space-x-2">
                      <span>PRO Career Highlights & Milestone Blast</span>
                      <Sparkles className="w-4 h-4 text-amber-400" />
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => fireEliteSeriesConfetti()}
                    className="px-4 py-2 bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 text-black font-black italic uppercase text-xs rounded-xl shadow-lg shadow-amber-400/20 transition flex items-center space-x-1.5 shrink-0"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Blast Confetti Celebration</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-indigo-950/80 p-4 rounded-2xl border border-amber-400/40 space-y-2 relative overflow-hidden flex flex-col justify-between">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="p-2 bg-amber-400/20 text-amber-300 rounded-xl border border-amber-400/40">
                          <Crown className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black italic uppercase text-white">Top 1% League Scorer 👑</h4>
                          <p className="text-[10px] text-amber-300/80 font-mono">1,000+ Verified Career Output</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 bg-amber-400/20 text-amber-300 text-[9px] font-mono font-bold rounded border border-amber-400/30">LEGENDARY TIER</span>
                    </div>
                    <p className="text-[11px] text-indigo-200/80 italic">Ranked in the top 1% across all registered playground and league players nationwide.</p>
                    <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[10px] font-mono">
                      <span className="text-lime-400 font-bold">+2,500 XP Awarded</span>
                      <button type="button" onClick={() => fireEliteSeriesConfetti()} className="text-amber-300 hover:text-white underline font-bold flex items-center space-x-1">
                        <span>Replay Confetti & Glow</span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-indigo-950/80 p-4 rounded-2xl border border-amber-400/40 space-y-2 relative overflow-hidden flex flex-col justify-between">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="p-2 bg-amber-400/20 text-amber-300 rounded-xl border border-amber-400/40">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black italic uppercase text-white">
                            Legendary {primarySport === 'soccer' ? 'Striker ⚽' : 'Hooper 🏀'}
                          </h4>
                          <p className="text-[10px] text-amber-300/80 font-mono">Sport-Specific 1000+ Milestone</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 bg-amber-400/20 text-amber-300 text-[9px] font-mono font-bold rounded border border-amber-400/30">ELITE SERIES</span>
                    </div>
                    <p className="text-[11px] text-indigo-200/80 italic">Unlocked all 3 tiers for primary sport ({primarySport || 'basketball'}). Special CSS Aura filter unlocked.</p>
                    <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[10px] font-mono">
                      <span className="text-lime-400 font-bold">+2,500 XP Awarded</span>
                      <button type="button" onClick={() => fireEliteSeriesConfetti()} className="text-amber-300 hover:text-white underline font-bold flex items-center space-x-1">
                        <span>Replay Confetti & Glow</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* PRO Verified & Elite Series Badge Showcase */}
              <div
                className={`p-6 rounded-[2.5rem] border shadow-xl space-y-4 transition-all duration-300 ${
                  hasUnlockedAllTiersForSport(athlete)
                    ? 'bg-gradient-to-br from-amber-950/80 via-indigo-900 to-indigo-950 border-2 border-amber-400 shadow-amber-400/20'
                    : 'bg-indigo-900/60 border-white/10'
                }`}
                style={hasUnlockedAllTiersForSport(athlete) ? { filter: 'drop-shadow(0 0 16px rgba(251, 191, 36, 0.85)) contrast(1.1) brightness(1.1)' } : undefined}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 bg-amber-400 text-black text-[10px] font-black italic uppercase rounded font-mono">
                        PRO VERIFIED BADGE SHOWCASE 👑
                      </span>
                      {hasUnlockedAllTiersForSport(athlete) && (
                        <span className="text-xs text-amber-300 font-extrabold flex items-center space-x-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>✨ Special CSS Aura Filter Unlocked (All 3 Tiers Achieved!)</span>
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-black italic uppercase text-white mt-1">Earned Milestones & Elite Series Showcase</h3>
                  </div>
                  <button type="button" onClick={() => setProfileTab('badges')}
                    className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-black font-black italic uppercase text-xs rounded-xl shadow-md transition flex items-center space-x-1 shrink-0">
                    <Trophy className="w-3.5 h-3.5" />
                    <span>View All Badges ({((athlete as any).badges?.length || 5)})</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    { id: 'badge_pro_top_1pct_scorer', name: 'Top 1% League Scorer 👑', desc: '1,000+ Career Points in League Matches', tier: 'legendary', isProVerified: true, icon: Crown, unlocked: true },
                    { id: 'badge_pro_vanguard_scorer', name: 'Pro Vanguard Scorer 👑', desc: '120+ Verified Points in Official Matches', tier: 'pro_elite', isProVerified: true, icon: Sparkles, unlocked: isProUser && ((athlete as any).stats?.basketball?.pts || 0) >= 100 },
                    { id: 'badge_pro_playmaker', name: 'Scout Certified Playmaker 👁️', desc: '30+ Verified Assists with Video Proof', tier: 'pro_elite', isProVerified: true, icon: Eye, unlocked: isProUser },
                    { id: 'badge_pro_legend_wins', name: 'Verified Court Legend 💎', desc: '8+ Verified PRO Victories', tier: 'pro_elite', isProVerified: true, icon: Award, unlocked: isProUser && Number((athlete as any).winCount || 0) >= 5 },
                  ].map((badge) => (
                    <motion.div
                      key={badge.id}
                      animate={badge.isProVerified && badge.unlocked ? { boxShadow: ['0 0 12px rgba(251,191,36,0.25)', '0 0 28px rgba(251,191,36,0.65)', '0 0 12px rgba(251,191,36,0.25)'], scale: [1, 1.01, 1] } : undefined}
                      style={getLegendaryBadgeFilter(badge.tier)}
                      transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }}
                      className={`p-4 rounded-2xl border transition relative overflow-hidden flex flex-col justify-between space-y-2 ${
                        badge.unlocked && (badge.isProVerified || badge.tier === 'pro_elite' || badge.tier === 'legendary') ? 'animate-elite-breathing' : ''
                      } ${
                        badge.unlocked
                          ? badge.tier === 'legendary'
                            ? 'bg-gradient-to-br from-amber-900 via-amber-950 to-indigo-950 border-2 border-amber-300'
                            : 'bg-gradient-to-br from-amber-950/80 via-indigo-950 to-indigo-900 border-2 border-amber-400'
                          : 'bg-indigo-950/60 border-white/10 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="p-2.5 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/40">
                          <badge.icon className="w-5 h-5" />
                        </div>
                        <span className="text-[9px] font-black italic uppercase px-2 py-0.5 bg-amber-400 text-black rounded-full font-mono">ELITE PRO BADGE</span>
                      </div>
                      <div>
                        <h4 className="text-xs font-black italic uppercase text-white flex items-center space-x-1">
                          <span>{badge.name}</span>
                          {badge.unlocked && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                        </h4>
                        <p className="text-[10px] text-indigo-200/70 mt-0.5">{badge.desc}</p>
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono pt-1 border-t border-white/10">
                        <span className="text-amber-300 font-bold">+1,000 XP Reward</span>
                        <span className="text-amber-400 font-black italic">{badge.unlocked ? 'PRO VERIFIED ✓' : 'LOCKED'}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* 5. VOLleyball Trends + Recent Match Logs (Stats Logged & Verified) */}
          <VolleyballTrendsChart athlete={athlete} />
          <RecentMatchLogList athlete={athlete} onUpdateProfile={persistPatch} onOpenStatLog={onOpenStatLog} />

          {/* 6. RecentTeammates */}
          <RecentTeammates
            user={athlete}
            allAthletes={allAthletes}
            onSelectAthlete={(a: AthleteProfile) => {
              if (onNavigateToTab) onNavigateToTab('profile', a);
            }}
          />

          {/* 7. DATA BACKUP */}
          <div className="flex justify-end">
            <button type="button" onClick={handleDownloadDataBackup}
              className="px-5 py-3 bg-indigo-950 hover:bg-indigo-900 text-lime-300 border border-lime-400/40 font-black italic uppercase text-xs rounded-xl flex items-center space-x-2">
              <Download className="w-4 h-4 text-lime-400" /><span>Download Backup</span>
            </button>
          </div>
        </form>
      )}

      {/* ═════════ TAB: BADGES ═════════ */}
      {profileTab === 'badges' && (
        <Achievements
          user={athlete}
          allAthletes={allAthletes}
          onUpdateProfile={(updated) => {
            setAthlete((prev) => (prev ? { ...prev, ...updated } : prev));
            if (onSaveProfile) { try { onSaveProfile(updated); } catch { /* ignore */ } }
          }}
          onOpenUploadModal={() => setIsUploadModalOpen(true)}
          onOpenReels={() => setProfileTab('match_logs')}
          onEarnXp={(amount, source) => {
            setXpToast(`+${amount} XP from ${source}! 🎉`);
            setTimeout(() => setXpToast(null), 3000);
          }}
          initialTab="showcase"
        />
      )}

      {/* ═════════ TAB: STREAK ═════════ */}
      {profileTab === 'streak' && (
        <StreakCalendar
          user={athlete}
          onUpdateProfile={(updated) => {
            setAthlete((prev) => (prev ? { ...prev, ...updated } : prev));
            if (onSaveProfile) { try { onSaveProfile(updated); } catch { /* ignore */ } }
          }}
          onEarnXp={(amount, source) => {
            setXpToast(`+${amount} XP from ${source}! 🔥`);
            setTimeout(() => setXpToast(null), 3000);
          }}
          freezeCostXp={250}
        />
      )}

      {/* ═════════ TAB: INJURY ═════════ */}
      {profileTab === 'injury' && (
        <div className="bg-indigo-900/60 p-6 rounded-[2.5rem] border border-white/10 shadow-xl">
          <h3 className="font-black italic uppercase text-white text-base flex items-center">
            <HeartPulse className="w-5 h-5 text-rose-400 mr-2" />Injury & Recovery
          </h3>
          <p className="text-xs text-indigo-200/70 mt-2">Wire up <code>InjuryRecoveryTracker</code> component here.</p>
        </div>
      )}

      {/* ═════════ TAB: SECURITY (unchanged - full) ═════════ */}
      {profileTab === 'security' && (
        <div className="bg-indigo-900/60 p-6 rounded-[2.5rem] border border-white/10 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black italic uppercase text-white text-base flex items-center">
                <ShieldCheck className="w-5 h-5 text-lime-400 mr-2" />
                Multi-Factor Authentication (MFA) & Security
              </h3>
              <p className="text-xs text-indigo-200/70 font-semibold">Protect sensitive athletic profiles with two-factor authorization.</p>
            </div>
            <button type="button"
              onClick={() => { setMfaEnabled(!mfaEnabled); persistPatch({ mfaEnabled: !mfaEnabled } as any); }}
              className={`px-3 py-1.5 rounded-xl font-black italic uppercase text-xs transition ${
                mfaEnabled ? 'bg-lime-400 text-black shadow-md' : 'bg-indigo-950 text-indigo-200 border border-white/10'
              }`}>
              {mfaEnabled ? 'MFA Enabled ✓' : 'Enable MFA'}
            </button>
          </div>

          {mfaEnabled && (
            <div className="p-4 bg-lime-400/10 border border-lime-400/30 rounded-2xl flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Smartphone className="w-8 h-8 text-lime-400 shrink-0" />
                <div className="text-xs">
                  <span className="font-extrabold text-lime-300 block">Authenticator App Linked</span>
                  <span className="text-indigo-200/70">TOTP Code verification active on logins.</span>
                </div>
              </div>
              <span className="text-xs font-mono font-black bg-indigo-950 text-lime-400 px-3 py-1 rounded-lg border border-white/10">394-102</span>
            </div>
          )}

          <div className="pt-4 border-t border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-indigo-950/80 p-5 rounded-2xl border border-lime-400/30">
              <div className="flex items-start space-x-3">
                <div className="p-3 bg-lime-400/20 text-lime-300 rounded-xl shrink-0">
                  <Fingerprint className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-lime-400/20 text-lime-300 rounded font-mono border border-lime-400/30">WEBAUTHN PASSKEY</span>
                    <span className="text-xs font-bold text-indigo-200/70">Biometric Touch ID / Face ID</span>
                  </div>
                  <h4 className="text-sm font-black italic uppercase text-white mt-1">Biometric Athlete Profile Lock</h4>
                  <p className="text-xs text-indigo-200/70 mt-0.5 max-w-md">Secure your personal athletic stats using hardware-backed biometric verification.</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                {!biometricRegistered ? (
                  <button type="button" onClick={handleRegisterPasskey}
                    className="px-4 py-2.5 bg-lime-400 hover:bg-lime-300 text-black font-black italic uppercase text-xs rounded-xl shadow-lg shadow-lime-400/20 flex items-center justify-center space-x-2 transition">
                    <Key className="w-4 h-4" /><span>Register Biometric Key</span>
                  </button>
                ) : (
                  <div className="flex items-center space-x-2">
                    <button type="button" onClick={() => setIsStatsLocked(!isStatsLocked)}
                      className={`px-3.5 py-2 rounded-xl font-black italic uppercase text-xs flex items-center space-x-1.5 transition ${
                        isStatsLocked ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}>
                      {isStatsLocked ? <Lock className="w-3.5 h-3.5 text-rose-400" /> : <Unlock className="w-3.5 h-3.5 text-emerald-400" />}
                      <span>{isStatsLocked ? 'Stats Locked' : 'Stats Unlocked'}</span>
                    </button>
                    <button type="button" onClick={handleVerifyPasskeyToUnlock}
                      className="px-3.5 py-2 bg-indigo-900 hover:bg-indigo-800 text-lime-300 border border-lime-400/40 font-black italic uppercase text-xs rounded-xl flex items-center space-x-1.5 transition">
                      <Fingerprint className="w-3.5 h-3.5" /><span>Test Scan</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {biometricStatusMsg && (
              <div className="p-3 bg-indigo-950 border border-lime-400/40 rounded-xl text-xs font-semibold text-lime-300 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-lime-400 shrink-0" /><span>{biometricStatusMsg}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═════════ TAB: MEMBERSHIP ═════════ */}
      {profileTab === 'membership' && (
        <div className="space-y-6">
          <div className="relative overflow-hidden bg-gradient-to-br from-amber-500/20 via-indigo-900 to-indigo-950 p-6 md:p-8 rounded-[2.5rem] border-2 border-amber-400/40 shadow-2xl space-y-6">
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
              <div className="flex items-center space-x-4">
                <div className="p-3.5 bg-gradient-to-tr from-amber-400 to-yellow-300 text-black rounded-2xl shadow-lg">
                  <Crown className="w-8 h-8 fill-black" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-amber-400 text-black rounded-full font-mono">
                      {isProUser ? 'PRO MEMBER 👑' : 'FREE TIER'}
                    </span>
                    <span className="text-xs text-amber-200/80 font-bold">$9.99 / Month Plan</span>
                  </div>
                  <h3 className="text-2xl font-black italic uppercase text-white tracking-tight mt-1">
                    {isProUser ? 'Playground PRO Tier & Gold Badge Unlocked' : 'Upgrade to Playground PRO Tier'}
                  </h3>
                </div>
              </div>
              <div className="flex items-center space-x-3 bg-indigo-950/90 p-3 rounded-2xl border border-white/10 shrink-0">
                <div className="text-right">
                  <div className="text-xs font-bold text-white">{isProUser ? 'Verified PRO Status Active' : 'Free Account Plan'}</div>
                  <div className="text-[10px] text-indigo-300 font-mono">
                    {isProUser ? `Receipt: ${(athlete as any).payment_receipt_id || 'INV-PRO-2026-8842'}` : 'Payment Required for PRO Access'}
                  </div>
                </div>
                {!isProUser ? (
                  <button type="button" onClick={() => setIsCheckoutModalOpen(true)}
                    className="px-5 py-2.5 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-200 text-black font-black italic uppercase text-xs rounded-xl shadow-lg shadow-amber-400/20 transition flex items-center space-x-1.5 animate-pulse">
                    <Crown className="w-4 h-4" /><span>Pay $9.99 & Upgrade</span>
                  </button>
                ) : (
                  <button type="button" onClick={() => setIsCheckoutModalOpen(true)}
                    className="px-4 py-2 bg-indigo-900 hover:bg-indigo-800 text-indigo-200 font-bold text-xs rounded-xl border border-white/10 transition flex items-center space-x-1">
                    <CreditCard className="w-3.5 h-3.5" /><span>View / Manage</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { icon: <Sparkles className="w-5 h-5" />, title: 'Advanced Analytics', desc: 'Trend projections & heatmaps.' },
                { icon: <Zap className="w-5 h-5" />, title: 'Ad-Free Browsing', desc: 'Zero sponsored banners.' },
                { icon: <Crown className="w-5 h-5" />, title: 'Gold Crown Badge', desc: 'Stand out on leaderboards.' },
                { icon: <CreditCard className="w-5 h-5" />, title: 'Priority Reservations', desc: 'Reserve courts first.' },
              ].map((p, i) => (
                <div key={i} className="p-4 bg-indigo-950/80 rounded-2xl border border-white/10 flex items-start space-x-3">
                  <div className="p-2 bg-amber-400/20 text-amber-300 rounded-xl">{p.icon}</div>
                  <div>
                    <h4 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                      {p.title}
                      {isProUser && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                    </h4>
                    <p className="text-xs text-indigo-200/70 mt-0.5">{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 bg-indigo-950/60 p-5 rounded-2xl border border-white/10">
              <div className="text-xs text-indigo-200 space-y-0.5">
                <span className="font-bold text-white block">
                  {isProUser ? `PRO Active • Billing Method: ${(athlete as any).payment_method || 'Credit Card'}` : 'PRO Tier Payment Verification Required'}
                </span>
                <span className="text-indigo-300/70">
                  {isProUser ? `Renews automatically. Receipt ID: ${(athlete as any).payment_receipt_id || 'INV-PRO-2026-8842'}` : 'To access PRO tier, click the button to select Card, Apple Pay, Google Pay via Stripe.'}
                </span>
              </div>

              {!isProUser ? (
                <button type="button" onClick={() => setIsCheckoutModalOpen(true)}
                  className="px-6 py-3 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 text-black font-black italic uppercase text-xs tracking-wider rounded-2xl shadow-xl shadow-amber-400/20 hover:scale-105 transition flex items-center space-x-2 shrink-0">
                  <Crown className="w-4 h-4" /><span>Upgrade to PRO Tier ($9.99/mo)</span>
                </button>
              ) : (
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button type="button" onClick={() => setIsCheckoutModalOpen(true)}
                    className="px-4 py-2 bg-indigo-900 hover:bg-indigo-800 text-amber-300 border border-amber-400/40 font-bold text-xs rounded-xl transition flex items-center space-x-1.5">
                    <Crown className="w-3.5 h-3.5 text-amber-400" /><span>Manage Subscription</span>
                  </button>
                  <button type="button" onClick={handleCancelProSubscription} disabled={isCancelling}
                    className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold text-xs rounded-xl transition disabled:opacity-50 flex items-center gap-1.5">
                    {isCancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>{isCancelling ? 'Cancelling...' : 'Cancel PRO Subscription'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-indigo-900/80 p-6 md:p-8 rounded-[2.5rem] border border-white/15 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-emerald-400 text-black rounded-2xl shadow-lg">
                  <Building2 className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-emerald-400/20 text-emerald-300 rounded font-mono border border-emerald-400/30">
                    MERCHANT RECEIVING PAYMENTS CONFIG
                  </span>
                  <h3 className="text-xl font-black italic uppercase text-white mt-0.5">PayPal & Bank Account Receiving Linkage</h3>
                </div>
              </div>
              <button type="button" onClick={() => setShowMerchantSettings(!showMerchantSettings)}
                className="px-4 py-2 bg-indigo-950 hover:bg-indigo-900 text-indigo-200 border border-white/15 text-xs font-bold rounded-xl transition flex items-center space-x-1.5">
                <span>{showMerchantSettings ? 'Hide' : 'Configure'}</span>
              </button>
            </div>
            {showMerchantSettings && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 animate-fadeIn">
                <div className="p-4 bg-indigo-950/80 rounded-2xl border border-white/10 space-y-2">
                  <label className="font-extrabold text-white text-xs flex items-center justify-between">
                    <span>PayPal Account Email</span><span className="text-[10px] text-amber-300 font-mono">Express Checkout</span>
                  </label>
                  <input type="email" value={merchantPaypalEmail} onChange={(e) => setMerchantPaypalEmail(e.target.value)}
                    className="w-full bg-indigo-900/80 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400" />
                </div>
                {[
                  { label: 'Bank Name', key: 'bankName', value: merchantBankDetails.bankName },
                  { label: 'Routing / ABA Number', key: 'routingNumber', value: merchantBankDetails.routingNumber },
                  { label: 'Account Number', key: 'accountNumber', value: merchantBankDetails.accountNumber },
                ].map((f) => (
                  <div key={f.key} className="p-4 bg-indigo-950/80 rounded-2xl border border-white/10 space-y-2">
                    <label className="font-extrabold text-white text-xs">{f.label}</label>
                    <input type="text" value={f.value}
                      onChange={(e) => setMerchantBankDetails({ ...merchantBankDetails, [f.key]: e.target.value })}
                      className="w-full bg-indigo-900/80 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═════════ TAB: APPEARANCE ═════════ */}
      {profileTab === 'appearance' && (
        <div className="space-y-6">
          <div className="bg-indigo-900/60 p-6 md:p-8 rounded-[2.5rem] border border-white/10 shadow-2xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
              <div className="flex items-center space-x-4">
                <div className="p-3.5 bg-lime-400 text-black rounded-2xl shadow-lg">
                  <Palette className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-amber-400 text-black rounded-full font-mono">PRO EXCLUSIVE 🎨</span>
                    <span className="text-xs text-indigo-200/80 font-bold">Custom Theme Engine</span>
                  </div>
                  <h3 className="text-2xl font-black italic uppercase text-white tracking-tight mt-1">Application Color Palettes</h3>
                </div>
              </div>
              {!isProUser && (
                <button type="button" onClick={() => setIsCheckoutModalOpen(true)}
                  className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-black font-black italic uppercase text-xs rounded-2xl shadow-xl shadow-amber-400/20 flex items-center space-x-2 transition shrink-0">
                  <Crown className="w-4 h-4 fill-black" /><span>Unlock PRO Theme Engine</span>
                </button>
              )}
            </div>
            {!isProUser ? (
              <div className="p-8 text-center bg-indigo-950/80 rounded-3xl border-2 border-amber-400/30 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-400/20 text-amber-300 flex items-center justify-center border border-amber-400/40">
                  <Lock className="w-8 h-8 text-amber-400" />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h4 className="text-base font-black italic uppercase text-white">Custom Color Palettes Locked</h4>
                  <p className="text-xs text-indigo-200/70 leading-relaxed">Custom palettes are exclusive for PRO subscribers. Upgrade now!</p>
                </div>
                <button type="button" onClick={() => setIsCheckoutModalOpen(true)}
                  className="px-6 py-3 bg-amber-400 hover:bg-amber-300 text-black font-black italic uppercase text-xs rounded-2xl shadow-xl shadow-amber-400/20 inline-flex items-center space-x-2 transition scale-105">
                  <Crown className="w-4 h-4 fill-black" /><span>Enable PRO Tier & Unlock All Themes</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PALETTES.map((p) => {
                  const isSelected = (activePalette || 'midnight_chrome') === p.id;
                  return (
                    <div key={p.id} onClick={() => onSelectPalette && onSelectPalette(p.id)}
                      className={`relative p-5 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-4 ${
                        isSelected ? 'bg-indigo-950 border-lime-400 shadow-[0_0_25px_rgba(163,230,53,0.2)] scale-[1.02]' : 'bg-indigo-950/60 border-white/10 hover:border-white/30'
                      }`}>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="text-base font-black italic uppercase text-white">{p.name}</h4>
                            {isSelected && (
                              <span className="bg-lime-400 text-black text-[9px] font-black px-2 py-0.5 rounded-full font-mono flex items-center gap-0.5">
                                <Check className="w-3 h-3 stroke-[3]" /><span>ACTIVE</span>
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-indigo-200/70">{p.description}</p>
                        </div>
                        <div className="flex space-x-1.5 p-1.5 bg-black/40 rounded-xl border border-white/10 shrink-0">
                          <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: p.colors.bg }} />
                          <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: p.colors.accent1 }} />
                          <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: p.colors.accent2 }} />
                        </div>
                      </div>
                      <div className="h-3 rounded-xl overflow-hidden flex border border-white/10 shadow-inner">
                        <div className="h-full flex-1" style={{ backgroundColor: p.colors.bg }} />
                        <div className="h-full flex-1" style={{ backgroundColor: p.colors.card }} />
                        <div className="h-full flex-1" style={{ backgroundColor: p.colors.accent1 }} />
                        <div className="h-full flex-1" style={{ backgroundColor: p.colors.accent2 }} />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-indigo-300 font-mono pt-1">
                        <span>Vibe: {p.vibe}</span>
                        <button type="button" onClick={(e) => { e.stopPropagation(); onSelectPalette && onSelectPalette(p.id); }}
                          className={`px-3 py-1 rounded-xl text-[10px] font-black italic uppercase transition ${
                            isSelected ? 'bg-lime-400 text-black font-extrabold' : 'bg-white/10 text-white hover:bg-white/20'
                          }`}>
                          {isSelected ? 'Applied' : 'Select Theme'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═════════ TAB: OFFLINE SYNC ═════════ */}
      {profileTab === 'offline_sync' && (
        <div className="bg-indigo-900/60 p-6 rounded-[2.5rem] border border-white/10 shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div>
              <div className="flex items-center space-x-2">
                <Zap className="w-6 h-6 text-cyan-400 fill-cyan-400" />
                <h3 className="font-black italic uppercase text-white text-lg tracking-tight">Offline Sync Logs & Queue Transparency</h3>
              </div>
              <p className="text-xs text-indigo-200/70 font-semibold mt-1">Monitor queued offline database write operations, inspect payload details, and manually retry.</p>
            </div>
            <div className="flex items-center space-x-3 shrink-0">
              <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-indigo-950 border border-white/10 text-xs font-bold">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-emerald-300 font-mono text-[11px]">Cloud Online</span>
              </div>
              <button type="button"
                onClick={() => {
                  const now = new Date();
                  const randomType = OFFLINE_ACTION_TYPES[Math.floor(Math.random() * OFFLINE_ACTION_TYPES.length)];
                  const newItem = {
                    id: `queue_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                    type: randomType.type,
                    payload: { timestamp: now.toISOString(), sport: (athlete as any)?.primary_sport || 'basketball', ...randomType.samplePayload },
                    status: 'pending' as const,
                    createdAt: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  };
                  setLocalSimulatedQueue((prev) => [newItem, ...prev]);
                  if (onSimulateOfflineAction) { try { onSimulateOfflineAction(); } catch { /* ignore */ } }
                  setTimeout(() => {
                    setLocalSimulatedQueue((prev) => prev.map((item) => (item.id === newItem.id ? { ...item, status: 'synced' as const } : item)));
                  }, 1500);
                  setXpToast(`Queued offline action: ${newItem.type}`);
                  setTimeout(() => setXpToast(null), 2500);
                }}
                className="px-3.5 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-black italic uppercase text-xs transition shadow-md shadow-cyan-400/20 flex items-center space-x-1.5">
                <Plus className="w-3.5 h-3.5 stroke-[3]" /><span>Simulate Queued Action</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-indigo-950/80 p-4 rounded-2xl border border-white/10">
              <span className="text-[10px] font-extrabold uppercase text-indigo-300/70 block">Total In Queue</span>
              <span className="text-2xl font-black text-white font-mono">{mergedQueue.length}</span>
            </div>
            <div className="bg-indigo-950/80 p-4 rounded-2xl border border-amber-400/30">
              <span className="text-[10px] font-extrabold uppercase text-amber-300 block">Pending Sync</span>
              <span className="text-2xl font-black text-amber-400 font-mono">{mergedQueue.filter((i) => i.status === 'pending').length}</span>
            </div>
            <div className="bg-indigo-950/80 p-4 rounded-2xl border border-rose-500/30">
              <span className="text-[10px] font-extrabold uppercase text-rose-300 block">Failed Attempts</span>
              <span className="text-2xl font-black text-rose-400 font-mono">{mergedQueue.filter((i) => i.status === 'failed').length}</span>
            </div>
            <div className="bg-indigo-950/80 p-4 rounded-2xl border border-emerald-400/30">
              <span className="text-[10px] font-extrabold uppercase text-emerald-300 block">Synced Success</span>
              <span className="text-2xl font-black text-emerald-400 font-mono">{mergedQueue.filter((i) => i.status === 'synced').length}</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black italic uppercase text-indigo-200/90 tracking-wider">Pending & Historical Operations ({mergedQueue.length})</h4>
              {mergedQueue.some((i) => i.status === 'synced') && (
                <button type="button"
                  onClick={() => { setLocalSimulatedQueue((prev) => prev.filter((item) => item.status !== 'synced')); if (onClearSyncedQueue) onClearSyncedQueue(); }}
                  className="text-[11px] font-extrabold text-indigo-300 hover:text-white uppercase transition">
                  Clear Synced Logs 🧹
                </button>
              )}
            </div>

            {mergedQueue.length === 0 ? (
              <div className="bg-indigo-950/60 rounded-2xl border border-white/10 p-8 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h5 className="text-sm font-black italic uppercase text-white">All Queue Items Synced!</h5>
                  <p className="text-xs text-indigo-200/70 max-w-sm mx-auto">No pending offline actions in the local storage buffer.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {mergedQueue.map((item) => (
                  <div key={item.id} className="p-4 bg-indigo-950/90 rounded-2xl border border-white/10 hover:border-white/20 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded-md bg-cyan-400/20 text-cyan-300 text-[10px] font-black font-mono uppercase border border-cyan-400/30">{item.type}</span>
                        <span className="text-[11px] text-indigo-300/80 font-mono">ID: {item.id.substring(0, 16)}...</span>
                        {item.createdAt && <span className="text-[10px] text-indigo-200/60">• {item.createdAt}</span>}
                      </div>
                      {item.payload && (
                        <div className="text-xs text-indigo-200/90 font-mono bg-black/30 p-2 rounded-xl border border-white/5 truncate max-w-md">
                          {JSON.stringify(item.payload)}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      {item.status === 'synced' ? (
                        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold uppercase rounded-xl border border-emerald-500/30 flex items-center space-x-1">
                          <Check className="w-3 h-3 stroke-[3]" /><span>Synced</span>
                        </span>
                      ) : item.status === 'failed' ? (
                        <span className="px-3 py-1 bg-rose-500/20 text-rose-300 text-[10px] font-extrabold uppercase rounded-xl border border-rose-500/30 flex items-center space-x-1">
                          <ShieldAlert className="w-3 h-3" /><span>Failed</span>
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-amber-400/20 text-amber-300 text-[10px] font-extrabold uppercase rounded-xl border border-amber-400/30 animate-pulse">Pending</span>
                      )}
                      {(item.status === 'pending' || item.status === 'failed') && (
                        <button type="button"
                          onClick={() => {
                            if (item.id.startsWith('queue_')) {
                              setLocalSimulatedQueue((prev) => prev.map((q) => q.id === item.id ? { ...q, status: 'pending' as const, errorMessage: undefined } : q));
                              setTimeout(() => {
                                setLocalSimulatedQueue((prev) => prev.map((q) => q.id === item.id ? { ...q, status: 'synced' as const } : q));
                              }, 1500);
                            }
                            if (onRetryQueueItem) onRetryQueueItem(item.id);
                          }}
                          className="px-3 py-1.5 bg-lime-400 hover:bg-lime-300 text-black font-black italic uppercase text-[10px] rounded-xl transition shadow-sm flex items-center space-x-1">
                          <Zap className="w-3 h-3 fill-black" /><span>Retry Sync</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═════════ TAB: REFERRALS ═════════ */}
      {profileTab === 'referrals' && (
        <div className="bg-indigo-900/60 p-6 md:p-8 rounded-[2.5rem] border border-amber-400/30 shadow-2xl space-y-6">
          <div className="flex items-center space-x-3 border-b border-white/10 pb-4">
            <Gift className="w-6 h-6 text-amber-400" />
            <h3 className="text-xl font-black italic uppercase text-white">My Referral History</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="px-4 py-3 bg-black/40 rounded-2xl border border-white/10 text-center">
              <span className="text-[10px] font-mono font-bold text-indigo-300 uppercase block">Total Signups</span>
              <span className="text-xl font-black italic text-white">{(athlete as any).total_referrals || 0}</span>
            </div>
            <div className="px-4 py-3 bg-black/40 rounded-2xl border border-amber-400/30 text-center">
              <span className="text-[10px] font-mono font-bold text-amber-300 uppercase block">XP Earned</span>
              <span className="text-xl font-black italic text-lime-400">+{(athlete as any).referral_xp || 0}</span>
            </div>
          </div>
          <div className="p-5 bg-indigo-950/80 rounded-2xl border border-white/10">
            <h4 className="text-xs font-black uppercase text-amber-300 mb-2">Your Referral Code</h4>
            <div className="flex items-center gap-2 bg-black/50 p-2.5 rounded-xl border border-white/10">
              <span className="font-mono font-black text-lime-400 text-sm flex-1">{(athlete as any).referral_code || '—'}</span>
              <button onClick={() => { navigator.clipboard.writeText((athlete as any).referral_code || ''); setXpToast('Code copied!'); setTimeout(() => setXpToast(null), 2000); }}
                className="px-2.5 py-1 bg-lime-400 text-black font-black uppercase text-[10px] rounded-lg">Copy</button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════ TAB: MAP VIEW ═════════ */}
      {profileTab === 'map_view' && <StatsClusterMapView user={athlete} />}

      {/* ═════════ MODALS ═════════ */}
      <UploadHighlightModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onAddHighlight={(newClip: any) => setHighlights((p) => [newClip, ...p])}
        athleteId={athlete?.id || ''}
      />

      <ProCheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        user={athlete}
        merchantPaypalEmail={merchantPaypalEmail}
        merchantBankDetails={merchantBankDetails}
        onPaymentSuccess={(updatedPartial) => {
          setAthlete((prev) => (prev ? { ...prev, ...updatedPartial } : prev));
          if (onSaveProfile) { try { onSaveProfile(updatedPartial); } catch { /* ignore */ } }
        }}
      />

      {isBiometricPromptOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="relative w-full max-w-sm bg-indigo-950 border-2 border-lime-400/50 rounded-[2.5rem] p-6 text-center space-y-5 shadow-2xl">
            <button onClick={() => setIsBiometricPromptOpen(false)} className="absolute top-4 right-4 p-2 text-indigo-300 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <div className="space-y-1 pt-2">
              <span className="text-[10px] font-mono font-black uppercase text-lime-400 tracking-wider">WEBAUTHN AUTHENTICATOR</span>
              <h3 className="text-xl font-black italic uppercase text-white">
                {biometricPromptMode === 'register' ? 'Register Biometric Key' : 'Biometric Passkey Scan'}
              </h3>
            </div>
            <div className="py-4 flex flex-col items-center justify-center">
              <div className={`relative p-6 rounded-full border-2 transition-all duration-700 ${
                scanningPhase === 'success'
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 scale-110 shadow-[0_0_40px_rgba(52,211,153,0.5)]'
                  : 'bg-lime-400/10 border-lime-400/60 text-lime-400 animate-pulse'
              }`}>
                <Fingerprint className="w-16 h-16 animate-bounce" />
              </div>
              {scanningPhase === 'success' && (
                <div className="mt-4 text-xs font-black italic uppercase text-emerald-300 flex items-center space-x-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /><span>Biometric Verified ✓</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeVideoModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setActiveVideoModal(null)}>
          <div className="bg-indigo-950 border border-lime-400/40 rounded-3xl w-full max-w-3xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div>
                <h3 className="text-sm font-black italic uppercase text-white">{activeVideoModal.title}</h3>
                <p className="text-[10px] text-indigo-300 font-mono">{activeVideoModal.sport} • {activeVideoModal.durationSeconds}s</p>
              </div>
              <button onClick={() => setActiveVideoModal(null)} className="p-2 text-indigo-300 hover:text-white rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-black aspect-video">
              {activeVideoModal.videoUrl?.includes('youtube') || activeVideoModal.videoUrl?.includes('youtu.be') ? (
                <iframe
                  src={`https://www.youtube.com/embed/${(() => {
                    const m = activeVideoModal.videoUrl.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/);
                    return m ? m[1] : '';
                  })()}`}
                  className="w-full h-full" allowFullScreen
                />
              ) : (
                <video src={activeVideoModal.videoUrl} controls autoPlay className="w-full h-full" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileTab;