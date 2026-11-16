import {
  ActivePiece,
  BOARD_COLS,
  BOARD_ROWS,
  CellType,
  GameMode,
  HIDDEN_ROWS,
  SHAPES,
  TetrominoType,
  TOTAL_ROWS,
  WALL_KICKS_I,
  WALL_KICKS_JLSTZ,
} from './types.js';

export interface LineClearEvent {
  clearedRows: number[];
  rowColors: CellType[][];
  actionLabel: string;
  subLabel: string;
  pointsAwarded: number;
  isTSpin: boolean;
  isTetris: boolean;
  isBackToBack: boolean;
  combo: number;
  levelUp: boolean;
  attackSent: number;
}

export interface HardDropEvent {
  type: TetrominoType;
  colStart: number;
  colEnd: number;
  startY: number;
  endY: number;
  cells: { x: number; y: number }[];
  bonusPoints: number;
  isOmegaBomb: boolean;
}

export interface PieceLockEvent {
  type: TetrominoType;
  cells: { x: number; y: number }[];
}

export interface OmegaExplosionEvent {
  centerX: number;
  centerY: number;
  minCol: number;
  maxCol: number;
  minRow: number;
  maxRow: number;
  destroyedCells: { x: number; y: number; type: CellType }[];
  pointsAwarded: number;
  multiplier: number;
  levelUp: boolean;
  attackSent: number;
}

export class TetrisEngine {
  public mode: GameMode = 'normal';
  public isCpu: boolean = false;
  public board: CellType[][] = [];
  public activePiece: ActivePiece | null = null;
  public holdPiece: TetrominoType | null = null;
  public canHold: boolean = true;
  public nextQueue: TetrominoType[] = [];

  public score: number = 0;
  public highScoreNormal: number = 0;
  public highScoreDopamine: number = 0;
  public lines: number = 0;
  public level: number = 1;
  public combo: number = -1;
  public backToBack: boolean = false;
  public pendingGarbage: number = 0;

  // Dopamine Mode state
  public overdriveGauge: number = 0; // 0 to 100 (charges ONLY on line clears!)
  public omegaReady: boolean = false;
  public dopamineMultiplier: number = 1;
  public readonly OMEGA_BLAST_RADIUS = 2; // 5x5 area around bomb center

  public isGameOver: boolean = false;
  public isPaused: boolean = false;

  private bag: TetrominoType[] = [];
  private dropAccumulator: number = 0;
  private lockTimer: number = 0;
  private lockResets: number = 0;
  private readonly LOCK_DELAY_MS = 500;
  private readonly MAX_LOCK_RESETS = 15;
  private lastMoveWasRotate: boolean = false;

  private onLineClear?: (ev: LineClearEvent) => void;
  private onHardDrop?: (ev: HardDropEvent) => void;
  private onPieceLock?: (ev: PieceLockEvent) => void;
  private onGaugeMax?: () => void;
  private onOmegaExplosion?: (ev: OmegaExplosionEvent) => void;
  private onAttack?: (lines: number) => void;
  private onGameOver?: () => void;

  constructor(callbacks?: {
    isCpu?: boolean;
    onLineClear?: (ev: LineClearEvent) => void;
    onHardDrop?: (ev: HardDropEvent) => void;
    onPieceLock?: (ev: PieceLockEvent) => void;
    onGaugeMax?: () => void;
    onOmegaExplosion?: (ev: OmegaExplosionEvent) => void;
    onAttack?: (lines: number) => void;
    onGameOver?: () => void;
  }) {
    this.isCpu = Boolean(callbacks?.isCpu);
    this.onLineClear = callbacks?.onLineClear;
    this.onHardDrop = callbacks?.onHardDrop;
    this.onPieceLock = callbacks?.onPieceLock;
    this.onGaugeMax = callbacks?.onGaugeMax;
    this.onOmegaExplosion = callbacks?.onOmegaExplosion;
    this.onAttack = callbacks?.onAttack;
    this.onGameOver = callbacks?.onGameOver;

    const savedHighNormal = localStorage.getItem('ttoris_highscore');
    if (savedHighNormal) {
      this.highScoreNormal = parseInt(savedHighNormal, 10) || 0;
    }
    const savedHighDopamine = localStorage.getItem('ttoris_highscore_dopamine');
    if (savedHighDopamine) {
      this.highScoreDopamine = parseInt(savedHighDopamine, 10) || 0;
    }

    this.reset();
  }

