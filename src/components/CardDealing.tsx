/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Player } from '../types';
import { playDealCardSound } from '../utils/audio';
import { BALL_COLORS } from './PoolTable';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff } from 'lucide-react';

import RealisticPokerCard from './RealisticPokerCard';
import PlayerAvatar from './PlayerAvatar';

interface CardDealingProps {
  players: Player[];
  myPlayerId: string;
  onDealComplete: () => void;
}

export default function CardDealing({ players, myPlayerId, onDealComplete }: CardDealingProps) {
  const [dealIndex, setDealIndex] = useState(-1);
  const [revealedPlayers, setRevealedPlayers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let currentIdx = 0;
    const totalCards = players.reduce((acc, p) => acc + p.cards.length, 0);
    
    const interval = setInterval(() => {
      if (currentIdx < totalCards) {
        playDealCardSound();
        setDealIndex(currentIdx);
        currentIdx++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          onDealComplete();
        }, 1200);
      }
    }, 120);

    return () => clearInterval(interval);
  }, [players, onDealComplete]);

  const toggleReveal = (playerId: string) => {
    setRevealedPlayers(prev => ({
      ...prev,
      [playerId]: !prev[playerId]
    }));
  };

  return (
    <div className="bg-[#0a0a0a]/95 backdrop-blur-3xl p-8 rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] max-w-4xl w-full mx-auto flex flex-col items-center relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[200px] bg-indigo-500/10 blur-[100px] pointer-events-none mix-blend-screen" />
      
      <div className="text-center mb-10 relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-4 backdrop-blur-md">
          <span className="text-[10px] font-semibold text-white/70 tracking-[0.3em] uppercase">
            CASINO DEALER
          </span>
        </div>
        <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50 tracking-wide mb-2">
          随机分配目标球
        </h3>
        <p className="text-white/40 text-xs font-medium tracking-wide">
          正在为您发放专属数字牌
        </p>
      </div>

      <div className="relative w-full flex flex-col items-center py-6">
        {/* Sleek Casino Deck */}
        <div className="relative w-28 h-40 select-none mb-12">
          {/* Deck glow */}
          <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full" />
          
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-zinc-800 to-black border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-center overflow-hidden z-10">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            <div className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center bg-white/5 backdrop-blur-md shadow-inner">
              <span className="text-3xl filter drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">♠️</span>
            </div>
          </div>
          {/* Stack effect */}
          <div className="absolute -bottom-1 -right-1 w-full h-full rounded-2xl bg-zinc-900 border border-white/5 -z-10" />
          <div className="absolute -bottom-2 -right-2 w-full h-full rounded-2xl bg-zinc-950 border border-white/5 -z-20" />
        </div>

        {/* Players ring placeholders layout */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5 w-full relative z-10">
          {players.map((player, pIdx) => {
            const isRevealed = revealedPlayers[player.id];
            const isMe = player.id === myPlayerId;
            
            return (
              <div
                key={player.id}
                className={`p-4 rounded-3xl flex flex-col items-center relative overflow-hidden transition-all duration-300 ${
                  isMe 
                    ? "bg-white/[0.06] border border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.05)]" 
                    : "bg-white/[0.02] border border-white/5"
                }`}
              >
                {/* Header info */}
                <div className="flex items-center justify-between w-full mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <PlayerAvatar avatar={player.avatar} color={player.color} size="sm" isMe={isMe} />
                    <span className="text-sm font-bold text-white/90 truncate tracking-wide max-w-[100px]">{player.name}</span>
                  </div>
                  {isMe ? (
                    <button
                      onClick={() => toggleReveal(player.id)}
                      className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                      title={isRevealed ? "隐藏手牌" : "查看手牌"}
                    >
                      {isRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  ) : (
                    <span className="text-white/20 text-xs px-2 py-1 rounded-md bg-white/5 border border-white/5" title="他人手牌保密">保密</span>
                  )}
                </div>

                {/* Hand cards space */}
                <div className="flex flex-wrap gap-1.5 justify-center py-2 min-h-[80px] w-full max-w-full overflow-hidden">
                  {player.cards.map((cardBall, cardIdx) => {
                    const currentAbsIdx = players.slice(0, pIdx).reduce((acc, p) => acc + p.cards.length, 0) + cardIdx;
                    const hasDealt = dealIndex >= currentAbsIdx;
                    const ballData = BALL_COLORS[cardBall.billiardNum];

                    return (
                      <div key={cardIdx} className="relative w-12 h-16 shrink-0 perspective-1000">
                        <AnimatePresence>
                          {hasDealt && (
                            <motion.div
                              initial={{
                                x: 0,
                                y: -150,
                                scale: 0.2,
                                rotateY: 180,
                                rotateZ: Math.random() * 20 - 10,
                                opacity: 0,
                              }}
                              animate={{
                                x: 0,
                                y: 0,
                                scale: 1,
                                rotateY: isRevealed ? 0 : 180,
                                rotateZ: 0,
                                opacity: 1,
                              }}
                              transition={{
                                type: 'spring',
                                stiffness: 200,
                                damping: 20,
                              }}
                              className="absolute inset-0 transform-style-3d"
                            >
                              {isRevealed && ballData ? (
                                <RealisticPokerCard
                                  suit={cardBall.suit}
                                  value={cardBall.value}
                                  billiardNum={cardBall.billiardNum}
                                  size="sm"
                                />
                              ) : (
                                <RealisticPokerCard
                                  isBack={true}
                                  size="sm"
                                  value=""
                                  billiardNum={0}
                                />
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 text-[10px] text-white/30 font-semibold tracking-widest uppercase">
                  {player.cards.length} Cards
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="mt-6 flex items-center gap-3">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
        <span className="text-[11px] text-emerald-400/80 tracking-[0.2em] uppercase font-bold">
          DEALING IN PROGRESS...
        </span>
      </div>
    </div>
  );
}
