export type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';
export type CellType = TetrominoType | 'G' | null;

export type ThemeId = 'neon' | 'retro' | 'minimal' | 'gold' | 'sakura';

export type GameMode = 'normal' | 'dopamine';

export type CpuLevel = 1 | 2 | 3 | 4 | 5;

export interface CpuDifficultyConfig {
  level: CpuLevel;
  name: string;
  subtitle: string;
  badgeColor: string;
  thinkDelayMs: number;
  stepIntervalMs: number;
  useHold: boolean;
  lookahead: boolean;
  noise: number;
  tetrisBias: number;
}

export const CPU_LEVEL_CONFIGS: Record<CpuLevel, CpuDifficultyConfig> = {
  1: {
    level: 1,
    name: 'LV.1 ROOKIE',
    subtitle: 'のんびり練習向け・ときどきミス',
    badgeColor: '#38bdf8',
    thinkDelayMs: 680,
    stepIntervalMs: 145,
    useHold: false,
    lookahead: false,
    noise: 8.5,
    tetrisBias: 0,
  },
  2: {
    level: 2,
    name: 'LV.2 CASUAL',
    subtitle: 'ほどよい手応えの標準AI',
    badgeColor: '#22c55e',
    thinkDelayMs: 440,
    stepIntervalMs: 95,
    useHold: false,
    lookahead: false,
    noise: 3.2,
    tetrisBias: 0.2,
  },
  3: {
    level: 3,
    name: 'LV.3 CHALLENGER',
    subtitle: 'ホールド活用・堅実な中級AI',
    badgeColor: '#eab308',
    thinkDelayMs: 260,
    stepIntervalMs: 62,
    useHold: true,
    lookahead: false,
    noise: 0.9,
    tetrisBias: 0.5,
  },
  4: {
    level: 4,
    name: 'LV.4 MASTER',
    subtitle: '2手先読み・TETRIS狙いの強敵',
    badgeColor: '#f97316',
    thinkDelayMs: 120,
    stepIntervalMs: 36,
    useHold: true,
    lookahead: true,
    noise: 0.15,
    tetrisBias: 1.0,
  },
  5: {
    level: 5,
    name: 'LV.5 DEMON GOD',
    subtitle: '超高速＆最適解・容赦なき魔王AI',
    badgeColor: '#ff1e56',
    thinkDelayMs: 35,
    stepIntervalMs: 18,
    useHold: true,
    lookahead: true,
    noise: 0,
    tetrisBias: 1.35,
  },
};

export type BgmTrackId =
  | 'korobeiniki'
  | 'cyber_rush'
  | 'chiptune_party'
  | 'boss_battle'
  | 'trick_star'
  | 'galaxy_finale';

export type AchievementId =
  | 'default_unlock'
  | 'first_tetris'
  | 'combo_master'
  | 'demolition_expert'
  | 'trick_spinner'
  | 'high_roller'
  | 'fever_addict'
  | 'speed_demon'
  | 'first_line'
  | 'hold_tactician'
  | 'hard_dropper'
  | 'combo_god'
  | 'b2b_chain'
  | 'omega_triple'
  | 'no_ghost_clear'
  | 'legend_score'
  | 'cpu_challenger'
  | 'demon_slayer';

export type AchievementFilter = 'all' | 'reward' | 'trophy';

export interface BgmTrackDef {
  id: BgmTrackId;
  title: string;
  subtitle: string;
  baseBpm: number;
  achievementId: AchievementId;
}

export interface AchievementDef {
  id: AchievementId;
  icon: string;
  title: string;
  conditionText: string;
  rewardType: 'bgm' | 'theme' | 'none';
  rewardBgmId?: BgmTrackId;
  rewardBgmTitle?: string;
  rewardThemeId?: ThemeId;
  rewardThemeTitle?: string;
  unlockedByDefault?: boolean;
}

export const BGM_TRACKS: BgmTrackDef[] = [
  {
    id: 'korobeiniki',
    title: '01. KOROBEINIKI',
    subtitle: '王道クラシック・テトリス A-Type',
    baseBpm: 138,
    achievementId: 'default_unlock',
  },
  {
    id: 'cyber_rush',
    title: '02. CYBERPUNK OVERDRIVE',
    subtitle: '高速シンセウェーブ・トランス',
    baseBpm: 152,
    achievementId: 'first_tetris',
  },
  {
    id: 'chiptune_party',
    title: '03. 8-BIT CARNIVAL',
    subtitle: 'レトロアーケード・チップチューン B-Type',
    baseBpm: 146,
    achievementId: 'combo_master',
  },
  {
    id: 'boss_battle',
    title: '04. OMEGA BOSS BATTLE',
    subtitle: '重低音ダーク・プログレッシブ',
    baseBpm: 160,
    achievementId: 'demolition_expert',
  },
  {
    id: 'trick_star',
    title: '05. NEON NIGHT GROOVE',
    subtitle: 'スタイリッシュ・エレクトロファンク',
    baseBpm: 132,
    achievementId: 'trick_spinner',
  },
  {
    id: 'galaxy_finale',
    title: '06. GALAXY FINALE',
    subtitle: '最高潮ユーフォリック・レイヴ',
    baseBpm: 168,
    achievementId: 'high_roller',
  },
];

