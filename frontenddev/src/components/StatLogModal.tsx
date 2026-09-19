import React, { useEffect, useState } from 'react';
import { X, Trophy } from 'lucide-react';
import { getLevelInfo } from '../utils/leveling';
import { awardXp } from '../utils/xp';

interface StatLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (data: StatLogData) => void;
  initialSport?: string;
  created_by_id?: string;
  user?: string;
}

interface StatLogData {
  sport: string;
  outcome: 'win' | 'loss';
  created_by_id?: string;
  user?: string;
  points?: number;
  assists?: number;
  rebounds?: number;
  threePtMade?: number;
  steals?: number;
  blocks?: number;
  baseHits?: number;
  atBats?: number;
  rbis?: number;
  homeRuns?: number;
  softballHits?: number;
  softballAtBats?: number;
  softballRbis?: number;
  stolenBases?: number;
  kitchenDinks?: number;
  acesServed?: number;
  goalsScored?: number;
  soccerAssists?: number;
  spikeKills?: number;
  serviceAces?: number;
  netBlocks?: number;
  groundDigs?: number;
  settingAssists?: number;
  passingYards?: number;
  touchdowns?: number;
  tennisAcesServed?: number;
  breakPointsWon?: number;
  valuexp?: number;
  levelTitle?: string;
  [key: string]: any;
}

