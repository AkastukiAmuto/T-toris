import { TetrisEngine } from './engine.js';
import {
  BOARD_COLS,
  CPU_LEVEL_CONFIGS,
  CpuLevel,
  HIDDEN_ROWS,
  SHAPES,
  TetrominoType,
  TOTAL_ROWS,
} from './types.js';

interface CpuMovePlan {
  useHold: boolean;
  targetRotation: number;
  targetX: number;
  score: number;
}

export class TetrisCpuAI {
  private level: CpuLevel = 3;
  private thinkTimer: number = 0;
  private stepTimer: number = 0;
  private currentPlan: CpuMovePlan | null = null;
  private lastPieceRef: object | null = null;
  private stallSteps: number = 0;

  public setLevel(level: CpuLevel): void {
    this.level = level;
    this.reset();
  }

  public getLevel(): CpuLevel {
    return this.level;
  }

  public reset(): void {
    this.thinkTimer = 0;
    this.stepTimer = 0;
    this.currentPlan = null;
    this.lastPieceRef = null;
    this.stallSteps = 0;
  }

  public update(engine: TetrisEngine, dtMs: number): void {
    if (engine.isGameOver || engine.isPaused || !engine.activePiece) return;

    const cfg = CPU_LEVEL_CONFIGS[this.level];

    // Detect newly spawned piece
    if (this.lastPieceRef !== engine.activePiece) {
      this.lastPieceRef = engine.activePiece;
      this.currentPlan = null;
      this.thinkTimer = 0;
      this.stepTimer = 0;
      this.stallSteps = 0;
    }

    if (!this.currentPlan) {
      this.thinkTimer += dtMs;
      if (this.thinkTimer >= cfg.thinkDelayMs) {
        this.currentPlan = this.computeBestPlan(engine);
      }
      return;
    }

    this.stepTimer += dtMs;
    while (this.stepTimer >= cfg.stepIntervalMs && this.currentPlan) {
      this.stepTimer -= cfg.stepIntervalMs;
      this.executeStep(engine);
    }
  }

  private executeStep(engine: TetrisEngine): void {
    if (!engine.activePiece || !this.currentPlan || engine.isGameOver) return;

    if (this.currentPlan.useHold) {
      this.currentPlan.useHold = false;
      if (engine.hold()) {
        this.lastPieceRef = engine.activePiece;
        this.currentPlan = this.computeBestPlan(engine, false);
        return;
      }
    }

    const piece = engine.activePiece;
    const targetRot = this.currentPlan.targetRotation;
    const targetX = this.currentPlan.targetX;

    if (piece.rotation !== targetRot) {
      const diff = (targetRot - piece.rotation + 4) % 4;
      const dir: 1 | -1 = diff === 3 ? -1 : 1;
      const rotated = engine.rotate(dir);
      if (!rotated) {
        this.stallSteps++;
      }
      if (this.stallSteps >= 12) {
        engine.hardDrop();
        this.currentPlan = null;
      }
      return;
    }

    if (piece.x !== targetX) {
      const dir: 1 | -1 = piece.x < targetX ? 1 : -1;
      const moved = engine.moveHorizontal(dir);
      if (!moved) {
        this.stallSteps++;
      }
      if (this.stallSteps >= 8) {
        engine.hardDrop();
        this.currentPlan = null;
      }
      return;
    }

    // Aligned: Hard drop!
    engine.hardDrop();
    this.currentPlan = null;
  }

