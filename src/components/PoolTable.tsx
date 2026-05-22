/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Player, TableFeltColor } from '../types';
import { playBallHitSound, playPocketSound } from '../utils/audio';

// Standard 8-ball and Snooker Colors mapping for the card balls
export interface BallMetaData {
  bg: string;
  text: string;
  name: string;
  isStripe: boolean;
  scoreValue: number;
}

const BASE_COLORS_MAP: Record<number, { bg: string; text: string; name: string; isStripe: boolean }> = {
  1: { bg: '#dc2626', text: '#ffffff', name: '1号 (红球 / A 牌)', isStripe: false },
  2: { bg: '#fbbf24', text: '#000000', name: '2号 (黄球 / 2 牌)', isStripe: false },
  3: { bg: '#16a34a', text: '#ffffff', name: '3号 (绿球 / 3 牌)', isStripe: false },
  4: { bg: '#78350f', text: '#ffffff', name: '4号 (咖球 / 4 牌)', isStripe: false },
  5: { bg: '#2563eb', text: '#ffffff', name: '5号 (蓝球 / 5 牌)', isStripe: false },
  6: { bg: '#ec4899', text: '#ffffff', name: '6号 (粉球 / 6 牌)', isStripe: false },
  7: { bg: '#111827', text: '#ffffff', name: '7号 (黑球 / 7 牌)', isStripe: false },
  8: { bg: '#111827', text: '#ffffff', name: '8号 (黑球 / 8 牌)', isStripe: false },
};

const STRIPE_PALETTE = [
  '#dc2626', '#fb923c', '#fbbf24', '#10b981', '#06b6d4', '#6366f1', '#a855f7', '#ec4899', '#14b8a6', '#0ea5e9'
];

export const BALL_COLORS: Record<number, BallMetaData> = {};

for (let i = 1; i <= 60; i++) {
  if (BASE_COLORS_MAP[i]) {
    BALL_COLORS[i] = {
      ...BASE_COLORS_MAP[i],
      scoreValue: i,
    };
  } else {
    const colExp = STRIPE_PALETTE[(i - 9) % STRIPE_PALETTE.length];
    BALL_COLORS[i] = {
      bg: colExp,
      text: '#ffffff',
      name: `${i}号 专属花色球`,
      isStripe: true,
      scoreValue: i,
    };
  }
}

// Map selected felt colors to specific background styles
export const FELT_COLOR_STYLES: Record<TableFeltColor, { bgClass: string; hex: string; borderHex: string; name: string }> = {
  classic_green: {
    bgClass: 'from-emerald-800 to-emerald-950',
    hex: '#022c22',
    borderHex: '#047857',
    name: '森林雅绿'
  },
  royal_blue: {
    bgClass: 'from-blue-900 to-blue-950',
    hex: '#0f172a',
    borderHex: '#1d4ed8',
    name: '皇家蔚蓝'
  },
  elite_burgundy: {
    bgClass: 'from-rose-900 to-rose-950',
    hex: '#450a0a',
    borderHex: '#9f1239',
    name: '雅致红酒紫'
  },
  carbon_black: {
    bgClass: 'from-zinc-900 to-zinc-950',
    hex: '#09090b',
    borderHex: '#27272a',
    name: '极温碳黑'
  },
};

interface PoolTableProps {
  pocketedBalls: number[];
  players: Player[];
  activePlayerIndex: number;
  totalBalls: number;
  feltColor: TableFeltColor;
  onPocketBall: (ball: number, shooterId: string) => void;
  onUnpocketBall: (ball: number) => void;
}