export const ACHIEVEMENTS: AchievementDef[] = [
  // ==========================================
  // 1. BGM解放実績 (BGM REWARDS)
  // ==========================================
  {
    id: 'default_unlock',
    icon: '🎮',
    title: 'WELCOME TO T-TORIS',
    conditionText: '初期解放（最初から使用可能）',
    rewardType: 'bgm',
    rewardBgmId: 'korobeiniki',
    rewardBgmTitle: '01. KOROBEINIKI',
    unlockedByDefault: true,
  },
  {
    id: 'first_tetris',
    icon: '⚡',
    title: '四連撃の目覚め (FIRST TETRIS)',
    conditionText: '1度の消去で4ライン同時消し（TETRIS）を達成する',
    rewardType: 'bgm',
    rewardBgmId: 'cyber_rush',
    rewardBgmTitle: '02. CYBERPUNK OVERDRIVE',
  },
  {
    id: 'combo_master',
    icon: '🔥',
    title: '連撃の達人 (COMBO MASTER)',
    conditionText: '4コンボ（4連続ライン消去）以上を達成する',
    rewardType: 'bgm',
    rewardBgmId: 'chiptune_party',
    rewardBgmTitle: '03. 8-BIT CARNIVAL',
  },
  {
    id: 'demolition_expert',
    icon: '💣',
    title: '爆破工作員 (OMEGA BOMBER)',
    conditionText: 'ドパガキモードで「★オメガボム（5×5爆破）」を発動する（または1ゲームで20ライン消去）',
    rewardType: 'bgm',
    rewardBgmId: 'boss_battle',
    rewardBgmTitle: '04. OMEGA BOSS BATTLE',
  },
  {
    id: 'trick_spinner',
    icon: '🌀',
    title: '華麗なる技巧派 (TRICK SPINNER)',
    conditionText: 'T-Spin（Tスピン）または Back-to-Back を達成する',
    rewardType: 'bgm',
    rewardBgmId: 'trick_star',
    rewardBgmTitle: '05. NEON NIGHT GROOVE',
  },
  {
    id: 'high_roller',
    icon: '👑',
    title: 'スコアハンター (HIGH ROLLER)',
    conditionText: 'いずれかのモードでスコア 10,000点 以上を達成する',
    rewardType: 'bgm',
    rewardBgmId: 'galaxy_finale',
    rewardBgmTitle: '06. GALAXY FINALE',
  },

  // ==========================================
  // 2. 隠しテーマ解放実績 (SECRET THEME REWARDS)
  // ==========================================
  {
    id: 'fever_addict',
    icon: '🎰',
    title: '脳汁ジャンキー (DOPAMINE ADDICT)',
    conditionText: 'ドパガキモードで FEVER倍率 x4 以上、またはスコア 25,000点 以上に到達する',
    rewardType: 'theme',
    rewardThemeId: 'gold',
    rewardThemeTitle: 'ROYAL GOLD（黄金カジノテーマ）',
  },
  {
    id: 'speed_demon',
    icon: '🚀',
    title: '音速の領域 (SPEED DEMON)',
    conditionText: 'いずれかのモードで LEVEL 5 以上（40ライン消去）に到達する',
    rewardType: 'theme',
    rewardThemeId: 'sakura',
    rewardThemeTitle: 'CYBER SAKURA（電脳夜桜テーマ）',
  },

  // ==========================================
  // 3. 純粋なトロフィー実績 (TROPHY ONLY / 報酬なしやり込み)
  // ==========================================
  {
    id: 'first_line',
    icon: '🌱',
    title: '最初の一歩 (FIRST CLEAR)',
    conditionText: '初めてラインを消去する（1ライン以上）',
    rewardType: 'none',
  },
  {
    id: 'hold_tactician',
    icon: '🔄',
    title: '戦略的キープ (TACTICAL HOLD)',
    conditionText: '1回のゲーム中にホールド（HOLD）を5回以上使用する',
    rewardType: 'none',
  },
  {
    id: 'hard_dropper',
    icon: '☄️',
    title: '電光石火の着地 (LIGHTNING DROPPER)',
    conditionText: '1回のゲーム中にハードドロップを25回以上行う',
    rewardType: 'none',
  },
  {
    id: 'combo_god',
    icon: '🌋',
    title: '怒涛の七連撃 (7-COMBO FRENZY)',
    conditionText: '7コンボ（7連続ライン消去）以上を達成する',
    rewardType: 'none',
  },
  {
    id: 'b2b_chain',
    icon: '🔗',
    title: '背水の連環 (BACK-TO-BACK MASTER)',
    conditionText: '1回のゲーム中に Back-to-Back（連続TETRISまたはT-Spin）を3回以上決める',
    rewardType: 'none',
  },
  {
    id: 'omega_triple',
    icon: '☢️',
    title: '焦土作戦 (TRIPLE OMEGA)',
    conditionText: '1回のドパガキモード中に「★オメガボム」を3回発動する',
    rewardType: 'none',
  },
  {
    id: 'no_ghost_clear',
    icon: '👁️',
    title: '心の目 (BLIND SENSE)',
    conditionText: 'ゴースト表示を「OFF」にした状態で 4ライン同時消し（TETRIS）を決める',
    rewardType: 'none',
  },
  {
    id: 'legend_score',
    icon: '💎',
    title: '伝説のグランドマスター (GRANDMASTER)',
    conditionText: 'いずれかのモードでスコア 50,000点 以上を達成する',
    rewardType: 'none',
  },
  {
    id: 'cpu_challenger',
    icon: '🤖',
    title: 'AIハンター (CPU CHALLENGER)',
    conditionText: 'VS CPU戦で 難易度 LV.3 以上のAIに勝利する',
    rewardType: 'none',
  },
  {
    id: 'demon_slayer',
    icon: '⚔️',
    title: '魔王討伐 (DEMON GOD SLAYER)',
    conditionText: 'VS CPU戦で 最強難易度 LV.5「DEMON GOD」に勝利する',
    rewardType: 'none',
  },
];

