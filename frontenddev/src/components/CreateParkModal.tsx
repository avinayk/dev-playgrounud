import React, { useState } from 'react';
import {
  X,
  MapPin,
  Save,
  Loader2,
  Plus,
  AlertCircle,
  CheckCircle2,
  Navigation,
} from 'lucide-react';
import { createCourtAPI } from '../services/courts.service';
import { triggerHaptic } from '../utils/haptics';

interface CreateParkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newCourt: any) => void;
  user?: {
    id?: string;
    registeredCity?: string;
    registeredState?: string;
  };
}

const SPORTS = [
  { id: 'basketball', label: 'Basketball 🏀' },
  { id: 'volleyball', label: 'Volleyball 🏐' },
  { id: 'pickleball', label: 'Pickleball 🏓' },
  { id: 'soccer', label: 'Soccer ⚽' },
  { id: 'baseball', label: 'Baseball ⚾' },
  { id: 'softball', label: 'Softball 🥎' },
];

export const CreateParkModal: React.FC<CreateParkModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  user,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    sport: 'basketball',
    city: user?.registeredCity || '',
    state: user?.registeredState || '',
    address: '',
    lat: '',
    lng: '',
    imageUrl: '',
    rating: 4.5,
    activePlayersNow: 0,
  });

  const handleChange = (field: keyof typeof form, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleGetCurrentLocation = () => {
    triggerHaptic('light');
    if (!('geolocation' in navigator)) {
      setError('Geolocation not supported in your browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((prev) => ({
          ...prev,
          lat: pos.coords.latitude.toFixed(8),
          lng: pos.coords.longitude.toFixed(8),
        }));
        setSuccess('Location captured ✅');
        setTimeout(() => setSuccess(null), 2000);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setError('Could not fetch location. Please enable GPS.');
      },
      { timeout: 5000, enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.name.trim()) return setError('Court name is required');
    if (!form.city.trim()) return setError('City is required');
    if (!form.state.trim()) return setError('State is required');
    if (!form.sport) return setError('Sport is required');

    setIsSubmitting(true);
    triggerHaptic('medium');

    try {
      const created = await createCourtAPI({
        name: form.name.trim(),
        sport: form.sport,
        city: form.city.trim(),
        state: form.state.trim().toUpperCase(),
        address: form.address.trim() || null,
        lat: form.lat ? Number(form.lat) : null,
        lng: form.lng ? Number(form.lng) : null,
        imageUrl: form.imageUrl.trim() || null,
        rating: Number(form.rating) || 4.5,
        activePlayersNow: Number(form.activePlayersNow) || 0,
        isActive: true,
      } as any);

      triggerHaptic('success');
      setSuccess(`Court "${created.name}" added successfully! 🏀`);

      setTimeout(() => {
        onCreated?.(created);
        resetForm();
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('❌ Create court failed:', err);
      setError(err?.message || 'Failed to add court. Try again.');
      triggerHaptic('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      sport: 'basketball',
      city: user?.registeredCity || '',
      state: user?.registeredState || '',
      address: '',
      lat: '',
      lng: '',
      imageUrl: '',
      rating: 4.5,
      activePlayersNow: 0,
    });
    setError(null);
    setSuccess(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-indigo-950 border border-lime-400/40 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-5 sticky top-0 bg-indigo-950/95 backdrop-blur-md z-10">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-lime-400 text-black rounded-xl">
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-lg font-black italic uppercase">
                Add New Court
              </h3>
              <p className="text-[10px] text-indigo-300 font-mono">
                Submit a community park to Playground League
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="p-2 text-indigo-300 hover:text-white rounded-xl hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/40 rounded-xl flex items-center gap-2 text-xs text-rose-300 font-bold">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="p-3 bg-lime-400/10 border border-lime-400/40 rounded-xl flex items-center gap-2 text-xs text-lime-300 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>{success}</span>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-xs font-black uppercase text-indigo-200 mb-1">
              Court / Park Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Rucker Park"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full p-2.5 bg-indigo-900/80 border border-white/10 rounded-xl font-bold text-white outline-none focus:ring-2 focus:ring-lime-400"
            />
          </div>

          {/* Sport */}
          <div>
            <label className="block text-xs font-black uppercase text-indigo-200 mb-1">
              Primary Sport *
            </label>
            <select
              value={form.sport}
              onChange={(e) => handleChange('sport', e.target.value)}
              className="w-full p-2.5 bg-indigo-900/80 border border-white/10 rounded-xl font-bold text-white outline-none focus:ring-2 focus:ring-lime-400"
            >
              {SPORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* City + State */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase text-indigo-200 mb-1">
                City *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. New York"
                value={form.city}
                onChange={(e) => handleChange('city', e.target.value)}
                className="w-full p-2.5 bg-indigo-900/80 border border-white/10 rounded-xl font-bold text-white outline-none focus:ring-2 focus:ring-lime-400"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-indigo-200 mb-1">
                State *
              </label>
              <input
                type="text"
                required
                maxLength={2}
                placeholder="NY"
                value={form.state}
                onChange={(e) =>
                  handleChange('state', e.target.value.toUpperCase())
                }
                className="w-full p-2.5 bg-indigo-900/80 border border-white/10 rounded-xl font-bold text-white outline-none focus:ring-2 focus:ring-lime-400"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-black uppercase text-indigo-200 mb-1">
              Street Address
            </label>
            <input
              type="text"
              placeholder="e.g. 155th St & Frederick Douglass Blvd"
              value={form.address}
              onChange={(e) => handleChange('address', e.target.value)}
              className="w-full p-2.5 bg-indigo-900/80 border border-white/10 rounded-xl font-bold text-white outline-none focus:ring-2 focus:ring-lime-400"
            />
          </div>

          {/* GPS Location */}
          <div>
            <label className="block text-xs font-black uppercase text-indigo-200 mb-1 flex items-center justify-between">
              <span>GPS Coordinates</span>
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                className="text-[10px] text-lime-400 hover:text-lime-300 font-black uppercase flex items-center gap-1"
              >
                <Navigation className="w-3 h-3" />
                Use My Location
              </button>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                step="0.00000001"
                placeholder="Latitude"
                value={form.lat}
                onChange={(e) => handleChange('lat', e.target.value)}
                className="w-full p-2.5 bg-indigo-900/80 border border-white/10 rounded-xl font-mono text-xs text-white outline-none focus:ring-2 focus:ring-lime-400"
              />
              <input
                type="number"
                step="0.00000001"
                placeholder="Longitude"
                value={form.lng}
                onChange={(e) => handleChange('lng', e.target.value)}
                className="w-full p-2.5 bg-indigo-900/80 border border-white/10 rounded-xl font-mono text-xs text-white outline-none focus:ring-2 focus:ring-lime-400"
              />
            </div>
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-xs font-black uppercase text-indigo-200 mb-1">
              Court Photo URL (optional)
            </label>
            <input
              type="url"
              placeholder="https://images.unsplash.com/..."
              value={form.imageUrl}
              onChange={(e) => handleChange('imageUrl', e.target.value)}
              className="w-full p-2.5 bg-indigo-900/80 border border-white/10 rounded-xl font-bold text-white outline-none focus:ring-2 focus:ring-lime-400"
            />
          </div>

          {/* Rating + Players */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase text-indigo-200 mb-1">
                Rating (1-5)
              </label>
              <input
                type="number"
                min="1"
                max="5"
                step="0.1"
                value={form.rating}
                onChange={(e) => handleChange('rating', e.target.value)}
                className="w-full p-2.5 bg-indigo-900/80 border border-white/10 rounded-xl font-bold text-white outline-none focus:ring-2 focus:ring-lime-400"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-indigo-200 mb-1">
                Players Now
              </label>
              <input
                type="number"
                min="0"
                value={form.activePlayersNow}
                onChange={(e) =>
                  handleChange('activePlayersNow', e.target.value)
                }
                className="w-full p-2.5 bg-indigo-900/80 border border-white/10 rounded-xl font-bold text-white outline-none focus:ring-2 focus:ring-lime-400"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 flex justify-end space-x-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 bg-indigo-900 hover:bg-indigo-800 text-indigo-200 rounded-xl font-bold text-xs transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-lime-400 hover:bg-lime-300 text-black font-black italic uppercase rounded-xl text-xs transition shadow-lg disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Add Court</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};