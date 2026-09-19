// components/HostGameModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import { X, MapPin, Calendar, Clock, Users, Flame, Search } from 'lucide-react';
import type { PickupGameFormData } from '../types/pickupGames';
import { geocodeAddress } from '../services/geocoding';
interface HostGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: PickupGameFormData) => void | Promise<void>; // ✅ typed + async allowed
  user?: {
    id: string;        // ✅ ADD THIS
    name?: string;
    level: number;
  };
}
// Predefined venues list
const VENUES = [
  "Holcombe Rucker Park (155th St & Frederick Douglass Blvd, Harlem, NY)",
  "North Rockland high school (106 Hammond Rd)",
  'West 4th St "The Cage" (W 4th St & 6th Ave, Greenwich Village, NY)',
  "Central Park Ballfield #4 (Central Park South Diamond Field, NY)",
  "Pier 40 Waterfront Soccer Turf (353 West St, New York, NY)",
  "McCarren Park Volleyball Courts (Driggs Ave & Lorimer St, Brooklyn, NY)",
  "Riverside Park Softball Diamond #2 (Riverside Dr & W 101st St, New York, NY)",
  "Hudson River Park Pickleball Hub (Pier 25 & West St, New York, NY)",
  "Brooklyn Technical High School Gym & Track (29 Fort Greene Pl, Brooklyn, NY)",
  "DeMatha Catholic High School Gymnasium (4313 Madison St, Hyattsville, MD)",
  "Long Beach Poly High School Jackrabbit Gymnasium (1600 Atlantic Ave, Long Beach, CA)",
  "Lincoln Park High School Athletic Field & Courts (2001 N Orchard St, Chicago, IL)",
  "Lower Merion High School Kobe Bryant Gym (315 E Montgomery Ave, Ardmore, PA)",
  "Mater Dei High School Meruelo Athletic Center (1202 W Edinger Ave, Santa Ana, CA)",
  "Sierra Canyon High School Athletics Complex (20800 Rinaldi St, Chatsworth, CA)",
  "Simeon Career Academy Gymnasium (8147 S Vincennes Ave, Chicago, IL)",
  "Stuyvesant High School Gymnasium & Athletic Center (345 Chambers St, New York, NY)",
  "Westlake High School Varsity Gymnasium (4100 Westbank Dr, Austin, TX)",
  "Astoria Park Pickleball & Tennis Courts (19th St & 23rd Ave, Astoria, NY)",
  "Pelham Bay Athletic Fields & Baseball Diamond (Bruckner Blvd & Middletown Rd, Bronx, NY)",
];


// Sport options with emojis
const SPORTS = [
  { value: 'basketball', label: 'Basketball', emoji: '🏀' },
  { value: 'pickleball', label: 'Pickleball', emoji: '🏀' },
  { value: 'baseball', label: 'Baseball', emoji: '⚾' },
  { value: 'softball', label: 'Softball', emoji: '🥎' },
  { value: 'soccer', label: 'Soccer', emoji: '⚽' },
  { value: 'volleyball', label: 'Volleyball', emoji: '🏐' },
  { value: 'football', label: 'Football', emoji: '🏈' },
  { value: 'tennis', label: 'Tennis', emoji: '🎾' },
];

// Competitive levels
const COMPETITIVE_LEVELS = [
  { value: 'casual', label: 'Casual' },
  { value: 'competitive', label: 'Competitive' },
  { value: 'varsity', label: 'Varsity / Intramural' },
];