  private computeBestPlan(engine: TetrisEngine, allowHoldOption: boolean = true): CpuMovePlan {
    const piece = engine.activePiece!;
    const cfg = CPU_LEVEL_CONFIGS[this.level];
    const isOmega = Boolean(piece.isOmegaBomb);

    const candidates: Array<{
      useHold: boolean;
      targetRotation: number;
      targetX: number;
      boardAfter: number[][];
      score: number;
    }> = [];

    // 1. Evaluate current active piece placements
    this.collectPlacements(
      engine.board,
      piece.type,
      isOmega,
      false,
      engine.pendingGarbage,
      candidates
    );

    // 2. Evaluate Hold option if allowed by difficulty & engine state
    if (allowHoldOption && cfg.useHold && engine.canHold && !isOmega) {
      const holdType = engine.holdPiece ?? engine.nextQueue[0];
      if (holdType && holdType !== piece.type) {
        this.collectPlacements(
          engine.board,
          holdType,
          false,
          true,
          engine.pendingGarbage,
          candidates
        );
      }
    }

    if (candidates.length === 0) {
      return { useHold: false, targetRotation: piece.rotation, targetX: piece.x, score: -99999 };
    }

    // Sort descending by 1-ply heuristic score
    candidates.sort((a, b) => b.score - a.score);

    // 2-ply Lookahead for Lv.4 & Lv.5
    if (cfg.lookahead && !isOmega && engine.nextQueue.length > 0) {
      const nextType = engine.nextQueue[0];
      const topK = candidates.slice(0, 4);
      let bestFinal = topK[0];
      let bestTotal = -Infinity;

      for (const cand of topK) {
        const secondBest = this.evaluateBestSecondPly(cand.boardAfter, nextType, engine.pendingGarbage);
        const total = cand.score + secondBest * 0.65;
        if (total > bestTotal) {
          bestTotal = total;
          bestFinal = cand;
        }
      }

      return {
        useHold: bestFinal.useHold,
        targetRotation: bestFinal.targetRotation,
        targetX: bestFinal.targetX,
        score: bestTotal,
      };
    }

    // Add noise for lower difficulty levels (Lv.1 - Lv.3)
    if (cfg.noise > 0) {
      const pool = candidates.slice(0, Math.min(candidates.length, this.level === 1 ? 8 : 4));
      let picked = pool[0];
      let bestNoisy = -Infinity;
      for (const c of pool) {
        const noisyScore = c.score + (Math.random() - 0.5) * 2 * cfg.noise * 8;
        if (noisyScore > bestNoisy) {
          bestNoisy = noisyScore;
          picked = c;
        }
      }
      return {
        useHold: picked.useHold,
        targetRotation: picked.targetRotation,
        targetX: picked.targetX,
        score: picked.score,
      };
    }

    const best = candidates[0];
    return {
      useHold: best.useHold,
      targetRotation: best.targetRotation,
      targetX: best.targetX,
      score: best.score,
    };
  }

  private collectPlacements(
    srcBoard: (string | null)[][],
    type: TetrominoType,
    isOmega: boolean,
    useHold: boolean,
    pendingGarbage: number,
    out: Array<{
      useHold: boolean;
      targetRotation: number;
      targetX: number;
      boardAfter: number[][];
      score: number;
    }>
  ): void {
    const baseGrid = this.toBinaryGrid(srcBoard);
    let matrix = SHAPES[type].map((r) => [...r]);
    const maxRot = type === 'O' ? 1 : type === 'I' || type === 'S' || type === 'Z' ? 2 : 4;

    for (let rot = 0; rot < maxRot; rot++) {
      for (let x = -2; x < BOARD_COLS; x++) {
        if (!this.isValidOnGrid(baseGrid, matrix, x, HIDDEN_ROWS - 2)) continue;

        let y = HIDDEN_ROWS - 2;
        while (this.isValidOnGrid(baseGrid, matrix, x, y + 1)) {
          y++;
        }

        if (isOmega) {
          const score = this.evaluateOmegaBlast(baseGrid, matrix, x, y);
          out.push({
            useHold,
            targetRotation: rot,
            targetX: x,
            boardAfter: baseGrid,
            score,
          });
          continue;
        }

        const sim = this.simulateDrop(baseGrid, matrix, x, y);
        const score = this.evaluateGrid(sim.grid, sim.cleared, pendingGarbage);
        out.push({
          useHold,
          targetRotation: rot,
          targetX: x,
          boardAfter: sim.grid,
          score,
        });
      }
      matrix = this.rotateCW(matrix);
    }
  }

  private evaluateBestSecondPly(grid: number[][], type: TetrominoType, pendingGarbage: number): number {
    let matrix = SHAPES[type].map((r) => [...r]);
    const maxRot = type === 'O' ? 1 : type === 'I' || type === 'S' || type === 'Z' ? 2 : 4;
    let best = -Infinity;

    for (let rot = 0; rot < maxRot; rot++) {
      for (let x = -2; x < BOARD_COLS; x++) {
        if (!this.isValidOnGrid(grid, matrix, x, HIDDEN_ROWS - 2)) continue;
        let y = HIDDEN_ROWS - 2;
        while (this.isValidOnGrid(grid, matrix, x, y + 1)) {
          y++;
        }
        const sim = this.simulateDrop(grid, matrix, x, y);
        const s = this.evaluateGrid(sim.grid, sim.cleared, pendingGarbage);
        if (s > best) best = s;
      }
      matrix = this.rotateCW(matrix);
    }
    return best === -Infinity ? -1000 : best;
  }

