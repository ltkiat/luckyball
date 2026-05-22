/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Player, LogEntry, GameSettings } from "../types";
import { ScrollText, X } from "lucide-react";

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  logs: LogEntry[];
  players: Player[];
  settings?: GameSettings;
  onClearHistory?: () => void;
}

export default function HistorySidebar({
  isOpen,
  onClose,
  logs,
  players,
}: HistorySidebarProps) {
  if (!isOpen) return null;

  const safeLogs = logs || [];
  const safePlayers = players || [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="关闭历史记录"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside className="relative h-full w-full max-w-md bg-zinc-950/95 border-l border-white/10 shadow-2xl flex flex-col min-h-0 animate-in slide-in-from-right duration-300">
        <div className="shrink-0 p-4 border-b border-white/10 flex items-center justify-between glass-panel rounded-none">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
              <ScrollText className="text-amber-400" size={18} />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">历史记录</h3>
              <p className="text-[10px] text-zinc-500">{safeLogs.length} 条事件</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
            id="close-sidebar-btn"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 flex flex-col min-h-0 p-4 pb-6">
          <h4 className="shrink-0 text-zinc-400 font-semibold text-xs uppercase tracking-wider flex items-center gap-1.5 mb-3">
            <ScrollText size={14} className="text-amber-500" />
            对局实战日志
          </h4>

          <div className="flex-1 min-h-0 overflow-y-auto rounded-2xl border border-white/8 bg-zinc-900/60 p-2 space-y-2 scrollbar-thin">
            {safeLogs.length === 0 ? (
              <div className="h-full min-h-[12rem] flex flex-col items-center justify-center text-zinc-500 text-xs gap-2">
                <ScrollText size={28} className="opacity-20" />
                <span>暂无实战历史记录</span>
              </div>
            ) : (
              safeLogs.map((log) => {
                const parts = log.timestamp?.split("T")[1]?.split(".")?.[0] || "";
                const description = log.description || "(无描述)";

                let logLabel = "事件";
                let badgeStyle =
                  "bg-zinc-800/80 text-zinc-300 border border-zinc-600/50";
                let borderStyle = "border-l-amber-500/40 bg-zinc-950/40";

                switch (log.type) {
                  case "give_score":
                    logLabel = "给分";
                    badgeStyle =
                      "bg-indigo-500/15 text-indigo-300 border border-indigo-500/35";
                    borderStyle = "border-l-indigo-400 bg-indigo-950/20";
                    break;
                  case "pocket":
                    logLabel = "落袋";
                    badgeStyle =
                      "bg-amber-500/15 text-amber-300 border border-amber-500/35";
                    borderStyle = "border-l-amber-400 bg-amber-950/15";
                    break;
                  case "drink":
                    logLabel = "喝水";
                    badgeStyle =
                      "bg-cyan-500/15 text-cyan-300 border border-cyan-500/35";
                    borderStyle = "border-l-cyan-400 bg-cyan-950/15";
                    break;
                  case "foul":
                    logLabel = "犯规";
                    badgeStyle =
                      "bg-red-500/15 text-red-300 border border-red-500/35";
                    borderStyle = "border-l-red-400 bg-red-950/15";
                    break;
                  case "deal":
                    logLabel = "发牌";
                    badgeStyle =
                      "bg-emerald-500/15 text-emerald-300 border border-emerald-500/35";
                    borderStyle = "border-l-emerald-400 bg-emerald-950/15";
                    break;
                  case "round_end":
                    logLabel = "局结";
                    badgeStyle =
                      "bg-yellow-500/15 text-yellow-300 border border-yellow-500/35";
                    borderStyle = "border-l-yellow-400";
                    break;
                  case "room_created":
                    logLabel = "创房";
                    badgeStyle =
                      "bg-teal-500/15 text-teal-300 border border-teal-500/35";
                    borderStyle = "border-l-teal-400";
                    break;
                }

                return (
                  <div
                    key={log.id}
                    className={`p-3 rounded-xl border-l-[3px] hover:bg-white/[0.03] transition-colors flex flex-col gap-1.5 text-[11px] ${borderStyle}`}
                  >
                    <div className="flex justify-between items-center text-zinc-500">
                      <span className="font-mono text-[10px]">
                        {parts || "时间不详"}
                      </span>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${badgeStyle}`}
                      >
                        {logLabel}
                      </span>
                    </div>
                    <p className="text-zinc-200 leading-relaxed">{description}</p>

                    {log.scoreChanges &&
                      Object.keys(log.scoreChanges).length > 0 && (
                        <div className="flex gap-2 flex-wrap text-[10px] mt-0.5 bg-black/25 px-2 py-1.5 rounded-lg">
                          {Object.entries(log.scoreChanges).map(([pId, diff]) => {
                            const player = safePlayers.find((p) => p.id === pId);
                            if (!player) return null;
                            return (
                              <span key={pId} className="text-zinc-400 font-mono">
                                {player.name}:{" "}
                                <strong
                                  className={
                                    diff >= 0
                                      ? "text-emerald-400"
                                      : "text-rose-400"
                                  }
                                >
                                  {diff >= 0 ? `+${diff}` : diff}
                                </strong>
                              </span>
                            );
                          })}
                        </div>
                      )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