export const HostGameModal: React.FC<HostGameModalProps> = ({ 
  isOpen, 
  onClose,
  onSave,
  user 
}) => {
  const [gameData, setGameData] = useState({
    gameTitle: '',
    sport: 'basketball',
    competitiveLevel: 'casual',
    venue: '',
    location: '',
    lat: null,          // ✅ ADD
    lng: null,          // ✅ ADD
    date: '',
    time: '',
    maxPlayers: 10,
    gameType: 'pickup',
    skillLevel: 'intermediate',
    description: '',
  });
  const [isGeocoding, setIsGeocoding] = useState(false);

  const [venueSearch, setVenueSearch] = useState('');
  const [showVenueDropdown, setShowVenueDropdown] = useState(false);
  const venueRef = useRef<HTMLDivElement>(null);
  const [submitting, setSubmitting] = useState(false);
  // Filter venues based on search
  const filteredVenues = venueSearch
    ? VENUES.filter(v => v.toLowerCase().includes(venueSearch.toLowerCase()))
    : VENUES;

  // Handle ESC key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Close venue dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (venueRef.current && !venueRef.current.contains(e.target as Node)) {
        setShowVenueDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    // validation
    if (!gameData.gameTitle.trim()) {
      alert('Please enter a game title');
      return;
    }
    if (!gameData.venue && !gameData.location) {
      alert('Please select or enter a venue');
      return;
    }

    setSubmitting(true);
    try {
      await onSave(gameData);   // ✅ wait karo
      onClose();                // ✅ success ke baad band karo
    } catch (err) {
      // parent ne error alert kiya, modal open rakho
      console.error('Save failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setGameData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleVenueSelect = async (venueName: string) => {
    setVenueSearch(venueName);
    setShowVenueDropdown(false);

    // Set name immediately
    setGameData((prev) => ({
      ...prev,
      venue: venueName,
      location: venueName,
      lat: null,      // reset until geocoded
      lng: null,
    }));

    // Geocode in background
    setIsGeocoding(true);
    try {
      const coords = await geocodeAddress(venueName);
      if (coords) {
        setGameData((prev) => ({
          ...prev,
          lat: coords.lat,
          lng: coords.lng,
        }));
        console.log('✅ Coordinates:', coords);
      } else {
        console.warn('⚠️ Could not geocode:', venueName);
      }
    } finally {
      setIsGeocoding(false);
    }
  };
  const handleVenueInputBlur = async () => {
    if (!gameData.venue || gameData.lat !== null) return;

    setIsGeocoding(true);
    try {
      const coords = await geocodeAddress(gameData.venue);
      console.log(coords);
      if (coords) {
        setGameData((prev) => ({ ...prev, lat: coords.lat, lng: coords.lng }));
      }
    } finally {
      setIsGeocoding(false);
    }
  };
  const handleVenueInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setVenueSearch(value);
    setGameData(prev => ({
      ...prev,
      venue: value,
      location: value
    }));
    setShowVenueDropdown(true);
  };

  const getSportEmoji = (sportValue: string) => {
    const sport = SPORTS.find(s => s.value === sportValue);
    return sport ? sport.emoji : '🏀';
  };

  const getSportLabel = (sportValue: string) => {
    const sport = SPORTS.find(s => s.value === sportValue);
    return sport ? sport.label : sportValue;
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-indigo-950/95 p-6 rounded-3xl w-11/12 max-w-lg border border-white/10 shadow-2xl relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-indigo-900/80 text-indigo-300 hover:text-white hover:bg-indigo-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-rose-500/20 rounded-xl border border-rose-400/30">
            <Flame className="w-6 h-6 text-rose-400" />
          </div>
          <div>
            <h2 className="text-xl font-black italic uppercase text-white">
              Host Pickup Game
            </h2>
            <p className="text-sm text-indigo-300">
              {user?.name ? `Hosting as ${user.name}` : 'Create a new pickup game'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Game Title */}
          <div>
            <label className="text-sm text-indigo-300 font-medium flex items-center space-x-2">
              <span>Game Title *</span>
            </label>
            <input
              type="text"
              name="gameTitle"
              value={gameData.gameTitle}
              onChange={handleChange}
              className="w-full bg-indigo-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-white mt-1 placeholder-indigo-400/50 focus:border-lime-400 focus:ring-1 focus:ring-lime-400 transition"
              placeholder="e.g., 5v5 Friday Playground Run"
              required
            />
          </div>
        <div className="grid grid-cols-2 gap-3">
          {/* Sport */}
          <div>
            <label className="text-sm text-indigo-300 font-medium flex items-center space-x-2">
              <span>Sport</span>
            </label>
            <select
              name="sport"
              value={gameData.sport}
              onChange={handleChange}
              className="w-full bg-indigo-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-white mt-1 focus:border-lime-400 focus:ring-1 focus:ring-lime-400 transition"
            >
              {SPORTS.map(sport => (
                <option key={sport.value} value={sport.value}>
                  {sport.emoji} {sport.label}
                </option>
              ))}
            </select>
          </div>

          {/* Competitive Level */}
          <div>
            <label className="text-sm text-indigo-300 font-medium flex items-center space-x-2">
              <span>Competitive Level</span>
            </label>
            <select
              name="competitiveLevel"
              value={gameData.competitiveLevel}
              onChange={handleChange}
              className="w-full bg-indigo-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-white mt-1 focus:border-lime-400 focus:ring-1 focus:ring-lime-400 transition"
            >
              {COMPETITIVE_LEVELS.map(level => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>
</div>
          {/* Venue / Court Selector with Autocomplete */}
          <div ref={venueRef} className="relative">
            <label className="text-sm text-indigo-300 font-medium flex items-center space-x-2">
              <MapPin className="w-4 h-4" />
              <span>Select Court / Park Venue</span>
            </label>
            <div className="relative mt-1">
              <input
                type="text"
                value={venueSearch}
                onChange={handleVenueInputChange}
                onFocus={() => setShowVenueDropdown(true)}
                onBlur={handleVenueInputBlur}
                className="w-full bg-indigo-900/60 border border-white/10 rounded-xl px-4 py-2.5 pl-10 text-white placeholder-indigo-400/50 focus:border-lime-400 focus:ring-1 focus:ring-lime-400 transition"
                placeholder="Search for a venue..."
                autoComplete="off"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
            </div>
            
            {/* Venue Dropdown */}
            {showVenueDropdown && filteredVenues.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-indigo-900/95 border border-white/10 rounded-xl max-h-48 overflow-y-auto shadow-xl backdrop-blur-sm">
                {filteredVenues.map((venue, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleVenueSelect(venue)}
                    className="w-full text-left px-4 py-2.5 text-white hover:bg-indigo-800/70 transition text-sm border-b border-white/5 last:border-0"
                  >
                    {venue}
                  </button>
                ))}
              </div>
            )}
            
            {/* Selected venue display */}
            {gameData.venue && !venueSearch && (
              <div className="mt-2 px-4 py-2.5 bg-indigo-800/40 rounded-xl border border-indigo-700/30 text-white text-sm">
                <span className="text-indigo-300">📍</span> {gameData.venue}
              </div>
            )}
          </div>
 
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-indigo-300 font-medium flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>Date</span>
              </label>
              <input
                type="date"
                name="date"
                value={gameData.date}
                onChange={handleChange}
                min={new Date().toISOString().split('T')[0]} 
                className="w-full bg-indigo-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-white mt-1 focus:border-lime-400 focus:ring-1 focus:ring-lime-400 transition"
                required
              />
            </div>
            <div>
              <label className="text-sm text-indigo-300 font-medium flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Time</span>
              </label>
              <input
                type="time"
                name="time"
                value={gameData.time}
                onChange={handleChange}
                className="w-full bg-indigo-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-white mt-1 focus:border-lime-400 focus:ring-1 focus:ring-lime-400 transition"
                required
              />
            </div>
          </div>

          

          {/* Max Players */}
          <div>
            <label className="text-sm text-indigo-300 font-medium flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>Max Player Capacity</span>
            </label>
            <input
              type="number"
              name="maxPlayers"
              value={gameData.maxPlayers}
              onChange={handleChange}
              min="2"
              max="20"
              className="w-full bg-indigo-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-white mt-1 focus:border-lime-400 focus:ring-1 focus:ring-lime-400 transition"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm text-indigo-300 font-medium">Game Notes & Rules</label>
            <textarea
              name="description"
              value={gameData.description}
              onChange={handleChange}
              rows={3}
              className="w-full bg-indigo-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-white mt-1 placeholder-indigo-400/50 focus:border-lime-400 focus:ring-1 focus:ring-lime-400 transition resize-none"
              placeholder="Any special rules or notes for players..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-indigo-800/50 hover:bg-indigo-800 text-white font-bold rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white font-black italic rounded-xl transition shadow-lg shadow-rose-500/20 flex items-center justify-center space-x-2"
            >
              <Flame className="w-4 h-4" />
              <span>Host Game</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};