export default function PoolTable({
  pocketedBalls,
  players,
  activePlayerIndex,
  totalBalls,
  feltColor,
  onPocketBall,
  onUnpocketBall,
}: PoolTableProps) {
  const [selectedBall, setSelectedBall] = useState<number | null>(null);

  // Billiard pool balls representing the poker deck assigned values
  const ballsList = Array.from({ length: totalBalls }, (_, i) => i + 1);
  const activeFelt = FELT_COLOR_STYLES[feltColor] || FELT_COLOR_STYLES.classic_green;

  const handleBallClick = (ballNum: number) => {
    playBallHitSound();
    if (pocketedBalls.includes(ballNum)) {
      onUnpocketBall(ballNum);
    } else {
      setSelectedBall(ballNum);
    }
  };

  const confirmPocket = (shooterId: string) => {
    if (selectedBall !== null) {
      playPocketSound();
      onPocketBall(selectedBall, shooterId);
      setSelectedBall(null);
    }
  };

  return (
    <div className="bg-neutral-900 p-5 rounded-3xl border-4 border-amber-900 shadow-2xl relative overflow-hidden flex flex-col items-center">
      
      {/* Elegantly themed Velvet Table Backboard */}
      <div
        className="relative w-full rounded-2xl border-4 border-amber-950 shadow-inner flex flex-col items-center justify-center p-6 md:p-8 transition-all duration-300 overflow-hidden"
        style={{
          backgroundColor: activeFelt.hex,
          backgroundImage: `radial-gradient(circle at center, ${activeFelt.hex} 40%, #000000 100%)`,
        }}
      >
        {/* Soft shadow effects of leather borders */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-black/30 pointer-events-none" />
        <div className="absolute bottom-0 inset-x-0 h-1.5 bg-black/30 pointer-events-none" />

        {/* Visual pool cues crossed back decoration (subtle watermark) */}
        <div className="absolute inset-0 opacity-[0.03] flex items-center justify-center pointer-events-none">
          <span className="text-9xl">🎱</span>
        </div>

        {/* Dynamic score control buttons grid layout */}
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 max-w-md w-full z-10">
          {ballsList.map(ballNum => {
            const isPocketed = pocketedBalls.includes(ballNum);
            const data = BALL_COLORS[ballNum];
            if (!data) return null;

            return (
              <button
                key={ballNum}
                onClick={() => handleBallClick(ballNum)}
                className={`relative flex flex-col items-center justify-center aspect-square rounded-full transition-all duration-300 ${
                  isPocketed
                    ? 'opacity-25 scale-90 filter brightness-50 hover:opacity-50 ring-2 ring-red-500/20'
                    : 'hover:scale-105 hover:-translate-y-0.5 active:scale-95 shadow-lg ring-2 ring-white/10 hover:ring-amber-400 cursor-pointer'
                }`}
                style={{
                  backgroundColor: data.bg,
                }}
                id={`ball-grid-btn-${ballNum}`}
              >
                {/* Stripe layout overlay if the ball is high-rank stripe */}
                {data.isStripe && !isPocketed && (
                  <div className="absolute inset-0 bg-white scale-x-[0.98] scale-y-[0.3] rotate-12 opacity-95 pointer-events-none rounded-sm" />
                )}

                {/* Glossy light reflection bulb */}
                {!isPocketed && (
                  <div className="absolute top-1.5 left-1.5 w-2 h-2 rounded-full bg-white/40 pointer-events-none blur-[0.5px]" />
                )}

                {/* The ball number label */}
                <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center z-10 shadow-inner">
                  <span className="text-[11px] font-black text-neutral-900 leading-none">{ballNum}</span>
                </div>

                {isPocketed && (
                  <div className="absolute inset-0 bg-neutral-950/85 rounded-full flex items-center justify-center z-20 border border-zinc-800">
                    <span className="text-[10px] font-bold text-zinc-500 tracking-wider">落袋</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Card prompt modal overlay */}
        {selectedBall !== null && (
          <div className="absolute inset-0 bg-neutral-950/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 z-40">
            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl max-w-sm w-full text-center shadow-2xl relative">
              
              <div className="flex justify-center mb-2.5">
                <div
                  className="w-12 h-12 rounded-full relative flex items-center justify-center shadow-xl border border-white/10 self-center"
                  style={{ backgroundColor: BALL_COLORS[selectedBall]?.bg }}
                >
                  <circle cx="0" cy="0" r="10" />
                  <span className="font-extrabold text-neutral-900 bg-white rounded-full w-5 h-5 flex items-center justify-center text-xs z-10">
                    {selectedBall}
                  </span>
                </div>
              </div>

              <h4 className="text-white font-bold text-xs mb-1">
                记录击落球号:{' '}
                <span className="text-amber-400 font-mono text-xs">{BALL_COLORS[selectedBall]?.name}</span>
              </h4>
              <p className="text-zinc-500 text-[10px] mb-3.5">
                此轮谁完成了该项进球（主政人得分/底牌所有者扣分）？
              </p>

              {/* Player list trigger items */}
              <div className="grid grid-cols-1 gap-1.5 mb-3.5">
                {players.map((p, idx) => (
                  <button
                    key={p.id}
                    onClick={() => confirmPocket(p.id)}
                    className={`flex items-center justify-between px-3.5 py-2 rounded-xl border text-xs transition-all text-left font-semibold ${
                      idx === activePlayerIndex
                        ? 'bg-amber-500 border-amber-600 text-neutral-950 shadow-md font-bold scale-[1.01]'
                        : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-750 text-neutral-200 hover:text-white'
                    }`}
                    id={`confirm-pocket-player-${p.id}`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full border border-white/10" style={{ backgroundColor: p.color }} />
                      {p.name}
                    </span>
                    {idx === activePlayerIndex && (
                      <span className="text-[9px] bg-neutral-950/15 px-1.5 py-0.2 rounded text-neutral-900 font-bold">
                        当前主攻手
                      </span>
                    )}
                  </button>
                ))}

                <button
                  onClick={() => confirmPocket('system_other')}
                  className="bg-zinc-800/60 border border-zinc-700 hover:bg-zinc-750 text-zinc-400 px-4 py-1.5 rounded-xl text-[10px] font-mono"
                  id="confirm-pocket-other"
                >
                  无意擦落 / 其他客观干扰
                </button>
              </div>

              {/* Cancel button */}
              <button
                onClick={() => setSelectedBall(null)}
                className="text-zinc-500 hover:text-zinc-300 text-xs py-0.5 mt-1 hover:underline cursor-pointer"
              >
                取消
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Manual details helper */}
      <div className="w-full text-center mt-3 scale-90">
        <p className="text-[10px] text-zinc-500 leading-normal select-none">
          操作指南：点击台泥内的活性牌球标记击落，并确定对应扣惩罚者与得分手。再次点击下方已被判处的<b>「落袋」</b>状态即可瞬间撤销、回滚分数。
        </p>
      </div>
    </div>
  );
}