  public get highScore(): number {
    return this.mode === 'dopamine' ? this.highScoreDopamine : this.highScoreNormal;
  }

  public setMode(mode: GameMode): void {
    this.mode = mode;
    this.reset();
  }

  public reset(): void {
    this.board = Array.from({ length: TOTAL_ROWS }, () =>
      Array<CellType>(BOARD_COLS).fill(null)
    );
    this.bag = [];
    this.nextQueue = [];
    this.holdPiece = null;
    this.canHold = true;

    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.combo = -1;
    this.backToBack = false;
    this.pendingGarbage = 0;

    this.overdriveGauge = 0;
    this.omegaReady = false;
    this.dopamineMultiplier = 1;

    this.isGameOver = false;
    this.isPaused = false;

    this.dropAccumulator = 0;
    this.lockTimer = 0;
    this.lockResets = 0;
    this.lastMoveWasRotate = false;

    for (let i = 0; i < 5; i++) {
      this.nextQueue.push(this.drawFromBag());
    }
    this.spawnNextPiece();
  }

  public addGauge(amount: number): void {
    if (this.mode !== 'dopamine') return;
    if (this.omegaReady || this.activePiece?.isOmegaBomb) return;

    const prev = this.overdriveGauge;
    this.overdriveGauge = Math.min(100, this.overdriveGauge + amount);
    if (prev < 100 && this.overdriveGauge >= 100) {
      this.omegaReady = true;
      this.onGaugeMax?.();
    }
  }