export const StatLogModal: React.FC<StatLogModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialSport = 'volleyball',
  created_by_id,
}) => {
  // ✅ user lives in state so setUser() re-renders the modal
  const [user, setUser] = useState<any>(() => {
    const raw = localStorage.getItem('playground_user');
    return raw ? JSON.parse(raw) : null;
  });

  const userId = user?.id ?? user?._id ?? user?.user_id;
  const [xpToast, setXpToast] = useState<string | null>(null);

  const [selectedSport, setSelectedSport] = useState(initialSport);
  const [outcome, setOutcome] = useState<'win' | 'loss'>('win');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Basketball
  const [points, setPoints] = useState<number | ''>('');
  const [assists, setAssists] = useState<number | ''>('');
  const [rebounds, setRebounds] = useState<number | ''>('');
  const [threePtMade, setThreePtMade] = useState<number | ''>('');
  const [steals, setSteals] = useState<number | ''>('');
  const [blocks, setBlocks] = useState<number | ''>('');

  // Baseball
  const [baseHits, setBaseHits] = useState<number | ''>('');
  const [atBats, setAtBats] = useState<number | ''>('');
  const [rbis, setRbis] = useState<number | ''>('');
  const [homeRuns, setHomeRuns] = useState<number | ''>('');

  // Softball
  const [softballHits, setSoftballHits] = useState<number | ''>('');
  const [softballAtBats, setSoftballAtBats] = useState<number | ''>('');
  const [softballRbis, setSoftballRbis] = useState<number | ''>('');
  const [stolenBases, setStolenBases] = useState<number | ''>('');

  // Pickleball
  const [kitchenDinks, setKitchenDinks] = useState<number | ''>('');
  const [acesServed, setAcesServed] = useState<number | ''>('');

  // Soccer
  const [goalsScored, setGoalsScored] = useState<number | ''>('');
  const [soccerAssists, setSoccerAssists] = useState<number | ''>('');

  // Volleyball
  const [spikeKills, setSpikeKills] = useState<number | ''>('');
  const [serviceAces, setServiceAces] = useState<number | ''>('');
  const [netBlocks, setNetBlocks] = useState<number | ''>('');
  const [groundDigs, setGroundDigs] = useState<number | ''>('');
  const [settingAssists, setSettingAssists] = useState<number | ''>('');

  // Football
  const [passingYards, setPassingYards] = useState<number | ''>('');
  const [touchdowns, setTouchdowns] = useState<number | ''>('');

  // Tennis
  const [tennisAcesServed, setTennisAcesServed] = useState<number | ''>('');
  const [breakPointsWon, setBreakPointsWon] = useState<number | ''>('');

  const sports = [
    { id: 'basketball', label: 'Bball 🏀' },
    { id: 'baseball', label: 'Baseball ⚾' },
    { id: 'softball', label: 'Softball 🥎' },
    { id: 'pickleball', label: 'Pickleball 🏓' },
    { id: 'soccer', label: 'Soccer ⚽' },
    { id: 'volleyball', label: 'Volleyball 🏐' },
    { id: 'football', label: 'Football 🏈' },
    { id: 'tennis', label: 'Tennis 🎾' },
  ];

  const sportLabels: Record<string, string> = {
    basketball: 'Bball 🏀',
    baseball: 'Baseball ⚾',
    softball: 'Softball 🥎',
    pickleball: 'Pickleball 🏓',
    soccer: 'Soccer ⚽',
    volleyball: 'Volleyball 🏐',
    football: 'Football 🏈',
    tennis: 'Tennis 🎾',
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      // Don't allow ESC to close while the toast is showing
      if (e.key === 'Escape' && !xpToast) onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
      setSelectedSport(initialSport);
      setOutcome('win');
      setIsSubmitting(false);
      setPoints('');
      setAssists('');
      setRebounds('');
      setThreePtMade('');
      setSteals('');
      setBlocks('');
      setBaseHits('');
      setAtBats('');
      setRbis('');
      setHomeRuns('');
      setSoftballHits('');
      setSoftballAtBats('');
      setSoftballRbis('');
      setStolenBases('');
      setKitchenDinks('');
      setAcesServed('');
      setGoalsScored('');
      setSoccerAssists('');
      setSpikeKills('');
      setServiceAces('');
      setNetBlocks('');
      setGroundDigs('');
      setSettingAssists('');
      setPassingYards('');
      setTouchdowns('');
      setTennisAcesServed('');
      setBreakPointsWon('');
      setXpToast(null);
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, initialSport, xpToast]);

  if (!isOpen) return null;

  const XP_REWARD = 200;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSport) return;

    // Sport-specific validation
    if (selectedSport === 'basketball' && points === '') return;
    if (selectedSport === 'baseball' && (baseHits === '' || atBats === '')) return;
    if (selectedSport === 'softball' && (softballHits === '' || softballAtBats === '')) return;
    if (selectedSport === 'pickleball' && (kitchenDinks === '' || acesServed === '')) return;
    if (selectedSport === 'soccer' && (goalsScored === '' || soccerAssists === '')) return;
    if (selectedSport === 'volleyball' && spikeKills === '') return;
    if (selectedSport === 'football' && (passingYards === '' || touchdowns === '')) return;
    if (selectedSport === 'tennis' && (tennisAcesServed === '' || breakPointsWon === '')) return;

    setIsSubmitting(true);

    // ✅ Hoisted so onSave() can always see them
    let newTotal: number = user?.valuexp ?? 0;
    let newLevelInfo = getLevelInfo(newTotal);

    try {
      const data: StatLogData = {
        sport: selectedSport,
        outcome,
        created_by_id,
        user,
      };

      if (selectedSport === 'basketball') {
        data.points = points === '' ? 0 : Number(points);
        data.assists = assists === '' ? 0 : Number(assists);
        data.rebounds = rebounds === '' ? 0 : Number(rebounds);
        data.threePtMade = threePtMade === '' ? 0 : Number(threePtMade);
        data.steals = steals === '' ? 0 : Number(steals);
        data.blocks = blocks === '' ? 0 : Number(blocks);
      }
      if (selectedSport === 'baseball') {
        data.baseHits = Number(baseHits);
        data.atBats = Number(atBats);
        data.rbis = rbis === '' ? 0 : Number(rbis);
        data.homeRuns = homeRuns === '' ? 0 : Number(homeRuns);
      }
      if (selectedSport === 'softball') {
        data.softballHits = Number(softballHits);
        data.softballAtBats = Number(softballAtBats);
        data.softballRbis = softballRbis === '' ? 0 : Number(softballRbis);
        data.stolenBases = stolenBases === '' ? 0 : Number(stolenBases);
      }
      if (selectedSport === 'pickleball') {
        data.kitchenDinks = Number(kitchenDinks);
        data.acesServed = Number(acesServed);
      }
      if (selectedSport === 'soccer') {
        data.goalsScored = Number(goalsScored);
        data.soccerAssists = Number(soccerAssists);
      }
      if (selectedSport === 'volleyball') {
        data.spikeKills = Number(spikeKills);
        data.serviceAces = serviceAces === '' ? 0 : Number(serviceAces);
        data.netBlocks = netBlocks === '' ? 0 : Number(netBlocks);
        data.groundDigs = groundDigs === '' ? 0 : Number(groundDigs);
        data.settingAssists = settingAssists === '' ? 0 : Number(settingAssists);
      }
      if (selectedSport === 'football') {
        data.passingYards = Number(passingYards);
        data.touchdowns = Number(touchdowns);
      }
      if (selectedSport === 'tennis') {
        data.tennisAcesServed = Number(tennisAcesServed);
        data.breakPointsWon = Number(breakPointsWon);
      }

      const API_URL = import.meta.env.VITE_API_URL || '';

      const response = await fetch(`${API_URL}/stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      console.log(`[API Response] Status: ${response.status} ${response.statusText}`);

      const responseText = await response.text();
      if (!responseText) {
        throw new Error(
          `Server error (${response.status}): Empty response. Check backend logs for a crash.`
        );
      }

      let result: any;
      try {
        result = JSON.parse(responseText);
        console.log('[API Success] Parsed JSON:', result);
      } catch {
        console.error('[API Parse Error] Raw response:', responseText);
        throw new Error(`Invalid JSON from server. Raw: ${responseText.substring(0, 100)}...`);
      }

      if (!response.ok) {
        console.error('[API Error] Backend returned error object:', result);
        throw new Error(result.error || result.message || `Server error: ${response.status}`);
      }

      // ----- XP award -----
      if (!userId) {
        console.warn('[XP] No user id found in localStorage — skipping XP award');
      } else {
        try {
          const xpResult = await awardXp(userId, XP_REWARD, `stat_log:${selectedSport}`);
          newTotal = xpResult.valuexp;
          newLevelInfo = getLevelInfo(newTotal);

          const updatedUser = { ...user, valuexp: newTotal };
          localStorage.setItem('playground_user', JSON.stringify(updatedUser));
          setUser(updatedUser);

          setXpToast(`+${XP_REWARD} XP · ${newLevelInfo.levelTitle}`);
          console.log(
            `[XP] Awarded ${XP_REWARD}. New total: ${newTotal} (Lvl ${newLevelInfo.level})`
          );

          // Let any other component listening for XP updates react
          window.dispatchEvent(
            new CustomEvent('user:xp-updated', {
              detail: {
                valuexp: newTotal,
                levelTitle: newLevelInfo.levelTitle,
              },
            })
          );
        } catch (xpErr) {
          console.error('[XP] Failed to award XP:', xpErr);
          setXpToast('Stat saved, but XP update failed.');
        }
      }

      console.log('Stats saved:', result);

      // ✅ onSave sees newTotal / newLevelInfo because they're hoisted
      onSave?.({
        ...data,
        valuexp: newTotal,
        levelTitle: newLevelInfo.levelTitle,
      });

      // Keep the modal open briefly so the toast is visible
       
        window.location.reload();
     
    } catch (error: any) {
      console.error('Error submitting stats:', error);
      alert(error.message || 'Failed to submit stats. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSportSelect = (sportId: string) => setSelectedSport(sportId);

  const getDisplaySport = () => sportLabels[selectedSport] || selectedSport;

  const showBasketballStats = selectedSport === 'basketball';
  const showBaseballStats = selectedSport === 'baseball';
  const showSoftballStats = selectedSport === 'softball';
  const showPickleballStats = selectedSport === 'pickleball';
  const showSoccerStats = selectedSport === 'soccer';
  const showVolleyballStats = selectedSport === 'volleyball';
  const showFootballStats = selectedSport === 'football';
  const showTennisStats = selectedSport === 'tennis';

  const submitDisabled =
    isSubmitting ||
    !selectedSport ||
    (selectedSport === 'basketball' && points === '') ||
    (selectedSport === 'baseball' && (baseHits === '' || atBats === '')) ||
    (selectedSport === 'softball' && (softballHits === '' || softballAtBats === '')) ||
    (selectedSport === 'pickleball' && (kitchenDinks === '' || acesServed === '')) ||
    (selectedSport === 'soccer' && (goalsScored === '' || soccerAssists === '')) ||
    (selectedSport === 'volleyball' && spikeKills === '') ||
    (selectedSport === 'football' && (passingYards === '' || touchdowns === '')) ||
    (selectedSport === 'tennis' && (tennisAcesServed === '' || breakPointsWon === ''));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn"
      onClick={() => {
        if (!xpToast) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="bg-indigo-900/90 p-6 rounded-3xl w-full max-w-2xl border border-white/10 shadow-2xl relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ✅ XP Toast — finally rendered */}
        {xpToast && (
          <div className="mb-4 px-4 py-2 rounded-xl bg-lime-400 text-black text-sm font-black italic uppercase text-center shadow-lg shadow-lime-400/30 animate-fadeIn">
            {xpToast}
          </div>
        )}

        <button
          onClick={() => {
            if (!xpToast) onClose();
          }}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-indigo-900/80 text-indigo-300 hover:text-white hover:bg-indigo-800 transition z-10"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start space-x-3 mb-6">
          <div className="p-2 bg-lime-500/20 rounded-xl border border-lime-400/30">
            <Trophy className="w-6 h-6 text-lime-400" />
          </div>
          <div>
            <h2 id="modal-title" className="text-xl font-black italic uppercase text-white">
              Log Recent Game Performance
            </h2>
            <p className="text-sm text-indigo-300">
              Record game stats manually or speak directly to hands-free voice log stats!
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            {/* Sport Selection */}
            <div>
              <label className="text-sm text-indigo-300 font-medium block mb-1.5">
                Select Sport
              </label>
              <div className="flex flex-wrap bg-indigo-950 p-1.5 rounded-2xl border border-white/10 gap-1">
                {sports.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSportSelect(s.id)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-black italic uppercase transition ${
                      selectedSport === s.id
                        ? 'bg-lime-400 text-black shadow-md'
                        : 'text-indigo-200/60 hover:text-white hover:bg-indigo-800/50'
                    }`}
                    aria-pressed={selectedSport === s.id}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Outcome */}
            <div>
              <label className="text-sm text-indigo-300 font-medium block mb-1.5">
                Game Outcome
              </label>
              <div className="flex bg-indigo-950 p-1.5 rounded-2xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setOutcome('win')}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-black italic uppercase transition ${
                    outcome === 'win'
                      ? 'bg-lime-400 text-black shadow-md'
                      : 'text-indigo-200/60 hover:text-white hover:bg-indigo-800/50'
                  }`}
                  aria-pressed={outcome === 'win'}
                >
                  WIN 🏆
                </button>
                <button
                  type="button"
                  onClick={() => setOutcome('loss')}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-black italic uppercase transition ${
                    outcome === 'loss'
                      ? 'bg-rose-500/80 text-white shadow-md'
                      : 'text-indigo-200/60 hover:text-white hover:bg-indigo-800/50'
                  }`}
                  aria-pressed={outcome === 'loss'}
                >
                  LOSS
                </button>
              </div>
            </div>

            {/* Basketball */}
            {showBasketballStats && (
              <div className="grid grid-cols-2 items-center gap-3 bg-indigo-950/50 p-4 rounded-2xl border border-white/5">
                <h3 className="col-span-2 text-xs font-black italic uppercase text-indigo-300 tracking-wider mb-1">
                  📊 Basketball Stats
                </h3>

                <div>
                  <label htmlFor="points" className="text-sm text-indigo-300 font-medium">
                    Points (PTS)
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setPoints((p) => Math.max(0, (typeof p === 'number' ? p : 0) - 1))}
                      className="w-10 h-10 rounded-xl bg-indigo-800/50 hover:bg-indigo-700 text-white font-bold text-xl transition disabled:opacity-50"
                      disabled={isSubmitting || (typeof points === 'number' && points <= 0)}
                    >
                      −
                    </button>
                    <input
                      id="points"
                      type="number"
                      min="0"
                      step="1"
                      value={points}
                      onChange={(e) => setPoints(e.target.value ? parseInt(e.target.value, 10) : '')}
                      className="w-full bg-indigo-900/60 border border-white/10 rounded-xl py-2.5 text-white text-center focus:outline-none focus:ring-2 focus:ring-lime-400/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0"
                      required
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setPoints((p) => (typeof p === 'number' ? p + 1 : 1))}
                      className="w-10 h-10 rounded-xl bg-indigo-800/50 hover:bg-indigo-700 text-white font-bold text-xl transition disabled:opacity-50"
                      disabled={isSubmitting}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="assists" className="text-sm text-indigo-300 font-medium">
                    Assists (AST)
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setAssists((p) => Math.max(0, (typeof p === 'number' ? p : 0) - 1))}
                      className="w-10 h-10 rounded-xl bg-indigo-800/50 hover:bg-indigo-700 text-white font-bold text-xl transition disabled:opacity-50"
                      disabled={isSubmitting || (typeof assists === 'number' && assists <= 0)}
                    >
                      −
                    </button>
                    <input
                      id="assists"
                      type="number"
                      min="0"
                      step="1"
                      value={assists}
                      onChange={(e) => setAssists(e.target.value ? parseInt(e.target.value, 10) : '')}
                      className="w-full bg-indigo-900/60 border border-white/10 rounded-xl py-2.5 text-white text-center focus:outline-none focus:ring-2 focus:ring-lime-400/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setAssists((p) => (typeof p === 'number' ? p + 1 : 1))}
                      className="w-10 h-10 rounded-xl bg-indigo-800/50 hover:bg-indigo-700 text-white font-bold text-xl transition disabled:opacity-50"
                      disabled={isSubmitting}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="rebounds" className="text-sm text-indigo-300 font-medium">
                    Rebounds (REB)
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setRebounds((p) => Math.max(0, (typeof p === 'number' ? p : 0) - 1))}
                      className="w-10 h-10 rounded-xl bg-indigo-800/50 hover:bg-indigo-700 text-white font-bold text-xl transition disabled:opacity-50"
                      disabled={isSubmitting || (typeof rebounds === 'number' && rebounds <= 0)}
                    >
                      −
                    </button>
                    <input
                      id="rebounds"
                      type="number"
                      min="0"
                      step="1"
                      value={rebounds}
                      onChange={(e) => setRebounds(e.target.value ? parseInt(e.target.value, 10) : '')}
                      className="w-full bg-indigo-900/60 border border-white/10 rounded-xl py-2.5 text-white text-center focus:outline-none focus:ring-2 focus:ring-lime-400/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setRebounds((p) => (typeof p === 'number' ? p + 1 : 1))}
                      className="w-10 h-10 rounded-xl bg-indigo-800/50 hover:bg-indigo-700 text-white font-bold text-xl transition disabled:opacity-50"
                      disabled={isSubmitting}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="threePtMade" className="text-sm text-indigo-300 font-medium">
                    3PT Made
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setThreePtMade((p) => Math.max(0, (typeof p === 'number' ? p : 0) - 1))}
                      className="w-10 h-10 rounded-xl bg-indigo-800/50 hover:bg-indigo-700 text-white font-bold text-xl transition disabled:opacity-50"
                      disabled={isSubmitting || (typeof threePtMade === 'number' && threePtMade <= 0)}
                    >
                      −
                    </button>
                    <input
                      id="threePtMade"
                      type="number"
                      min="0"
                      step="1"
                      value={threePtMade}
                      onChange={(e) => setThreePtMade(e.target.value ? parseInt(e.target.value, 10) : '')}
                      className="w-full bg-indigo-900/60 border border-white/10 rounded-xl py-2.5 text-white text-center focus:outline-none focus:ring-2 focus:ring-lime-400/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setThreePtMade((p) => (typeof p === 'number' ? p + 1 : 1))}
                      className="w-10 h-10 rounded-xl bg-indigo-800/50 hover:bg-indigo-700 text-white font-bold text-xl transition disabled:opacity-50"
                      disabled={isSubmitting}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="steals" className="text-sm text-indigo-300 font-medium">
                    Steals (STL)
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setSteals((p) => Math.max(0, (typeof p === 'number' ? p : 0) - 1))}
                      className="w-10 h-10 rounded-xl bg-indigo-800/50 hover:bg-indigo-700 text-white font-bold text-xl transition disabled:opacity-50"
                      disabled={isSubmitting || (typeof steals === 'number' && steals <= 0)}
                    >
                      −
                    </button>
                    <input
                      id="steals"
                      type="number"
                      min="0"
                      step="1"
                      value={steals}
                      onChange={(e) => setSteals(e.target.value ? parseInt(e.target.value, 10) : '')}
                      className="w-full bg-indigo-900/60 border border-white/10 rounded-xl py-2.5 text-white text-center focus:outline-none focus:ring-2 focus:ring-lime-400/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setSteals((p) => (typeof p === 'number' ? p + 1 : 1))}
                      className="w-10 h-10 rounded-xl bg-indigo-800/50 hover:bg-indigo-700 text-white font-bold text-xl transition disabled:opacity-50"
                      disabled={isSubmitting}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="blocks" className="text-sm text-indigo-300 font-medium">
                    Blocks (BLK)
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setBlocks((p) => Math.max(0, (typeof p === 'number' ? p : 0) - 1))}
                      className="w-10 h-10 rounded-xl bg-indigo-800/50 hover:bg-indigo-700 text-white font-bold text-xl transition disabled:opacity-50"
                      disabled={isSubmitting || (typeof blocks === 'number' && blocks <= 0)}
                    >
                      −
                    </button>
                    <input
                      id="blocks"
                      type="number"
                      min="0"
                      step="1"
                      value={blocks}
                      onChange={(e) => setBlocks(e.target.value ? parseInt(e.target.value, 10) : '')}
                      className="w-full bg-indigo-900/60 border border-white/10 rounded-xl py-2.5 text-white text-center focus:outline-none focus:ring-2 focus:ring-lime-400/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setBlocks((p) => (typeof p === 'number' ? p + 1 : 1))}
                      className="w-10 h-10 rounded-xl bg-indigo-800/50 hover:bg-indigo-700 text-white font-bold text-xl transition disabled:opacity-50"
                      disabled={isSubmitting}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Baseball */}
            {showBaseballStats && (
              <div className="grid grid-cols-2 items-center gap-3 bg-indigo-950/50 p-4 rounded-2xl border border-white/5">
                <h3 className="col-span-2 text-xs font-black italic uppercase text-indigo-300 tracking-wider mb-1">
                  ⚾ Baseball Stats
                </h3>

                <div>
                  <label htmlFor="baseHits" className="text-sm text-indigo-300 font-medium">
                    Base Hits
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setBaseHits((p) => Math.max(0, (typeof p === 'number' ? p : 0) - 1))}
                      className="w-10 h-10 rounded-xl bg-indigo-800/50 hover:bg-indigo-700 text-white font-bold text-xl transition disabled:opacity-50"
                      disabled={isSubmitting || (typeof baseHits === 'number' && baseHits <= 0)}
                    >
                      −
                    </button>
                    <input
                      id="baseHits"
                      type="number"
                      min="0"
                      step="1"
                      value={baseHits}
                      onChange={(e) => setBaseHits(e.target.value ? parseInt(e.target.value, 10) : '')}
                      className="w-full bg-indigo-900/60 border border-white/10 rounded-xl py-2.5 text-white text-center focus:outline-none focus:ring-2 focus:ring-lime-400/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0"
                      required
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setBaseHits((p) => (typeof p === 'number' ? p + 1 : 1))}
                      className="w-10 h-10 rounded-xl bg-indigo-800/50 hover:bg-indigo-700 text-white font-bold text-xl transition disabled:opacity-50"
                      disabled={isSubmitting}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="atBats" className="text-sm text-indigo-300 font-medium">
                    At Bats
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setAtBats((p) => Math.max(0, (typeof p === 'number' ? p : 0) - 1))}
                      className="w-10 h-10 rounded-xl bg-indigo-800/50 hover:bg-indigo-700 text-white font-bold text-xl transition disabled:opacity-50"
                      disabled={isSubmitting || (typeof atBats === 'number' && atBats <= 0)}
                    >
                      −
                    </button>
                    <input
                      id="atBats"
                      type="number"
                      min="0"
                      step="1"
                      value={atBats}
                      onChange={(e) => setAtBats(e.target.value ? parseInt(e.target.value, 10) : '')}
                      className="w-full bg-indigo-900/60 border border-white/10 rounded-xl py-2.5 text-white text-center focus:outline-none focus:ring-2 focus:ring-lime-400/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0"
                      required
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setAtBats((p) => (typeof p === 'number' ? p + 1 : 1))}
                      className="w-10 h-10 rounded-xl bg-indigo-800/50 hover:bg-indigo-700 text-white font-bold text-xl transition disabled:opacity-50"
                      disabled={isSubmitting}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="rbis" className="text-sm text-indigo-300 font-medium">
                    RBIs
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setRbis((p) => Math.max(0, (typeof p === 'number' ? p : 0) - 1))}
                      className="w-10 h-10 rounded-xl bg-indigo-800/50 hover:bg-indigo-700 text-white font-bold text-xl transition disabled:opacity-50"
                      disabled={isSubmitting || (typeof rbis === 'number' && rbis <= 0)}
                    >
                      −
                    </button>
                    <input
                      id="rbis"
                      type="number"
                      min="0"
                      step="1"
                      value={rbis}
                      onChange={(e) => setRbis(e.target.value ? parseInt(e.target.value, 10) : '')}
                      className="w-full bg-indigo-900/60 border border-white/10 rounded-xl py-2.5 text-white text-center focus:outline-none focus:ring-2 focus:ring-lime-400/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setRbis((p) => (typeof p === 'number' ? p + 1 : 1))}
                      className="w-10 h-10 rounded-xl bg-indigo-800/50 hover:bg-indigo-700 text-white font-bold text-xl transition disabled:opacity-50"
                      disabled={isSubmitting}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="homeRuns" className="text-sm text-indigo-300 font-medium">
                    Home Runs
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setHomeRuns((p) => Math.max(0, (typeof p === 'number' ? p : 0) - 1))}
                      className="w-10 h-10 rounded-xl bg-indigo-800/50 hover:bg-indigo-700 text-white font-bold text-xl transition disabled:opacity-50"
                      disabled={isSubmitting || (typeof homeRuns === 'number' && homeRuns <= 0)}
                    >
                      −
                    </button>
                    <input
                      id="homeRuns"
                      type="number"
                      min="0"
                      step="1"
                      value={homeRuns}
                      onChange={(e) => setHomeRuns(e.target.value ? parseInt(e.target.value, 10) : '')}
                      className="w-full bg-indigo-900/60 border border-white/10 rounded-xl py-2.5 text-white text-center focus:outline-none focus:ring-2 focus:ring-lime-400/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setHomeRuns((p) => (typeof p === 'number' ? p + 1 : 1))}
                      className="w-10 h-10 rounded-xl bg-indigo-800/50 hover:bg-indigo-700 text-white font-bold text-xl transition disabled:opacity-50"
                      disabled={isSubmitting}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Softball */}
            {showSoftballStats && (
              <div className="grid grid-cols-2 items-center gap-3 bg-indigo-950/50 p-4 rounded-2xl border border-white/5">
                <h3 className="col-span-2 text-xs font-black italic uppercase text-indigo-300 tracking-wider mb-1">
                  🥎 Softball Stats
                </h3>

                <div>
                  <label htmlFor="softballHits" className="text-sm text-indigo-300 font-medium">
                    Base Hits
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setSoftballHits((p) => Math.max(0, (typeof p === 'number' ? p : 0) - 1))}
                      className="w-10 h-10 rounded-xl bg-indigo-800/50 hover:bg-indigo-700 text-white font-bold text-xl transition disabled:opacity-50"
                      disabled={isSubmitting || (typeof softballHits === 'number' && softballHits <= 0)}
                    >
                      −
                    </button>
                    <input
                      id="softballHits"
                      type="number"
                      min="0"
                      step="1"
                      value={softballHits}
                      onChange={(e) => setSoftballHits(e.target.value ? parseInt(e.target.value, 10) : '')}
                      className="w-full bg-indigo-900/60 border border-white/10 rounded-xl py-2.5 text-white text-center focus:outline-none focus:ring-2 focus:ring-lime-400/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0"
                      required
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setSoftballHits((p) => (typeof p === 'number' ? p + 1 : 1))}
                      className="w-10 h-10 rounded-xl bg-indigo-800/50 hover:bg-indigo-700 text-white font-bold text-xl transition disabled:opacity-50"
                      disabled={isSubmitting}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="softballAtBats" className="text-sm text-indigo-300 font-medium">
                    At Bats
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setSoftballAtBats((p) => Math.max(0, (typeof p === 'number' ? p : 0) - 1))}
                      className="w-10 h-10 rounded-xl bg-indigo-800/50 hover:bg-indigo-700 text-white font-bold text-xl transition disabled:opacity-50"
                      disabled={isSubmitting || (typeof softballAtBats === 'number' && softballAtBats <= 0)}
                    >
                      −
                    </button>
                    <input
                      id="softballAtBats"
                      type="number"
                      min="0"
                      step="1"
                      value={softballAtBats}
                      onChange={(e) => setSoftballAtBats(e.target.value ? parseInt(e.target.value, 10) : '')}
                      className="w-full bg-indigo-900/60 border border-white/10 rounded-xl py-2.5 text-white text-center focus:outline-none focus:ring-2 focus:ring-lime-400/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0"
                      required
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setSoftballAtBats((p) => (typeof p === 'number' ? p + 1 : 1))}
                      className="w-10 h-10 rounded-xl bg-indigo-800/50 hover:bg-indigo-700 text-white font-bold text-xl transition disabled:opacity-50"
                      disabled={isSubmitting}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="softballRbis" className="text-sm text-indigo-300 font-medium">
                    RBIs
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setSoftballRbis((p) => Math.max(0, (typeof p === 'number' ? p : 0) - 1))}
                      className="w-10 h-10 rounded-xl bg-indigo-800/50 hover:bg-indigo-700 text-white font-bold text-xl transition disabled:opacity-50"
                      disabled={isSubmitting || (typeof softballRbis === 'number' && softballRbis <= 0)}
                    >
                      −
                    </button>
                    <input
                      id="softballRbis"
                      type="number"
                      min="0"
                      step="1"
                      value={softballRbis}
                      onChange={(e) => setSoftballRbis(e.target.value ? parseInt(e.target.value, 10) : '')}
                      className="w-full bg-indigo-900/60 border border-white/10 rounded-xl py-2.5 text-white text-center focus:outline-none focus:ring-2 focus:ring-lime-400/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setSoftballRbis((p) => (typeof p === 'number' ? p + 1 : 1))}
                      className="w-10 h-10 rounded-xl bg-indigo-800/50 hover:bg-indigo-700 text-white font-bold text-xl transition disabled:opacity-50"
                      disabled={isSubmitting}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="stolenBases" className="text-sm text-indigo-300 font-medium">
                    Stolen Bases
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setStolenBases((p) => Math.max(0, (typeof p === 'number' ? p : 0) - 1))}
                      className="w-10 h-10 rounded-xl bg-indigo-800/50 hover:bg-indigo-700 text-white font-bold text-xl transition disabled:opacity-50"
                      disabled={isSubmitting || (typeof stolenBases === 'number' && stolenBases <= 0)}
                    >
                      −
                    </button>
                    <input
                      id="stolenBases"
                      type="number"
                      min="0"
                      step="1"
                      value={stolenBases}
                      onChange={(e) => setStolenBases(e.target.value ? parseInt(e.target.value, 10) : '')}
                      className="w-full bg-indigo-900/60 border border-white/10 rounded-xl py-2.5 text-white text-center focus:outline-none focus:ring-2 focus:ring-lime-400/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setStolenBases((p) => (typeof p === 'number' ? p + 1 : 1))}
                      className="w-10 h-10 rounded-xl bg-indigo-800/50 hover:bg-indigo-700 text-white font-bold text-xl transition disabled:opacity-50"
                      disabled={isSubmitting}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Pickleball */}
            {showPickleballStats && (
              <div className="grid grid-cols-2 items-center gap-3 bg-indigo-950/50 p-4 rounded-2xl border border-white/5">
                <h3 className="col-span-2 text-xs font-black italic uppercase text-indigo-300 tracking-wider mb-1">
                  🏓 Pickleball Stats
                </h3>

                <div>
                  <label htmlFor="kitchenDinks" className="text-sm text-indigo-300 font-medium">
                    Kitchen Dinks
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setKitchenDinks((p) => Math.max(0, (typeof p === 'number' ? p : 0) - 1))}
                      className="w-10 h-10 rounded-xl bg-indigo-800/50 hover:bg-indigo-700 text-white font-bold text-xl transition disabled:opacity-50"
                      disabled={isSubmitting || (typeof kitchenDinks === 'number' && kitchenDinks <= 0)}
                    >
                      −
                    </button>
                    <input
                      id="kitchenDinks"
                      type="number"
                      min="0"
                      step="1"
                      value={kitchenDinks}
                      onChange={(e) => setKitchenDinks(e.target.value ? parseInt(e.target.value, 10) : '')}
                      className="w-full bg-indigo-900/60 border border-white/10 rounded-xl py-2.5 text-white text-center focus:outline-none focus:ring-2 focus:ring-lime-400/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0"
                      required
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setKitchenDinks((p) => (typeof p === 'number' ? p + 1 : 1))}
                      className="w-10 h-10 rounded-xl bg-indigo-800/50 hover:bg-indigo-700 text-white font-bold text-xl transition disabled:opacity-50"
                      disabled={isSubmitting}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="acesServed" className="text-sm text-indigo-300 font-medium">
                    Aces Served
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setAcesServed((p) => Math.max(0, (typeof p === 'number' ? p : 0) - 1))}
                      className="w-10 h-10 rounded-xl bg-indigo-800/50 hover:bg-indigo-700 text-white font-bold text-xl transition disabled:opacity-50"
                      disabled={isSubmitting || (typeof acesServed === 'number' && acesServed <= 0)}
                    >
                      −
                    </button>
                    <input
                      id="acesServed"
                      type="number"
                      min="0"
                      step="1"
                      value={acesServed}
                      onChange={(e) => setAcesServed(e.target.value ? parseInt(e.target.value, 10) : '')}
                      className="w-full bg-indigo-900/60 border border-white/10 rounded-xl py-2.5 text-white text-center focus:outline-none focus:ring-2 focus:ring-lime-400/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0"
                      required
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setAcesServed((p) => (typeof p === 'number' ? p + 1 : 1))}
                      className="w-10 h-10 rounded-xl bg-indigo-800/50 hover:bg-indigo-700 text-white font-bold text-xl transition disabled:opacity-50"
                      disabled={isSubmitting}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Soccer */}
            {showSoccerStats && (
              <div className="grid grid-cols-2 items-center gap-3 bg-indigo-950/50 p-4 rounded-2xl border border-white/5">
                <h3 className="col-span-2 text-xs font-black italic uppercase text-indigo-300 tracking-wider mb-1">
                  ⚽ Soccer Stats
                </h3>

                <div>
                  <label htmlFor="goalsScored" className="text-sm text-indigo-300 font-medium">
                    Goals Scored
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setGoalsScored((p) => Math.max(0, (typeof p === 'number' ? p : 0) - 1))}
                      className="w-10 h-10 rounded-xl bg-indigo-800/50 hover:bg-indigo-700 text-white font-bold text-xl transition disabled:opacity-50"
                      disabled={isSubmitting || (typeof goalsScored === 'number' && goalsScored <= 0)}
                    >
                      −
                    </button>
                    <input
                      id="goalsScored"
                      type="number"
                      min="0"
                      step="1"
                      value={goalsScored}
                      onChange={(e) => setGoalsScored(e.target.value ? parseInt(e.target.value, 10) : '')}
                      className="w-full bg-indigo-900/60 border border-white/10 rounded-xl py-2.5 text-white text-center focus:outline-none focus:ring-2 focus:ring-lime-400/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0"
                      required
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setGoalsScored((p) => (typeof p === 'number' ? p + 1 : 1))}
                      className="w-10 h-10 rounded-xl bg-indigo-800/50 hover:bg-indigo-700 text-white font-bold text-xl transition disabled:opacity-50"
                      disabled={isSubmitting}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="soccerAssists" className="text-sm text-indigo-300 font-medium">
                    Assists
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setSoccerAssists((p) => Math.max(0, (typeof p === 'number' ? p : 0) - 1))}
                      className="w-10 h-10 rounded-xl bg-indigo-800/50 hover:bg-indigo-700 text-white font-bold text-xl transition disabled:opacity-50"
                      disabled={isSubmitting || (typeof soccerAssists === 'number' && soccerAssists <= 0)}
                    >
                      −
                    </button>
                    <input
                      id="soccerAssists"
                      type="number"
                      min="0"
                      step="1"
                      value={soccerAssists}
                      onChange={(e) => setSoccerAssists(e.target.value ? parseInt(e.target.value, 10) : '')}
                      className="w-full bg-indigo-900/60 border border-white/10 rounded-xl py-2.5 text-white text-center focus:outline-none focus:ring-2 focus:ring-lime-400/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0"
                      required
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setSoccerAssists((p) => (typeof p === 'number' ? p + 1 : 1))}
                      className="w-10 h-10 rounded-xl bg-indigo-800/50 hover:bg-indigo-700 text-white font-bold text-xl transition disabled:opacity-50"
                      disabled={isSubmitting}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Volleyball */}
            {showVolleyballStats && (
              <div className="grid grid-cols-2 items-center gap-3 bg-indigo-950/50 p-4 rounded-2xl border border-white/5">
                <h3 className="col-span-2 text-xs font-black italic uppercase text-indigo-300 tracking-wider mb-1">
                  🏐 Volleyball Stats
                </h3>

                <div>
                  <label htmlFor="spikeKills" className="text-sm text-indigo-300 font-medium">
                    Spike Kills
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setSpikeKills((p) => Math.max(0, (typeof p === 'number' ? p : 0) - 1))}
                      className="w-10 h-10 rounded-xl bg-indigo-800/50 hover:bg-indigo-700 text-white font-bold text-xl transition disabled:opacity-50"
                      disabled={isSubmitting || (typeof spikeKills === 'number' && spikeKills <= 0)}
                    >
                      −
                    </button>
                    <input
                      id="spikeKills"
                      type="number"
                      min="0"
                      step="1"
                      value={spikeKills}
                      onChange={(e) => setSpikeKills(e.target.value ? parseInt(e.target.value, 10) : '')}
                      className="w-full bg-indigo-900/60 border border-white/10 rounded-xl py-2.5 text-white text-center focus:outline-none focus:ring-2 focus:ring-lime-400/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0"
                      required
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setSpikeKills((p) => (typeof p === 'number' ? p + 1 : 1))}
                      className="w-10 h-10 rounded-xl bg-indigo-800/50 hover:bg-indigo-700 text-white font-bold text-xl transition disabled:opacity-50"
                      disabled={isSubmitting}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="serviceAces" className="text-sm text-indigo-300 font-medium">
                    Service Aces
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setServiceAces((p) => Math.max(0, (typeof p === 'number' ? p : 0) - 1))}
                      className="w-10 h-10 rounded-xl bg-indigo-800/50 hover:bg-indigo-700 text-white font-bold text-xl transition disabled:opacity-50"
                      disabled={isSubmitting || (typeof serviceAces === 'number' && serviceAces <= 0)}
                    >
                      −
                    </button>
                    <input
                      id="serviceAces"
                      type="number"
                      min="0"
                      step="1"
                      value={serviceAces}
                      onChange={(e) => setServiceAces(e.target.value ? parseInt(e.target.value, 10) : '')}
                      className="w-full bg-indigo-900/60 border border-white/10 rounded-xl py-2.5 text-white text-center focus:outline-none focus:ring-2 focus:ring-lime-400/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setServiceAces((p) => (typeof p === 'number' ? p + 1 : 1))}
                      className="w-10 h-10 rounded-xl bg-indigo-800/50 hover:bg-indigo-700 text-white font-bold text-xl transition disabled:opacity-50"
                      disabled={isSubmitting}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="netBlocks" className="text-sm text-indigo-300 font-medium">
                    Net Blocks
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setNetBlocks((p) => Math.max(0, (typeof p === 'number' ? p : 0) - 1))}
                      className="w-10 h-10 rounded-xl bg-indigo-800/50 hover:bg-indigo-700 text-white font-bold text-xl transition disabled:opacity-50"
                      disabled={isSubmitting || (typeof netBlocks === 'number' && netBlocks <= 0)}
                    >
                      −
                    </button>
                    <input
                      id="netBlocks"
                      type="number"
                      min="0"
                      step="1"
                      value={netBlocks}
                      onChange={(e) => setNetBlocks(e.target.value ? parseInt(e.target.value, 10) : '')}
                      className="w-full bg-indigo-900/60 border border-white/10 rounded-xl py-2.5 text-white text-center focus:outline-none focus:ring-2 focus:ring-lime-400/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setNetBlocks((p) => (typeof p === 'number' ? p + 1 : 1))}
                      className="w-10 h-10 rounded-xl bg-indigo-800/50 hover:bg-indigo-700 text-white font-bold text-xl transition disabled:opacity-50"
                      disabled={isSubmitting}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="groundDigs" className="text-sm text-indigo-300 font-medium">
                    Ground Digs
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setGroundDigs((p) => Math.max(0, (typeof p === 'number' ? p : 0) - 1))}
                      className="w-10 h-10 rounded-xl bg-indigo-800/50 hover:bg-indigo-700 text-white font-bold text-xl transition disabled:opacity-50"
                      disabled={isSubmitting || (typeof groundDigs === 'number' && groundDigs <= 0)}
                    >
                      −
                    </button>
                    <input
                      id="groundDigs"
                      type="number"
                      min="0"
                      step="1"
                      value={groundDigs}
                      onChange={(e) => setGroundDigs(e.target.value ? parseInt(e.target.value, 10) : '')}
                      className="w-full bg-indigo-900/60 border border-white/10 rounded-xl py-2.5 text-white text-center focus:outline-none focus:ring-2 focus:ring-lime-400/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setGroundDigs((p) => (typeof p === 'number' ? p + 1 : 1))}
                      className="w-10 h-10 rounded-xl bg-indigo-800/50 hover:bg-indigo-700 text-white font-bold text-xl transition disabled:opacity-50"
                      disabled={isSubmitting}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="settingAssists" className="text-sm text-indigo-300 font-medium">
                    Setting Assists
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setSettingAssists((p) => Math.max(0, (typeof p === 'number' ? p : 0) - 1))}
                      className="w-10 h-10 rounded-xl bg-indigo-800/50 hover:bg-indigo-700 text-white font-bold text-xl transition disabled:opacity-50"
                      disabled={isSubmitting || (typeof settingAssists === 'number' && settingAssists <= 0)}
                    >
                      −
                    </button>
                    <input
                      id="settingAssists"
                      type="number"
                      min="0"
                      step="1"
                      value={settingAssists}
                      onChange={(e) => setSettingAssists(e.target.value ? parseInt(e.target.value, 10) : '')}
                      className="w-full bg-indigo-900/60 border border-white/10 rounded-xl py-2.5 text-white text-center focus:outline-none focus:ring-2 focus:ring-lime-400/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setSettingAssists((p) => (typeof p === 'number' ? p + 1 : 1))}
                      className="w-10 h-10 rounded-xl bg-indigo-800/50 hover:bg-indigo-700 text-white font-bold text-xl transition disabled:opacity-50"
                      disabled={isSubmitting}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Football */}
            {showFootballStats && (
              <div className="grid grid-cols-2 items-center gap-3 bg-indigo-950/50 p-4 rounded-2xl border border-white/5">
                <h3 className="col-span-2 text-xs font-black italic uppercase text-indigo-300 tracking-wider mb-1">
                  🏈 Football Stats
                </h3>

                <div>
                  <label htmlFor="passingYards" className="text-sm text-indigo-300 font-medium">
                    Passing Yards
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setPassingYards((p) => Math.max(0, (typeof p === 'number' ? p : 0) - 1))}
                      className="w-10 h-10 rounded-xl bg-indigo-800/50 hover:bg-indigo-700 text-white font-bold text-xl transition disabled:opacity-50"
                      disabled={isSubmitting || (typeof passingYards === 'number' && passingYards <= 0)}
                    >
                      −
                    </button>
                    <input
                      id="passingYards"
                      type="number"
                      min="0"
                      step="1"
                      value={passingYards}
                      onChange={(e) => setPassingYards(e.target.value ? parseInt(e.target.value, 10) : '')}
                      className="w-full bg-indigo-900/60 border border-white/10 rounded-xl py-2.5 text-white text-center focus:outline-none focus:ring-2 focus:ring-lime-400/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0"
                      required
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setPassingYards((p) => (typeof p === 'number' ? p + 1 : 1))}
                      className="w-10 h-10 rounded-xl bg-indigo-800/50 hover:bg-indigo-700 text-white font-bold text-xl transition disabled:opacity-50"
                      disabled={isSubmitting}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="touchdowns" className="text-sm text-indigo-300 font-medium">
                    Touchdowns
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setTouchdowns((p) => Math.max(0, (typeof p === 'number' ? p : 0) - 1))}
                      className="w-10 h-10 rounded-xl bg-indigo-800/50 hover:bg-indigo-700 text-white font-bold text-xl transition disabled:opacity-50"
                      disabled={isSubmitting || (typeof touchdowns === 'number' && touchdowns <= 0)}
                    >
                      −
                    </button>
                    <input
                      id="touchdowns"
                      type="number"
                      min="0"
                      step="1"
                      value={touchdowns}
                      onChange={(e) => setTouchdowns(e.target.value ? parseInt(e.target.value, 10) : '')}
                      className="w-full bg-indigo-900/60 border border-white/10 rounded-xl py-2.5 text-white text-center focus:outline-none focus:ring-2 focus:ring-lime-400/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0"
                      required
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setTouchdowns((p) => (typeof p === 'number' ? p + 1 : 1))}
                      className="w-10 h-10 rounded-xl bg-indigo-800/50 hover:bg-indigo-700 text-white font-bold text-xl transition disabled:opacity-50"
                      disabled={isSubmitting}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tennis */}
            {showTennisStats && (
              <div className="grid grid-cols-2 items-center gap-3 bg-indigo-950/50 p-4 rounded-2xl border border-white/5">
                <h3 className="col-span-2 text-xs font-black italic uppercase text-indigo-300 tracking-wider mb-1">
                  🎾 Tennis Stats
                </h3>

                <div>
                  <label htmlFor="tennisAcesServed" className="text-sm text-indigo-300 font-medium">
                    Aces Served
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setTennisAcesServed((p) => Math.max(0, (typeof p === 'number' ? p : 0) - 1))}
                      className="w-10 h-10 rounded-xl bg-indigo-800/50 hover:bg-indigo-700 text-white font-bold text-xl transition disabled:opacity-50"
                      disabled={isSubmitting || (typeof tennisAcesServed === 'number' && tennisAcesServed <= 0)}
                    >
                      −
                    </button>
                    <input
                      id="tennisAcesServed"
                      type="number"
                      min="0"
                      step="1"
                      value={tennisAcesServed}
                      onChange={(e) => setTennisAcesServed(e.target.value ? parseInt(e.target.value, 10) : '')}
                      className="w-full bg-indigo-900/60 border border-white/10 rounded-xl py-2.5 text-white text-center focus:outline-none focus:ring-2 focus:ring-lime-400/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0"
                      required
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setTennisAcesServed((p) => (typeof p === 'number' ? p + 1 : 1))}
                      className="w-10 h-10 rounded-xl bg-indigo-800/50 hover:bg-indigo-700 text-white font-bold text-xl transition disabled:opacity-50"
                      disabled={isSubmitting}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="breakPointsWon" className="text-sm text-indigo-300 font-medium">
                    Break Points Won
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setBreakPointsWon((p) => Math.max(0, (typeof p === 'number' ? p : 0) - 1))}
                      className="w-10 h-10 rounded-xl bg-indigo-800/50 hover:bg-indigo-700 text-white font-bold text-xl transition disabled:opacity-50"
                      disabled={isSubmitting || (typeof breakPointsWon === 'number' && breakPointsWon <= 0)}
                    >
                      −
                    </button>
                    <input
                      id="breakPointsWon"
                      type="number"
                      min="0"
                      step="1"
                      value={breakPointsWon}
                      onChange={(e) => setBreakPointsWon(e.target.value ? parseInt(e.target.value, 10) : '')}
                      className="w-full bg-indigo-900/60 border border-white/10 rounded-xl py-2.5 text-white text-center focus:outline-none focus:ring-2 focus:ring-lime-400/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0"
                      required
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setBreakPointsWon((p) => (typeof p === 'number' ? p + 1 : 1))}
                      className="w-10 h-10 rounded-xl bg-indigo-800/50 hover:bg-indigo-700 text-white font-bold text-xl transition disabled:opacity-50"
                      disabled={isSubmitting}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Selection summary */}
            <div className="text-sm text-indigo-300 flex flex-wrap justify-between gap-2">
              <span>
                Sport: <span className="text-white font-medium">{getDisplaySport()}</span>
              </span>
              <span>
                Outcome:{' '}
                <span className={`font-medium ${outcome === 'win' ? 'text-lime-400' : 'text-rose-400'}`}>
                  {outcome === 'win' ? '🏆 Win' : 'Loss'}
                </span>
              </span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={() => {
                if (!xpToast) onClose();
              }}
              className="flex-1 text-md py-2.5 bg-indigo-800/50 hover:bg-indigo-800 text-white font-bold rounded-xl transition disabled:opacity-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 text-md py-2 bg-lime-400 hover:bg-lime-300 text-black font-black italic rounded-xl transition shadow-lg shadow-lime-400/20 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={submitDisabled}
            >
              {isSubmitting ? 'Submitting...' : 'Submit & Earn +200 XP'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};