  private evaluateOmegaBlast(grid: number[][], matrix: number[][], x: number, y: number): number {
    let sumX = 0;
    let sumY = 0;
    let count = 0;
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c]) {
          sumX += x + c;
          sumY += y + r;
          count++;
        }
      }
    }
    const cx = Math.round(sumX / Math.max(1, count));
    const cy = Math.round(sumY / Math.max(1, count));
    let destroyed = 0;
    let heightBonus = 0;
    for (let r = Math.max(0, cy - 2); r <= Math.min(TOTAL_ROWS - 1, cy + 2); r++) {
      for (let c = Math.max(0, cx - 2); c <= Math.min(BOARD_COLS - 1, cx + 2); c++) {
        if (grid[r][c]) {
          destroyed++;
          heightBonus += (TOTAL_ROWS - r) * 0.4;
        }
      }
    }
    return destroyed * 25 + heightBonus;
  }

  private evaluateGrid(grid: number[][], clearedLines: number, pendingGarbage: number): number {
    const cfg = CPU_LEVEL_CONFIGS[this.level];
    const heights = new Array<number>(BOARD_COLS).fill(0);
    let holes = 0;
    let coveredCells = 0;

    for (let c = 0; c < BOARD_COLS; c++) {
      let foundTop = false;
      let blocksAbove = 0;
      for (let r = 0; r < TOTAL_ROWS; r++) {
        if (grid[r][c] === 1) {
          if (!foundTop) {
            heights[c] = TOTAL_ROWS - r;
            foundTop = true;
          }
          blocksAbove++;
        } else if (foundTop) {
          holes++;
          coveredCells += blocksAbove;
        }
      }
    }

    let aggregateHeight = 0;
    let maxHeight = 0;
    for (let c = 0; c < BOARD_COLS; c++) {
      aggregateHeight += heights[c];
      if (heights[c] > maxHeight) maxHeight = heights[c];
    }

    // Well-aware bumpiness for Lv.4 / Lv.5 (keep rightmost column open for Tetris when safe)
    const inDanger = maxHeight >= 12 || pendingGarbage >= 4;
    let bumpiness = 0;
    const bumpCols = !inDanger && cfg.tetrisBias >= 0.9 ? BOARD_COLS - 1 : BOARD_COLS;
    for (let c = 0; c < bumpCols - 1; c++) {
      bumpiness += Math.abs(heights[c] - heights[c + 1]);
    }

    // Line clear reward
    let lineScore = 0;
    if (clearedLines === 4) {
      lineScore = 52 + cfg.tetrisBias * 28;
    } else if (clearedLines === 3) {
      lineScore = inDanger ? 26 : 12;
    } else if (clearedLines === 2) {
      lineScore = inDanger ? 16 : 4;
    } else if (clearedLines === 1) {
      lineScore = inDanger ? 9 : -4.5 * cfg.tetrisBias;
    }

    // Danger height penalty escalates sharply near top
    const dangerPenalty = maxHeight > 13 ? (maxHeight - 13) * 9 : 0;

    // Bonus for keeping right-most column (col 9) low as a Tetris well when safe
    const wellBonus =
      !inDanger && cfg.tetrisBias >= 0.9 && heights[BOARD_COLS - 1] <= heights[BOARD_COLS - 2] - 2
        ? 4.5
        : 0;

    return (
      lineScore -
      aggregateHeight * 0.58 -
      holes * 14.5 -
      coveredCells * 2.2 -
      bumpiness * 0.82 -
      dangerPenalty +
      wellBonus
    );
  }

  private toBinaryGrid(board: (string | null)[][]): number[][] {
    return board.map((row) => row.map((cell) => (cell !== null ? 1 : 0)));
  }

  private rotateCW(matrix: number[][]): number[][] {
    const n = matrix.length;
    const res = Array.from({ length: n }, () => Array<number>(n).fill(0));
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        res[c][n - 1 - r] = matrix[r][c];
      }
    }
    return res;
  }

  private isValidOnGrid(grid: number[][], matrix: number[][], x: number, y: number): boolean {
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (!matrix[r][c]) continue;
        const bx = x + c;
        const by = y + r;
        if (bx < 0 || bx >= BOARD_COLS || by >= TOTAL_ROWS) return false;
        if (by >= 0 && grid[by][bx] === 1) return false;
      }
    }
    return true;
  }

  private simulateDrop(
    baseGrid: number[][],
    matrix: number[][],
    x: number,
    y: number
  ): { grid: number[][]; cleared: number } {
    const grid = baseGrid.map((r) => [...r]);
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c]) {
          const by = y + r;
          const bx = x + c;
          if (by >= 0 && by < TOTAL_ROWS && bx >= 0 && bx < BOARD_COLS) {
            grid[by][bx] = 1;
          }
        }
      }
    }

    let cleared = 0;
    const nextGrid: number[][] = [];
    for (let r = 0; r < TOTAL_ROWS; r++) {
      if (grid[r].every((v) => v === 1)) {
        cleared++;
      } else {
        nextGrid.push(grid[r]);
      }
    }
    while (nextGrid.length < TOTAL_ROWS) {
      nextGrid.unshift(Array<number>(BOARD_COLS).fill(0));
    }
    return { grid: nextGrid, cleared };
  }
}
