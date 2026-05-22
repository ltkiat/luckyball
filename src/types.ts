/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type GameMode = 'survival' | 'target' | 'points' | 'snooker_classic';
export type TableFeltColor = 'classic_green' | 'royal_blue' | 'elite_burgundy' | 'carbon_black';
export type CardType = 'billiard_ball' | 'poker';

export interface CardObject {
  suit?: 'spade' | 'heart' | 'club' | 'diamond' | 'joker';
  value: string; // e.g., 'A', '3', '8', 'J', 'Q', 'K'
  billiardNum: number; // 1 to 15
  isRevealed?: boolean; // 是否开牌（其他人可见）
  isNewlyDrawn?: boolean; // 是否是新抽的牌，用于动画显示
  isDrinkPenalty?: boolean; // 犯规喝水加抽的罚牌
}

export interface GameSettings {
  mode: GameMode;
  playerCount: number;
  gameAmount: '1-3' | '2-5' | '3-10' | '5-15'; // 游戏金额选择 (e.g. 1-3元)
  cardsPerPlayer: number;
  ownPocketScore: number;       // 自己打进自己牌的得分 / 自己清空专属分
  opponentPocketScore: number;  // 别人打进自己牌（己方扣分）
  shooterBonusScore: number;    // 打进别人牌（射手加分）
  drinkWaterPenalty: number;    // 喝水惩罚扣分
  totalBalls: number;           // 13, 15 or 21 (Snooker total)
  feltColor: TableFeltColor;    // 斯诺克桌布颜色：classic_green, royal_blue, elite_burgundy, carbon_black
  cardType: CardType;           // 纸牌类型：billiard_ball (台球数字牌) | poker (皇家扑克牌)
}

export interface Player {
  id: string;
  name: string;
  color: string;
  avatar: string;
  score: number;
  cards: CardObject[];       // 分配到的皇家扑克/台球牌，即代表手牌
  pocketedCards: CardObject[]; // 已经完成或落袋的手牌
  drinkCount: number;        // 本局犯规喝水次数（每局重置）
  totalDrinkCount?: number;  // 全场累计喝水次数
  isActive: boolean;
  historyScores: number[];   // 历史积分记录
}

export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'pocket' | 'foul' | 'drink' | 'deal' | 'reset' | 'round_end' | 'room_created' | 'give_score';
  playerId?: string;          // 触发或相关的玩家ID
  targetPlayerId?: string;    // 受害者玩家ID (比如被打进牌的人)
  ball?: number;              // 涉及的球号
  description: string;
  scoreChanges: Record<string, number>; // 玩家ID -> 积分变化
}

export interface GameState {
  phase: 'home' | 'room_creation' | 'join_room' | 'joined' | 'dealing' | 'playing' | 'ended';
  roomNo: string;
  settings: GameSettings;
  players: Player[];
  activePlayerIndex: number;
  pocketedBalls: number[];   // 所有已打落的球 (1-15 代表斯诺克相应分数)
  logs: LogEntry[];
  currentRound: number;
  winnerPlayerId?: string;
  drawnStatus: Record<string, boolean>; // Step 4 requirement: track drawing done per player to reveal drink button

  // Shared Drawing State
  orderCards: CardObject[];
  ordersDrawn: Record<string, CardObject>;
  isOrderApplied: boolean;
}
