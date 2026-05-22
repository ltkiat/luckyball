/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

interface RoomNumberDisplayProps {
  roomNo: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const digitSize = {
  sm: { cell: "w-9 h-11", text: "text-xl", gap: "gap-1.5", label: "text-[10px]" },
  md: { cell: "w-12 h-14", text: "text-3xl", gap: "gap-2", label: "text-xs" },
  lg: { cell: "w-14 h-[4.25rem]", text: "text-4xl", gap: "gap-2.5", label: "text-sm" },
};

export default function RoomNumberDisplay({
  roomNo,
  size = "md",
  className = "",
}: RoomNumberDisplayProps) {
  const code = (roomNo || "----").replace(/\D/g, "").padStart(4, "0").slice(-4);
  const digits = code.split("");
  const s = digitSize[size];

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <span
        className={`${s.label} font-bold text-zinc-400 tracking-[0.35em] mb-2.5 uppercase`}
      >
        房间号
      </span>
      <div className={`flex ${s.gap} justify-center`}>
        {digits.map((digit, i) => (
          <div
            key={`${digit}-${i}`}
            className={`${s.cell} rounded-2xl flex items-center justify-center font-mono font-black ${s.text} text-amber-100 relative overflow-hidden`}
            style={{
              background:
                "linear-gradient(165deg, rgba(245,158,11,0.22) 0%, rgba(9,9,11,0.95) 45%, rgba(24,24,27,1) 100%)",
              boxShadow:
                "0 0 0 1px rgba(245,158,11,0.35), 0 8px 20px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.12)",
            }}
          >
            <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
            <span className="relative drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
              {digit}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
