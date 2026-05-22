/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

interface GiveScoreButtonsProps {
  basePoints: number;
  groupPoints: number;
  onGiveBase: () => void;
  onGiveGroup: () => void;
  playerId: string;
}

export default function GiveScoreButtons({
  basePoints,
  groupPoints,
  onGiveBase,
  onGiveGroup,
  playerId,
}: GiveScoreButtonsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 w-full">
      <button
        type="button"
        onClick={onGiveBase}
        id={`player-give-btn-${playerId}`}
        className="py-3 px-2 rounded-2xl border border-amber-500/30 bg-zinc-900/90 hover:bg-amber-500/15 hover:border-amber-400/55 active:scale-[0.98] transition-all cursor-pointer"
      >
        <span className="text-lg font-black text-amber-300 leading-none">
          给{basePoints}分
        </span>
      </button>

      <button
        type="button"
        onClick={onGiveGroup}
        id={`player-give-group-btn-${playerId}`}
        className="py-3 px-2 rounded-2xl border border-orange-500/35 bg-zinc-900/90 hover:bg-orange-500/15 hover:border-orange-400/55 active:scale-[0.98] transition-all cursor-pointer"
      >
        <span className="text-lg font-black text-orange-200 leading-none">
          给{groupPoints}分
        </span>
      </button>
    </div>
  );
}
