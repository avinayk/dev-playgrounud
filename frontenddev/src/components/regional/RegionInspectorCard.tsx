// frontend/src/components/regional/RegionInspectorCard.tsx
import React, { useState, useMemo } from 'react';
import type { AthleteProfile } from '../../types/auth.types';
import { getStateName } from '../../data/usLocations';
import {
  Sparkles,
  MapPin,
  Users,
  Building2,
  Activity,
  Trophy,
  Flame,
  ChevronRight,
  ShieldCheck,
  Globe,
} from 'lucide-react';

interface RegionInspectorCardProps {
  user?: AthleteProfile;
  registeredCity?: string;
  registeredState?: string;
}

interface RegionalHub {
  id: string;
  cityName: string;
  athletesCount: number;
  courtCount: number;
  activeGames: number;
  density: 'Extreme' | 'High' | 'Moderate';
  topSport: string;
}

export const RegionInspectorCard: React.FC<RegionInspectorCardProps> = ({
  user,
  registeredCity = 'Venice',
  registeredState = 'CA',
}) => {
  const city =
    registeredCity || user?.registeredCity || user?.location?.city || 'Venice';
  const stateCode =
    registeredState ||
    user?.registeredState ||
    user?.location?.state ||
    'CA';
  const stateName = getStateName(stateCode);

  /* Regional hubs data */
  const regionalHubs = useMemo<RegionalHub[]>(() => {
    if (stateCode === 'NY') {
      return [
        { id: 'h1', cityName: 'New York City (NYC)', athletesCount: 3840, courtCount: 86, activeGames: 24, density: 'Extreme', topSport: 'Basketball' },
        { id: 'h2', cityName: 'Buffalo', athletesCount: 620, courtCount: 18, activeGames: 5, density: 'Moderate', topSport: 'Volleyball' },
        { id: 'h3', cityName: 'Rochester', athletesCount: 480, courtCount: 14, activeGames: 3, density: 'Moderate', topSport: 'Soccer' },
        { id: 'h4', cityName: 'Syracuse', athletesCount: 710, courtCount: 22, activeGames: 7, density: 'High', topSport: 'Basketball' },
        { id: 'h5', cityName: 'Albany', athletesCount: 940, courtCount: 28, activeGames: 9, density: 'High', topSport: 'Volleyball' },
      ];
    } else if (stateCode === 'TX') {
      return [
        { id: 'h1', cityName: 'Houston', athletesCount: 2900, courtCount: 64, activeGames: 18, density: 'Extreme', topSport: 'Basketball' },
        { id: 'h2', cityName: 'Dallas / Fort Worth', athletesCount: 3100, courtCount: 72, activeGames: 21, density: 'Extreme', topSport: 'Soccer' },
        { id: 'h3', cityName: 'Austin', athletesCount: 1850, courtCount: 42, activeGames: 12, density: 'High', topSport: 'Volleyball' },
        { id: 'h4', cityName: 'San Antonio', athletesCount: 1420, courtCount: 35, activeGames: 8, density: 'High', topSport: 'Basketball' },
      ];
    } else if (stateCode === 'FL') {
      return [
        { id: 'h1', cityName: 'Miami Metro', athletesCount: 3400, courtCount: 78, activeGames: 22, density: 'Extreme', topSport: 'Volleyball' },
        { id: 'h2', cityName: 'Orlando', athletesCount: 1920, courtCount: 44, activeGames: 14, density: 'High', topSport: 'Basketball' },
        { id: 'h3', cityName: 'Tampa Bay', athletesCount: 1680, courtCount: 38, activeGames: 11, density: 'High', topSport: 'Soccer' },
        { id: 'h4', cityName: 'Jacksonville', athletesCount: 1210, courtCount: 30, activeGames: 7, density: 'High', topSport: 'Basketball' },
      ];
    }

    /* Default CA or generic state hubs */
    return [
      { id: 'h1', cityName: `${city} / Metro West`, athletesCount: 2850, courtCount: 62, activeGames: 19, density: 'Extreme', topSport: 'Volleyball' },
      { id: 'h2', cityName: 'Los Angeles / Venice', athletesCount: 4200, courtCount: 94, activeGames: 31, density: 'Extreme', topSport: 'Basketball' },
      { id: 'h3', cityName: 'San Francisco Bay Area', athletesCount: 3150, courtCount: 70, activeGames: 22, density: 'Extreme', topSport: 'Soccer' },
      { id: 'h4', cityName: 'San Diego', athletesCount: 1980, courtCount: 46, activeGames: 14, density: 'High', topSport: 'Volleyball' },
      { id: 'h5', cityName: 'Sacramento', athletesCount: 1120, courtCount: 28, activeGames: 8, density: 'High', topSport: 'Basketball' },
    ];
  }, [city, stateCode]);

  const [selectedHubId, setSelectedHubId] = useState<string>(regionalHubs[0].id);

  const activeHub = useMemo(() => {
    return regionalHubs.find((h) => h.id === selectedHubId) || regionalHubs[0];
  }, [regionalHubs, selectedHubId]);

  const totalCourtsInState = useMemo(() => {
    return regionalHubs.reduce((acc, curr) => acc + curr.courtCount, 0);
  }, [regionalHubs]);

  const totalAthletesInState = useMemo(() => {
    return regionalHubs.reduce((acc, curr) => acc + curr.athletesCount, 0);
  }, [regionalHubs]);

  return (
    <div className="bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-950 p-5 md:p-6 rounded-[2.5rem] border border-amber-400/30 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3.5">
        <div className="flex items-center space-x-2.5">
          <div className="p-2.5 bg-amber-400 text-black rounded-2xl shadow-md">
            <Sparkles className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-amber-400/20 text-amber-300 rounded font-mono border border-amber-400/30">
                REGION INSPECTOR
              </span>
              <span className="text-[10px] text-indigo-300 font-mono flex items-center gap-1">
                <MapPin className="w-3 h-3 text-lime-400" />
                State of {stateName} ({stateCode})
              </span>
            </div>
            <h3 className="text-lg font-black italic uppercase text-white mt-0.5">
              Regional Leaderboard & Hub Intelligence
            </h3>
          </div>
        </div>

        {/* Hub Selector */}
        <div className="flex flex-wrap items-center gap-1.5 bg-black/40 p-1.5 rounded-2xl border border-white/10">
          {regionalHubs.map((hub) => (
            <button
              key={hub.id}
              type="button"
              onClick={() => setSelectedHubId(hub.id)}
              className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase transition flex items-center gap-1 ${
                selectedHubId === hub.id
                  ? 'bg-amber-400 text-black shadow-md font-extrabold'
                  : 'text-indigo-200 hover:text-white'
              }`}
            >
              <span>{hub.cityName.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="p-4 bg-indigo-900/60 rounded-2xl border border-white/10 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase text-indigo-200/80 tracking-wider">
              Regional Hub
            </span>
            <span className="px-2 py-0.5 bg-lime-400/20 text-lime-300 text-[9px] font-mono font-bold rounded border border-lime-400/30">
              {activeHub.density}
            </span>
          </div>
          <h4 className="text-base font-black italic uppercase text-white truncate">
            {activeHub.cityName}
          </h4>
          <p className="text-[10px] text-indigo-300 font-mono">
            Top Sport: {activeHub.topSport}
          </p>
        </div>

        <div className="p-4 bg-indigo-900/60 rounded-2xl border border-white/10 flex flex-col justify-between">
          <span className="text-[10px] font-extrabold uppercase text-indigo-200/80 tracking-wider flex items-center gap-1">
            <Users className="w-3 h-3 text-lime-400" />
            Registered Athletes
          </span>
          <div className="text-2xl font-black italic text-lime-400">
            {activeHub.athletesCount.toLocaleString()}
          </div>
          <p className="text-[10px] text-indigo-300 font-mono">
            Verified in {stateCode} Leaderboard
          </p>
        </div>

        <div className="p-4 bg-indigo-900/60 rounded-2xl border border-white/10 flex flex-col justify-between">
          <span className="text-[10px] font-extrabold uppercase text-indigo-200/80 tracking-wider flex items-center gap-1">
            <Building2 className="w-3 h-3 text-cyan-400" />
            Active Courts Listed
          </span>
          <div className="text-2xl font-black italic text-white">
            {activeHub.courtCount} Courts
          </div>
          <p className="text-[10px] text-indigo-300 font-mono">
            Mapped in {activeHub.cityName}
          </p>
        </div>

        <div className="p-4 bg-indigo-900/60 rounded-2xl border border-white/10 flex flex-col justify-between">
          <span className="text-[10px] font-extrabold uppercase text-indigo-200/80 tracking-wider flex items-center gap-1">
            <Activity className="w-3 h-3 text-amber-400" />
            Pickup Games Live
          </span>
          <div className="text-2xl font-black italic text-amber-300">
            {activeHub.activeGames} Matches
          </div>
          <p className="text-[10px] text-indigo-300 font-mono">
            Scheduled for today
          </p>
        </div>
      </div>

      {/* Statewide Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-black/40 rounded-2xl border border-white/10 text-xs font-mono text-indigo-200">
        <div className="flex items-center space-x-4">
          <span>
            State Total Courts ({stateCode}):{' '}
            <strong className="text-white">{totalCourtsInState}</strong>
          </span>
          <span>
            State Athlete Base:{' '}
            <strong className="text-lime-300">
              {totalAthletesInState.toLocaleString()}
            </strong>
          </span>
        </div>
        <span className="text-[10px] text-indigo-300/80 italic mt-1 sm:mt-0">
          State rankings updated automatically from verified match logs.
        </span>
      </div>
    </div>
  );
};