export type KeyAction =
  | 'moveLeft'
  | 'moveRight'
  | 'softDrop'
  | 'hardDrop'
  | 'rotateCW'
  | 'rotateCCW'
  | 'hold'
  | 'pause'
  | 'restart';

export type KeyBindings = Record<KeyAction, string>;

export const DEFAULT_KEY_BINDINGS: KeyBindings = {
  moveLeft: 'ArrowLeft',
  moveRight: 'ArrowRight',
  softDrop: 'ArrowDown',
  hardDrop: 'Space',
  rotateCW: 'ArrowUp',
  rotateCCW: 'KeyZ',
  hold: 'KeyC',
  pause: 'KeyP',
  restart: 'KeyR',
};

export const KEY_ACTION_LABELS: Record<KeyAction, string> = {
  moveLeft: '左移動 (Move Left)',
  moveRight: '右移動 (Move Right)',
  softDrop: 'ソフトドロップ (Soft Drop)',
  hardDrop: 'ハードドロップ (Hard Drop)',
  rotateCW: '右回転 (Rotate CW)',
  rotateCCW: '左回転 (Rotate CCW)',
  hold: 'ホールド (Hold)',
  pause: '一時停止 (Pause)',
  restart: 'リスタート [1秒長押し] (Hold to Restart)',
};

export function formatKeyCode(code: string): string {
  const map: Record<string, string> = {
    ArrowLeft: '←',
    ArrowRight: '→',
    ArrowUp: '↑',
    ArrowDown: '↓',
    Space: 'SPACE',
    ShiftLeft: 'L-SHIFT',
    ShiftRight: 'R-SHIFT',
    ControlLeft: 'L-CTRL',
    ControlRight: 'R-CTRL',
    AltLeft: 'L-ALT',
    AltRight: 'R-ALT',
    Enter: 'ENTER',
    Backspace: 'BACKSPACE',
    Tab: 'TAB',
  };
  if (map[code]) return map[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return 'NUM ' + code.slice(6);
  return code.toUpperCase();
}

export interface ThemePalette {
  id: ThemeId;
  name: string;
  boardBg: string;
  gridLine: string;
  ghostAlpha: number;
  colors: Record<TetrominoType | 'G', string>;
  glow: boolean;
  rounded: number;
  pixelBevel: boolean;
}

export interface ActivePiece {
  type: TetrominoType;
  matrix: number[][];
  x: number;
  y: number;
  rotation: number; // 0, 1, 2, 3
  isOmegaBomb?: boolean;
}

export interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
  lineWidth: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  shape: 'square' | 'circle' | 'spark';
}

