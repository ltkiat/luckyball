/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

interface PlayerAvatarProps {
  avatar: string;
  color: string;
  size?: "sm" | "md" | "lg" | "xl";
  isMe?: boolean;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}

const sizeMap = {
  sm: { box: "w-9 h-9", emoji: "text-base", ring: "p-[2px]" },
  md: { box: "w-11 h-11", emoji: "text-xl", ring: "p-[2.5px]" },
  lg: { box: "w-16 h-16", emoji: "text-3xl", ring: "p-[3px]" },
  xl: { box: "w-24 h-24", emoji: "text-5xl", ring: "p-1" },
};

export default function PlayerAvatar({
  avatar,
  color,
  size = "md",
  isMe = false,
  isActive = false,
  onClick,
  className = "",
}: PlayerAvatarProps) {
  const s = sizeMap[size];
  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`relative shrink-0 rounded-2xl ${s.ring} bg-gradient-to-br from-white/25 via-white/5 to-transparent shadow-lg transition-transform hover:scale-105 active:scale-95 ${onClick ? "cursor-pointer" : ""} ${className}`}
      style={{
        backgroundImage: `linear-gradient(135deg, ${color}88, ${color}22)`,
      }}
    >
      <div
        className={`${s.box} rounded-[0.65rem] flex items-center justify-center bg-zinc-950/90 border border-white/10 shadow-inner backdrop-blur-sm`}
      >
        <span className={`${s.emoji} select-none leading-none drop-shadow-sm`}>
          {avatar}
        </span>
      </div>
      {isMe && (
        <span className="absolute -bottom-1 -right-1 text-[8px] font-black bg-amber-400 text-zinc-950 px-1.5 py-0.5 rounded-md shadow-md border border-amber-200/50">
          我
        </span>
      )}
      {isActive && (
        <span className="absolute -top-1 -left-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-zinc-950 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
      )}
    </Wrapper>
  );
}
