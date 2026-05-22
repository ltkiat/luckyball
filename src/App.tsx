/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, off, get } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBi3lf_5kQ1BRa4Bat_kMgdBbezZEibmrs",
  authDomain: "luckyball-2c998.firebaseapp.com",
  databaseURL: "https://luckyball-2c998-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "luckyball-2c998",
  storageBucket: "luckyball-2c998.firebasestorage.app",
  messagingSenderId: "929781895354",
  appId: "1:929781895354:web:1ffa0cb3e164f7d545b283",
  measurementId: "G-TFCR6G5YQP"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
import {
  Player,
  GameSettings,
  GameState,
  LogEntry,
  GameMode,
  TableFeltColor,
  CardType,
  CardObject,
} from "./types";
import {
  BALL_COLORS,
  FELT_COLOR_STYLES,
} from "./components/PoolTable";
import HistorySidebar from "./components/HistorySidebar";
import PlayerAvatar from "./components/PlayerAvatar";
import CardDealing from "./components/CardDealing";
import RealisticPokerCard from "./components/RealisticPokerCard";
import {
  playBallHitSound,
  playPocketSound,
  playDrinkWaterSound,
  playWinSound,
  playDealCardSound,
  playReceiveScoreSound,
} from "./utils/audio";
import { speakReceivedPoints, warmUpSpeech } from "./utils/speech";
import RoomNumberDisplay from "./components/RoomNumberDisplay";
import GiveScoreButtons from "./components/GiveScoreButtons";
import TournamentSettlement from "./components/TournamentSettlement";
import {
  Coffee,
  RotateCcw,
  Sparkles,
  Users,
  Settings,
  Play,
  CheckCircle,
  HelpCircle,
  Trophy,
  History,
  Volume2,
  VolumeX,
  Layers,
  Award,
  Trash2,
  Lock,
  UserCheck,
  Eye,
  Info,
  Home,
  BookOpen,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Default values & styles
const CARD_RANK: Record<string, number> = {
  A: 14,
  K: 13,
  Q: 12,
  J: 11,
  "10": 10,
  "9": 9,
  "8": 8,
  "7": 7,
  "6": 6,
  "5": 5,
  "4": 4,
  "3": 3,
  "2": 2,
};

const sortCardsByRank = (cards: CardObject[]): CardObject[] =>
  [...cards].sort((a, b) => CARD_RANK[a.value] - CARD_RANK[b.value]);
const DEFAULT_COLORS = [
  "#fbbf24",
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#a855f7",
  "#06b6d4",
  "#f43f5e",
  "#a855f7",
  "#e11d48",
  "#059669",
];
const DEFAULT_NAMES = [
  "阿华",
  "小美",
  "大壯",
  "老李",
  "小羽",
  "阿强",
  "露露",
  "亮亮",
  "婷婷",
  "胖虎",
];
const ANIMAL_AVATARS = [
  "🦁", "🐯", "🐼", "🦊", "🐨", "🐰", "🐶", "🐱", "🐻", "🐸", "🐵", "🐹", "🐿️", "🦥",
];
const shuffledAvatars = [...ANIMAL_AVATARS].sort(() => Math.random() - 0.5);

/** 测试模式：房主无需等满员（原需 3/4/5 人全部入座）即可开局 */
const DEV_SKIP_FULL_ROOM_TO_START = false;

// Helper to generate a Poker deck representing balls
function generatePokerDeck(totalCount: number): CardObject[] {
  const suits: ("spade" | "heart" | "club" | "diamond")[] = [
    "spade",
    "heart",
    "club",
    "diamond",
  ];
  const values = [
    "A",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "J",
    "Q",
    "K",
  ];

  const deck: CardObject[] = [];
  for (let b = 1; b <= totalCount; b++) {
    const suit = suits[(b - 1) % suits.length];
    // map values based on pool score mapping
    const valIdx = (b + 5) % values.length;
    deck.push({
      suit,
      value: values[valIdx],
      billiardNum: b,
    });
  }
  return deck;
}

export default function App() {
  // Global Game State initialized in 'home' phase
  const [_gameState, _setGameState] = useState<GameState>({
    phase: "home",
    roomNo: "",
    settings: {
      mode: "snooker_classic",
      playerCount: 3,
      gameAmount: "2-5",
      cardsPerPlayer: 8,
      ownPocketScore: 10,
      opponentPocketScore: 5,
      shooterBonusScore: 5,
      drinkWaterPenalty: 5,
      totalBalls: 24,
      feltColor: "classic_green",
      cardType: "poker",
    },
    players: [],
    activePlayerIndex: 0,
    pocketedBalls: [],
    logs: [],
    currentRound: 1,
    drawnStatus: {},
    orderCards: [],
    ordersDrawn: {},
    isOrderApplied: false,
  });

  const gameState = _gameState;

  // Firebase strips empty arrays. We need to normalize incoming data.
  const normalizeGameState = (data: any): GameState => {
    return {
      ...data,
      logs: data.logs || [],
      pocketedBalls: data.pocketedBalls || [],
      orderCards: data.orderCards || [],
      ordersDrawn: data.ordersDrawn || {},
      drawnStatus: data.drawnStatus || {},
      players: (data.players || []).map((p: any) => ({
        ...p,
        cards: p.cards || [],
        pocketedCards: p.pocketedCards || [],
        historyScores: p.historyScores || [],
      })),
    };
  };

  // Custom setGameState wrapper to push to Firebase
  const setGameState = (action: React.SetStateAction<GameState>) => {
    _setGameState((prev) => {
      const next = typeof action === "function" ? (action as any)(prev) : action;
      // Sync to cloud if in a room and not joining
      if (next.roomNo && next.phase !== "home" && next.phase !== "join_room") {
        try {
          const cleanNext = JSON.parse(JSON.stringify(next));
          set(ref(database, `rooms/${next.roomNo}`), cleanNext).catch(console.error);
        } catch (err) {
          console.error("Firebase sync error:", err);
        }
      }
      return next;
    });
  };

  // Listen to Firebase cloud updates
  useEffect(() => {
    if (gameState.roomNo && gameState.phase !== "home" && gameState.phase !== "join_room") {
      const roomRef = ref(database, `rooms/${gameState.roomNo}`);
      const unsubscribe = onValue(roomRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          // Use native _setGameState to avoid re-triggering cloud writes
          _setGameState((prev) => {
             // Optional: only update if something structurally changed, but this is fine for JSON object
             return { ...prev, ...normalizeGameState(data) };
          });
        }
      });
      return () => unsubscribe();
    }
  }, [gameState.roomNo, gameState.phase]);

  // UI States
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [customNames, setCustomNames] = useState<string[]>(DEFAULT_NAMES);
  const [isPeekingPlayerId, setIsPeekingPlayerId] = useState<string | null>(
    null,
  );
  const [twitchingPlayerId, setTwitchingPlayerId] = useState<string | null>(
    null,
  );
  const [myPlayerId, setMyPlayerId] = useState<string>("");
  const [myName, setMyName] = useState<string>("");
  const [hasDismissedDrawModal, setHasDismissedDrawModal] = useState(false);
  const [hasEnteredGame, setHasEnteredGame] = useState(false); // local: whether I've clicked 进入对局 in joined phase
  const [hasStartedNextRound, setHasStartedNextRound] = useState(false); // local: whether I've started next round
  const [showSettlement, setShowSettlement] = useState(false);
  const [togglePeekMyCards, setTogglePeekMyCards] = useState(false);

  // Reset local flags when global phase changes
  useEffect(() => {
    if (!gameState.isOrderApplied) {
      setHasDismissedDrawModal(false);
    }
  }, [gameState.isOrderApplied]);

  useEffect(() => {
    setHasEnteredGame(false);
  }, [gameState.currentRound, gameState.phase]);

  useEffect(() => {
    setHasStartedNextRound(false);
  }, [gameState.currentRound]);

  useEffect(() => {
    if (gameState.phase !== "ended") {
      setShowSettlement(false);
    }
  }, [gameState.phase]);
  const [notifications, setNotifications] = useState<
    { id: string; message: string }[]
  >([]);

  const [joinRoomInput, setJoinRoomInput] = useState("");

  useEffect(() => {
    const initSpeech = () => warmUpSpeech();
    window.addEventListener("click", initSpeech, { once: true });
    window.addEventListener("touchstart", initSpeech, { once: true });
    return () => {
      window.removeEventListener("click", initSpeech);
      window.removeEventListener("touchstart", initSpeech);
    };
  }, []);
  const [isGameModalOpen, setIsGameModalOpen] = useState(false);
  const [gameModalSelection, setGameModalSelection] = useState<string | null>(
    "everyone",
  );
  const [gameWinnerId, setGameWinnerId] = useState<string | null>(null);
  const [scoreFlyers, setScoreFlyers] = useState<{ id: string; playerId: string; change: number }[]>([]);

  // Helper to determine order drawing status/rules for the current round
  const getRoundDrawingRules = () => {
    // If it's the lobby or first round, all players must draw
    if (gameState.currentRound <= 1) {
      return {
        fixedPlayers: [] as { playerId: string; position: number }[],
        drawingPlayerIds: gameState.players.map((p) => p.id),
      };
    }

    const lastLog = gameState.logs.find((log) => log.type === "give_score");
    if (!lastLog) {
      return {
        fixedPlayers: [] as { playerId: string; position: number }[],
        drawingPlayerIds: gameState.players.map((p) => p.id),
      };
    }

    const winnerId = lastLog.playerId;
    const scoreChanges = lastLog.scoreChanges || {};
    const negativeEntries = Object.entries(scoreChanges).filter(([_, change]) => change < 0);
    const N = gameState.players.length;

    if (negativeEntries.length === 1) {
      // "包GAME": winner is 1st, loser is 2nd
      const loserId = negativeEntries[0][0];
      const othersIds = gameState.players
        .filter((p) => p.id !== winnerId && p.id !== loserId)
        .map((p) => p.id);

      if (N === 3) {
        // For 3-player, the 3rd is automatically determined — no need to draw
        return {
          fixedPlayers: [
            { playerId: winnerId, position: 0 },
            { playerId: loserId, position: 1 },
            { playerId: othersIds[0], position: 2 },
          ],
          drawingPlayerIds: [] as string[], // No draw needed!
        };
      }

      // 4/5 players: remaining must draw for positions 3..N
      return {
        fixedPlayers: [
          { playerId: winnerId, position: 0 },
          { playerId: loserId, position: 1 },
        ],
        drawingPlayerIds: othersIds,
      };
    } else {
      // "GAME大家": winner is 1st, all others must draw (regardless of player count)
      return {
        fixedPlayers: [
          { playerId: winnerId, position: 0 },
        ],
        drawingPlayerIds: gameState.players.filter((p) => p.id !== winnerId).map((p) => p.id),
      };
    }
  };


  const getEstimatedOrder = () => {
    const rules = getRoundDrawingRules();
    const N = gameState.players.length;
    if (N === 0) return [];
    const result = new Array(N).fill(null);

    // Place fixed players
    rules.fixedPlayers.forEach((fp) => {
      const player = gameState.players.find((p) => p.id === fp.playerId);
      if (player) {
        result[fp.position] = {
          player,
          isFixed: true,
          positionName: fp.position === 0 ? "👑 赢家 (第1棒)" : "🎯 输家 (第2棒)",
          card: null,
          rank: 999 - fp.position,
        };
      }
    });

    // Sort drawing players
    const sortedDrawing = rules.drawingPlayerIds
      .map((pid) => {
        const drawnCard = gameState.ordersDrawn[pid];
        const rank = drawnCard ? CARD_RANK[drawnCard.value] : -1;
        const player = gameState.players.find((p) => p.id === pid)!;
        return {
          player,
          isFixed: false,
          positionName: "",
          card: drawnCard,
          rank,
        };
      })
      .sort((a, b) => b.rank - a.rank);

    // Fill remaining spots in result array
    let drawingIdx = 0;
    for (let i = 0; i < N; i++) {
      if (result[i] === null && drawingIdx < sortedDrawing.length) {
        result[i] = sortedDrawing[drawingIdx];
        drawingIdx++;
      }
    }

    return result.filter(item => item !== null);
  };

  const addNotification = (message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  };

  // Generating a brand-new random room code on mount or reset
  const generateNewRoomNo = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  // Set initial setup metadata
  useEffect(() => {
    if (gameState.phase === "room_creation" && !gameState.roomNo) {
      setGameState((prev) => ({ ...prev, roomNo: generateNewRoomNo() }));
    }
  }, [gameState.phase]);

  // (Removed legacy auto-generation useEffect to allow true multiplayer lobby)

  // Generate distinct cards for order selection step
  useEffect(() => {
    if ((gameState.phase === "joined" || gameState.phase === "dealing") && gameState.orderCards.length === 0) {
      const rules = getRoundDrawingRules();
      const numCardsToDraw = rules.drawingPlayerIds.length;
      if (numCardsToDraw > 0) {
        const suits: ("spade" | "heart" | "club" | "diamond")[] = [
          "spade",
          "heart",
          "club",
          "diamond",
        ];
        const values = [
          "2",
          "3",
          "4",
          "5",
          "6",
          "7",
          "8",
          "9",
          "10",
          "J",
          "Q",
          "K",
          "A",
        ]; // 2 is lowest, A is highest

        // Shuffle poker values to select distinct values
        const shuffledValues = [...values].sort(() => Math.random() - 0.5);
        const selectedValues = shuffledValues.slice(0, numCardsToDraw);

        const generated = selectedValues.map((val) => {
          const suit = suits[Math.floor(Math.random() * suits.length)];
          return {
            suit,
            value: val,
            billiardNum: 0, // 0 means order decider card
          };
        });
        setGameState((prev) => ({
          ...prev,
          orderCards: generated,
          ordersDrawn: {},
        }));
      }
    }
  }, [gameState.phase, gameState.players.length, gameState.orderCards.length]);

  // Handle game betting amount preset settings
  const handleGameAmountChange = (amount: "1-3" | "2-5" | "3-10" | "5-15") => {
    setGameState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        gameAmount: amount,
      },
    }));
  };

  const handleNameChange = (index: number, name: string) => {
    const updated = [...customNames];
    updated[index] = name;
    setCustomNames(updated);

    setGameState((prev) => ({
      ...prev,
      players: prev.players.map((p, i) => (i === index ? { ...p, name } : p)),
    }));
  };

  // Start dealing and drawing phase (Step 2 & 3)
  const initializeLobbyAndDraw = () => {
    if (soundEnabled) playDealCardSound();

    const maxBalls = gameState.settings.totalBalls;
    const fullDeck = generatePokerDeck(maxBalls);

    // Shuffle cards
    const shuffledDeck = [...fullDeck];
    for (let i = shuffledDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledDeck[i], shuffledDeck[j]] = [shuffledDeck[j], shuffledDeck[i]];
    }

    const cardsCount = gameState.settings.cardsPerPlayer;
    const updatedPlayers = gameState.players.map((player, idx) => {
      const startIdx = idx * cardsCount;
      const assigned = sortCardsByRank(
        shuffledDeck.slice(startIdx, startIdx + cardsCount),
      );
      return {
        ...player,
        cards: assigned,
        pocketedCards: [],
        drinkCount: 0,
        isActive: idx === 0,
      };
    });

    // Reset drawing confirm flags
    const initialDrawnStatus: Record<string, boolean> = {};
    updatedPlayers.forEach((p) => {
      initialDrawnStatus[p.id] = false;
    });

    setGameState((prev) => ({
      ...prev,
      phase: "dealing",
      players: updatedPlayers,
      pocketedBalls: [],
      activePlayerIndex: 0,
      drawnStatus: initialDrawnStatus,
      logs: [
        {
          id: `room_created_${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: "room_created",
          description: `斯诺克牌局创建成功！房间号: #${prev.roomNo}。对应桌布颜色为【${
            prev.settings.feltColor === "classic_green"
              ? "经典森林绿"
              : prev.settings.feltColor === "royal_blue"
                ? "皇家深邃蓝"
                : prev.settings.feltColor === "elite_burgundy"
                  ? "贵族酒红"
                  : "碳纤曜石黑"
          }】。已为所有加入者分配 ${cardsCount} 张专属扑克牌号！`,
          scoreChanges: {},
        },
      ],
    }));
  };

  const handleMarkPlayerDrawn = (playerId: string) => {
    setGameState((prev) => {
      const nextDrawn = { ...prev.drawnStatus, [playerId]: true };
      const allDrawn = prev.players.every((p) => nextDrawn[p.id] === true);

      // Transition to active gaming if all players checked cards
      const nextPhase = allDrawn ? "playing" : "joined";

      return {
        ...prev,
        drawnStatus: nextDrawn,
        phase: nextPhase,
        logs: allDrawn
          ? [
              {
                id: `deal_complete_${Date.now()}`,
                timestamp: new Date().toISOString(),
                type: "deal",
                description: `🎉 所有玩家秘密查牌（抽牌）完成！计分台开启！激活并生成“被迫喝水（犯规）”考核区。`,
                scoreChanges: {},
              },
              ...prev.logs,
            ]
          : prev.logs,
      };
    });
  };

  // Ball pocketing physics rules & scoring core
  const handlePocketBall = (ball: number, shooterId: string) => {
    setGameState((prev) => {
      const updatedPocketedBalls = [...prev.pocketedBalls, ball];

      // Identify whose card belongs to this billiard ball
      const ownerPlayer = prev.players.find((p) =>
        p.cards.some((c) => c.billiardNum === ball),
      );
      const shooterPlayer = prev.players.find((p) => p.id === shooterId);

      const scoreChanges: Record<string, number> = {};
      let desc = "";

      prev.players.forEach((p) => {
        scoreChanges[p.id] = 0;
      });

      const updatedPlayers = prev.players.map((p) => {
        const isShooter = p.id === shooterId;
        const isOwner = ownerPlayer ? p.id === ownerPlayer.id : false;

        let pocketedHandList = [...p.pocketedCards];
        const cardObj = p.cards.find((c) => c.billiardNum === ball);
        if (
          isOwner &&
          cardObj &&
          !pocketedHandList.some((item) => item.billiardNum === ball)
        ) {
          pocketedHandList.push(cardObj);
        }

        let newScore = p.score;

        // Custom scoring mode rules
        if (
          prev.settings.mode === "survival" ||
          prev.settings.mode === "snooker_classic"
        ) {
          // Survival/Snooker Mode: Pocketing own ball awards positive points
          if (isShooter && isOwner) {
            newScore += prev.settings.ownPocketScore;
            scoreChanges[p.id] = prev.settings.ownPocketScore;
            desc = `【自主进账】✊ ${p.name} 亲手将自己关联的牌面球 [${ball}号] 打入，获得最高礼遇 +${prev.settings.ownPocketScore} 积分！`;
          }
          // Pocketing opponent card deducts opponent points, awards shooter bonus
          else if (isOwner) {
            newScore -= prev.settings.opponentPocketScore;
            scoreChanges[p.id] = -prev.settings.opponentPocketScore;
            triggerCardTwitch(p.id);
          } else if (isShooter) {
            newScore += prev.settings.shooterBonusScore;
            scoreChanges[p.id] = prev.settings.shooterBonusScore;
          }
        } else if (prev.settings.mode === "target") {
          // Target Speed Mode
          if (isShooter && isOwner) {
            newScore += prev.settings.ownPocketScore;
            scoreChanges[p.id] = prev.settings.ownPocketScore;
            desc = `【速进己球】🎯 ${p.name} 打进己方关联球 [${ball}号]，喜提 +${prev.settings.ownPocketScore} 分。`;
          } else if (isOwner) {
            newScore -= 3;
            scoreChanges[p.id] = -3;
            triggerCardTwitch(p.id);
          } else if (isShooter) {
            newScore += 2;
            scoreChanges[p.id] = 2;
          }
        } else {
          // Points Mode
          if (isShooter && isOwner) {
            newScore += prev.settings.ownPocketScore;
            scoreChanges[p.id] = prev.settings.ownPocketScore;
          } else if (isOwner) {
            newScore -= prev.settings.opponentPocketScore;
            scoreChanges[p.id] = -prev.settings.opponentPocketScore;
            triggerCardTwitch(p.id);
          }
        }

        return {
          ...p,
          score: newScore,
          pocketedCards: pocketedHandList,
        };
      });

      if (!desc) {
        if (ownerPlayer && shooterPlayer) {
          if (ownerPlayer.id === shooterPlayer.id) {
            desc = `【自我清理】${shooterPlayer.name} 进账自己的专属球牌 [${ball}号]。`;
          } else {
            desc = `【击溃敌牌】⚔️ ${shooterPlayer.name} 精准突击，把属于 ${ownerPlayer.name} 的对应牌球 [${ball}号] 击沉！${ownerPlayer.name} 全身发生冷颤扣除 ${prev.settings.opponentPocketScore} 分，${shooterPlayer.name} 作为突击手加 ${prev.settings.shooterBonusScore} 分。`;
          }
        } else {
          const shooterName = shooterPlayer ? shooterPlayer.name : "公共球员";
          desc = `【口袋进球】${shooterName} 击沉了一颗无关双方暗箱的公共球 [${ball}号]，积分为静态。`;
        }
      }

      const newLog: LogEntry = {
        id: `pocket_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: "pocket",
        playerId: shooterId,
        targetPlayerId: ownerPlayer?.id,
        ball,
        description: desc,
        scoreChanges,
      };

      // Detect if someone pocketed all their assigned cards - Round Completed!
      const winner = updatedPlayers.find(
        (p) => p.pocketedCards.length === p.cards.length && p.cards.length > 0,
      );
      if (winner) {
        if (soundEnabled) playWinSound();

        updatedPlayers.forEach((p) => {
          if (p.id === winner.id) {
            p.score += 20; // +20 points tournament prize
            scoreChanges[p.id] = (scoreChanges[p.id] || 0) + 20;
          }
        });

        const victoryLog: LogEntry = {
          id: `victory_${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: "round_end",
          playerId: winner.id,
          description: `🏅 绝尘而去！${winner.name} 已经率先将自己所有的球卡牌全部洗落入袋！全场清台。额外加冕 +20 分桂冠积分！`,
          scoreChanges: { [winner.id]: 20 },
        };

        return {
          ...prev,
          phase: "ended",
          players: updatedPlayers,
          pocketedBalls: updatedPocketedBalls,
          winnerPlayerId: winner.id,
          logs: [victoryLog, newLog, ...prev.logs],
        };
      }

      return {
        ...prev,
        players: updatedPlayers,
        pocketedBalls: updatedPocketedBalls,
        logs: [newLog, ...prev.logs],
      };
    });
  };

  const handleUnpocketBall = (ball: number) => {
    setGameState((prev) => {
      const updatedPocketedBalls = prev.pocketedBalls.filter((b) => b !== ball);
      const matchedLog = prev.logs.find(
        (log) => log.type === "pocket" && log.ball === ball,
      );

      const restoredPlayers = prev.players.map((p) => {
        const pocketedRestored = p.pocketedCards.filter(
          (item) => item.billiardNum !== ball,
        );
        let scoreToRestore = p.score;
        if (matchedLog && matchedLog.scoreChanges[p.id]) {
          scoreToRestore -= matchedLog.scoreChanges[p.id];
        }
        return {
          ...p,
          score: scoreToRestore,
          pocketedCards: pocketedRestored,
        };
      });

      const resetLog: LogEntry = {
        id: `undo_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: "reset",
        ball,
        description: `【裁判干预】${BALL_COLORS[ball]?.name || ball} 重新被吸回，于斯诺克台面上复位。`,
        scoreChanges: {},
      };

      return {
        ...prev,
        players: restoredPlayers,
        pocketedBalls: updatedPocketedBalls,
        logs: [
          resetLog,
          ...prev.logs.filter((log) => log.id !== matchedLog?.id),
        ],
      };
    });
  };

  // Step 4: Drink water sequence with card drawing and card shake but no point deduction
  const handleDrinkWater = (playerId: string) => {
    if (soundEnabled) playBallHitSound();
    triggerCardTwitch(playerId);

    const offenderOutside = gameState.players.find((p) => p.id === playerId);
    if (offenderOutside) {
      addNotification(`💦 ${offenderOutside.avatar} ${offenderOutside.name} 喝水了！被强制加抽了一张罚牌！`);
    }

    setGameState((prev) => {
      const offender = prev.players.find((p) => p.id === playerId);
      if (!offender) return prev;

      // Find all ball numbers currently assigned in player hands
      const allHeldCardNumbers = prev.players.flatMap((p) =>
        p.cards.map((c) => c.billiardNum),
      );
      const fullDeck = generatePokerDeck(prev.settings.totalBalls);
      const remaining = fullDeck.filter(
        (c) => !allHeldCardNumbers.includes(c.billiardNum),
      );

      let cardToAdd: CardObject | null = null;
      if (remaining.length > 0) {
        cardToAdd = remaining[Math.floor(Math.random() * remaining.length)];
      } else {
        // Fallback: draw any card offender doesn't already have
        const offenderCardNumbers = offender.cards.map((c) => c.billiardNum);
        const fallbackOptions = fullDeck.filter(
          (c) => !offenderCardNumbers.includes(c.billiardNum),
        );
        if (fallbackOptions.length > 0) {
          cardToAdd =
            fallbackOptions[Math.floor(Math.random() * fallbackOptions.length)];
        }
      }

      const updatedPlayers = prev.players.map((p) => {
        if (p.id === playerId) {
          const newCard = cardToAdd
            ? { ...cardToAdd, isNewlyDrawn: true, isDrinkPenalty: true }
            : null;
          const newCards = newCard
            ? sortCardsByRank([...p.cards, newCard])
            : p.cards;
          return {
            ...p,
            drinkCount: p.drinkCount + 1,
            cards: newCards,
          };
        }
        return p;
      });

      const foulLog: LogEntry = {
        id: `foul_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: "drink",
        playerId,
        description: `🍻 【大口喝水】${offender.name} 触犯了落袋/白球出界犯规！饮水一杯不扣分，被迫加抽一张罚牌！他的卡牌发生剧烈颤抖！`,
        scoreChanges: {},
      };

      if (cardToAdd) {
        setTimeout(() => {
          setGameState((currentState) => ({
            ...currentState,
            players: currentState.players.map((p) => {
              if (p.id === playerId) {
                return {
                  ...p,
                  cards: p.cards.map((c) => ({ ...c, isNewlyDrawn: false })),
                };
              }
              return p;
            }),
          }));
        }, 3000);
      }

      return {
        ...prev,
        players: updatedPlayers,
        logs: [foulLog, ...prev.logs],
      };
    });
  };

  const triggerCardTwitch = (playerId: string) => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      // Vibrate pattern: 200ms on, 100ms off, 200ms on
      navigator.vibrate([200, 100, 200]);
    }
  };

  const getGiveScoreBaseValue = (gameAmount: string): number => {
    const match = gameAmount.match(/^(\d+)/);
    return match ? parseInt(match[1], 10) : 2;
  };

  const getGiveScoreGroupValue = (
    gameAmount: string,
    playerCount: number,
  ): number => getGiveScoreBaseValue(gameAmount) * Math.max(playerCount - 1, 1);

  const handleGiveScore = (
    fromPlayerId: string,
    toPlayerId: string,
    pts?: number,
  ) => {
    if (soundEnabled) playBallHitSound();
    const points =
      pts ?? getGiveScoreBaseValue(gameState.settings.gameAmount);

    const giver = gameState.players.find((p) => p.id === fromPlayerId);
    const receiver = gameState.players.find((p) => p.id === toPlayerId);

    if (giver && receiver) {
      addNotification(
        `✨ ${giver.avatar} ${giver.name} 给 ${receiver.avatar} ${receiver.name} 了 ${points} 分！`,
      );
      if (toPlayerId === myPlayerId && soundEnabled) {
        playReceiveScoreSound();
        speakReceivedPoints(points, true);
      }
    }

    setGameState((prev) => {
      if (!giver || !receiver) return prev;

      const scoreChanges: Record<string, number> = {};
      prev.players.forEach((p) => {
        if (p.id === fromPlayerId) {
          scoreChanges[p.id] = -points;
        } else if (p.id === toPlayerId) {
          scoreChanges[p.id] = points;
        } else {
          scoreChanges[p.id] = 0;
        }
      });

      const updatedPlayers = prev.players.map((p) => {
        if (p.id === fromPlayerId) {
          return { ...p, score: p.score - points };
        }
        if (p.id === toPlayerId) {
          return { ...p, score: p.score + points };
        }
        return p;
      });

      const giveLog: LogEntry = {
        id: `give_score_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: "give_score",
        playerId: fromPlayerId,
        targetPlayerId: toPlayerId,
        description: `🎁 【给分打赏】${giver.name} 向 ${receiver.name} 手动给分 ${points} 分！`,
        scoreChanges,
      };

      return {
        ...prev,
        players: updatedPlayers,
        logs: [giveLog, ...prev.logs],
      };
    });
  };

  const handleRevealCard = (playerId: string, cardIndex: number) => {
    if (playerId !== myPlayerId) return;
    if (soundEnabled) playBallHitSound();

    setGameState((prev) => {
      const player = prev.players.find((p) => p.id === playerId);
      const card = player?.cards[cardIndex];
      if (!card) return prev;

      const prevRevealed = !!card.isRevealed;
      const nextRevealed = !prevRevealed;

      const ballName =
        BALL_COLORS[card.billiardNum]?.name || `${card.billiardNum}号球`;
      const desc = nextRevealed
        ? `📢 【选手开牌】选手 ${player?.name} 主动翻牌公开展示了手牌：【${card.value}】号 (${ballName})`
        : `🙈 【收回公开】选手 ${player?.name} 收回并重新折叠隐藏了手牌 (${ballName})`;

      const updatedPlayers = prev.players.map((p) => {
        if (p.id === playerId) {
          return {
            ...p,
            cards: p.cards.map((c, idx) =>
              idx === cardIndex ? { ...c, isRevealed: nextRevealed } : c,
            ),
          };
        }
        return p;
      });

      return {
        ...prev,
        players: updatedPlayers,
      };
    });
  };

  const handleNextTurnClient = () => {
    setGameState((prev) => {
      const nextIdx = (prev.activePlayerIndex + 1) % prev.players.length;
      return {
        ...prev,
        activePlayerIndex: nextIdx,
      };
    });
  };

  const handleGameConfirm = () => {
    if (!gameModalSelection || !gameWinnerId) return;

    const amountStr = gameState.settings.gameAmount;
    const maxAmount = parseInt(amountStr.split("-")[1] || "0");
    const N = gameState.players.length;

    const currentPlayerId = gameWinnerId;

    const newScoreChanges: Record<string, number> = {};
    let desc = "";

    const winnerName = gameState.players.find(p => p.id === currentPlayerId)?.name;

    if (gameModalSelection === "everyone") {
      const totalGain = maxAmount * (N - 1);
      newScoreChanges[currentPlayerId] = totalGain;
      gameState.players.forEach((p) => {
        if (p.id !== currentPlayerId) {
          newScoreChanges[p.id] = -maxAmount;
        }
      });
      desc = `💥 【GAME大家】! ${winnerName} 赢得全场，其他每人扣除 ${maxAmount} 分，获得 ${totalGain} 分！`;
    } else {
      const payerId = gameModalSelection;
      if (payerId === currentPlayerId) return;
      const penalty = maxAmount * (N - 1);

      newScoreChanges[currentPlayerId] = penalty;
      newScoreChanges[payerId] = -penalty;

      const loserName = gameState.players.find((p) => p.id === payerId)?.name;
      desc = `🔥 【包${loserName} GAME】! ${loserName} 包揽全责，扣除 ${penalty} 分，${winnerName} 获得 ${penalty} 分！`;
    }

    setGameState((prev) => {
      const newPlayers = prev.players.map((p) => {
        const change = newScoreChanges[p.id] || 0;
        return { ...p, score: p.score + change };
      });

      const newLog: LogEntry = {
        id: `game_conclude_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: "give_score",
        playerId: currentPlayerId,
        targetPlayerId:
          gameModalSelection !== "everyone" ? gameModalSelection : undefined,
        description: desc,
        scoreChanges: newScoreChanges,
      };

      const leader = newPlayers.reduce(
        (max, p) => (p.score > max.score ? p : max),
        newPlayers[0],
      );

      return {
        ...prev,
        players: newPlayers,
        logs: [newLog, ...prev.logs],
        phase: "ended",
        winnerPlayerId: leader.id,
      };
    });

    const flyers = Object.entries(newScoreChanges).filter(([_, v]) => v !== 0).map(([id, change]) => ({
      id: Math.random().toString(36).substring(2, 9),
      playerId: id,
      change,
    }));
    
    if (flyers.length > 0) {
      setScoreFlyers((prev) => [...prev, ...flyers]);
      setTimeout(() => {
        setScoreFlyers((prev) => prev.filter(f => !flyers.find(nf => nf.id === f.id)));
      }, 3000);
    }

    if (soundEnabled) playWinSound();
    setIsGameModalOpen(false);
    setGameModalSelection("everyone");
  };

  const transitionToConclude = () => {
    if (soundEnabled) playWinSound();
    setGameState((prev) => {
      const leader = prev.players.reduce(
        (max, p) => (p.score > max.score ? p : max),
        prev.players[0],
      );
      return {
        ...prev,
        phase: "ended",
        winnerPlayerId: leader.id,
      };
    });
  };

  const startNextRoundOfTournament = () => {
    setGameState((prev) => {
      const maxBalls = prev.settings.totalBalls;
      let newDeck = generatePokerDeck(maxBalls);
      
      const generated = [...newDeck].sort(() => Math.random() - 0.5);

      const shuffledDeck = [...newDeck];
      for (let i = shuffledDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledDeck[i], shuffledDeck[j]] = [shuffledDeck[j], shuffledDeck[i]];
      }

      // Rotate players so that the winner of the last round is first, loser is second, others follow
      const lastLog = prev.logs.find(log => log.type === 'give_score');
      let rotatedPlayers = [...prev.players];
      if (lastLog) {
        const winnerId = lastLog.playerId;
        const scoreChanges = lastLog.scoreChanges || {};
        
        // Find if there is exactly one payer (negative score change)
        const negativeEntries = Object.entries(scoreChanges).filter(([_, change]) => change < 0);
        
        if (negativeEntries.length === 1) {
          // "包GAME" situation: winner is first, loser is second, others follow in original relative order
          const loserId = negativeEntries[0][0];
          const winner = rotatedPlayers.find(p => p.id === winnerId);
          const loser = rotatedPlayers.find(p => p.id === loserId);
          const others = rotatedPlayers.filter(p => p.id !== winnerId && p.id !== loserId);
          if (winner && loser) {
            rotatedPlayers = [winner, loser, ...others];
          }
        } else {
          // "GAME大家" or default situation: winner is first, others follow in original clockwise rotation
          const winnerIdx = rotatedPlayers.findIndex(p => p.id === winnerId);
          if (winnerIdx !== -1) {
            const part1 = rotatedPlayers.slice(winnerIdx);
            const part2 = rotatedPlayers.slice(0, winnerIdx);
            rotatedPlayers = [...part1, ...part2];
          }
        }
      }

      const cardsCount = prev.settings.cardsPerPlayer;
      const updatedPlayers = rotatedPlayers.map((player, idx) => {
        const startIdx = idx * cardsCount;
        const assigned = sortCardsByRank(
          shuffledDeck.slice(startIdx, startIdx + cardsCount),
        );
        return {
          ...player,
          cards: assigned,
          pocketedCards: [],
          drinkCount: 0,
          totalDrinkCount:
            (player.totalDrinkCount ?? 0) + (player.drinkCount ?? 0),
          isActive: idx === 0,
        };
      });

      const initialDrawnStatus: Record<string, boolean> = {};
      updatedPlayers.forEach((p) => {
        initialDrawnStatus[p.id] = false;
      });

      return {
        ...prev,
        currentRound: prev.currentRound + 1,
        phase: "dealing",
        players: updatedPlayers,
        pocketedBalls: [],
        activePlayerIndex: 0,
        drawnStatus: initialDrawnStatus,
        orderCards: generated,
        ordersDrawn: {},
        isOrderApplied: false,
      };
    });
  };

  const getTournamentSettlement = () =>
    [...gameState.players]
      .map((p) => ({
        player: p,
        netScore: p.score,
        totalDrinks: (p.totalDrinkCount ?? 0) + p.drinkCount,
      }))
      .sort((a, b) => b.netScore - a.netScore);

  const openFinalSettlement = () => {
    if (soundEnabled) playBallHitSound();
    setShowSettlement(true);
  };

  const finishTournamentAndGoHome = () => {
    setShowSettlement(false);
    setHasStartedNextRound(false);
    resetTournamentCompletely();
  };

  const resetTournamentCompletely = () => {
    setShowSettlement(false);
    setGameState({
      phase: "home",
      roomNo: generateNewRoomNo(),
      orderCards: [],
      ordersDrawn: {},
      isOrderApplied: false,
      settings: {
        mode: "snooker_classic",
        playerCount: 3,
        gameAmount: "2-5",
        cardsPerPlayer: 8,
        ownPocketScore: 10,
        opponentPocketScore: 5,
        shooterBonusScore: 5,
        drinkWaterPenalty: 5,
        totalBalls: 24,
        feltColor: "classic_green",
        cardType: "poker",
      },
      players: [],
      activePlayerIndex: 0,
      pocketedBalls: [],
      logs: [],
      currentRound: 1,
      drawnStatus: {},
      orderCards: [],
      ordersDrawn: {},
      isOrderApplied: false,
    });
    setIsPeekingPlayerId(null);
  };

  const activePlayer = gameState.players[gameState.activePlayerIndex];

  return (
    <div 
      className="min-h-screen text-zinc-100 flex flex-col font-sans selection:bg-amber-500 selection:text-neutral-900 overflow-x-hidden pb-12 relative"
      style={{
        backgroundColor: '#0a1a12',
        backgroundImage: 'radial-gradient(circle at 50% 30%, #0e2a1d 0%, #050d09 100%)'
      }}
    >
      {/* Header Bar */}
      <header className="sticky top-0 z-30 glass-panel backdrop-blur-xl border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600/40 to-emerald-900/60 shadow-lg flex items-center justify-center border border-emerald-400/30 text-xl">
            🎱
          </div>
          <div>
            <h1 className="text-white font-extrabold text-sm tracking-wider flex items-center gap-1.5 leading-none">
              Enjoy Your Lucky Ball
              <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/35 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold">
                Lucky Ball v2.0
              </span>
            </h1>
            <p className="text-[9px] text-zinc-500 mt-0.5 tracking-wider font-mono uppercase">
              SNOOKER & EIGHT-BALL SCORER
            </p>
          </div>
        </div>

        {/* Global Controllers */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            title="音效开关"
          >
            {soundEnabled ? (
              <Volume2 size={16} className="text-amber-400 animate-pulse" />
            ) : (
              <VolumeX size={16} />
            )}
          </button>

          <button
            onClick={() => setIsSidebarOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-zinc-200 hover:text-white text-xs font-semibold transition-all cursor-pointer"
            id="open-history-sidebar-btn"
          >
            <History size={14} className="text-amber-500" />
            <span>历史记录</span>
          </button>
        </div>
      </header>

      {/* Main Stage */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 mt-6">
        
        {/* PHASE 0: HOME MENU */}
        {gameState.phase === "home" && (
          <div className="w-full max-w-md mx-auto scoreboard-card rounded-3xl border border-white/10 p-8 shadow-2xl relative overflow-hidden flex flex-col items-center">
            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full filter blur-3xl -z-10" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full filter blur-3xl -z-10" />
            
            <div className="text-center mb-10">
              <span className="text-5xl mb-4 block drop-shadow-xl">🎱</span>
              <h1 className="text-white font-black text-3xl tracking-tight mb-2">
                Enjoy Your Lucky Ball
              </h1>
              <p className="text-zinc-400 text-xs">
                高规格斯诺克/中八计分器
              </p>
            </div>

            <div className="w-full space-y-4">
              <button
                onClick={() => {
                  const roomCode = generateNewRoomNo();
                  setMyPlayerId("player_0");
                  setGameState(prev => ({ 
                    ...prev, 
                    phase: "room_creation", 
                    roomNo: roomCode,
                    players: [{
                      id: "player_0",
                      name: "房主",
                      color: DEFAULT_COLORS[0],
                      avatar: "👑",
                      score: 0,
                      cards: [],
                      pocketedCards: [],
                      drinkCount: 0,
                      isActive: true,
                      historyScores: []
                    }]
                  }));
                }}
                className="w-full py-4 bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-neutral-950 font-black text-lg rounded-2xl shadow-lg shadow-amber-900/20 transition-all hover:-translate-y-1 active:translate-y-0"
              >
                创建房间
              </button>
              
              <button
                onClick={() => setGameState(prev => ({ ...prev, phase: "join_room" }))}
                className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-lg rounded-2xl border border-zinc-700 shadow-lg transition-all hover:-translate-y-1 active:translate-y-0"
              >
                加入房间
              </button>
            </div>
          </div>
        )}

        {/* JOIN ROOM */}
        {gameState.phase === "join_room" && (
          <div className="w-full max-w-md mx-auto bg-neutral-900 rounded-3xl border border-zinc-800/80 p-8 shadow-2xl relative overflow-hidden">
            <div className="text-center mb-8">
              <h2 className="text-white font-black text-2xl tracking-tight mb-2">
                加入房间
              </h2>
              <p className="text-zinc-400 text-xs">
                输入好友创建的房间号
              </p>
            </div>
            
            <input 
              type="text" 
              value={joinRoomInput}
              onChange={(e) => setJoinRoomInput(e.target.value.replace(/\D/g, '').substring(0, 4))}
              placeholder="4位数字房间号"
              className="w-full bg-zinc-950 border-2 border-zinc-800 rounded-2xl px-6 py-4 text-white text-center text-2xl font-black font-mono focus:border-amber-500 outline-none transition-colors mb-6 shadow-inner tracking-widest placeholder:tracking-normal placeholder:font-sans placeholder:text-base placeholder:text-zinc-700"
            />
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setGameState(prev => ({ ...prev, phase: "home" }))}
                className="py-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl transition-colors"
              >
                返回
              </button>
              <button
                disabled={joinRoomInput.length < 4}
                onClick={() => {
                  get(ref(database, `rooms/${joinRoomInput}`)).then((snapshot) => {
                    if (snapshot.exists()) {
                      const data = snapshot.val();
                      _setGameState(normalizeGameState(data));
                      addNotification(`✅ 成功进入房间 ${joinRoomInput}！数据已同步。`);
                    } else {
                      addNotification(`❌ 未找到房间 ${joinRoomInput}。请检查房间号是否正确。`);
                    }
                  }).catch(() => {
                    addNotification("❌ 网络连接错误，加入房间失败。");
                  });
                }}
                className="py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-900/20"
              >
                进入房间
              </button>
            </div>
            <p className="text-[10px] text-emerald-500/80 mt-5 text-center leading-relaxed">
              *提示：退出后可重新输入原房间号加回游戏，你的位置和数据都还在！
            </p>

            {/* Quick rejoin hint if previously in a room */}
            <div className="mt-4 bg-zinc-900 border border-dashed border-zinc-700 rounded-xl p-3 text-center">
              <p className="text-zinc-500 text-[10px] mb-2">如果你是退出后重新加入，输入房间号后点击进入，然后在大厅中认领回你的座位。</p>
            </div>
          </div>
        )}



        {/* PHASE 1: SNOOKER ROOM CREATION WIZARD (Step 1) - HOST LOBBY */}
        {gameState.phase === "room_creation" && myPlayerId === "player_0" && (
          <div className="w-full max-w-xl mx-auto bg-neutral-900 rounded-3xl border border-zinc-800/80 p-6 md:p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full filter blur-3xl -z-10" />

            <div className="text-center mb-6">
              <RoomNumberDisplay
                roomNo={gameState.roomNo || "----"}
                size="lg"
                className="mb-5"
              />
              <h2 className="text-white font-black text-2xl tracking-tight">
                斯诺克多人娱乐场创建
              </h2>
              <p className="text-zinc-400 text-xs mt-1">
                选择局内玩家数量规格、定制斯诺克高档台泥和专属卡牌类型。
              </p>
            </div>

            <div className="space-y-6">
              {/* Step 1 Game Amount / Betting Selection */}
              <div>
                <label className="text-zinc-300 text-xs font-extrabold uppercase tracking-widest flex items-center gap-1.5 mb-2.5">
                  <span className="text-amber-400 text-sm">💰</span>
                  游戏金额选择 (Game Betting Options)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(["1-3", "2-5", "3-10", "5-15"] as const).map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => handleGameAmountChange(amount)}
                      className={`py-3.5 rounded-2xl border text-xs font-bold transition-all ${
                        gameState.settings.gameAmount === amount
                          ? "bg-amber-500 text-neutral-950 border-amber-400 shadow-lg font-black"
                          : "bg-zinc-800/70 border-zinc-700/60 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {amount} 元
                    </button>
                  ))}
                </div>
              </div>

              {/* Exact playerCount Option Blocks */}
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-white text-xs font-bold block">
                      游戏人数:
                    </span>
                    <span className="text-[10px] text-zinc-500 mt-0.5 block">
                      请选择 3人、4人 或 5人 模式下的卡牌分配
                    </span>
                  </div>
                  <span className="text-amber-400 font-mono font-bold text-xs bg-black/45 px-2.5 py-1 rounded-lg border border-zinc-900 shrink-0">
                    {gameState.settings.playerCount}人对战
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {([3, 4, 5] as const).map((count) => {
                    const cardsNeeded = count === 3 ? 8 : 7;
                    const isActive = gameState.settings.playerCount === count;
                    return (
                      <button
                        key={count}
                        type="button"
                        onClick={() => {
                          setGameState((prev) => ({
                            ...prev,
                            settings: {
                              ...prev.settings,
                              playerCount: count,
                              cardsPerPlayer: cardsNeeded,
                              totalBalls: count * cardsNeeded,
                            },
                          }));
                        }}
                        className={`py-3 rounded-xl border text-xs flex flex-col items-center justify-center transition-all cursor-pointer ${
                          isActive
                            ? "bg-amber-500 text-neutral-950 border-amber-400 font-black shadow-lg scale-[1.02]"
                            : "bg-zinc-800/70 border-zinc-700/60 text-zinc-400 hover:text-white"
                        }`}
                        id={`player-count-option-${count}`}
                      >
                        <span className="text-xs font-extrabold">
                          {count}人模式
                        </span>
                        <span
                          className={`text-[9px] mt-0.5 font-bold ${isActive ? "text-neutral-900/80" : "text-zinc-500"}`}
                        >
                          分房 {cardsNeeded}张
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Host Name Setting */}
              <div>
                <label className="text-zinc-300 text-xs font-extrabold uppercase tracking-widest flex items-center gap-1.5 mb-2.5">
                  <span className="text-amber-400 text-sm">👑</span>
                  您的专属名称
                </label>
                <input
                  type="text"
                  value={gameState.players.find(p => p.id === "player_0")?.name || ""}
                  onChange={(e) => setGameState(prev => ({
                     ...prev,
                     players: prev.players.map(p => p.id === "player_0" ? { ...p, name: e.target.value } : p)
                  }))}
                  placeholder="房主"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-white font-bold focus:border-amber-500 outline-none transition-colors"
                />
              </div>

              {/* Connected Players List */}
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/60 space-y-3">
                 <div className="flex justify-between items-center">
                    <span className="text-white text-xs font-bold">已入座玩家</span>
                    <span className="text-amber-400 font-mono font-bold text-xs bg-black/45 px-2.5 py-1 rounded-lg border border-zinc-900 shrink-0">
                       {gameState.players.length} / {gameState.settings.playerCount}
                    </span>
                 </div>
                 <div className="flex flex-col gap-2">
                    {gameState.players.map((p) => (
                       <div key={p.id} className="flex items-center gap-3 glass-panel p-2.5 rounded-xl">
                          <PlayerAvatar avatar={p.avatar} color={p.color} size="sm" isMe={p.id === myPlayerId} />
                          <span className="text-sm font-bold text-white">{p.name}</span>
                          {p.id === "player_0" && <span className="text-[10px] text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full ml-auto">房主</span>}
                       </div>
                    ))}
                    {Array.from({ length: Math.max(0, gameState.settings.playerCount - gameState.players.length) }).map((_, i) => (
                       <div key={i} className="flex items-center gap-2 bg-zinc-900/50 p-2 rounded-lg border border-zinc-800/50 text-zinc-600 border-dashed">
                          <span className="text-sm font-bold animate-pulse">等待加入...</span>
                       </div>
                    ))}
                 </div>
              </div>



              {/* Create Action Button (Step 2 transition) */}
              <button
                type="button"
                disabled={
                  !DEV_SKIP_FULL_ROOM_TO_START &&
                  gameState.players.length !== gameState.settings.playerCount
                }
                /* 正式环境须满员才能开局：
                disabled={gameState.players.length !== gameState.settings.playerCount}
                */
                onClick={initializeLobbyAndDraw}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 font-bold text-white rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-emerald-900/30 text-sm tracking-widest transition-all cursor-pointer hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles
                  size={16}
                  className={`text-yellow-300 ${
                    DEV_SKIP_FULL_ROOM_TO_START ||
                    gameState.players.length === gameState.settings.playerCount
                      ? "animate-spin"
                      : ""
                  }`}
                />
                <span>
                  {DEV_SKIP_FULL_ROOM_TO_START ||
                  gameState.players.length === gameState.settings.playerCount
                    ? "正式开始牌局"
                    : "等待全员入座..."}
                </span>
              </button>
              {DEV_SKIP_FULL_ROOM_TO_START && (
                <p className="text-[10px] text-amber-500/90 text-center">
                  测试模式：无需等满 {gameState.settings.playerCount}{" "}
                  人即可开局
                </p>
              )}
            </div>
          </div>
        )}

        {/* JOINER LOBBY FLOW */}
        {gameState.phase === "room_creation" && myPlayerId !== "player_0" && (
          <div className="w-full max-w-md mx-auto bg-neutral-900 rounded-3xl border border-zinc-800/80 p-8 shadow-2xl relative overflow-hidden">
            <div className="text-center mb-8">
               <RoomNumberDisplay roomNo={gameState.roomNo} size="md" className="mb-5" />
               <h2 className="text-white font-black text-2xl tracking-tight">
                 大厅等候中...
               </h2>
               <p className="text-zinc-400 text-xs mt-2">
                 房主正在设置游戏规则，请坐下等候。
               </p>
            </div>
            
            {!gameState.players.find(p => p.id === myPlayerId) ? (
              <div className="space-y-4">
                 <input 
                   type="text"
                   value={myName}
                   onChange={e => setMyName(e.target.value)}
                   placeholder="请输入你的专属名称"
                   className="w-full bg-zinc-950 border-2 border-zinc-800 rounded-2xl px-6 py-4 text-white text-center text-xl font-bold focus:border-emerald-500 outline-none transition-colors shadow-inner"
                 />
                 <button
                   disabled={!myName.trim() || gameState.players.length >= gameState.settings.playerCount}
                   onClick={() => {
                     const newId = `player_${gameState.players.length}`;
                     setMyPlayerId(newId);
                     setGameState(prev => ({
                        ...prev,
                        players: [...prev.players, {
                           id: newId,
                           name: myName.trim(),
                           color: DEFAULT_COLORS[prev.players.length % DEFAULT_COLORS.length],
                           avatar: shuffledAvatars[prev.players.length % shuffledAvatars.length],
                           score: 0, cards: [], pocketedCards: [], drinkCount: 0, isActive: true, historyScores: []
                        }]
                     }));
                   }}
                   className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-900/20"
                 >
                   {gameState.players.length >= gameState.settings.playerCount ? "房间已满" : "确认入座"}
                 </button>
              </div>
            ) : (
              <div className="space-y-4">
                 <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                    <p className="text-emerald-400 font-bold">✅ 你已成功入座！</p>
                 </div>
                 
                 <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/60">
                    <div className="flex justify-between items-center mb-3">
                       <span className="text-white text-xs font-bold">当前玩家列表</span>
                       <span className="text-amber-400 font-mono font-bold text-xs">
                          {gameState.players.length} / {gameState.settings.playerCount}
                       </span>
                    </div>
                    <div className="flex flex-col gap-2">
                       {gameState.players.map((p) => (
                          <div key={p.id} className="flex items-center gap-3 glass-panel p-2.5 rounded-xl">
                             <PlayerAvatar avatar={p.avatar} color={p.color} size="sm" isMe={p.id === myPlayerId} />
                             <span className="text-sm font-bold text-white">{p.name}</span>
                             {p.id === "player_0" && <span className="text-[10px] text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full ml-auto">房主</span>}
                          </div>
                       ))}
                    </div>
                 </div>
                 <p className="text-xs text-zinc-500 text-center animate-pulse mt-4">等待房主开始游戏...</p>
              </div>
            )}
          </div>
        )}

        {/* REJOIN FLOW: Player enters a room that's already started, needs to claim identity */}
        {(gameState.phase === "dealing" || gameState.phase === "joined") && !myPlayerId && (
          <div className="w-full max-w-md mx-auto bg-neutral-900 rounded-3xl border border-zinc-800/80 p-8 shadow-2xl">
            <div className="text-center mb-6">
              <span className="text-4xl block mb-3">🔄</span>
              <h2 className="text-white font-black text-2xl tracking-tight mb-2">重新加入游戏</h2>
              <p className="text-zinc-400 text-xs">游戏已经开始了，请认领回你的座位！</p>
            </div>
            <div className="space-y-3">
              {gameState.players.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setMyPlayerId(p.id);
                    addNotification(`✅ 你已重新认领 ${p.name} 的身份！`);
                  }}
                  className="w-full flex items-center gap-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-amber-500/50 p-4 rounded-2xl transition-all"
                >
                  <PlayerAvatar avatar={p.avatar} color={p.color} size="md" />
                  <div className="text-left flex-1">
                    <span className="text-white font-bold block">{p.name}</span>
                    <span className="text-zinc-500 text-xs">点击认领此位置</span>
                  </div>
                  {p.id === "player_0" && <span className="text-[10px] text-amber-500 bg-amber-500/10 px-2 py-1 rounded ml-auto">房主</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PHASE 1.5: CARD DEALING ANIMATION (Step 2.5) */}
        {gameState.phase === "dealing" && !!myPlayerId && (
          <CardDealing
            players={gameState.players}
            myPlayerId={myPlayerId}
            onDealComplete={() => {
              setGameState((prev) => ({ ...prev, phase: "joined" }));
            }}
          />
        )}


        {/* PHASE 2: SECRET MASKING CARD DRAW LOBBY (Step 3 & 4) */}
        {gameState.phase === "joined" && !hasEnteredGame && (
          <div className="hidden">
            {/* The manual card peeking step has been removed by user request. 
                The order drawing modal (below) now directly enters the game. */}
          </div>
        )}


        {/* PHASE 3: ACTIVE PLAYING STAGE WITH AUTOMATIC "DRINK WATER" ACTIONS (Step 4) */}
        {gameState.phase === "playing" && (
          <div className="max-w-3xl mx-auto w-full space-y-4">
            {/* Main Scoreboard area */}
            <div className="space-y-4">
              {/* Score indicators card list */}
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <span className="text-sm text-white font-bold flex items-center gap-2">
                    <Layers size={16} className="text-amber-400" />
                    积分榜
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    点击查看手牌
                  </span>
                </div>

                {gameState.players.map((player, idx) => {
                  const isMyself = player.id === myPlayerId;
                  const isCurrent = idx === gameState.activePlayerIndex;
                  const isPeeking = isPeekingPlayerId === player.id;
                  const isCardTwitching = twitchingPlayerId === player.id;

                  let containerStyles = "";
                  if (isMyself) {
                    containerStyles = isCurrent
                      ? "scoreboard-card border-emerald-400/50 shadow-[0_0_20px_rgba(52,211,153,0.12)] ring-1 ring-emerald-400/30"
                      : "scoreboard-card border-amber-500/35 ring-1 ring-amber-500/15";
                  } else {
                    containerStyles = isCurrent
                      ? "glass-panel border-emerald-500/25 opacity-90"
                      : "glass-panel border-white/5 opacity-70 hover:opacity-90";
                  }

                  return (
                    <div
                      key={player.id}
                      className={`p-4 rounded-3xl border transition-all duration-300 relative ${containerStyles} ${isCardTwitching ? "animate-bounce border-red-500" : ""}`}
                      style={{
                        animationDuration: "0.15s",
                        animationIterationCount: "3",
                      }}
                      id={`player-display-card-${player.id}`}
                    >
                      {/* Player Row details */}
                      <div className="flex items-center justify-between mb-2.5 w-full">
                        <div className="flex items-center gap-3">
                          <PlayerAvatar
                            avatar={player.avatar}
                            color={player.color}
                            size="md"
                            isMe={isMyself}
                            isActive={isCurrent}
                            onClick={() => {
                              setGameState((prev) => ({
                                ...prev,
                                activePlayerIndex: idx,
                              }));
                            }}
                          />
                          <div>
                            <span className="text-sm font-bold text-white flex items-center gap-1.5 leading-none">
                              {player.name}
                              {isCurrent && (
                                <span className="text-[9px] bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 px-1.5 py-0.5 rounded-full font-bold">
                                  主攻
                                </span>
                              )}
                            </span>
                            <span className="text-[9px] text-zinc-500 mt-0.5 block leading-none">
                              已落袋: {player.pocketedCards.length} /{" "}
                              {player.cards.length}
                            </span>
                          </div>
                        </div>

                        {/* Core Stats values */}
                        <div className="text-right">
                          <span
                            className={`text-sm font-extrabold font-mono relative ${isMyself ? "text-amber-400 font-black" : "text-zinc-300"}`}
                          >
                            {player.score}{" "}
                            {scoreFlyers.filter(f => f.playerId === player.id).map(f => (
                              <motion.span
                                key={f.id}
                                initial={{ opacity: 1, y: 0, scale: 1 }}
                                animate={{ opacity: 0, y: -40, scale: 1.5 }}
                                transition={{ duration: 2.5, ease: "easeOut" }}
                                className={`absolute top-0 right-0 transform translate-x-full -translate-y-1/2 text-xl font-black ${f.change > 0 ? 'text-emerald-400' : 'text-red-500'}`}
                              >
                                {f.change > 0 ? `+${f.change}` : f.change}
                              </motion.span>
                            ))}
                            <span className="text-[9px] text-zinc-500 font-normal">
                              分
                            </span>
                          </span>
                          <div className="flex items-center justify-end gap-1 text-[10px] text-zinc-400 leading-none">
                            <Coffee
                              size={10}
                              className="text-cyan-400 animate-pulse"
                            />
                            <span>
                              本局喝水: {player.drinkCount} 次
                              {(player.totalDrinkCount ?? 0) > 0 && (
                                <span className="text-zinc-600">
                                  {" "}
                                  · 累计 {player.totalDrinkCount}
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Step 3 & 4 cards drawing and long-press checking inside main UI */}
                      <div className="flex gap-2 py-3 px-2 justify-center bg-black/40 p-2 rounded-2xl mb-3 border border-white/5 flex-wrap select-none">
                        <AnimatePresence>
                          {player.cards.map((c, cIdx) => {
                            const isBallPocketed =
                              gameState.pocketedBalls.includes(c.billiardNum);
                            const canPeekThisCard =
                              (isPeeking ||
                                (togglePeekMyCards &&
                                  player.id === myPlayerId)) &&
                              player.id === myPlayerId;
                            const showCardFaceUp =
                              (canPeekThisCard ||
                                c.isRevealed ||
                                (c.isNewlyDrawn && player.id === myPlayerId)) &&
                              !isBallPocketed;
                            const uniqueKey = `${c.suit || "X"}-${c.value}-${c.billiardNum}-${cIdx}`;

                            return (
                              <motion.div
                                key={uniqueKey}
                                initial={
                                  c.isNewlyDrawn
                                    ? { opacity: 0, x: -150, y: 0, rotateY: 0 }
                                    : { opacity: 0, scale: 0.1, y: 20, rotateY: 180 }
                                }
                                animate={{
                                  opacity: 1,
                                  scale: 1,
                                  x: 0,
                                  y: 0,
                                  rotateY: 0,
                                }}
                                layout
                                transition={{
                                  type: "spring",
                                  stiffness: 260,
                                  damping: 20,
                                  duration: 0.5,
                                }}
                                className={`relative poker-card-slot-sm shrink-0 transition-transform duration-300 origin-center ${
                                  isCardTwitching ? "scale-105" : ""
                                } ${isBallPocketed ? "opacity-30" : ""} ${
                                  isMyself && !isBallPocketed
                                    ? "cursor-pointer hover:scale-110 active:scale-95"
                                    : ""
                                }`}
                                onClick={() => {
                                  if (isMyself && !isBallPocketed) {
                                    handleRevealCard(player.id, cIdx);
                                  }
                                }}
                              >
                                {showCardFaceUp ? (
                                  <div className="relative w-full h-full">
                                    <RealisticPokerCard
                                      suit={c.suit}
                                      value={c.value}
                                      billiardNum={c.billiardNum}
                                      size="sm"
                                      isDimmed={isBallPocketed}
                                      isRevealed={c.isRevealed}
                                    />
                                    {c.isDrinkPenalty && (
                                      <div className="absolute -top-1 -left-1 z-10 bg-cyan-500 text-neutral-950 font-black text-[7px] px-1 py-0.5 rounded-sm border border-cyan-200 shadow-md leading-none">
                                        喝水
                                      </div>
                                    )}
                                    {c.isRevealed && (
                                      <div className="absolute -top-1 -right-1 z-10 bg-amber-500 text-neutral-900 font-extrabold text-[7px] px-1 rounded-sm scale-75 border border-neutral-950 shadow-md">
                                        公开
                                      </div>
                                    )}
                                  </div>
                                ) : isBallPocketed ? (
                                  <div className="w-full h-full rounded bg-zinc-950 border border-dashed border-zinc-805 flex items-center justify-center text-[10px]">
                                    <span className="text-[9px] text-zinc-600 font-black line-through select-none">
                                      落袋
                                    </span>
                                  </div>
                                ) : (
                                  <div className="relative w-full h-full">
                                    <RealisticPokerCard
                                      isBack={true}
                                      size="sm"
                                      value=""
                                      billiardNum={0}
                                    />
                                    {c.isDrinkPenalty && (
                                      <div className="absolute -top-1 -left-1 z-10 bg-cyan-500 text-neutral-950 font-black text-[7px] px-1 py-0.5 rounded-sm border border-cyan-200 shadow-md leading-none">
                                        喝水
                                      </div>
                                    )}
                                  </div>
                                )}
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </div>

                      {/* Controls: 查看牌 / 眯牌 / 喝水 同一行 */}
                      <div className="flex gap-1.5 w-full items-stretch">
                        {player.id === myPlayerId ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                if (soundEnabled) playBallHitSound();
                                setTogglePeekMyCards((prev) => !prev);
                              }}
                              className={`flex-[3] min-w-0 px-1.5 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1 cursor-pointer select-none border ${
                                togglePeekMyCards
                                  ? "bg-amber-500/20 border-amber-500 text-amber-300"
                                  : "bg-neutral-950 border-zinc-850 text-zinc-400 hover:text-white"
                              }`}
                            >
                              <Eye size={14} />
                              <span>{togglePeekMyCards ? "隐藏" : "查看牌"}</span>
                            </button>

                            <button
                              type="button"
                              onMouseDown={() => {
                                if (soundEnabled) playBallHitSound();
                                setIsPeekingPlayerId(player.id);
                              }}
                              onMouseUp={() => setIsPeekingPlayerId(null)}
                              onMouseLeave={() => setIsPeekingPlayerId(null)}
                              onTouchStart={(e) => {
                                e.preventDefault();
                                if (soundEnabled) playBallHitSound();
                                setIsPeekingPlayerId(player.id);
                              }}
                              onTouchEnd={() => setIsPeekingPlayerId(null)}
                              className="flex-[7] min-w-0 py-2.5 bg-neutral-950 text-zinc-200 hover:text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer border border-zinc-700 select-none active:bg-zinc-900"
                            >
                              <span>眯牌 ⚡</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDrinkWater(player.id)}
                              className="shrink-0 px-2.5 py-2.5 bg-cyan-950/90 border border-cyan-600/50 text-cyan-200 hover:bg-cyan-900 rounded-xl text-[10px] font-bold flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all min-w-[2.75rem]"
                              id={`player-drink-btn-${player.id}`}
                              title="犯规喝水"
                            >
                              <Coffee size={12} className="text-cyan-400" />
                              <span className="leading-none">喝水</span>
                            </button>
                          </>
                        ) : (
                          <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                            <div className="py-2 w-full bg-neutral-950/40 border border-zinc-900/60 text-zinc-500 rounded-xl text-[10px] font-semibold flex items-center justify-center gap-1 select-none">
                              <Lock size={9} />
                              <span>他人底牌保密</span>
                            </div>
                            <GiveScoreButtons
                              playerId={player.id}
                              basePoints={getGiveScoreBaseValue(
                                gameState.settings.gameAmount,
                              )}
                              groupPoints={getGiveScoreGroupValue(
                                gameState.settings.gameAmount,
                                gameState.settings.playerCount,
                              )}
                              onGiveBase={() =>
                                handleGiveScore(
                                  myPlayerId,
                                  player.id,
                                  getGiveScoreBaseValue(
                                    gameState.settings.gameAmount,
                                  ),
                                )
                              }
                              onGiveGroup={() =>
                                handleGiveScore(
                                  myPlayerId,
                                  player.id,
                                  getGiveScoreGroupValue(
                                    gameState.settings.gameAmount,
                                    gameState.settings.playerCount,
                                  ),
                                )
                              }
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right side column: Snooker Canvas rendering in House Colors */}
            <div className="lg:col-span-7 space-y-4">


              {/* Round end — GAME */}
              <div className="glass-panel p-5 rounded-3xl flex flex-col items-center gap-4 shadow-xl">
                <div className="text-center w-full">
                  <span className="text-zinc-400 text-xs font-bold block">
                    第 {gameState.currentRound} 局 · 进行中
                  </span>
                  <span className="text-[10px] text-zinc-500 mt-1 block">
                    本局打完、要结算分数时点下方按钮
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (soundEnabled) playBallHitSound();
                    setGameWinnerId(
                      gameState.players[gameState.activePlayerIndex].id,
                    );
                    setGameModalSelection("everyone");
                    setIsGameModalOpen(true);
                  }}
                  className="group relative w-full max-w-sm py-4 px-6 rounded-2xl overflow-hidden cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_8px_32px_rgba(16,185,129,0.25)]"
                  id="conclude-round-btn"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-white/10" />
                  <div className="absolute -inset-1 bg-emerald-400/20 blur-xl group-hover:bg-emerald-400/30 transition-all" />
                  <div className="relative flex flex-col items-center gap-1">
                    <div className="flex items-center gap-2.5">
                      <Trophy
                        size={22}
                        className="text-amber-200 drop-shadow-md"
                      />
                      <span className="text-white font-black text-xl tracking-wide">
                        本局结束
                      </span>
                    </div>
                    <span className="text-emerald-100/90 text-xs font-semibold tracking-[0.2em] uppercase">
                      GAME · 结算
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Forced Order Selection Modal - only show in 'joined' phase, NOT during 'dealing' */}
        {gameState.phase === "joined" && !hasDismissedDrawModal && (() => {
          const rules = getRoundDrawingRules();
          const undrawnPlayers = rules.drawingPlayerIds.filter(pid => !gameState.ordersDrawn[pid]);
          const isMyTurn = undrawnPlayers.includes(myPlayerId);
          const isAllDrawn = undrawnPlayers.length === 0;

          return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 overflow-y-auto">
              <div className="bg-zinc-950 border border-amber-500/30 rounded-3xl p-6 w-full max-w-md shadow-2xl flex flex-col my-auto max-h-[90vh] overflow-y-auto">
                <h3 className="text-amber-500 text-lg font-black mb-1 text-center">
                  🎲 强制抽牌：排定本局出杆顺序
                </h3>
                <p className="text-[10px] text-zinc-400 text-center mb-5 leading-relaxed">
                  按照最新规则，除了上一局的固定位次外，其余选手自由点选卡牌决定出杆先后顺序！
                </p>

                {/* Enhanced Draw Area */}
                <div className="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800/80 mb-5 relative">
                  {!isAllDrawn ? (
                    <>
                      <div className="flex flex-col items-center mb-6">
                        {isMyTurn ? (
                          <div className="w-full bg-emerald-500/20 border-2 border-emerald-500 animate-pulse rounded-xl p-3 text-center mb-2 shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                            <span className="text-emerald-400 font-black text-lg block mb-1">👉 轮到你了，请抽牌！</span>
                            <span className="text-emerald-300/80 text-xs">点击下方任意一张未翻开的卡牌</span>
                          </div>
                        ) : (
                          <div className="w-full bg-amber-500/10 border border-amber-500/50 rounded-xl p-3 text-center mb-2">
                            <span className="text-zinc-400 text-xs font-bold mb-1 block">尚未抽牌的选手：</span>
                            <div className="flex flex-wrap justify-center gap-2">
                              {undrawnPlayers.map(pid => {
                                const p = gameState.players.find(x => x.id === pid)!;
                                return (
                                  <div key={pid} className="inline-flex bg-zinc-950 border border-amber-500/50 px-2 py-1 rounded-md text-amber-400 font-bold text-[10px] items-center gap-1 shadow-inner">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                                    {p.avatar} {p.name}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex justify-center flex-wrap gap-4">
                        {gameState.orderCards.map((card, idx) => {
                          const drawingPlayerId = Object.keys(gameState.ordersDrawn).find(
                            (pid) =>
                              gameState.ordersDrawn[pid].value === card.value &&
                              gameState.ordersDrawn[pid].suit === card.suit,
                          );
                          const isDrawn = !!drawingPlayerId;
                          const drawingPlayer = gameState.players.find((p) => p.id === drawingPlayerId);

                          return (
                            <div
                              key={idx}
                              onClick={() => {
                                if (isDrawn) return;
                                if (soundEnabled) playDealCardSound();
                                setGameState((prev) => ({
                                  ...prev,
                                  ordersDrawn: {
                                    ...prev.ordersDrawn,
                                    [myPlayerId]: card,
                                  },
                                }));
                              }}
                              className={`relative text-center select-none transition-all duration-300 ${
                                isDrawn
                                  ? "opacity-50 scale-95"
                                  : "cursor-pointer hover:-translate-y-2 hover:shadow-2xl hover:shadow-emerald-500/20 animate-bounce"
                              }`}
                            >
                                <div className="poker-card-slot-sm shrink-0">
                                  {isDrawn ? (
                                    <RealisticPokerCard suit={card.suit} value={card.value} billiardNum={0} size="sm" />
                                  ) : (
                                    <RealisticPokerCard isBack={true} size="sm" value="" billiardNum={0} />
                                  )}
                                </div>
                                {isDrawn && drawingPlayer && (
                                  <div className="absolute -bottom-2 inset-x-0 mx-auto flex justify-center z-10">
                                    <span className="bg-zinc-800 text-zinc-300 text-[9px] font-black px-1.5 py-0.5 rounded border border-zinc-700 shadow-md">
                                      {drawingPlayer.name}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                    <div className="text-center py-4">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mb-2">
                        <CheckCircle size={24} />
                      </div>
                      <p className="text-emerald-400 font-bold text-sm">所有需抽牌选手已完成抽牌！</p>
                    </div>
                  )}
                </div>

                {/* Preview Area */}
                <div className="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800/80 mb-5">
                  <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-wider mb-3">
                    📊 本局出杆位次实时预览:
                  </span>
                  <div className="space-y-1.5">
                    {getEstimatedOrder().map((item, sortedIdx) => (
                      <div
                        key={item.player.id}
                        className={`flex justify-between items-center text-xs p-2 rounded-xl border ${
                          item.isFixed
                            ? "bg-amber-950/20 border-amber-500/40"
                            : item.card
                            ? "bg-zinc-950 border-zinc-800"
                            : "bg-zinc-950/40 border-dashed border-zinc-800/50 opacity-60"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-zinc-900 flex items-center justify-center text-[10px] text-zinc-400 font-black">
                            {sortedIdx + 1}
                          </span>
                          <span className="text-xs font-black text-zinc-200">
                            {item.player.avatar} {item.player.name}
                          </span>
                        </div>

                        {item.isFixed ? (
                          <span className="text-[10px] text-amber-500 font-bold">
                            {item.positionName}
                          </span>
                        ) : item.card ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-indigo-400 font-bold">
                              手揽 【{item.card.value}】
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-zinc-600 italic">
                            等候抽牌...
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Apply Button */}
                <button
                  type="button"
                  disabled={!isAllDrawn}
                  onClick={() => {
                    if (soundEnabled) playWinSound();
                    
                    // Locally hide the modal
                    setHasDismissedDrawModal(true);

                    // If order hasn't been globally applied by someone else yet, apply it
                    if (!gameState.isOrderApplied) {
                      const finalOrder = getEstimatedOrder().map((item, index) => ({
                        ...item.player,
                        isActive: index === 0,
                      }));

                      setGameState((prev) => {
                        const newLogs: LogEntry[] = [
                          {
                            id: `order_rearranged_${Date.now()}`,
                            timestamp: new Date().toISOString(),
                            type: "deal",
                            description: `⚖️ 比牌排定进攻棒次！出击排位：${finalOrder.map((p, idx) => `第${idx + 1}棒: ${p.avatar} ${p.name}`).join(" ➔ ")}！`,
                            scoreChanges: {},
                          },
                          ...prev.logs,
                        ];

                        return {
                          ...prev,
                          players: finalOrder,
                          activePlayerIndex: 0,
                          logs: newLogs,
                          isOrderApplied: true,
                          phase: "playing", // Directly enter game!
                        };
                      });
                    } else {
                      // Order was already applied globally, just transition locally to playing
                      if (gameState.phase !== "playing") {
                        setGameState((prev) => ({ ...prev, phase: "playing" }));
                      }
                    }
                    
                    addNotification(`✅ 成功进入对局！`);
                  }}
                  className={`w-full py-3.5 text-white text-sm font-black rounded-xl transition-all shadow-lg ${
                    isAllDrawn
                      ? "bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 cursor-pointer shadow-emerald-900/30 scale-100 hover:scale-[1.02] active:scale-95"
                      : "bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-70"
                  }`}
                >
                  {isAllDrawn ? "⚡ 进入对局" : "等待所有人完成抽牌..."}
                </button>
              </div>
            </div>
          );
        })()}

        {/* Game Conclude Modal Selection */}
        {isGameModalOpen && (() => {
          const winner = gameState.players.find((p) => p.id === gameWinnerId);
          const amountStr = gameState.settings.gameAmount;
          const maxAmount = parseInt(amountStr.split("-")[1] || "0");
          const N = gameState.players.length;
          const packageTargets = gameState.players.filter(
            (p) => p.id !== gameWinnerId,
          );
          const canConfirm =
            gameModalSelection === "everyone" ||
            (gameModalSelection &&
              gameModalSelection !== gameWinnerId &&
              packageTargets.some((p) => p.id === gameModalSelection));

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
              <div className="bg-zinc-950 border border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="bg-gradient-to-r from-amber-500/15 to-transparent border border-amber-500/30 rounded-2xl p-4 mb-5 flex items-center gap-4">
                  {winner && (
                    <PlayerAvatar
                      avatar={winner.avatar}
                      color={winner.color}
                      size="lg"
                    />
                  )}
                  <div className="text-left min-w-0">
                    <p className="text-amber-300 font-black text-base truncate">
                      {winner?.name} 赢得此局
                    </p>
                    <p className="text-zinc-500 text-xs mt-0.5">
                      选择 GAME 结算方式
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setGameModalSelection("everyone")}
                  className={`w-full py-3.5 rounded-2xl text-sm font-extrabold transition-all cursor-pointer mb-4 ${
                    gameModalSelection === "everyone"
                      ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-neutral-950 shadow-lg shadow-amber-900/25"
                      : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                >
                  🏆 GAME 大家
                  <span className="block text-[11px] mt-0.5 font-semibold opacity-80">
                    其余 {N - 1} 人各扣 {maxAmount} 分
                  </span>
                </button>

                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 px-1">
                  包 GAME · 选择承担者
                </p>
                <div className="grid grid-cols-2 gap-2 mb-5">
                  {packageTargets.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setGameModalSelection(p.id)}
                      className={`py-3 px-2 rounded-2xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        gameModalSelection === p.id
                          ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-neutral-950 shadow-md"
                          : "bg-zinc-900 border border-zinc-800 text-zinc-300 hover:border-emerald-500/40"
                      }`}
                    >
                      <span className="text-lg">{p.avatar}</span>
                      <span>
                        包{p.name} GAME
                      </span>
                    </button>
                  ))}
                </div>

                {canConfirm && (
                  <div className="bg-black/40 p-3 rounded-2xl border border-zinc-800/80 mb-5 text-[11px]">
                    <span className="text-zinc-500 font-bold block mb-2 text-[10px]">
                      分数预览
                    </span>
                    <div className="space-y-1.5">
                      {gameState.players.map((p) => {
                        let change = 0;
                        if (gameModalSelection === "everyone") {
                          change =
                            p.id === gameWinnerId
                              ? maxAmount * (N - 1)
                              : -maxAmount;
                        } else if (gameModalSelection) {
                          if (p.id === gameWinnerId) {
                            change = maxAmount * (N - 1);
                          } else if (p.id === gameModalSelection) {
                            change = -maxAmount * (N - 1);
                          }
                        }
                        const changeText =
                          change > 0
                            ? `+${change}`
                            : change < 0
                              ? `${change}`
                              : "0";
                        const changeColor =
                          change > 0
                            ? "text-emerald-400"
                            : change < 0
                              ? "text-rose-400"
                              : "text-zinc-500";

                        return (
                          <div
                            key={p.id}
                            className="flex justify-between items-center font-mono"
                          >
                            <span className="text-zinc-300 truncate pr-2">
                              {p.name}
                              {p.id === gameWinnerId && " 👑"}
                            </span>
                            <span className={`font-black shrink-0 ${changeColor}`}>
                              {changeText} 分
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2 border-t border-zinc-800/80">
                  <button
                    type="button"
                    onClick={() => {
                      setIsGameModalOpen(false);
                      setGameModalSelection("everyone");
                    }}
                    className="flex-1 py-2.5 text-zinc-400 hover:text-white text-sm font-bold cursor-pointer rounded-xl hover:bg-zinc-900"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={handleGameConfirm}
                    disabled={!canConfirm}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      canConfirm
                        ? "bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-md"
                        : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                    }`}
                  >
                    确定
                  </button>
                </div>
              </div>
            </div>
          );
        })()}


        {/* PHASE 4: CHAMPIONS WRAP UP STAGE */}
        {gameState.phase === "ended" && (
          <div className="w-full max-w-xl mx-auto scoreboard-card border border-white/10 rounded-3xl p-6 md:p-8 relative shadow-2xl">
            {showSettlement ? (
              <TournamentSettlement
                rows={getTournamentSettlement()}
                currentRound={gameState.currentRound}
                roomNo={gameState.roomNo}
                onGoHome={() => setShowSettlement(false)}
              />
            ) : (
              <>
                <div className="text-center">
                  <div className="w-16 h-16 bg-amber-500/25 border border-amber-500/35 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                    <Trophy size={32} className="text-yellow-400" />
                  </div>

                  <h2 className="text-white font-black text-2xl tracking-wide">
                    第 {gameState.currentRound} 局 圆满结束！
                  </h2>
                  <p className="text-zinc-500 text-xs mt-1">
                    本局排名速览
                  </p>
                </div>

                <div className="my-5 space-y-2 bg-zinc-950/60 p-4 rounded-2xl border border-zinc-800">
                  {getTournamentSettlement().map((row, pIdx) => {
                    const lastLog = gameState.logs[0];
                    const changeAmt =
                      lastLog?.type === "give_score"
                        ? lastLog.scoreChanges[row.player.id]
                        : undefined;

                    return (
                      <div
                        key={row.player.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/60 border border-zinc-800"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-neutral-950 flex items-center justify-center text-[10px] font-bold text-zinc-400">
                            {pIdx + 1}
                          </span>
                          <PlayerAvatar
                            avatar={row.player.avatar}
                            color={row.player.color}
                            size="sm"
                          />
                          <span className="text-xs font-bold text-white">
                            {row.player.name}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-bold font-mono text-zinc-100">
                            {row.netScore > 0 ? "+" : ""}
                            {row.netScore} 分
                            {changeAmt !== undefined && changeAmt !== 0 && (
                              <span
                                className={`text-[10px] ml-1 ${changeAmt > 0 ? "text-emerald-400" : "text-rose-400"}`}
                              >
                                (本局{changeAmt > 0 ? `+${changeAmt}` : changeAmt})
                              </span>
                            )}
                          </span>
                          <p className="text-[9px] text-zinc-500">
                            喝水 {row.totalDrinks} 次
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  {!hasStartedNextRound ? (
                    <button
                      type="button"
                      onClick={() => {
                        setHasStartedNextRound(true);
                        startNextRoundOfTournament();
                      }}
                      className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-1.5 shadow-lg cursor-pointer"
                      id="next-round-tourney-btn"
                    >
                      <RotateCcw size={14} />
                      <span>开启下一局</span>
                    </button>
                  ) : (
                    <div className="flex-1 py-3.5 bg-zinc-800 text-zinc-400 font-bold rounded-xl text-sm flex items-center justify-center gap-1">
                      <RotateCcw size={14} className="animate-spin" />
                      <span>正在发牌...</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={openFinalSettlement}
                    className="py-3.5 px-6 border border-indigo-500/40 bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-200 hover:text-white rounded-xl text-sm font-bold cursor-pointer"
                  >
                    查看成绩
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Billiard Scoring Helper Rules - Pinned at the bottom */}
        <div className="max-w-3xl mx-auto mt-12 mb-8 px-6 text-center">
          <div className="inline-block bg-zinc-900/60 p-6 rounded-2xl border border-zinc-800/80 shadow-lg text-left">
            <h4 className="text-amber-500 font-bold text-sm mb-3 text-center flex items-center justify-center gap-2">
              <BookOpen size={16} />
              台球抽牌（中八纸牌）全新玩法常识
            </h4>
            <ul className="text-zinc-400 text-xs leading-relaxed space-y-2 list-disc pl-5">
              <li><strong>基本规则</strong>：每个人初始发一定数量的暗牌，打球时要尽量隐藏自己的牌面。如果有人把你的牌面数字对应的台球打进，你可以隐瞒也可以直接在系统中点击该球员的【GAME大家】或【包GAME】触发扣分。</li>
              <li><strong>GAME 大家</strong>：当前击球手一次性赢下牌局，其余所有玩家每人扣除约定分数，击球手获得所有扣分。</li>
              <li><strong>包 GAME</strong>：当某人点炮失误导致另一人赢下全局时，由该失误者（上一手）一人承担所有的扣分，赢家获得该分数。</li>
              <li><strong>犯规喝水</strong>：当你犯规时（例如白球落袋），其他玩家可点击你的【喝水】按钮。你会自动受到系统随机“加抽一张罚牌”的惩罚！你手中的牌越多，爆雷几率越大。</li>
            </ul>
          </div>
        </div>
      </main>

      {/* History sidebar billing details drawer */}
      <HistorySidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        logs={gameState.logs}
        players={gameState.players}
        settings={gameState.settings}
        onClearHistory={resetTournamentCompletely}
      />

      {/* Notifications Toast stack */}
      <div className="fixed top-24 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {notifications.map((notif) => (
          <div
            key={notif.id}
            className="pointer-events-auto bg-neutral-900/95 border border-amber-500/30 text-white rounded-xl shadow-2xl px-4 py-3 text-xs font-semibold flex items-center gap-2.5 animate-in slide-in-from-top-4 fade-in duration-300"
            style={{ backdropFilter: "blur(8px)" }}
          >
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
            <p className="leading-tight text-neutral-100">{notif.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
