/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

const getSuitIconsLayout = (
  val: string,
  suitSym: string,
  colorClass: string,
  scale: "sm" | "md",
) => {
  const num = parseInt(val);
  if (isNaN(num)) return null;
  const pip = scale === "sm" ? "text-[9px]" : "text-[11px]";
  const pipLg = scale === "sm" ? "text-[10px]" : "text-[13px]";

  if (num === 2) {
    return (
      <div className="flex flex-col justify-between h-full py-1 select-none">
        <span className={`${pip} ${colorClass}`}>{suitSym}</span>
        <span className={`${pip} ${colorClass} rotate-180`}>{suitSym}</span>
      </div>
    );
  }
  if (num >= 3 && num <= 10) {
    const gridClass =
      num <= 4
        ? "grid grid-cols-2 gap-x-3 gap-y-2"
        : num <= 6
          ? "grid grid-cols-2 gap-x-3 gap-y-1.5"
          : "grid grid-cols-2 gap-x-2.5 gap-y-1";
    const cells = Array.from({ length: num }, (_, i) => (
      <span
        key={i}
        className={`${pip} ${colorClass} ${i >= num - (num % 2 === 0 ? 2 : 1) ? "rotate-180" : ""}`}
      >
        {suitSym}
      </span>
    ));
    return <div className={`${gridClass} p-0.5 select-none place-items-center`}>{cells}</div>;
  }
  return (
    <span className={`${pipLg} select-none leading-none ${colorClass}`}>{suitSym}</span>
  );
};

interface RealisticPokerCardProps {
  suit?: "spade" | "heart" | "club" | "diamond" | "joker";
  value: string;
  billiardNum: number;
  size?: "sm" | "md" | "lg";
  isDimmed?: boolean;
  isRevealed?: boolean;
  isBack?: boolean;
}

const CARD_WIDTH = {
  sm: "3.35rem",
  md: "5.5rem",
  lg: "7rem",
} as const;

export default function RealisticPokerCard({
  suit = "spade",
  value,
  billiardNum: _billiardNum,
  size = "md",
  isDimmed = false,
  isRevealed = false,
  isBack = false,
}: RealisticPokerCardProps) {
  const isRed = suit === "heart" || suit === "diamond";
  const suitSymbol = {
    spade: "♠",
    heart: "♥",
    club: "♣",
    diamond: "♦",
    joker: "★",
  }[suit];
  const suitColorClass = isRed ? "text-[#c41e3a]" : "text-[#1a1a2e]";
  const width = size === "sm" ? "100%" : CARD_WIDTH[size];
  const isSm = size === "sm";

  const cardShell = `relative w-full h-full rounded-[0.4rem] overflow-hidden select-none transition-all ${
    isDimmed
      ? "opacity-35 grayscale brightness-90"
      : isRevealed
        ? "brightness-[0.80] shadow-[0_2px_8px_rgba(0,0,0,0.22),0_1px_0_rgba(255,255,255,0.9)_inset]"
        : "shadow-[0_2px_8px_rgba(0,0,0,0.22),0_1px_0_rgba(255,255,255,0.9)_inset] hover:shadow-[0_6px_16px_rgba(0,0,0,0.28)] hover:-translate-y-0.5"
  }`;

  if (isBack) {
    return (
      <div
        className={`${cardShell} border border-[#8b0000]`}
        style={{
          width,
          aspectRatio: "5 / 7",
          background:
            "linear-gradient(145deg, #b91c1c 0%, #7f1d1d 45%, #991b1b 100%)",
          boxShadow:
            "inset 0 0 0 1px rgba(255,255,255,0.12), 0 4px 12px rgba(0,0,0,0.35)",
        }}
      >
        <div
          className="absolute inset-[5px] rounded-[0.3rem] border border-white/20"
          style={{
            backgroundImage: `
              repeating-linear-gradient(45deg, rgba(0,0,0,0.12) 0px, rgba(0,0,0,0.12) 4px, transparent 4px, transparent 8px),
              repeating-linear-gradient(-45deg, rgba(0,0,0,0.08) 0px, rgba(0,0,0,0.08) 4px, transparent 4px, transparent 8px)
            `,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/25 pointer-events-none" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[55%] aspect-square rounded-full border-2 border-white/25 flex items-center justify-center bg-black/15">
            <span className="text-white/70 text-lg font-serif">♠</span>
          </div>
        </div>
      </div>
    );
  }

  const cornerValueClass = isSm
    ? "text-[15px] font-black leading-none"
    : "text-[18px] font-black leading-none";
  const cornerSuitClass = isSm
    ? "text-[12px] leading-none mt-0.5"
    : "text-[13px] leading-none mt-0.5";

  const faceCenter = () => {
    const v = value.toUpperCase();
    if (isSm && !["J", "Q", "K", "A"].includes(v)) {
      return (
        <span
          className={`${parseInt(v) >= 8 ? "text-2xl" : "text-3xl"} leading-none ${suitColorClass}`}
        >
          {suitSymbol}
        </span>
      );
    }
    if (["J", "Q", "K", "A"].includes(v)) {
      const royalColor =
        v === "K"
          ? "text-amber-800"
          : v === "Q"
            ? "text-rose-800"
            : v === "J"
              ? "text-indigo-900"
              : suitColorClass;
      return (
        <div className="flex flex-col items-center justify-center gap-0.5">
          <span
            className={`font-serif font-black leading-none ${isSm ? "text-3xl" : "text-4xl"} ${royalColor}`}
          >
            {v}
          </span>
          <span className={`${isSm ? "text-sm" : "text-xl"} ${suitColorClass}`}>
            {suitSymbol}
          </span>
        </div>
      );
    }
    return getSuitIconsLayout(value, suitSymbol, suitColorClass, isSm ? "sm" : "md");
  };

  return (
    <div
      className={cardShell}
      style={{
        width,
        aspectRatio: "5 / 7",
        fontFamily: '"Georgia", "Times New Roman", serif',
        background: "linear-gradient(160deg, #ffffff 0%, #f8f8f6 55%, #efefec 100%)",
        border: "1px solid rgba(0,0,0,0.08)",
      }}
    >
      <div className="absolute inset-[3px] rounded-[0.32rem] border border-black/[0.06] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-black/[0.03] pointer-events-none" />

      <div className="relative z-10 flex flex-col justify-between h-full p-1.5">
        <div className="flex flex-col items-start leading-none">
          <span className={`${cornerValueClass} ${suitColorClass}`}>{value}</span>
          <span className={`${cornerSuitClass} ${suitColorClass}`}>{suitSymbol}</span>
        </div>

        <div className="flex-1 flex items-center justify-center min-h-0 py-0.5">
          {faceCenter()}
        </div>

        <div className="flex flex-col items-start leading-none rotate-180">
          <span className={`${cornerValueClass} ${suitColorClass}`}>{value}</span>
          <span className={`${cornerSuitClass} ${suitColorClass}`}>{suitSymbol}</span>
        </div>
      </div>
    </div>
  );
}
