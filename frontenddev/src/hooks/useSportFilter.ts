// frontend/src/hooks/useSportFilter.ts
import { useMemo } from 'react';
import {
  AthleteProfile,
  PickupGame,
  Tournament,
  SportType,
  HighlightClip,
} from '../types';
import { validateAndSanitizeSport } from '../context/SportFilterContext';

export function useSportFilter({
  userSport,
  athletes,
  pickupGames,
  tournaments,
  highlights,
}: {
  userSport: SportType;
  athletes: AthleteProfile[];
  pickupGames: PickupGame[];
  tournaments: Tournament[];
  highlights?: HighlightClip[];
}) {
  const activeSport = useMemo(
    () => validateAndSanitizeSport(userSport, 'volleyball'),
    [userSport]
  );

  const filteredAthletes = useMemo(() => {
    if (!athletes || athletes.length === 0) return [];

    const primaryMatches = athletes.filter(
      (a) => a.primarySport === activeSport
    );

    const secondaryMatches = athletes.filter((a) => {
      if (a.primarySport === activeSport) return false;
      const st = a.stats && a.stats[activeSport];
      return Boolean(st && (st as any).gamesPlayed > 0);
    });

    if (primaryMatches.length > 0 || secondaryMatches.length > 0) {
      return [...primaryMatches, ...secondaryMatches];
    }

    return [...athletes].sort((a, b) => {
      if (a.primarySport === activeSport) return -1;
      if (b.primarySport === activeSport) return 1;
      return (b.xp || 0) - (a.xp || 0);
    });
  }, [athletes, activeSport]);

  const filteredPickupGames = useMemo(() => {
    if (!pickupGames || pickupGames.length === 0) return [];
    const matched = pickupGames.filter((g) => g.sport === activeSport);
    if (matched.length > 0) return matched;
    const fallback = pickupGames.filter(
      (g) => !g.sport || g.sport === activeSport
    );
    return fallback.length > 0 ? fallback : pickupGames;
  }, [pickupGames, activeSport]);

  const filteredTournaments = useMemo(() => {
    if (!tournaments || tournaments.length === 0) return [];
    const matched = tournaments.filter((t) => t.sport === activeSport);
    if (matched.length > 0) return matched;
    return tournaments;
  }, [tournaments, activeSport]);

  const filteredHighlights = useMemo(() => {
    if (!highlights || highlights.length === 0) return [];
    const matched = highlights.filter((h) => h.sport === activeSport);
    if (matched.length > 0) return matched;
    return highlights.filter((h) => !h.sport || h.sport === activeSport);
  }, [highlights, activeSport]);

  return {
    activeSport,
    filteredAthletes,
    filteredPickupGames,
    filteredTournaments,
    filteredHighlights,
  };
}