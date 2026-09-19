// frontend/src/context/SportFilterContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { SportType } from '../types';

export const VALID_SPORTS: SportType[] = [
  'basketball',
  'volleyball',
  'soccer',
  'baseball',
  'softball',
  'pickleball',
  'football',
  'tennis',
];

export const SPORT_DISPLAY_METADATA: Record<
  SportType,
  { label: string; icon: string; accentColor: string }
> = {
  volleyball: {
    label: 'Volleyball',
    icon: '🏐',
    accentColor: 'from-amber-400 to-orange-500',
  },
  basketball: {
    label: 'Basketball',
    icon: '🏀',
    accentColor: 'from-orange-500 to-amber-500',
  },
  soccer: {
    label: 'Soccer',
    icon: '⚽',
    accentColor: 'from-emerald-400 to-teal-500',
  },
  baseball: {
    label: 'Baseball',
    icon: '⚾',
    accentColor: 'from-rose-500 to-red-600',
  },
  softball: {
    label: 'Softball',
    icon: '🥎',
    accentColor: 'from-yellow-400 to-amber-500',
  },
  pickleball: {
    label: 'Pickleball',
    icon: '🏓',
    accentColor: 'from-lime-400 to-emerald-500',
  },
  football: {
    label: 'Football',
    icon: '🏈',
    accentColor: 'from-indigo-500 to-purple-600',
  },
  tennis: {
    label: 'Tennis',
    icon: '🎾',
    accentColor: 'from-yellow-400 to-lime-500',
  },
};

export const SPORT_FILTER_EVENT = 'playground_sport_filter_changed';

export interface SportFilterChangeEventDetail {
  sport: SportType;
  timestamp: number;
  source?: string;
}

/**
 * Data-validation middleware:
 * Validates and sanitizes any candidate sport string against the supported SportType registry.
 */
export function validateAndSanitizeSport(
  candidate: any,
  defaultFallback: SportType = 'volleyball'
): SportType {
  if (typeof candidate === 'string') {
    const normalized = candidate.toLowerCase().trim();
    if (VALID_SPORTS.includes(normalized as SportType)) {
      return normalized as SportType;
    }
  }
  return defaultFallback;
}

interface SportFilterContextValue {
  activeSportFilter: SportType;
  isFiltering: boolean;
  setSportFilter: (sport: SportType, source?: string) => void;
  setActiveSportFilter: (sport: SportType, source?: string) => void;
  validSports: SportType[];
  sportMeta: typeof SPORT_DISPLAY_METADATA;
}

const SportFilterContext = createContext<SportFilterContextValue | undefined>(
  undefined
);

const STORAGE_KEY = 'playground_active_sport_filter';

export const SportFilterProvider: React.FC<{
  children: React.ReactNode;
  initialDefaultSport?: SportType;
}> = ({ children, initialDefaultSport = 'volleyball' }) => {
  const [activeSportFilter, setActiveSportFilterState] = useState<SportType>(
    () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          return validateAndSanitizeSport(stored, initialDefaultSport);
        }
      } catch (e) {
        console.warn('Could not read stored sport filter', e);
      }
      return initialDefaultSport;
    }
  );

  const [isFiltering, setIsFiltering] = useState<boolean>(false);

  const setSportFilter = useCallback(
    (rawSport: SportType, source: string = 'ui') => {
      const validatedSport = validateAndSanitizeSport(
        rawSport,
        activeSportFilter
      );

      setIsFiltering(true);
      setActiveSportFilterState(validatedSport);

      try {
        localStorage.setItem(STORAGE_KEY, validatedSport);
      } catch (e) {
        console.warn('Could not save sport filter to localStorage', e);
      }

      if (typeof window !== 'undefined') {
        const eventDetail: SportFilterChangeEventDetail = {
          sport: validatedSport,
          timestamp: Date.now(),
          source,
        };
        window.dispatchEvent(
          new CustomEvent(SPORT_FILTER_EVENT, { detail: eventDetail })
        );
      }

      setTimeout(() => {
        setIsFiltering(false);
      }, 450);
    },
    [activeSportFilter]
  );

  useEffect(() => {
    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent<SportFilterChangeEventDetail>;
      if (customEvent.detail && customEvent.detail.sport) {
        const validated = validateAndSanitizeSport(
          customEvent.detail.sport,
          activeSportFilter
        );
        if (validated !== activeSportFilter) {
          setActiveSportFilterState(validated);
          setIsFiltering(true);
          setTimeout(() => setIsFiltering(false), 450);
        }
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        const validated = validateAndSanitizeSport(
          e.newValue,
          activeSportFilter
        );
        setActiveSportFilterState(validated);
      }
    };

    window.addEventListener(SPORT_FILTER_EVENT, handleCustomEvent);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(SPORT_FILTER_EVENT, handleCustomEvent);
      window.removeEventListener('storage', handleStorage);
    };
  }, [activeSportFilter]);

  const value = useMemo<SportFilterContextValue>(
    () => ({
      activeSportFilter,
      isFiltering,
      setSportFilter,
      setActiveSportFilter: setSportFilter,
      validSports: VALID_SPORTS,
      sportMeta: SPORT_DISPLAY_METADATA,
    }),
    [activeSportFilter, isFiltering, setSportFilter]
  );

  return (
    <SportFilterContext.Provider value={value}>
      {children}
    </SportFilterContext.Provider>
  );
};

export function useSportFilterContext(): SportFilterContextValue {
  const ctx = useContext(SportFilterContext);
  if (!ctx) {
    throw new Error(
      'useSportFilterContext must be used within a SportFilterProvider'
    );
  }
  return ctx;
}