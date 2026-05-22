/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Player } from "../types";
import PlayerAvatar from "./PlayerAvatar";
import RoomNumberDisplay from "./RoomNumberDisplay";
import { Coffee, Crown, Trophy, ChevronLeft } from "lucide-react";

export interface SettlementRow {
  player: Player;
  netScore: number;
  totalDrinks: number;
}

interface TournamentSettlementProps {
  rows: SettlementRow[];
  currentRound: number;
  roomNo: string;
  onGoHome: () => void;
}

const rankStyles = [
  {
    ring: "from-yellow-300 via-yellow-500 to-yellow-700",
    badge: "冠军",
    badgeClass: "bg-yellow-500/10 text-yellow-300 border border-yellow-500/20",
    card: "border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-transparent",
  },
  {
    ring: "from-slate-200 via-slate-400 to-slate-600",
    badge: "亚军",
    badgeClass: "bg-slate-400/10 text-slate-300 border border-slate-400/20",
    card: "border-slate-400/20 bg-gradient-to-br from-slate-400/5 to-transparent",
  },
  {
    ring: "from-orange-300 via-orange-600 to-orange-800",
    badge: "季军",
    badgeClass: "bg-orange-500/10 text-orange-300 border border-orange-500/20",
    card: "border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-transparent",
  },
];

export default function TournamentSettlement({
  rows,
  currentRound,
  roomNo,
  onGoHome,
}: TournamentSettlementProps) {
  const winner = rows[0];

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl backdrop-blur-3xl bg-[#0a0a0a]/90">
      {/* Sophisticated ambient lights */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-violet-500/20 rounded-full blur-[100px] pointer-events-none mix-blend-screen" />

      <div className="relative px-6 pt-10 pb-8 md:px-10">
        <div className="flex flex-col items-center text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-6 backdrop-blur-md">
            <Trophy size={14} className="text-white/70" />
            <span className="text-[10px] font-semibold text-white/70 tracking-[0.2em] uppercase">
              Final Results
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 tracking-tight mb-3">
            查看成绩
          </h2>
          <p className="text-sm font-medium text-white/40 tracking-wide">
            共计 <span className="text-white/80">{currentRound}</span> 局精彩对决
          </p>
          <div className="mt-6 opacity-70">
            <RoomNumberDisplay roomNo={roomNo} size="sm" />
          </div>
        </div>

        {winner && winner.netScore > 0 && (
          <div className="mb-12 flex flex-col items-center relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-yellow-500/20 blur-2xl rounded-full pointer-events-none"></div>
            <div className={`relative p-1 rounded-full bg-gradient-to-b ${rankStyles[0].ring} shadow-[0_0_30px_rgba(234,179,8,0.2)]`}>
              <div className="bg-[#0a0a0a] rounded-full p-1">
                 <PlayerAvatar
                    avatar={winner.player.avatar}
                    color={winner.player.color}
                    size="xl"
                  />
              </div>
            </div>
            <div className="mt-5 flex items-center gap-2">
              <Crown size={20} className="text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" />
              <span className="text-2xl font-black text-white tracking-wide">
                {winner.player.name}
              </span>
            </div>
            <p className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-200 mt-2 drop-shadow-sm">
              +{winner.netScore}
            </p>
            <div className="flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-white/60">
              <Coffee size={12} className="text-white/40" />
              <span>累计饮水</span>
              <span className="text-white/90 font-bold">{winner.totalDrinks}</span>
              <span>次</span>
            </div>
          </div>
        )}

        <div className="space-y-4 mb-10">
          {rows.map((row, idx) => {
            const style = rankStyles[idx] ?? {
              ring: "from-white/20 to-white/5",
              badge: `NO.${idx + 1}`,
              badgeClass: "bg-white/5 text-white/50 border border-white/10",
              card: "border-white/5 bg-white/[0.02]",
            };

            return (
              <div
                key={row.player.id}
                className={`relative flex items-center gap-5 p-5 rounded-2xl border ${style.card} backdrop-blur-sm transition-transform hover:scale-[1.01]`}
              >
                <div className="shrink-0 relative">
                  {idx < 3 && <div className={`absolute inset-0 bg-gradient-to-b ${style.ring} blur-md opacity-40`} />}
                  <div className={`relative rounded-full p-[2px] bg-gradient-to-b ${style.ring}`}>
                    <div className="bg-[#0a0a0a] rounded-full">
                      <PlayerAvatar
                        avatar={row.player.avatar}
                        color={row.player.color}
                        size={idx < 3 ? "lg" : "md"}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="text-lg font-bold text-white/90 truncate tracking-wide">
                      {row.player.name}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wider ${style.badgeClass}`}
                    >
                      {style.badge}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-white/50">
                      <Coffee size={12} className="text-white/30" />
                      饮水 <span className="text-white/70">{row.totalDrinks}</span> 次
                    </div>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="flex flex-col items-end">
                    <span
                      className={`text-2xl font-black tracking-tighter ${
                        row.netScore > 0 
                          ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]" 
                          : row.netScore < 0 
                            ? "text-rose-400" 
                            : "text-white/40"
                      }`}
                    >
                      {row.netScore > 0 ? "+" : ""}
                      {row.netScore}
                    </span>
                    <span className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mt-0.5">
                      Score
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onGoHome}
          className="group relative w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold tracking-wide transition-all overflow-hidden cursor-pointer"
        >
          <ChevronLeft size={18} className="text-white/50 group-hover:text-white/90 transition-colors" />
          返回
        </button>
      </div>
    </div>
  );
}