export interface FloatingText {
  text: string;
  subText?: string;
  x: number;
  y: number;
  color: string;
  alpha: number;
  vy: number;
  scale: number;
  life: number;
  maxLife: number;
}

export const BOARD_COLS = 10;
export const BOARD_ROWS = 20;
export const HIDDEN_ROWS = 4;
export const TOTAL_ROWS = BOARD_ROWS + HIDDEN_ROWS;

export const SHAPES: Record<TetrominoType, number[][]> = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  O: [
    [0, 1, 1, 0],
    [0, 1, 1, 0],
    [0, 0, 0, 0],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
};

// Standard SRS Wall Kick data for J, L, S, T, Z
export const WALL_KICKS_JLSTZ: Record<string, [number, number][]> = {
  '0->1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '1->0': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '1->2': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '2->1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '2->3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '3->2': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '3->0': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '0->3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
};

// Standard SRS Wall Kick data for I piece
export const WALL_KICKS_I: Record<string, [number, number][]> = {
  '0->1': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  '1->0': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  '1->2': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
  '2->1': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  '2->3': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  '3->2': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  '3->0': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  '0->3': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
};

export const THEMES: Record<ThemeId, ThemePalette> = {
  neon: {
    id: 'neon',
    name: 'NEON CYBER',
    boardBg: '#070913',
    gridLine: 'rgba(0, 243, 255, 0.08)',
    ghostAlpha: 0.28,
    glow: true,
    rounded: 4,
    pixelBevel: false,
    colors: {
      I: '#00f3ff', // Cyan laser
      O: '#ffe600', // Cyber yellow
      T: '#d900ff', // Neon magenta
      S: '#00ff66', // Matrix green
      Z: '#ff0055', // Crimson laser
      J: '#3b66ff', // Electric blue
      L: '#ff7700', // Solar orange
      G: '#64748b', // Garbage steel
    },
  },
  retro: {
    id: 'retro',
    name: 'CLASSIC RETRO',
    boardBg: '#111410',
    gridLine: 'rgba(180, 200, 160, 0.08)',
    ghostAlpha: 0.25,
    glow: false,
    rounded: 0,
    pixelBevel: true,
    colors: {
      I: '#38c8ff',
      O: '#ffd828',
      T: '#b848f8',
      S: '#48d838',
      Z: '#f83838',
      J: '#3868f8',
      L: '#f88828',
      G: '#788078',
    },
  },
  minimal: {
    id: 'minimal',
    name: 'MODERN MINIMAL',
    boardBg: '#f8fafc',
    gridLine: 'rgba(15, 23, 42, 0.06)',
    ghostAlpha: 0.22,
    glow: false,
    rounded: 7,
    pixelBevel: false,
    colors: {
      I: '#06b6d4',
      O: '#eab308',
      T: '#8b5cf6',
      S: '#10b981',
      Z: '#f43f5e',
      J: '#3b82f6',
      L: '#f97316',
      G: '#94a3b8',
    },
  },
  gold: {
    id: 'gold',
    name: 'ROYAL GOLD',
    boardBg: '#0c0904',
    gridLine: 'rgba(255, 215, 0, 0.09)',
    ghostAlpha: 0.28,
    glow: true,
    rounded: 4,
    pixelBevel: false,
    colors: {
      I: '#ffd700', // Pure gold
      O: '#fff3a1', // Champagne platinum
      T: '#ff8c00', // Amber gold
      S: '#50c878', // Emerald jewel
      Z: '#ff2442', // Ruby crimson
      J: '#4169e1', // Royal sapphire
      L: '#ffb300', // Imperial topaz
      G: '#6b5e4c', // Tarnished bronze
    },
  },
  sakura: {
    id: 'sakura',
    name: 'CYBER SAKURA',
    boardBg: '#120710',
    gridLine: 'rgba(255, 105, 180, 0.09)',
    ghostAlpha: 0.28,
    glow: true,
    rounded: 5,
    pixelBevel: false,
    colors: {
      I: '#ff77bc', // Sakura blossom pink
      O: '#ffe066', // Lantern gold
      T: '#d946ef', // Orchid neon
      S: '#34d399', // Matcha mint
      Z: '#fb7185', // Crimson petal
      J: '#818cf8', // Twilight indigo
      L: '#fb923c', // Sunset coral
      G: '#6d597a', // Dusk stone
    },
  },
};