  public getOmegaBlastZone(pieceX: number, pieceY: number, matrix: number[][]): {
    minCol: number;
    maxCol: number;
    minRow: number; // visible row index (0..19)
    maxRow: number; // visible row index (0..19)
    centerCol: number;
    centerRow: number;
  } {
    let sumX = 0;
    let sumY = 0;
    let count = 0;
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c]) {
          sumX += pieceX + c;
          sumY += pieceY + r;
          count++;
        }
      }
    }
    const centerCol = Math.round(sumX / Math.max(1, count));
    const centerBoardRow = Math.round(sumY / Math.max(1, count));
    const rad = this.OMEGA_BLAST_RADIUS;

    return {
      minCol: Math.max(0, centerCol - rad),
      maxCol: Math.min(BOARD_COLS - 1, centerCol + rad),
      minRow: Math.max(0, centerBoardRow - rad - HIDDEN_ROWS),
      maxRow: Math.min(BOARD_ROWS - 1, centerBoardRow + rad - HIDDEN_ROWS),
      centerCol,
      centerRow: centerBoardRow - HIDDEN_ROWS,
    };
  }

  private drawFromBag(): TetrominoType {
    if (this.bag.length === 0) {
      const types: TetrominoType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
      for (let i = types.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [types[i], types[j]] = [types[j], types[i]];
      }
      this.bag = types;
    }
    return this.bag.pop()!;
  }

  private spawnNextPiece(overrideType?: TetrominoType): void {
    const type = overrideType ?? this.nextQueue.shift()!;
    if (!overrideType) {
      this.nextQueue.push(this.drawFromBag());
    }

    const matrix = SHAPES[type].map((row) => [...row]);
    const x = Math.floor((BOARD_COLS - matrix[0].length) / 2);
    const y = HIDDEN_ROWS - 2;

    const spawnAsOmega = this.mode === 'dopamine' && this.omegaReady;
    if (spawnAsOmega) {
      this.omegaReady = false;
    }

    this.activePiece = {
      type,
      matrix,
      x,
      y,
      rotation: 0,
      isOmegaBomb: spawnAsOmega,
    };

    this.lockTimer = 0;
    this.lockResets = 0;
    this.dropAccumulator = 0;
    this.lastMoveWasRotate = false;

    if (!this.isValidPosition(this.activePiece.matrix, this.activePiece.x, this.activePiece.y)) {
      this.activePiece.y -= 1;
      if (!this.isValidPosition(this.activePiece.matrix, this.activePiece.x, this.activePiece.y)) {
        this.isGameOver = true;
        this.saveHighScore();
        this.onGameOver?.();
      }
    }
  }

  public getDropIntervalMs(): number {
    const lv = Math.min(20, this.level);
    return Math.max(45, Math.round(1000 * Math.pow(0.84, lv - 1)));
  }

  public isGrounded(): boolean {
    if (!this.activePiece) return false;
    return !this.isValidPosition(
      this.activePiece.matrix,
      this.activePiece.x,
      this.activePiece.y + 1
    );
  }

  public getLockProgress(): number {
    if (!this.isGrounded()) return 0;
    return Math.min(1, this.lockTimer / this.LOCK_DELAY_MS);
  }

  public update(dtMs: number): void {
    if (this.isGameOver || this.isPaused || !this.activePiece) return;

    const interval = this.getDropIntervalMs();
    this.dropAccumulator += dtMs;

    while (this.dropAccumulator >= interval) {
      this.dropAccumulator -= interval;
      if (!this.isGrounded()) {
        this.activePiece.y += 1;
        this.lastMoveWasRotate = false;
      }
    }

    if (this.isGrounded()) {
      this.lockTimer += dtMs;
      if (this.lockTimer >= this.LOCK_DELAY_MS) {
        this.lockPiece();
      }
    } else {
      this.lockTimer = 0;
    }
  }

  public moveHorizontal(dir: -1 | 1): boolean {
    if (this.isGameOver || this.isPaused || !this.activePiece) return false;
    const nx = this.activePiece.x + dir;
    if (this.isValidPosition(this.activePiece.matrix, nx, this.activePiece.y)) {
      this.activePiece.x = nx;
      this.lastMoveWasRotate = false;
      this.resetLockDelayIfNeeded();
      return true;
    }
    return false;
  }

  public softDrop(): boolean {
    if (this.isGameOver || this.isPaused || !this.activePiece) return false;
    if (this.isValidPosition(this.activePiece.matrix, this.activePiece.x, this.activePiece.y + 1)) {
      this.activePiece.y += 1;
      this.score += 1;
      this.saveHighScore();
      this.dropAccumulator = 0;
      this.lastMoveWasRotate = false;
      return true;
    }
    return false;
  }

  public hardDrop(): void {
    if (this.isGameOver || this.isPaused || !this.activePiece) return;

    const startY = this.activePiece.y;
    const ghostY = this.getGhostY();
    const dropDist = Math.max(0, ghostY - startY);
    const isOmega = Boolean(this.activePiece.isOmegaBomb);

    this.activePiece.y = ghostY;

    // Hard drop gives standard drop points (no gauge charge from mashing hard drop!)
    const bonusPoints = dropDist * (this.mode === 'dopamine' ? 10 * this.dopamineMultiplier : 2);
    this.score += bonusPoints;
    this.saveHighScore();

    if (dropDist > 0) {
      this.lastMoveWasRotate = false;
    }

    const cells: { x: number; y: number }[] = [];
    let minCol = BOARD_COLS;
    let maxCol = 0;
    const { matrix, x, y, type } = this.activePiece;
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c]) {
          const bx = x + c;
          const by = y + r - HIDDEN_ROWS;
          minCol = Math.min(minCol, bx);
          maxCol = Math.max(maxCol, bx);
          cells.push({ x: bx, y: by });
        }
      }
    }

    this.onHardDrop?.({
      type,
      colStart: minCol,
      colEnd: maxCol,
      startY: startY - HIDDEN_ROWS,
      endY: ghostY - HIDDEN_ROWS,
      cells,
      bonusPoints,
      isOmegaBomb: isOmega,
    });

    this.lockPiece();
  }

  public rotate(dir: 1 | -1): boolean {
    if (this.isGameOver || this.isPaused || !this.activePiece) return false;
    const piece = this.activePiece;
    if (piece.type === 'O') return true;

    const oldRot = piece.rotation;
    const newRot = (oldRot + dir + 4) % 4;
    const rotatedMatrix = this.rotateMatrix(piece.matrix, dir);

    const key = `${oldRot}->${newRot}`;
    const kickTable = piece.type === 'I' ? WALL_KICKS_I[key] : WALL_KICKS_JLSTZ[key];
    const kicks = kickTable || [[0, 0]];

    for (const [dx, dy] of kicks) {
      const nx = piece.x + dx;
      const ny = piece.y - dy;
      if (this.isValidPosition(rotatedMatrix, nx, ny)) {
        piece.matrix = rotatedMatrix;
        piece.x = nx;
        piece.y = ny;
        piece.rotation = newRot;
        this.lastMoveWasRotate = true;
        this.resetLockDelayIfNeeded();
        return true;
      }
    }
    return false;
  }

  public hold(): boolean {
    if (this.isGameOver || this.isPaused || !this.activePiece || !this.canHold) return false;
    const wasOmega = Boolean(this.activePiece.isOmegaBomb);
    if (wasOmega) {
      this.omegaReady = true;
    }

    const currentType = this.activePiece.type;
    const prevHold = this.holdPiece;
    this.holdPiece = currentType;
    this.canHold = false;

    if (prevHold) {
      this.spawnNextPiece(prevHold);
    } else {
      this.spawnNextPiece();
    }
    return true;
  }

  public getGhostY(): number {
    if (!this.activePiece) return 0;
    let gy = this.activePiece.y;
    while (this.isValidPosition(this.activePiece.matrix, this.activePiece.x, gy + 1)) {
      gy += 1;
    }
    return gy;
  }

  private resetLockDelayIfNeeded(): void {
    if (this.lockResets < this.MAX_LOCK_RESETS) {
      this.lockTimer = 0;
      this.lockResets += 1;
    }
  }

  private rotateMatrix(matrix: number[][], dir: 1 | -1): number[][] {
    const N = matrix.length;
    const res = Array.from({ length: N }, () => Array(N).fill(0));
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (dir === 1) {
          res[c][N - 1 - r] = matrix[r][c];
        } else {
          res[N - 1 - c][r] = matrix[r][c];
        }
      }
    }
    return res;
  }

  private isValidPosition(matrix: number[][], x: number, y: number): boolean {
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (!matrix[r][c]) continue;
        const bx = x + c;
        const by = y + r;
        if (bx < 0 || bx >= BOARD_COLS || by >= TOTAL_ROWS) {
          return false;
        }
        if (by >= 0 && this.board[by][bx] !== null) {
          return false;
        }
      }
    }
    return true;
  }

  private detectTSpin(): boolean {
    if (!this.activePiece || this.activePiece.type !== 'T' || !this.lastMoveWasRotate) {
      return false;
    }
    const cx = this.activePiece.x + 1;
    const cy = this.activePiece.y + 1;
    const corners = [
      [cx - 1, cy - 1],
      [cx + 1, cy - 1],
      [cx - 1, cy + 1],
      [cx + 1, cy + 1],
    ];
    let occupied = 0;
    for (const [x, y] of corners) {
      if (x < 0 || x >= BOARD_COLS || y >= TOTAL_ROWS || (y >= 0 && this.board[y][x] !== null)) {
        occupied += 1;
      }
    }
    return occupied >= 3;
  }

  public receiveGarbage(lines: number): void {
    if (this.isGameOver || lines <= 0) return;
    this.pendingGarbage = Math.min(20, this.pendingGarbage + lines);
  }

  private calculateAttackLines(
    clearedCount: number,
    isTSpin: boolean,
    b2bActive: boolean,
    isPerfectClear: boolean,
    combo: number
  ): number {
    if (clearedCount <= 0) return 0;
    let attack = 0;
    if (isTSpin) {
      attack = [0, 2, 4, 6][Math.min(3, clearedCount)];
    } else {
      attack = [0, 0, 1, 2, 4][Math.min(4, clearedCount)];
    }
    if (b2bActive) attack += 1;
    if (isPerfectClear) attack += 6;
    if (combo >= 1) {
      attack += Math.min(4, Math.floor((combo + 1) / 2));
    }
    return attack;
  }

  private applyAttackWithOffset(rawAttack: number): number {
    if (rawAttack <= 0) return 0;
    const offset = Math.min(this.pendingGarbage, rawAttack);
    this.pendingGarbage -= offset;
    const netAttack = rawAttack - offset;
    if (netAttack > 0) {
      this.onAttack?.(netAttack);
    }
    return netAttack;
  }

  private applyPendingGarbage(): void {
    if (this.pendingGarbage <= 0 || this.isGameOver) return;
    const batch = Math.min(8, this.pendingGarbage);
    this.pendingGarbage -= batch;

    let holeCol = Math.floor(Math.random() * BOARD_COLS);
    for (let i = 0; i < batch; i++) {
      // 70% chance to keep same hole column for clean counterplay, 30% shift
      if (i > 0 && Math.random() < 0.3) {
        holeCol = Math.floor(Math.random() * BOARD_COLS);
      }
      this.board.shift();
      const row = Array<CellType>(BOARD_COLS).fill('G');
      row[holeCol] = null;
      this.board.push(row);
    }
  }

  private lockPiece(): void {
    if (!this.activePiece) return;

    const isOmega = Boolean(this.activePiece.isOmegaBomb);
    const isTSpin = this.detectTSpin();
    const { matrix, x, y, type } = this.activePiece;

    const pieceCells: { x: number; y: number }[] = [];
    const visCells: { x: number; y: number }[] = [];
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c]) {
          const bx = x + c;
          const by = y + r;
          if (by >= 0 && by < TOTAL_ROWS && bx >= 0 && bx < BOARD_COLS) {
            this.board[by][bx] = type;
            pieceCells.push({ x: bx, y: by });
            visCells.push({ x: bx, y: by - HIDDEN_ROWS });
          }
        }
      }
    }

    // If this piece is an OMEGA BOMB in Dopamine Mode, detonate 5x5 local blast!
    if (this.mode === 'dopamine' && isOmega) {
      this.detonateOmegaBomb(x, y, matrix);
      this.canHold = true;
      this.spawnNextPiece();
      return;
    }

    this.onPieceLock?.({ type, cells: visCells });

    // Check line clears
    const clearedRows: number[] = [];
    const rowColors: CellType[][] = [];

    for (let r = 0; r < TOTAL_ROWS; r++) {
      if (this.board[r].every((cell) => cell !== null)) {
        clearedRows.push(r - HIDDEN_ROWS);
        rowColors.push([...this.board[r]]);
      }
    }

    if (clearedRows.length > 0) {
      const newBoard = this.board.filter((row) => !row.every((cell) => cell !== null));
      while (newBoard.length < TOTAL_ROWS) {
        newBoard.unshift(Array<CellType>(BOARD_COLS).fill(null));
      }
      this.board = newBoard;

      this.combo += 1;
      const count = clearedRows.length;
      const difficult = count === 4 || isTSpin;
      const b2bActive = difficult && this.backToBack;

      let basePoints = 0;
      let actionLabel = '';

      if (isTSpin) {
        const names = ['T-SPIN', 'T-SPIN SINGLE!', 'T-SPIN DOUBLE!', 'T-SPIN TRIPLE!'];
        const pts = [400, 800, 1200, 1600];
        basePoints = pts[Math.min(3, count)];
        actionLabel = names[Math.min(3, count)];
      } else if (this.mode === 'dopamine') {
        const names = ['', '⚡ HYPER SINGLE!', '🔥 MEGA DOUBLE!!', '💥 ULTRA TRIPLE!!', '🌈 GODLIKE TETRIS!!'];
        const pts = [0, 1500, 4500, 12000, 35000];
        basePoints = pts[Math.min(4, count)];
        actionLabel = names[Math.min(4, count)];
      } else {
        const names = ['', 'SINGLE', 'DOUBLE!', 'TRIPLE!', 'TETRIS!!'];
        const pts = [0, 100, 300, 500, 800];
        basePoints = pts[Math.min(4, count)];
        actionLabel = names[Math.min(4, count)];
      }

      if (b2bActive) {
        basePoints = Math.floor(basePoints * 1.5);
      }

      const isPerfectClear = this.board.every((row) => row.every((cell) => cell === null));
      if (isPerfectClear) {
        basePoints += this.mode === 'dopamine' ? 100000 : 2000;
        actionLabel = '🌟 PERFECT CLEAR!! 🌟';
      }

      let totalAwarded = 0;
      if (this.mode === 'dopamine') {
        // Gauge ONLY charges on line clears!
        const gaugeGainTable = [0, 8, 18, 32, 50];
        const baseGauge = gaugeGainTable[Math.min(4, count)] + (isTSpin ? 20 : 0);
        const comboGauge = Math.max(0, this.combo) * 3;
        this.addGauge(baseGauge + comboGauge);

        this.dopamineMultiplier += count + Math.max(0, this.combo);
        const comboBonus = this.combo > 0 ? 1000 * this.combo : 0;
        totalAwarded = (basePoints + comboBonus) * this.dopamineMultiplier * this.level;
      } else {
        const comboPoints = this.combo > 0 ? 50 * this.combo * this.level : 0;
        totalAwarded = basePoints * this.level + comboPoints;
      }

      this.score += totalAwarded;
      this.lines += count;

      const prevLevel = this.level;
      this.level = Math.floor(this.lines / 10) + 1;
      const levelUp = this.level > prevLevel;

      this.backToBack = difficult;
      this.saveHighScore();

      const rawAttack = this.calculateAttackLines(count, isTSpin, b2bActive, isPerfectClear, this.combo);
      const attackSent = this.applyAttackWithOffset(rawAttack);

      const subParts: string[] = [];
      if (b2bActive) subParts.push('BACK-TO-BACK x1.5');
      if (this.combo >= 1) subParts.push(`${this.combo} COMBO`);
      if (this.mode === 'dopamine') subParts.push(`FEVER x${this.dopamineMultiplier}`);
      if (attackSent > 0) subParts.push(`⚔️ ATTACK +${attackSent}`);

      this.onLineClear?.({
        clearedRows,
        rowColors,
        actionLabel,
        subLabel: subParts.join(' • '),
        pointsAwarded: totalAwarded,
        isTSpin,
        isTetris: count === 4,
        isBackToBack: b2bActive,
        combo: this.combo,
        levelUp,
        attackSent,
      });
    } else {
      this.combo = -1;
      if (this.mode === 'dopamine' && this.dopamineMultiplier > 1) {
        // Slowly decay fever multiplier by 1 when no line is cleared
        this.dopamineMultiplier = Math.max(1, this.dopamineMultiplier - 1);
      }

      if (isTSpin) {
        this.addGauge(15);
        const pts = (this.mode === 'dopamine' ? 4000 * this.dopamineMultiplier : 400) * this.level;
        this.score += pts;
        this.saveHighScore();
        this.onLineClear?.({
          clearedRows: [],
          rowColors: [],
          actionLabel: 'T-SPIN!',
          subLabel: `+${pts.toLocaleString()}`,
          pointsAwarded: pts,
          isTSpin: true,
          isTetris: false,
          isBackToBack: false,
          combo: 0,
          levelUp: false,
          attackSent: 0,
        });
      }

      // Apply pending garbage lines only when no line was cleared on this lock
      this.applyPendingGarbage();
    }

    this.canHold = true;
    this.spawnNextPiece();
  }

  private detonateOmegaBomb(
    pieceX: number,
    pieceY: number,
    matrix: number[][]
  ): void {
    this.overdriveGauge = 0;
    this.omegaReady = false;

    const zone = this.getOmegaBlastZone(pieceX, pieceY, matrix);
    const boardMinRow = zone.minRow + HIDDEN_ROWS;
    const boardMaxRow = zone.maxRow + HIDDEN_ROWS;

    const destroyedCells: { x: number; y: number; type: CellType }[] = [];

    // Destroy ONLY blocks inside the 5x5 blast zone around the bomb!
    for (let r = boardMinRow; r <= boardMaxRow; r++) {
      if (r < 0 || r >= TOTAL_ROWS) continue;
      for (let c = zone.minCol; c <= zone.maxCol; c++) {
        if (c < 0 || c >= BOARD_COLS) continue;
        const cellType = this.board[r][c];
        if (cellType !== null) {
          destroyedCells.push({
            x: c,
            y: r - HIDDEN_ROWS,
            type: cellType,
          });
          this.board[r][c] = null;
        }
      }
    }

    this.dopamineMultiplier += 3;
    const pointsAwarded =
      Math.max(1, destroyedCells.length) * 5000 * this.dopamineMultiplier * this.level;

    this.score += pointsAwarded;
    this.saveHighScore();

    const rawAttack = Math.max(2, Math.min(6, Math.floor(destroyedCells.length / 4)));
    const attackSent = this.applyAttackWithOffset(rawAttack);

    this.onOmegaExplosion?.({
      centerX: zone.centerCol,
      centerY: zone.centerRow,
      minCol: zone.minCol,
      maxCol: zone.maxCol,
      minRow: zone.minRow,
      maxRow: zone.maxRow,
      destroyedCells,
      pointsAwarded,
      multiplier: this.dopamineMultiplier,
      levelUp: false,
      attackSent,
    });
  }

  private saveHighScore(): void {
    if (this.isCpu) return;
    if (this.mode === 'dopamine') {
      if (this.score > this.highScoreDopamine) {
        this.highScoreDopamine = this.score;
        localStorage.setItem('ttoris_highscore_dopamine', String(this.highScoreDopamine));
      }
    } else {
      if (this.score > this.highScoreNormal) {
        this.highScoreNormal = this.score;
        localStorage.setItem('ttoris_highscore', String(this.highScoreNormal));
      }
    }
  }
}
