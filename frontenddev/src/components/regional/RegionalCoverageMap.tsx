import React, { useState, useMemo, useEffect, useRef } from 'react';
import { CourtPOI } from '../../types';
import { getStateName } from '../../data/usLocations';
import L from 'leaflet';
import {
  MapPin, Flame, Building2, Users, Activity, Sparkles,
  Navigation, ChevronRight, Eye, ShieldCheck, Layers,
} from 'lucide-react';

interface RegionalCoverageMapProps {
  registeredCity?: string;
  registeredState?: string;
  courts?: CourtPOI[];
  onNavigateToCourts?: () => void;
}

interface RegionalHub {
  id: string;
  cityName: string;
  lat: number;
  lng: number;
  athletesCount: number;
  courtCount: number;
  activeGames: number;
  density: 'Extreme' | 'High' | 'Moderate';
}

export const RegionalCoverageMap: React.FC<RegionalCoverageMapProps> = ({
  registeredCity = 'Venice',
  registeredState = 'CA',
  courts = [],
  onNavigateToCourts,
}) => {
  const city = registeredCity || 'Venice';
  const stateCode = registeredState || 'CA';
  const stateName = getStateName(stateCode);

  const [selectedHubId, setSelectedHubId] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);

  const regionalHubs = useMemo<RegionalHub[]>(() => {
    if (stateCode === 'NY') {
      return [
        { id: 'h1', cityName: 'New York City', lat: 40.7128, lng: -74.006, athletesCount: 3840, courtCount: 86, activeGames: 24, density: 'Extreme' },
        { id: 'h2', cityName: 'Buffalo', lat: 42.8864, lng: -78.8784, athletesCount: 620, courtCount: 18, activeGames: 5, density: 'Moderate' },
        { id: 'h3', cityName: 'Syracuse', lat: 43.0481, lng: -76.1474, athletesCount: 710, courtCount: 22, activeGames: 7, density: 'High' },
        { id: 'h4', cityName: 'Albany', lat: 42.6526, lng: -73.7562, athletesCount: 940, courtCount: 28, activeGames: 9, density: 'High' },
      ];
    }
    if (stateCode === 'TX') {
      return [
        { id: 'h1', cityName: 'Houston', lat: 29.7604, lng: -95.3698, athletesCount: 2900, courtCount: 64, activeGames: 18, density: 'Extreme' },
        { id: 'h2', cityName: 'Dallas', lat: 32.7767, lng: -96.797, athletesCount: 3100, courtCount: 72, activeGames: 21, density: 'Extreme' },
        { id: 'h3', cityName: 'Austin', lat: 30.2672, lng: -97.7431, athletesCount: 1850, courtCount: 42, activeGames: 12, density: 'High' },
      ];
    }
    if (stateCode === 'FL') {
      return [
        { id: 'h1', cityName: 'Miami', lat: 25.7617, lng: -80.1918, athletesCount: 3400, courtCount: 78, activeGames: 22, density: 'Extreme' },
        { id: 'h2', cityName: 'Orlando', lat: 28.5383, lng: -81.3792, athletesCount: 1920, courtCount: 44, activeGames: 14, density: 'High' },
      ];
    }
    return [
      { id: 'h1', cityName: `${city} Metro`, lat: 33.985, lng: -118.4695, athletesCount: 2850, courtCount: 62, activeGames: 19, density: 'Extreme' },
      { id: 'h2', cityName: 'Los Angeles', lat: 34.0522, lng: -118.2437, athletesCount: 4200, courtCount: 94, activeGames: 31, density: 'Extreme' },
      { id: 'h3', cityName: 'San Francisco', lat: 37.7749, lng: -122.4194, athletesCount: 3150, courtCount: 70, activeGames: 22, density: 'Extreme' },
      { id: 'h4', cityName: 'San Diego', lat: 32.7157, lng: -117.1611, athletesCount: 1980, courtCount: 46, activeGames: 14, density: 'High' },
    ];
  }, [city, stateCode]);

  const activeHub = useMemo(
    () => regionalHubs.find((h) => h.id === selectedHubId) || regionalHubs[0],
    [regionalHubs, selectedHubId]
  );

  const totalCourtsInState = regionalHubs.reduce((a, c) => a + c.courtCount, 0);
  const totalAthletesInState = regionalHubs.reduce((a, c) => a + c.athletesCount, 0);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    const centerLat = activeHub.lat;
    const centerLng = activeHub.lng;

    if (!leafletMapRef.current) {
      if ((mapContainerRef.current as any)._leaflet_id) {
        (mapContainerRef.current as any)._leaflet_id = null;
      }
      try {
        const map = L.map(mapContainerRef.current, {
          center: [centerLat, centerLng],
          zoom: 6,
          zoomControl: true,
        });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap',
        }).addTo(map);
        leafletMapRef.current = map;
        markersGroupRef.current = L.layerGroup().addTo(map);
      } catch (err) {
        console.warn('Leaflet init warning:', err);
      }
    } else {
      try {
        leafletMapRef.current.setView([centerLat, centerLng]);
      } catch {}
    }

    if (markersGroupRef.current) {
      try {
        markersGroupRef.current.clearLayers();
        regionalHubs.forEach((hub) => {
          const isSel = hub.id === activeHub.id;
          const colorHex = hub.density === 'Extreme' ? '#f59e0b' : '#a3e635';
          const html = `
            <div style="background:#090d16;border:2px solid ${isSel ? '#fff' : colorHex};border-radius:14px;padding:5px 10px;color:#fff;font-family:sans-serif;font-size:11px;font-weight:800;display:flex;align-items:center;gap:6px;box-shadow:0 4px 16px rgba(0,0,0,0.7);white-space:nowrap;">
              <span style="background:${colorHex};color:#000;padding:2px 6px;border-radius:10px;font-size:10px;font-weight:900;">🔥 ${hub.density}</span>
              <span>${hub.cityName}</span>
              <span style="background:rgba(255,255,255,0.2);padding:1px 5px;border-radius:8px;font-size:10px;font-weight:800;font-family:monospace;">${hub.courtCount}</span>
            </div>
          `;
          const icon = L.divIcon({ html, className: 'regional-hub', iconSize: [160, 34], iconAnchor: [80, 17] });
          const marker = L.marker([hub.lat, hub.lng], { icon });
          marker.on('click', () => setSelectedHubId(hub.id));
          markersGroupRef.current?.addLayer(marker);
        });
      } catch (err) {
        console.warn('Marker render warning:', err);
      }
    }

    return () => {
      if (leafletMapRef.current) {
        try { leafletMapRef.current.remove(); } catch {}
        leafletMapRef.current = null;
      }
    };
  }, [regionalHubs, activeHub]);

  return (
    <div className="bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-950 p-5 md:p-6 rounded-[2.5rem] border border-lime-400/30 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3.5">
        <div className="flex items-center space-x-2.5">
          <div className="p-2.5 bg-amber-400 text-black rounded-2xl shadow-md">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-amber-400/20 text-amber-300 rounded font-mono border border-amber-400/30">
              REGIONAL OVERLAY
            </span>
            <h3 className="text-lg font-black italic uppercase text-white mt-0.5">
              Regional Coverage & Density Map
            </h3>
            <p className="text-[10px] text-indigo-300 font-mono mt-0.5">
              State of {stateName} ({stateCode})
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
        <div className="lg:col-span-2 relative h-80 sm:h-96 rounded-2xl border border-white/10 overflow-hidden shadow-inner bg-slate-950">
          <div ref={mapContainerRef} className="w-full h-full z-0" />
          <div className="absolute top-3 left-3 z-10 bg-black/80 text-white px-3 py-1.5 rounded-xl border border-white/20 backdrop-blur-md text-[11px] font-mono font-black flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-lime-400 animate-pulse" />
            <span>{stateName} • {regionalHubs.length} Hubs</span>
          </div>
          <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between text-[10px] font-mono font-bold text-indigo-200 bg-black/80 p-2.5 rounded-xl border border-white/20 backdrop-blur-md">
            <div className="flex items-center space-x-3">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                Extreme
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-lime-400 inline-block" />
                High
              </span>
            </div>
            <span>Click hub to inspect</span>
          </div>
        </div>

        <div className="p-4 bg-indigo-900/60 rounded-2xl border border-white/10 space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="text-[10px] font-black uppercase text-amber-300 font-mono flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              REGION INSPECTOR
            </span>
            <span className="px-2 py-0.5 bg-lime-400/20 text-lime-300 text-[9px] font-mono font-bold rounded border border-lime-400/30">
              {activeHub.density}
            </span>
          </div>

          <h4 className="text-base font-black italic uppercase text-white">
            {activeHub.cityName}
          </h4>

          <div className="space-y-2 font-mono text-xs">
            <div className="p-2.5 bg-indigo-950/80 rounded-xl border border-white/10 flex items-center justify-between">
              <span className="text-indigo-300 text-[11px]">Athletes</span>
              <span className="font-extrabold text-lime-400">
                {activeHub.athletesCount.toLocaleString()}
              </span>
            </div>
            <div className="p-2.5 bg-indigo-950/80 rounded-xl border border-white/10 flex items-center justify-between">
              <span className="text-indigo-300 text-[11px]">Courts</span>
              <span className="font-extrabold text-white">{activeHub.courtCount}</span>
            </div>
            <div className="p-2.5 bg-indigo-950/80 rounded-xl border border-white/10 flex items-center justify-between">
              <span className="text-indigo-300 text-[11px]">Live Games</span>
              <span className="font-extrabold text-amber-300">{activeHub.activeGames}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-white/10 text-[10px] text-indigo-300/80 font-mono space-y-1">
            <div className="flex justify-between">
              <span>State Total Courts:</span>
              <span className="text-white font-bold">{totalCourtsInState}</span>
            </div>
            <div className="flex justify-between">
              <span>State Athletes:</span>
              <span className="text-lime-300 font-bold">
                {totalAthletesInState.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};