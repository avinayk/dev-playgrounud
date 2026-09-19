// components/PickupGamesMap.tsx
import React, { useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  ZoomControl,
} from 'react-leaflet';
import { divIcon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { PickupGame } from '../types/pickupGames';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface DensityHub {
  id: string;
  name: string;
  lat: number;
  lng: number;
  athletes: number;
  courts: number;
  density: 'moderate' | 'high' | 'extreme' | 'verified';
}

interface PickupGamesMapProps {
  games: PickupGame[];
  center: { lat: number; lng: number };
  densityHubs?: DensityHub[];    // optional city-level stat markers
}

/* ------------------------------------------------------------------ */
/* Sport icons                                                         */
/* ------------------------------------------------------------------ */

const SPORT_EMOJI: Record<string, string> = {
  basketball: '🏀',
  baseball: '⚾',
  softball: '🥎',
  soccer: '⚽',
  volleyball: '🏐',
  football: '🏈',
  tennis: '🎾',
  pickleball: '🏓',
};

const createMarkerIcon = (isFull: boolean, sport: string) => {
  const color = isFull ? '#ef4444' : '#a3e635';
  const emoji = SPORT_EMOJI[sport] ?? '📍';

  return divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background: ${color};
        width: 34px;
        height: 34px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        font-size: 15px;
      ">
        <span style="transform: rotate(45deg);">${emoji}</span>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -34],
  });
};

/* ------------------------------------------------------------------ */
/* Density hub pill icon (matches target design)                       */
/* ------------------------------------------------------------------ */

const DENSITY_STYLES: Record<
  DensityHub['density'],
  { dot: string; label: string }
> = {
  extreme: { dot: '#f59e0b', label: 'Extreme' },
  high: { dot: '#84cc16', label: 'High' },
  moderate: { dot: '#84cc16', label: 'Moderate' },
  verified: { dot: '#14b8a6', label: 'Verified' },
};

const createHubIcon = (hub: DensityHub) => {
  const style = DENSITY_STYLES[hub.density];

  return divIcon({
    className: 'density-hub-marker',
    html: `
      <div style="
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: #0f0f1a;
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 999px;
        padding: 4px 10px 4px 6px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.5);
        white-space: nowrap;
        font-family: system-ui, sans-serif;
      ">
        <span style="
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: ${style.dot};
          flex-shrink: 0;
        "></span>
        <span style="font-size: 10px; color: #e5e7eb; font-weight: 600;">
          ${style.label}
        </span>
        <span style="font-size: 10px; color: #ffffff; font-weight: 700;">
          ${hub.name}
        </span>
        <span style="
          font-size: 9px;
          color: #0f0f1a;
          background: #a3e635;
          border-radius: 999px;
          padding: 1px 6px;
          font-weight: 700;
        ">${hub.courts} Courts</span>
      </div>
    `,
    iconSize: undefined,
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
  });
};

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

const isValidCoord = (lat: unknown, lng: unknown): boolean => {
  const nLat = Number(lat);
  const nLng = Number(lng);
  return (
    lat != null &&
    lng != null &&
    !isNaN(nLat) &&
    !isNaN(nLng) &&
    isFinite(nLat) &&
    isFinite(nLng) &&
    nLat >= -90 && nLat <= 90 &&
    nLng >= -180 && nLng <= 180
  );
};

/* ------------------------------------------------------------------ */
/* Component                                                            */
/* ------------------------------------------------------------------ */

export const PickupGamesMap: React.FC<PickupGamesMapProps> = ({
  games,
  center,
  densityHubs = [],
}) => {
  const safeCenter: [number, number] = [
    isValidCoord(center?.lat, center?.lng) ? Number(center.lat) : 40.7128,
    isValidCoord(center?.lat, center?.lng) ? Number(center.lng) : -74.006,
  ];

  const validGames = games.filter((g) => isValidCoord(g.lat, g.lng));
  const validHubs = densityHubs.filter((h) => isValidCoord(h.lat, h.lng));

  useEffect(() => {
    console.log('🗺️ Map render:', {
      total: games.length,
      valid: validGames.length,
      hubs: validHubs.length,
      center: safeCenter,
    });
  }, [games.length, validGames.length, validHubs.length, safeCenter]);

  if (validGames.length === 0 && validHubs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-indigo-400">
        <p className="text-sm">No valid coordinates to display</p>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'relative',
        height: '100%',
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      <MapContainer
        key={`${safeCenter[0]}-${safeCenter[1]}`}
        center={safeCenter}
        zoom={8}
        scrollWheelZoom={true}
        zoomControl={false}
        attributionControl={false}
        closePopupOnClick={true}
        style={{ height: '100%', width: '100%', background: '#0f0f1a' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <ZoomControl position="topleft" />

        {/* Game markers */}
        {validGames.map((game) => {
          const isFull = game.currentPlayers >= game.maxPlayers;
          const lat = Number(game.lat);
          const lng = Number(game.lng);

          return (
            <Marker
              key={game.id}
              position={[lat, lng]}
              icon={createMarkerIcon(isFull, game.sport)}
            >
              <Popup autoPan={true} maxWidth={220} minWidth={160}>
                <div style={{ fontFamily: 'system-ui' }}>
                  <strong
                    style={{
                      fontSize: 13,
                      color: '#0f172a',
                      display: 'block',
                      marginBottom: 6,
                    }}
                  >
                    {game.title}
                  </strong>

                  <div
                    style={{
                      fontSize: 11,
                      color: '#334155',
                      marginBottom: 4,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    📍 {game.location}
                  </div>

                  <div style={{ fontSize: 11, color: '#334155', marginBottom: 4 }}>
                    📅 {game.date} • 🕐 {game.time}
                  </div>

                  <div style={{ fontSize: 11, color: '#334155', marginBottom: 6 }}>
                    👤 {game.creatorName ?? 'Unknown'}
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      color: isFull ? '#dc2626' : '#16a34a',
                      fontWeight: 700,
                      marginTop: 6,
                      paddingTop: 6,
                      borderTop: '1px solid #e2e8f0',
                    }}
                  >
                    {isFull
                      ? '🔴 Full'
                      : `🟢 ${game.maxPlayers - game.currentPlayers} spots open`}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Density hub markers */}
        {validHubs.map((hub) => (
          <Marker
            key={hub.id}
            position={[hub.lat, hub.lng]}
            icon={createHubIcon(hub)}
          >
            <Popup autoPan={true} maxWidth={220} minWidth={180}>
              <div style={{ fontFamily: 'system-ui' }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#ea580c',
                    letterSpacing: 0.5,
                    marginBottom: 6,
                  }}
                >
                  🔥 {DENSITY_STYLES[hub.density].label.toUpperCase()} DENSITY HUB
                </div>
                <strong
                  style={{
                    fontSize: 15,
                    color: '#0f172a',
                    display: 'block',
                    marginBottom: 6,
                  }}
                >
                  {hub.name}
                </strong>
                <div style={{ fontSize: 12, color: '#334155', marginBottom: 2 }}>
                  Athletes: {hub.athletes.toLocaleString()}
                </div>
                <div style={{ fontSize: 12, color: '#334155' }}>
                  Courts Active: {hub.courts}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};