// src/components/regional/GpsMapThumbnail.tsx
import React, { useState } from 'react';
import { MapPin, Navigation, ShieldCheck, Maximize2, X, Globe } from 'lucide-react';

interface GpsMapThumbnailProps {
  latitude?: number;
  longitude?: number;
  locationName?: string;
  city?: string;
  state?: string;
  verifiedAt?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showDetails?: boolean;
}

export const GpsMapThumbnail: React.FC<GpsMapThumbnailProps> = ({
  latitude = 34.0522,
  longitude = -118.2437,
  locationName = 'Playground Arena Court #1',
  city = 'Venice',
  state = 'CA',
  verifiedAt,
  size = 'md',
  className = '',
  showDetails = true,
}) => {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Format coordinates nicely
  const formattedLat = Math.abs(latitude).toFixed(4) + '° ' + (latitude >= 0 ? 'N' : 'S');
  const formattedLng = Math.abs(longitude).toFixed(4) + '° ' + (longitude >= 0 ? 'W' : 'E');

  // Deterministic grid offset based on lat/lng
  const gridOffset = Math.abs(latitude * 100) % 20;

  // Height based on size
  const sizeClasses = {
    sm: 'h-24 w-full text-xs',
    md: 'h-36 w-full text-xs',
    lg: 'h-48 w-full text-sm',
  }[size];

  return (
    <>
      <div
        onClick={() => setIsLightboxOpen(true)}
        className={`group relative overflow-hidden rounded-2xl border border-lime-400/40 bg-slate-950 shadow-lg cursor-pointer transition-all duration-300 hover:border-lime-400 hover:shadow-lime-400/20 ${sizeClasses} ${className}`}
      >
        {/* Dark Map Base Texture */}
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:12px_12px] opacity-70" />

        {/* Simulated Map Grid & Court */}
        <svg
          className="absolute inset-0 w-full h-full opacity-40 group-hover:opacity-60 transition-opacity"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id={`mapGrid-${latitude}-${longitude}`} width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#334155" strokeWidth="0.8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#mapGrid-${latitude}-${longitude})`} />

          {/* Diagonal avenue */}
          <path
            d={`M -20 ${50 + gridOffset} Q 150 ${20 + gridOffset} 350 ${90 + gridOffset}`}
            fill="none"
            stroke="#475569"
            strokeWidth="3.5"
            strokeDasharray="4 2"
          />
          <path
            d={`M ${80 + gridOffset} -20 Q ${120 + gridOffset} 100 ${160 + gridOffset} 250`}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            opacity="0.6"
          />

          {/* Court outline */}
          <rect
            x="50%"
            y="50%"
            width="36"
            height="24"
            transform="translate(-18, -12)"
            fill="#10b981"
            fillOpacity="0.2"
            stroke="#10b981"
            strokeWidth="1.5"
            rx="3"
          />
          <line x1="50%" y1="calc(50% - 12px)" x2="50%" y2="calc(50% + 12px)" stroke="#10b981" strokeWidth="1" opacity="0.6" />
        </svg>

        {/* GPS Radar Animation */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-lime-400/10 to-transparent animate-pulse pointer-events-none" />

        {/* Radar crosshair */}
        <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-lime-400/30 border-r border-dashed border-lime-400/20" />
        <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-lime-400/30 border-b border-dashed border-lime-400/20" />

        {/* Center Pin */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10">
          <div className="relative flex items-center justify-center">
            <span className="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-lime-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-7 w-7 bg-lime-400 text-black items-center justify-center shadow-lg shadow-lime-400/50">
              <MapPin className="w-4 h-4 stroke-[2.5]" />
            </span>
          </div>
          <div className="mt-1 px-2 py-0.5 bg-slate-950/90 text-lime-300 text-[9px] font-mono font-black rounded-md border border-lime-400/50 shadow-md whitespace-nowrap flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" />
            <span>GPS PINNED</span>
          </div>
        </div>

        {/* Top Badge & Expand */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10 pointer-events-none">
          <div className="px-2 py-1 bg-slate-900/90 backdrop-blur-md rounded-lg border border-emerald-500/40 text-[9px] font-mono font-bold text-emerald-300 flex items-center gap-1 shadow">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>VERIFIED GPS</span>
          </div>
          <div className="p-1 bg-slate-900/90 backdrop-blur-md text-indigo-200 rounded-lg border border-white/10 group-hover:bg-lime-400 group-hover:text-black transition">
            <Maximize2 className="w-3 h-3" />
          </div>
        </div>

        {/* Bottom Details */}
        {showDetails && (
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent p-2.5 pt-4 z-10 flex items-end justify-between">
            <div className="min-w-0 pr-2">
              <div className="text-[11px] font-extrabold text-white truncate flex items-center gap-1">
                <Navigation className="w-3 h-3 text-lime-400 shrink-0" />
                <span>{locationName}</span>
              </div>
              <div className="text-[9px] text-indigo-300/80 font-mono flex items-center gap-2 mt-0.5">
                <span>{city}, {state}</span>
                <span>•</span>
                <span className="text-lime-300 font-bold">{formattedLat}, {formattedLng}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-950 border border-lime-400/40 rounded-3xl max-w-lg w-full p-6 space-y-4 text-white shadow-2xl relative overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-lime-400 text-black rounded-xl shadow-md">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-black uppercase text-lime-400 px-2 py-0.5 bg-lime-400/20 rounded border border-lime-400/30">
                    GPS TELEMETRY RECORD
                  </span>
                  <h3 className="text-lg font-black italic uppercase text-white mt-0.5">
                    {locationName}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setIsLightboxOpen(false); }}
                className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Enlarged Map */}
            <div className="relative h-64 w-full rounded-2xl border-2 border-lime-400/50 bg-slate-900 overflow-hidden shadow-inner">
              <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] opacity-80" />

              <svg className="absolute inset-0 w-full h-full opacity-60" xmlns="http://www.w3.org/2000/svg">
                <pattern id="modalMapGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#475569" strokeWidth="1" />
                </pattern>
                <rect width="100%" height="100%" fill="url(#modalMapGrid)" />

                <rect
                  x="50%"
                  y="50%"
                  width="120"
                  height="80"
                  transform="translate(-60, -40)"
                  fill="#059669"
                  fillOpacity="0.25"
                  stroke="#10b981"
                  strokeWidth="2"
                  rx="6"
                />
                <circle cx="50%" cy="50%" r="20" fill="none" stroke="#10b981" strokeWidth="1.5" opacity="0.6" />
                <line x1="50%" y1="calc(50% - 40px)" x2="50%" y2="calc(50% + 40px)" stroke="#10b981" strokeWidth="1.5" opacity="0.8" />
              </svg>

              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10">
                <span className="animate-ping absolute inline-flex h-12 w-12 rounded-full bg-lime-400 opacity-50" />
                <span className="relative inline-flex rounded-full h-10 w-10 bg-lime-400 text-black items-center justify-center shadow-2xl shadow-lime-400">
                  <MapPin className="w-6 h-6 stroke-[2.5]" />
                </span>
                <div className="mt-2 px-3 py-1 bg-black/90 text-lime-300 text-xs font-mono font-black rounded-lg border border-lime-400 shadow-xl">
                  {formattedLat}, {formattedLng}
                </div>
              </div>
            </div>

            {/* Coordinates Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono">
              <div className="p-3 bg-slate-900/90 rounded-xl border border-white/10">
                <span className="text-[10px] text-slate-400 uppercase font-black block">Latitude</span>
                <span className="text-sm font-bold text-lime-400">{latitude.toFixed(6)}</span>
              </div>
              <div className="p-3 bg-slate-900/90 rounded-xl border border-white/10">
                <span className="text-[10px] text-slate-400 uppercase font-black block">Longitude</span>
                <span className="text-sm font-bold text-lime-400">{longitude.toFixed(6)}</span>
              </div>
              <div className="p-3 bg-slate-900/90 rounded-xl border border-white/10 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-400 uppercase font-black block">City & State</span>
                <span className="text-sm font-bold text-white">{city}, {state}</span>
              </div>
            </div>

            <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 font-mono flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Geo-signature verified via mobile device hardware GPS during stat logging session.</span>
            </div>

            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="w-full py-3 bg-lime-400 hover:bg-lime-300 text-black font-black italic uppercase text-xs rounded-xl transition shadow-lg"
            >
              Close Map Confirmation
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default GpsMapThumbnail;