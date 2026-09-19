import React from 'react';
import { CheckCircle2, Clock } from 'lucide-react';

interface ReferralLogProps {
  history: Array<{
    id: number;
    name: string;
    handle: string;
    sport: string;
    xp: number;
    date: string;
    status: 'pending' | 'completed';
  }>;
}

export const ReferralHistory: React.FC<ReferralLogProps> = ({ history }) => {
  return (
    <div className="bg-indigo-950/50 p-6 rounded-3xl border border-white/10 mt-6">
      <h3 className="text-sm font-black italic uppercase text-white mb-4">
        Referred Athletes Log
      </h3>
      
      <div className="space-y-3">
        {history.map((item) => (
          <div 
            key={item.id} 
            className="flex items-center justify-between bg-indigo-900/40 p-3 rounded-2xl border border-white/5"
          >
            <div className="flex items-center space-x-3">
              {/* Avatar Placeholder */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-lime-400 to-emerald-500 flex items-center justify-center text-black font-black">
                {item.name.charAt(0)}
              </div>
              <div>
                <p className="text-white font-bold text-sm">{item.name}</p>
                <p className="text-indigo-300 text-xs">{item.handle} • {item.sport}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-[10px] text-indigo-400 uppercase">{item.date}</p>
                <p className={`text-xs font-black ${item.status === 'completed' ? 'text-lime-400' : 'text-amber-400'}`}>
                  +{item.xp} XP
                </p>
              </div>
              {item.status === 'completed' ? (
                <CheckCircle2 className="w-5 h-5 text-lime-400" />
              ) : (
                <Clock className="w-5 h-5 text-amber-400" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};