import {
  HardDropEvent,
  LineClearEvent,
  OmegaExplosionEvent,
  PieceLockEvent,
  TetrisEngine,
} from './engine.js';
import {
  BOARD_COLS,
  BOARD_ROWS,
  FloatingText,
  HIDDEN_ROWS,
  Particle,
  SHAPES,
  Shockwave,
  TetrominoType,
  ThemeId,
  ThemePalette,
  THEMES,
} from './types.js';

interface DropTrail {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  alpha: number;
}

interface FlashRow {
  row: number;
  alpha: number;
  color: string;
}

interface LockedCellFlash {
  x: number;
  y: number;
  color: string;
  alpha: number;
}

interface BlastBoxEffect {
  x: number;
  y: number;
  w: number;
  h: number;
  alpha: number;
}

interface LightningBolt {
  points: { x: number; y: number }[];
  color: string;
  alpha: number;
  width: number;
}

interface ScreenParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  rot: number;
  vRot: number;
  kind: 'star' | 'coin' | 'shard' | 'confetti';
}

interface SpotlightBeam {
  originX: number;
  originY: number;
  angle: number;
  vAngle: number;
  color: string;
  alpha: number;
  width: number;
}

export class GameRenderer {
  private boardCanvas: HTMLCanvasElement;
  private boardCtx: CanvasRenderingContext2D;
  private holdCanvas: HTMLCanvasElement;
  private holdCtx: CanvasRenderingContext2D;
  private nextCanvas: HTMLCanvasElement;
  private nextCtx: CanvasRenderingContext2D;
  private fxCanvas: HTMLCanvasElement;
  private fxCtx: CanvasRenderingContext2D;
  private appShellEl: HTMLElement;

  private cellSize: number = 32;
  private theme: ThemePalette = THEMES.neon;
  private showGhost: boolean = true;

  private particles: Particle[] = [];
  private shockwaves: Shockwave[] = [];
  private floatingTexts: FloatingText[] = [];
  private dropTrails: DropTrail[] = [];
  private flashRows: FlashRow[] = [];
  private lockedFlashes: LockedCellFlash[] = [];
  private blastBoxes: BlastBoxEffect[] = [];

  // Full-Window Dopamine FX State
  private screenParticles: ScreenParticle[] = [];
  private screenShockwaves: Shockwave[] = [];
  private screenTexts: FloatingText[] = [];
  private lightnings: LightningBolt[] = [];
  private spotlights: SpotlightBeam[] = [];
  private speedLinesAlpha: number = 0;
  private speedLinesColor: string = '#00f3ff';

  private screenFlashAlpha: number = 0;
  private screenFlashColor: string = '#ffffff';
  private shakeTimer: number = 0;
  private shakeIntensity: number = 0;

  // Whole-UI (.app-shell) Shake & Zoom Punch
  private uiShakeTimer: number = 0;
  private uiShakeIntensity: number = 0;
  private uiZoomPunch: number = 0;
  private isSecondary: boolean = false;

  constructor(
    boardCanvas: HTMLCanvasElement,
    holdCanvas: HTMLCanvasElement,
    nextCanvas: HTMLCanvasElement,
    options?: { isSecondary?: boolean }
  ) {
    this.boardCanvas = boardCanvas;
    this.boardCtx = boardCanvas.getContext('2d')!;
    this.holdCanvas = holdCanvas;
    this.holdCtx = holdCanvas.getContext('2d')!;
    this.nextCanvas = nextCanvas;
    this.nextCtx = nextCanvas.getContext('2d')!;
    this.isSecondary = Boolean(options?.isSecondary);

    this.fxCanvas = document.getElementById('fx-canvas') as HTMLCanvasElement;
    this.fxCtx = this.fxCanvas.getContext('2d')!;
    this.appShellEl = document.getElementById('app-shell')!;

    this.cellSize = this.boardCanvas.width / BOARD_COLS;
    if (!this.isSecondary) {
      this.resizeFxCanvas();
      window.addEventListener('resize', () => this.resizeFxCanvas());
    }
  }

  private resizeFxCanvas(): void {
    if (!this.fxCanvas) return;
    this.fxCanvas.width = window.innerWidth;
    this.fxCanvas.height = window.innerHeight;
  }

  private boardToScreenCoords(bx: number, by: number): { x: number; y: number } {
    const rect = this.boardCanvas.getBoundingClientRect();
    const scaleX = rect.width / this.boardCanvas.width;
    const scaleY = rect.height / this.boardCanvas.height;
    return {
      x: rect.left + bx * scaleX,
      y: rect.top + by * scaleY,
    };
  }

  private triggerWholeScreenShake(
    uiIntensity: number,
    durationMs: number,
    zoomPunch: number = 0.03,
    _nativeWindowIntensity: number = 0
  ): void {
    this.uiShakeIntensity = Math.max(this.uiShakeIntensity, uiIntensity);
    this.uiShakeTimer = Math.max(this.uiShakeTimer, durationMs);
    this.uiZoomPunch = Math.max(this.uiZoomPunch, zoomPunch);
  }

  private spawnLightning(x1: number, y1: number, x2: number, y2: number, color: string, width: number = 4): void {
    const segments = 10;
    const pts: { x: number; y: number }[] = [{ x: x1, y: y1 }];
    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      const bx = x1 + (x2 - x1) * t + (Math.random() - 0.5) * 75;
      const by = y1 + (y2 - y1) * t + (Math.random() - 0.5) * 25;
      pts.push({ x: bx, y: by });
    }
    pts.push({ x: x2, y: y2 });
    this.lightnings.push({
      points: pts,
      color,
      alpha: 1.0,
      width,
    });
  }

  private spawnScreenExplosionParticles(
    sx: number,
    sy: number,
    count: number,
    speedMult: number = 1
  ): void {
    const palette = ['#ffe600', '#00f3ff', '#ff007f', '#00ff66', '#ff6600', '#ffffff'];
    const kinds: ('star' | 'coin' | 'shard')[] = ['star', 'coin', 'shard'];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (3.5 + Math.random() * 14.5) * speedMult;
      this.screenParticles.push({
        x: sx,
        y: sy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3.5,
        size: 6 + Math.random() * 10,
        color: palette[i % palette.length],
        alpha: 1,
        life: 0,
        maxLife: 45 + Math.random() * 38,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.28,
        kind: kinds[i % kinds.length],
      });
    }
  }

  private spawnConfettiCannons(perSideCount: number = 45): void {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const palette = ['#ffe600', '#ff007f', '#00f3ff', '#00ff66', '#ff6600', '#b848f8', '#ffffff'];

    for (let side = 0; side < 2; side++) {
      const startX = side === 0 ? 10 : W - 10;
      const baseAngle = side === 0 ? -Math.PI * 0.34 : -Math.PI * 0.66;

      for (let i = 0; i < perSideCount; i++) {
        const angle = baseAngle + (Math.random() - 0.5) * 0.58;
        const speed = 11 + Math.random() * 17;
        this.screenParticles.push({
          x: startX,
          y: H - 10,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 7 + Math.random() * 9,
          color: palette[i % palette.length],
          alpha: 1,
          life: 0,
          maxLife: 65 + Math.random() * 45,
          rot: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.35,
          kind: i % 4 === 0 ? 'coin' : 'confetti',
        });
      }
    }
  }

  private spawnStageSpotlights(beamCount: number = 4): void {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const colors = ['#00f3ff', '#ff007f', '#ffe600', '#00ff66', '#b848f8'];

    for (let i = 0; i < beamCount; i++) {
      const originX = (W / (beamCount + 1)) * (i + 1);
      this.spotlights.push({
        originX,
        originY: H + 20,
        angle: -Math.PI / 2 + (Math.random() - 0.5) * 0.6,
        vAngle: (i % 2 === 0 ? 1 : -1) * (0.018 + Math.random() * 0.015),
        color: colors[i % colors.length],
        alpha: 0.72,
        width: 55 + Math.random() * 35,
      });
    }
  }

  public setTheme(themeId: ThemeId): void {
    this.theme = THEMES[themeId];
  }

  public setShowGhost(show: boolean): void {
    this.showGhost = show;
  }

  public isGhostVisible(): boolean {
    return this.showGhost;
  }

  private getRainbowColor(offsetDeg: number = 0): string {
    const hue = (performance.now() * 0.45 + offsetDeg) % 360;
    return `hsl(${hue}, 100%, 60%)`;
  }

  public triggerPieceLockEffect(ev: PieceLockEvent): void {
    const color = this.theme.colors[ev.type];
    for (const cell of ev.cells) {
      if (cell.y < 0) continue;
      this.lockedFlashes.push({
        x: cell.x * this.cellSize,
        y: cell.y * this.cellSize,
        color,
        alpha: 0.9,
      });

      for (let i = 0; i < 4; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.0 + Math.random() * 2.8;
        this.particles.push({
          x: (cell.x + 0.5) * this.cellSize,
          y: (cell.y + 0.5) * this.cellSize,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.6,
          size: 2.5 + Math.random() * 2.5,
          color,
          alpha: 1,
          life: 0,
          maxLife: 18 + Math.random() * 12,
          shape: 'spark',
        });
      }
    }
  }

  public triggerGaugeMaxEffect(): void {
    if (this.isSecondary) return;
    const cx = this.boardCanvas.width / 2;
    const cy = this.boardCanvas.height * 0.35;
    const sc = this.boardToScreenCoords(cx, cy);

    this.speedLinesColor = '#ffe600';
    this.speedLinesAlpha = 0.9;
    this.triggerWholeScreenShake(14, 320, 0.05, 12);

    this.screenShockwaves.push({
      x: sc.x,
      y: sc.y,
      radius: 15,
      maxRadius: 580,
      color: '#ffe600',
      alpha: 1,
      lineWidth: 10,
    });

    this.spawnLightning(sc.x - 200, 0, sc.x, sc.y, '#ffe600', 5);
    this.spawnLightning(sc.x + 200, 0, sc.x, sc.y, '#00f3ff', 5);
    this.spawnScreenExplosionParticles(sc.x, sc.y, 70, 1.1);

    this.screenTexts.push({
      text: '⚡ OMEGA BOMB READY!! ⚡',
      subText: '次のミノで5×5範囲を大爆破せよ！！',
      x: window.innerWidth / 2,
      y: window.innerHeight * 0.32,
      color: '#ffe600',
      alpha: 1,
      vy: -1.0,
      scale: 1.65,
      life: 0,
      maxLife: 85,
    });
  }

  public triggerOmegaExplosionEffect(ev: OmegaExplosionEvent): void {
    const cx = (ev.centerX + 0.5) * this.cellSize;
    const cy = (ev.centerY + 0.5) * this.cellSize;
    const sc = this.boardToScreenCoords(cx, cy);

    // Flash the 5x5 blast crater box
    this.blastBoxes.push({
      x: ev.minCol * this.cellSize,
      y: ev.minRow * this.cellSize,
      w: (ev.maxCol - ev.minCol + 1) * this.cellSize,
      h: (ev.maxRow - ev.minRow + 1) * this.cellSize,
      alpha: 1.0,
    });

    this.screenFlashColor = '#ffe600';
    this.screenFlashAlpha = 0.85;
    this.shakeTimer = 500;
    this.shakeIntensity = 15;

    const ringColors = ['#ffe600', '#ff0055', '#00f3ff', '#00ff66'];

    if (!this.isSecondary) {
      // Massive Whole-Screen & Desktop Window Earthquake!
      this.speedLinesColor = '#ff007f';
      this.speedLinesAlpha = 1.0;
      this.triggerWholeScreenShake(26, 520, 0.085, 22);

      // 4 Giant Full-Window Shockwaves
      ringColors.forEach((col, idx) => {
        this.screenShockwaves.push({
          x: sc.x,
          y: sc.y,
          radius: 10 + idx * 24,
          maxRadius: 680 + idx * 90,
          color: col,
          alpha: 1,
          lineWidth: 12 - idx * 2,
        });
      });

      // 6 Lightning Bolts converging on the blast center!
      for (let i = 0; i < 6; i++) {
        const startX = (window.innerWidth / 5) * i;
        const startY = i % 2 === 0 ? 0 : window.innerHeight;
        this.spawnLightning(startX, startY, sc.x, sc.y, ringColors[i % ringColors.length], 6);
      }

      // 180 Full-Window Coins, Stars & Shards + Confetti Cannons + Stage Spotlights!
      this.spawnScreenExplosionParticles(sc.x, sc.y, 180, 1.45);
      this.spawnConfettiCannons(65);
      this.spawnStageSpotlights(6);

      this.screenTexts.push({
        text: `💥 OMEGA BLAST!! (${ev.destroyedCells.length}個粉砕!!) 💥`,
        subText: `+${ev.pointsAwarded.toLocaleString()} PTS!! (FEVER x${ev.multiplier})`,
        x: window.innerWidth / 2,
        y: Math.max(180, Math.min(window.innerHeight - 180, sc.y)),
        color: '#ffe600',
        alpha: 1,
        vy: -1.4,
        scale: 1.85,
        life: 0,
        maxLife: 95,
      });
    } else {
      this.floatingTexts.push({
        text: `💥 OMEGA!!`,
        subText: ev.attackSent > 0 ? `⚔️ +${ev.attackSent}` : undefined,
        x: this.boardCanvas.width / 2,
        y: cy,
        color: '#ffe600',
        alpha: 1,
        vy: -1.2,
        scale: 1.2,
        life: 0,
        maxLife: 70,
      });
    }

    // Board-level particles
    const palette = ['#ffe600', '#ff5500', '#ff0055', '#00f3ff', '#ffffff'];
    for (const cell of ev.destroyedCells) {
      if (cell.y < 0) continue;
      for (let i = 0; i < 10; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2.5 + Math.random() * 9.0;
        const col = palette[(cell.x + cell.y + i) % palette.length];
        this.particles.push({
          x: (cell.x + 0.5) * this.cellSize,
          y: (cell.y + 0.5) * this.cellSize,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2.2,
          size: 4 + Math.random() * 5.5,
          color: col,
          alpha: 1,
          life: 0,
          maxLife: 40 + Math.random() * 28,
          shape: i % 2 === 0 ? 'spark' : 'circle',
        });
      }
    }
  }

  public triggerHardDropEffect(ev: HardDropEvent, isDopamine: boolean = false): void {
    const color = ev.isOmegaBomb ? '#ffe600' : this.theme.colors[ev.type];
    const topY = Math.max(0, ev.startY) * this.cellSize;
    const bottomY = (ev.endY + 2) * this.cellSize;
    const height = Math.max(this.cellSize, bottomY - topY);

    if (ev.endY > ev.startY) {
      this.dropTrails.push({
        x: ev.colStart * this.cellSize,
        y: topY,
        width: (ev.colEnd - ev.colStart + 1) * this.cellSize,
        height,
        color,
        alpha: isDopamine ? 0.88 : 0.62,
      });
    }

    const midX = ((ev.colStart + ev.colEnd + 1) / 2) * this.cellSize;
    const midY = Math.max(40, (ev.endY + 1) * this.cellSize);

    this.shockwaves.push({
      x: midX,
      y: midY,
      radius: 6,
      maxRadius: isDopamine ? 135 : 85,
      color,
      alpha: isDopamine ? 0.95 : 0.75,
      lineWidth: isDopamine ? 5.5 : 3.0,
    });

    const sparkCount = isDopamine ? 14 : 8;
    for (const cell of ev.cells) {
      if (cell.y < 0) continue;
      for (let i = 0; i < sparkCount; i++) {
        const angle = -Math.PI * Math.random();
        const speed = (1.6 + Math.random() * 5.2) * (isDopamine ? 1.4 : 1);
        this.particles.push({
          x: (cell.x + 0.5) * this.cellSize,
          y: (cell.y + 0.8) * this.cellSize,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.2,
          size: 3.0 + Math.random() * 4.0,
          color: i % 3 === 0 ? '#ffffff' : color,
          alpha: 1,
          life: 0,
          maxLife: 22 + Math.random() * 18,
          shape: this.theme.id === 'retro' ? 'square' : 'spark',
        });
      }
    }

    if (!this.isSecondary && isDopamine && !ev.isOmegaBomb) {
      const sc = this.boardToScreenCoords(midX, midY);
      // Lightning bolt strike from top of screen to hard-dropped piece!
      this.spawnLightning(sc.x + (Math.random() - 0.5) * 80, 0, sc.x, sc.y, color, 4);
      this.spawnScreenExplosionParticles(sc.x, sc.y, 26, 0.85);
      this.triggerWholeScreenShake(9, 140, 0.022, 6);
    }

    this.shakeTimer = isDopamine ? 180 : 120;
    this.shakeIntensity = isDopamine ? 7.5 : 4.5;
  }

  public triggerLineClearEffect(ev: LineClearEvent, isDopamine: boolean = false): void {
    const count = ev.clearedRows.length;
    const mainColor = ev.isTetris
      ? '#00f3ff'
      : ev.isTSpin
      ? '#ff00e5'
      : count >= 3
      ? '#ff5500'
      : count === 2
      ? '#00ff88'
      : '#ffe600';

    ev.clearedRows.forEach((rowIdx, idx) => {
      if (rowIdx < 0) return;
      this.flashRows.push({ row: rowIdx, alpha: 1.0, color: mainColor });

      const colors = ev.rowColors[idx] || [];
      for (let c = 0; c < BOARD_COLS; c++) {
        const tType = colors[c] || 'I';
        const color = this.theme.colors[tType];
        const baseParticles = ev.isTetris ? 12 : 8;
        const pCount = isDopamine ? Math.round(baseParticles * 1.8) : baseParticles;

        for (let p = 0; p < pCount; p++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = (2.0 + Math.random() * (ev.isTetris ? 8.5 : 5.5)) * (isDopamine ? 1.35 : 1);
          this.particles.push({
            x: (c + 0.5) * this.cellSize,
            y: (rowIdx + 0.5) * this.cellSize,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 2.0,
            size: 3.5 + Math.random() * 5.5,
            color: p % 4 === 0 ? '#ffffff' : p % 3 === 0 ? mainColor : color,
            alpha: 1,
            life: 0,
            maxLife: 38 + Math.random() * 28,
            shape:
              this.theme.id === 'retro'
                ? 'square'
                : p % 2 === 0
                ? 'spark'
                : 'circle',
          });
        }
      }
    });

    const centerRow =
      ev.clearedRows.length > 0
        ? ev.clearedRows.reduce((a, b) => a + b, 0) / ev.clearedRows.length
        : 8;
    const textY = Math.max(80, Math.min(this.boardCanvas.height - 80, centerRow * this.cellSize));

    const ringCount = Math.min(4, Math.max(1, count + (ev.isTSpin ? 1 : 0)));
    const ringPalette = ['#00f3ff', '#ff00aa', '#ffe600', '#00ff88'];
    for (let r = 0; r < ringCount; r++) {
      this.shockwaves.push({
        x: this.boardCanvas.width / 2,
        y: textY,
        radius: 10 + r * 16,
        maxRadius: 180 + count * 45 + r * 35,
        color: ringPalette[r % ringPalette.length],
        alpha: 0.95,
        lineWidth: 5.5 - r * 0.8,
      });
    }

    if (ev.isTetris || ev.isTSpin || count >= 2 || isDopamine) {
      this.screenFlashColor = mainColor;
      this.screenFlashAlpha = isDopamine ? 0.65 : ev.isTetris ? 0.5 : 0.25;
    }

    if (isDopamine && !this.isSecondary) {
      const sc = this.boardToScreenCoords(this.boardCanvas.width / 2, textY);

      // Whole-Screen & Desktop Window Shake!
      const shakePower = 12 + count * 5 + Math.min(12, ev.combo * 2);
      const zoomPower = 0.035 + count * 0.015;
      this.triggerWholeScreenShake(
        shakePower,
        240 + count * 75,
        zoomPower,
        8 + count * 4
      );

      this.speedLinesColor = mainColor;
      this.speedLinesAlpha = Math.min(1.0, 0.45 + count * 0.18);

      // Full-Window Shockwaves & Lightning Bolts!
      for (let r = 0; r < Math.min(4, count + 1); r++) {
        this.screenShockwaves.push({
          x: sc.x,
          y: sc.y,
          radius: 14 + r * 20,
          maxRadius: 520 + count * 70 + r * 60,
          color: ringPalette[r % ringPalette.length],
          alpha: 1,
          lineWidth: 9 - r * 1.5,
        });
      }

      for (let l = 0; l < count + 1; l++) {
        this.spawnLightning(
          Math.random() * window.innerWidth,
          0,
          sc.x + (Math.random() - 0.5) * 160,
          sc.y,
          ringPalette[l % ringPalette.length],
          5
        );
      }

      // Burst 50 ~ 160 full-screen coins, stars & shards!
      this.spawnScreenExplosionParticles(sc.x, sc.y, 45 + count * 30, 1.15 + count * 0.1);

      // Confetti Cannons & Stage Spotlights on Combos and Special Techniques!
      if (ev.combo >= 1 || ev.isTSpin || ev.isTetris || ev.isBackToBack) {
        this.spawnConfettiCannons(25 + Math.min(60, ev.combo * 14 + count * 8));
        this.spawnStageSpotlights(Math.min(6, 2 + ev.combo + (ev.isTetris || ev.isTSpin ? 2 : 0)));
      }

      // Dedicated Hype Stamp for Combos / Special Techniques!
      if (ev.combo >= 1 || ev.isTSpin || ev.isBackToBack) {
        let hypeBanner = '';
        if (ev.combo >= 5) {
          hypeBanner = `👑 GODLIKE ${ev.combo} COMBO!! UNSTOPPABLE!! 👑`;
        } else if (ev.combo === 4) {
          hypeBanner = `💥 SUPER CRAZY 4 COMBO!! 大歓声!! 💥`;
        } else if (ev.combo === 3) {
          hypeBanner = `⚡ GREAT FEVER 3 COMBO!! 歓声爆発!! ⚡`;
        } else if (ev.combo >= 1) {
          hypeBanner = `🔥 ${ev.combo} COMBO RUSH!! 🔥`;
        }
        if (ev.isTSpin) {
          hypeBanner = `🌪️ T-SPIN MASTER!! ${hypeBanner}`;
        } else if (ev.isBackToBack) {
          hypeBanner = `⚡ BACK-TO-BACK!! ${hypeBanner}`;
        }

        this.screenTexts.push({
          text: hypeBanner,
          x: window.innerWidth / 2,
          y: Math.max(110, sc.y - 65),
          color: '#ffe600',
          alpha: 1,
          vy: -1.8,
          scale: 1.35 + Math.min(0.6, ev.combo * 0.1),
          life: 0,
          maxLife: 88,
        });
      }

      // Giant Full-Window Cut-in Text!
      this.screenTexts.push({
        text: `${ev.actionLabel} +${ev.pointsAwarded.toLocaleString()}`,
        subText: ev.subLabel || undefined,
        x: window.innerWidth / 2,
        y: sc.y,
        color: mainColor,
        alpha: 1,
        vy: -1.5,
        scale: 1.35 + count * 0.15,
        life: 0,
        maxLife: 82,
      });
    } else {
      if (ev.isTetris || ev.isTSpin) {
        this.shakeTimer = 300;
        this.shakeIntensity = 8.0;
      } else {
        this.shakeTimer = 140 + count * 50;
        this.shakeIntensity = 4.0 + count * 1.5;
      }

      this.floatingTexts.push({
        text: `${ev.actionLabel} +${ev.pointsAwarded.toLocaleString()}`,
        subText: ev.subLabel || undefined,
        x: this.boardCanvas.width / 2,
        y: textY,
        color: this.theme.id === 'minimal' ? '#0f172a' : mainColor,
        alpha: 1,
        vy: -1.25,
        scale: ev.isTetris || ev.isTSpin ? 1.28 : 1.0 + count * 0.06,
        life: 0,
        maxLife: 78,
      });
    }
  }

  public render(engine: TetrisEngine, dtMs: number): void {
    this.updateEffects(dtMs);
    this.renderBoard(engine);
    this.renderHold(engine.holdPiece, engine.canHold);
    this.renderNext(engine.nextQueue, engine.omegaReady);
    if (!this.isSecondary) {
      this.renderFullScreenFx(engine);
    }
  }

  private updateEffects(dtMs: number): void {
    const step = dtMs / 16.67;
    const W = this.boardCanvas.width;

    if (this.shakeTimer > 0) {
      this.shakeTimer = Math.max(0, this.shakeTimer - dtMs);
    }

    // Update Whole-UI (.app-shell) Shake, Rotation & Zoom Punch (GPU-composited transform only)
    if (!this.isSecondary) {
      if (this.uiShakeTimer > 0 || this.uiZoomPunch > 0.001) {
        this.uiShakeTimer = Math.max(0, this.uiShakeTimer - dtMs);
        this.uiZoomPunch *= Math.pow(0.84, step);
        if (this.uiZoomPunch < 0.001) this.uiZoomPunch = 0;

        const ratio = Math.min(1, this.uiShakeTimer / 220);
        const mag = ratio * this.uiShakeIntensity;
        const dx = (Math.random() - 0.5) * mag * 2;
        const dy = (Math.random() - 0.5) * mag * 2;
        const rot = (Math.random() - 0.5) * ratio * 2.2;
        const scale = 1 + this.uiZoomPunch;

        this.appShellEl.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0) rotate(${rot.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
      } else if (this.appShellEl.style.transform !== '') {
        this.appShellEl.style.transform = '';
        this.uiShakeIntensity = 0;
      }
    }

    if (this.speedLinesAlpha > 0) {
      this.speedLinesAlpha = Math.max(0, this.speedLinesAlpha - 0.032 * step);
    }

    if (this.screenFlashAlpha > 0) {
      this.screenFlashAlpha = Math.max(0, this.screenFlashAlpha - 0.04 * step);
    }

    for (let i = this.lightnings.length - 1; i >= 0; i--) {
      this.lightnings[i].alpha -= 0.09 * step;
      if (this.lightnings[i].alpha <= 0) {
        this.lightnings.splice(i, 1);
      }
    }

    for (let i = this.screenShockwaves.length - 1; i >= 0; i--) {
      const sw = this.screenShockwaves[i];
      sw.radius += (sw.maxRadius - sw.radius) * 0.13 * step + 7 * step;
      sw.alpha = Math.max(0, 1 - sw.radius / sw.maxRadius);
      if (sw.radius >= sw.maxRadius || sw.alpha <= 0.02) {
        this.screenShockwaves.splice(i, 1);
      }
    }

    for (let i = this.spotlights.length - 1; i >= 0; i--) {
      const sl = this.spotlights[i];
      sl.angle += sl.vAngle * step;
      sl.alpha -= 0.014 * step;
      if (sl.alpha <= 0) {
        this.spotlights.splice(i, 1);
      }
    }

    if (this.screenParticles.length > 140) {
      this.screenParticles.splice(0, this.screenParticles.length - 140);
    }

    for (let i = this.screenParticles.length - 1; i >= 0; i--) {
      const sp = this.screenParticles[i];
      sp.x += sp.vx * step;
      sp.y += sp.vy * step;
      if (sp.kind === 'confetti') {
        sp.vx *= Math.pow(0.97, step);
        sp.vx += Math.sin(sp.life * 0.22) * 0.28 * step;
        sp.vy += 0.19 * step;
      } else {
        sp.vy += 0.24 * step;
      }
      sp.rot += sp.vRot * step;
      sp.life += step;
      sp.alpha = Math.max(0, 1 - sp.life / sp.maxLife);
      if (sp.life >= sp.maxLife) {
        this.screenParticles.splice(i, 1);
      }
    }

    for (let i = this.screenTexts.length - 1; i >= 0; i--) {
      const st = this.screenTexts[i];
      st.y += st.vy * step;
      st.life += step;
      st.alpha = Math.max(0, 1 - Math.pow(st.life / st.maxLife, 1.7));
      if (st.life >= st.maxLife) {
        this.screenTexts.splice(i, 1);
      }
    }

    for (let i = this.dropTrails.length - 1; i >= 0; i--) {
      this.dropTrails[i].alpha -= 0.04 * step;
      if (this.dropTrails[i].alpha <= 0) {
        this.dropTrails.splice(i, 1);
      }
    }

    for (let i = this.lockedFlashes.length - 1; i >= 0; i--) {
      this.lockedFlashes[i].alpha -= 0.075 * step;
      if (this.lockedFlashes[i].alpha <= 0) {
        this.lockedFlashes.splice(i, 1);
      }
    }

    for (let i = this.blastBoxes.length - 1; i >= 0; i--) {
      this.blastBoxes[i].alpha -= 0.05 * step;
      if (this.blastBoxes[i].alpha <= 0) {
        this.blastBoxes.splice(i, 1);
      }
    }

    for (let i = this.flashRows.length - 1; i >= 0; i--) {
      this.flashRows[i].alpha -= 0.065 * step;
      if (this.flashRows[i].alpha <= 0) {
        this.flashRows.splice(i, 1);
      }
    }

    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += (sw.maxRadius - sw.radius) * 0.14 * step + 4 * step;
      sw.alpha = Math.max(0, 1 - sw.radius / sw.maxRadius);
      if (sw.radius >= sw.maxRadius || sw.alpha <= 0.02) {
        this.shockwaves.splice(i, 1);
      }
    }

    if (this.particles.length > 120) {
      this.particles.splice(0, this.particles.length - 120);
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * step;
      p.y += p.vy * step;
      if (p.x < 2 || p.x > W - 2) {
        p.vx *= -0.75;
        p.x = Math.max(2, Math.min(W - 2, p.x));
      }
      p.vy += 0.17 * step;
      p.life += step;
      p.alpha = Math.max(0, 1 - p.life / p.maxLife);
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy * step;
      ft.life += step;
      ft.alpha = Math.max(0, 1 - Math.pow(ft.life / ft.maxLife, 1.6));
      if (ft.life >= ft.maxLife) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  private renderFullScreenFx(engine: TetrisEngine): void {
    const ctx = this.fxCtx;
    const W = this.fxCanvas.width;
    const H = this.fxCanvas.height;

    ctx.clearRect(0, 0, W, H);

    // 1. Stage Spotlights (sweeping concert beams from bottom)
    for (const sl of this.spotlights) {
      ctx.save();
      ctx.globalAlpha = sl.alpha * 0.36;
      const beamLen = Math.max(W, H) * 1.3;
      const endX = sl.originX + Math.cos(sl.angle) * beamLen;
      const endY = sl.originY + Math.sin(sl.angle) * beamLen;
      const perpX = -Math.sin(sl.angle) * sl.width;
      const perpY = Math.cos(sl.angle) * sl.width;

      const grad = ctx.createLinearGradient(sl.originX, sl.originY, endX, endY);
      grad.addColorStop(0, sl.color);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;

      ctx.beginPath();
      ctx.moveTo(sl.originX, sl.originY);
      ctx.lineTo(endX - perpX, endY - perpY);
      ctx.lineTo(endX + perpX, endY + perpY);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // 2. Anime / Pachinko Radial Speed Lines on big Dopamine moments!
    if (this.speedLinesAlpha > 0.01) {
      ctx.save();
      ctx.globalAlpha = this.speedLinesAlpha * 0.45;
      ctx.strokeStyle = this.speedLinesColor;
      ctx.shadowColor = this.speedLinesColor;
      ctx.shadowBlur = 14;
      const cx = W / 2;
      const cy = H / 2;
      const numLines = 42;
      const timeOffset = Math.floor(performance.now() / 40);
      for (let i = 0; i < numLines; i++) {
        const angle = (i / numLines) * Math.PI * 2 + timeOffset * 0.07;
        const innerR = 220 + ((i * 37) % 140);
        const outerR = Math.max(W, H);
        ctx.lineWidth = 2 + (i % 4);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
        ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 2. Rainbow Fever Border Aura when Omega Bomb is active or Combo >= 3 in Dopamine Mode
    if (
      engine.mode === 'dopamine' &&
      (engine.omegaReady || engine.activePiece?.isOmegaBomb || engine.combo >= 2)
    ) {
      ctx.save();
      const col = this.getRainbowColor(0);
      ctx.strokeStyle = col;
      ctx.lineWidth = 8;
      ctx.shadowColor = col;
      ctx.shadowBlur = 28;
      ctx.globalAlpha = 0.65 + 0.25 * Math.sin(performance.now() * 0.015);
      ctx.strokeRect(4, 4, W - 8, H - 8);
      ctx.restore();
    }

    // 3. Full-Screen Shockwave Rings
    for (const sw of this.screenShockwaves) {
      ctx.save();
      ctx.globalAlpha = sw.alpha;
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = sw.lineWidth;
      ctx.shadowColor = sw.color;
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 4. Jagged Lightning Bolts
    for (const lb of this.lightnings) {
      if (lb.points.length < 2) continue;
      ctx.save();
      ctx.globalAlpha = lb.alpha;
      ctx.strokeStyle = lb.color;
      ctx.lineWidth = lb.width;
      ctx.shadowColor = lb.color;
      ctx.shadowBlur = 22;
      ctx.beginPath();
      ctx.moveTo(lb.points[0].x, lb.points[0].y);
      for (let i = 1; i < lb.points.length; i++) {
        ctx.lineTo(lb.points[i].x, lb.points[i].y);
      }
      ctx.stroke();

      // White-hot lightning core
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1.5, lb.width * 0.45);
      ctx.stroke();
      ctx.restore();
    }

    // 5. Full-Window Unclipped Particles (Stars, Gold Coins, Shards)
    for (const sp of this.screenParticles) {
      ctx.save();
      ctx.globalAlpha = sp.alpha;
      ctx.translate(sp.x, sp.y);
      ctx.rotate(sp.rot);
      ctx.fillStyle = sp.color;

      if (sp.kind === 'coin') {
        ctx.beginPath();
        ctx.ellipse(0, 0, sp.size * 0.7, sp.size * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (sp.kind === 'star') {
        const s = sp.size * 0.75;
        ctx.fillRect(-s / 2, -s / 2, s, s);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-s / 2, -s / 2, s, s);
      } else if (sp.kind === 'confetti') {
        const flip = Math.cos(sp.life * 0.32);
        ctx.scale(1, Math.max(0.2, Math.abs(flip)));
        ctx.fillRect(-sp.size * 0.65, -sp.size * 0.32, sp.size * 1.3, sp.size * 0.64);
      } else {
        ctx.fillRect(-sp.size / 2, -sp.size / 4, sp.size, sp.size / 2);
      }
      ctx.restore();
    }

    // 6. Giant Full-Window Cut-in Texts
    for (const st of this.screenTexts) {
      ctx.save();
      ctx.globalAlpha = st.alpha;
      ctx.textAlign = 'center';
      ctx.font = `900 ${Math.round(24 * st.scale)}px "Segoe UI", system-ui, sans-serif`;
      ctx.shadowColor = st.color;
      ctx.shadowBlur = 24;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 6;
      ctx.strokeText(st.text, st.x, st.y);
      ctx.fillStyle = st.color;
      ctx.fillText(st.text, st.x, st.y);

      if (st.subText) {
        ctx.font = `900 ${Math.round(14 * st.scale)}px "Segoe UI", system-ui, sans-serif`;
        ctx.lineWidth = 4.5;
        ctx.strokeText(st.subText, st.x, st.y + 30);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(st.subText, st.x, st.y + 30);
      }
      ctx.restore();
    }
  }

  private renderBoard(engine: TetrisEngine): void {
    const ctx = this.boardCtx;
    const W = this.boardCanvas.width;
    const H = this.boardCanvas.height;

    ctx.save();

    if (this.shakeTimer > 0) {
      const mag = (this.shakeTimer / 220) * this.shakeIntensity;
      const ox = (Math.random() - 0.5) * mag * 2;
      const oy = (Math.random() - 0.5) * mag * 2;
      ctx.translate(ox, oy);
    }

    ctx.fillStyle = this.theme.boardBg;
    ctx.fillRect(0, 0, W, H);

    // Subtle Grid Lines
    ctx.strokeStyle = this.theme.gridLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let c = 1; c < BOARD_COLS; c++) {
      const x = c * this.cellSize + 0.5;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
    }
    for (let r = 1; r < BOARD_ROWS; r++) {
      const y = r * this.cellSize + 0.5;
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
    }
    ctx.stroke();

    // Hard drop laser trails
    for (const trail of this.dropTrails) {
      ctx.save();
      const grad = ctx.createLinearGradient(0, trail.y, 0, trail.y + trail.height);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(0.6, trail.color);
      grad.addColorStop(1, '#ffffff');
      ctx.fillStyle = grad;
      ctx.globalAlpha = Math.max(0, trail.alpha);
      ctx.fillRect(trail.x, trail.y, trail.width, trail.height);
      ctx.restore();
    }

    // Locked blocks on board
    for (let r = HIDDEN_ROWS; r < HIDDEN_ROWS + BOARD_ROWS; r++) {
      const visRow = r - HIDDEN_ROWS;
      for (let c = 0; c < BOARD_COLS; c++) {
        const cell = engine.board[r][c];
        if (cell) {
          this.drawCell(
            ctx,
            c * this.cellSize,
            visRow * this.cellSize,
            this.cellSize,
            this.theme.colors[cell],
            1
          );
        }
      }
    }

    // Locked cell landing flashes
    for (const lf of this.lockedFlashes) {
      ctx.save();
      ctx.globalAlpha = lf.alpha;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = lf.color;
      ctx.shadowBlur = 16;
      ctx.fillRect(lf.x + 2, lf.y + 2, this.cellSize - 4, this.cellSize - 4);
      ctx.restore();
    }

    // Active Piece & Ghost Piece
    if (engine.activePiece && !engine.isGameOver) {
      const { matrix, x, y, type, isOmegaBomb } = engine.activePiece;
      const color = isOmegaBomb ? this.getRainbowColor(0) : this.theme.colors[type];
      const ghostY = engine.getGhostY();

      if (isOmegaBomb) {
        const zone = engine.getOmegaBlastZone(x, ghostY, matrix);
        this.drawBlastTargetPreview(ctx, zone.minCol, zone.maxCol, zone.minRow, zone.maxRow);
      }

      if (this.showGhost && ghostY !== y) {
        for (let r = 0; r < matrix.length; r++) {
          for (let c = 0; c < matrix[r].length; c++) {
            if (!matrix[r][c]) continue;
            const visRow = ghostY + r - HIDDEN_ROWS;
            if (visRow >= 0) {
              this.drawGhostCell(
                ctx,
                (x + c) * this.cellSize,
                visRow * this.cellSize,
                this.cellSize,
                isOmegaBomb ? this.getRainbowColor((r + c) * 40) : color
              );
            }
          }
        }
      }

      const lockProg = engine.getLockProgress();
      const alpha = lockProg > 0 ? 1 - lockProg * 0.25 : 1;

      for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
          if (!matrix[r][c]) continue;
          const visRow = y + r - HIDDEN_ROWS;
          if (visRow >= 0) {
            if (isOmegaBomb) {
              this.drawOmegaCell(
                ctx,
                (x + c) * this.cellSize,
                visRow * this.cellSize,
                this.cellSize,
                this.getRainbowColor((r + c) * 45)
              );
            } else {
              this.drawCell(
                ctx,
                (x + c) * this.cellSize,
                visRow * this.cellSize,
                this.cellSize,
                color,
                alpha
              );
            }
          }
        }
      }
    }

    // 5x5 Omega Blast Crater Flash
    for (const bb of this.blastBoxes) {
      ctx.save();
      ctx.globalAlpha = bb.alpha;
      ctx.fillStyle = 'rgba(255, 230, 0, 0.55)';
      ctx.strokeStyle = '#ff0055';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#ffe600';
      ctx.shadowBlur = 24;
      ctx.fillRect(bb.x, bb.y, bb.w, bb.h);
      ctx.strokeRect(bb.x, bb.y, bb.w, bb.h);
      ctx.restore();
    }

    // Line clear laser row flashes
    for (const flash of this.flashRows) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, flash.alpha);
      ctx.shadowColor = flash.color;
      ctx.shadowBlur = 20;
      ctx.fillStyle = flash.color;
      ctx.fillRect(0, flash.row * this.cellSize - 2, W, this.cellSize + 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, flash.row * this.cellSize + 4, W, this.cellSize - 8);
      ctx.restore();
    }

    // Expanding Shockwaves
    for (const sw of this.shockwaves) {
      ctx.save();
      ctx.globalAlpha = sw.alpha;
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = sw.lineWidth;
      ctx.shadowColor = sw.color;
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Particles
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      ctx.restore();
    }

    // Full-board explosion flash
    if (this.screenFlashAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = this.screenFlashAlpha;
      ctx.fillStyle = this.screenFlashColor;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    // Floating Action Text (Normal Mode)
    for (const ft of this.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = ft.alpha;
      ctx.textAlign = 'center';
      ctx.font = `900 ${Math.round(18 * ft.scale)}px "Segoe UI", system-ui, sans-serif`;
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 14;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.lineWidth = 3.5;
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);

      if (ft.subText) {
        ctx.font = `800 12px "Segoe UI", system-ui, sans-serif`;
        ctx.strokeText(ft.subText, ft.x, ft.y + 20);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(ft.subText, ft.x, ft.y + 20);
      }
      ctx.restore();
    }

    ctx.restore();
  }

  private drawBlastTargetPreview(
    ctx: CanvasRenderingContext2D,
    minCol: number,
    maxCol: number,
    minRow: number,
    maxRow: number
  ): void {
    const x = minCol * this.cellSize;
    const y = minRow * this.cellSize;
    const w = (maxCol - minCol + 1) * this.cellSize;
    const h = (maxRow - minRow + 1) * this.cellSize;

    const pulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.012);

    ctx.save();
    ctx.fillStyle = `rgba(255, 50, 80, ${0.14 + pulse * 0.14})`;
    ctx.fillRect(x, y, w, h);

    ctx.strokeStyle = '#ffe600';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    ctx.setLineDash([]);

    ctx.font = '900 10px "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffe600';
    ctx.textAlign = 'center';
    ctx.fillText('🎯 5×5 BLAST AREA', x + w / 2, Math.max(12, y - 4));
    ctx.restore();
  }

  private drawOmegaCell(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    color: string
  ): void {
    ctx.save();
    const pad = 1;
    const bx = x + pad;
    const by = y + pad;
    const bw = size - pad * 2;
    const bh = size - pad * 2;

    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 5);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(bx + 4, by + 4, bw - 8, bh - 8, 3);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#070913';
    ctx.font = `900 ${Math.round(size * 0.45)}px "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', x + size / 2, y + size / 2 + 1);
    ctx.restore();
  }

  private drawCell(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    color: string,
    alpha: number = 1
  ): void {
    ctx.save();
    ctx.globalAlpha = alpha;

    const pad = this.theme.id === 'minimal' ? 2 : 1.2;
    const bx = x + pad;
    const by = y + pad;
    const bw = size - pad * 2;
    const bh = size - pad * 2;

    if (this.theme.glow) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, this.theme.rounded);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(7, 9, 19, 0.42)';
      ctx.beginPath();
      ctx.roundRect(bx + 3.5, by + 3.5, bw - 7, bh - 7, 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(bx + 1.5, by + 1.5, bw - 3, bh - 3, 3);
      ctx.stroke();
    } else if (this.theme.id === 'retro') {
      ctx.fillStyle = color;
      ctx.fillRect(bx, by, bw, bh);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.fillRect(bx, by, bw, 4);
      ctx.fillRect(bx, by, 4, bh);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(bx, by + bh - 4, bw, 4);
      ctx.fillRect(bx + bw - 4, by, 4, bh);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.fillRect(bx + 6, by + 6, 4, 4);
    } else {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, this.theme.rounded);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.24)';
      ctx.beginPath();
      ctx.roundRect(bx + 2, by + 2, bw - 4, (bh - 4) * 0.4, [4, 4, 2, 2]);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawGhostCell(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    color: string
  ): void {
    ctx.save();
    const pad = 2.5;
    const bx = x + pad;
    const by = y + pad;
    const bw = size - pad * 2;
    const bh = size - pad * 2;

    ctx.globalAlpha = this.theme.ghostAlpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, this.theme.rounded);
    ctx.fill();

    ctx.globalAlpha = Math.min(0.85, this.theme.ghostAlpha * 2.6);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, this.theme.rounded);
    ctx.stroke();
    ctx.restore();
  }

  private renderHold(holdType: TetrominoType | null, canHold: boolean): void {
    const ctx = this.holdCtx;
    const W = this.holdCanvas.width;
    const H = this.holdCanvas.height;

    ctx.clearRect(0, 0, W, H);
    if (!holdType) return;

    this.drawMiniPiece(
      ctx,
      holdType,
      W / 2,
      H / 2,
      24,
      canHold ? 1 : 0.38,
      false
    );
  }

  private renderNext(queue: TetrominoType[], nextIsOmega: boolean): void {
    const ctx = this.nextCtx;
    const W = this.nextCanvas.width;
    const H = this.nextCanvas.height;

    ctx.clearRect(0, 0, W, H);
    if (queue.length === 0) return;

    const accent =
      this.theme.id === 'minimal'
        ? '#2563eb'
        : this.theme.id === 'retro'
        ? '#9bbc0f'
        : this.theme.id === 'gold'
        ? '#ffd700'
        : this.theme.id === 'sakura'
        ? '#ff77bc'
        : '#00f3ff';

    const boxX = 8;
    const boxY = 6;
    const boxW = W - 16;
    const boxH = 82;

    ctx.save();
    ctx.fillStyle =
      this.theme.id === 'minimal'
        ? 'rgba(37, 99, 235, 0.07)'
        : 'rgba(0, 243, 255, 0.09)';
    ctx.strokeStyle = nextIsOmega ? '#ffe600' : accent;
    ctx.lineWidth = 2;
    if (this.theme.glow || nextIsOmega) {
      ctx.shadowColor = nextIsOmega ? '#ffe600' : accent;
      ctx.shadowBlur = 10;
    }
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = nextIsOmega ? '#ffe600' : accent;
    ctx.font = '900 10px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(nextIsOmega ? '★ OMEGA NEXT' : '▶ NEXT (次)', boxX + 8, boxY + 5);
    ctx.restore();

    this.drawMiniPiece(ctx, queue[0], W / 2, boxY + boxH / 2 + 6, 26, 1, nextIsOmega);

    const subCount = Math.min(3, queue.length - 1);
    const subStartY = boxY + boxH + 18;
    const subSlotH = (H - subStartY - 4) / 3;

    for (let i = 0; i < subCount; i++) {
      const type = queue[i + 1];
      const slotCenterY = subStartY + subSlotH * i + subSlotH / 2;

      const arrowY = subStartY + subSlotH * i - 6;
      this.drawUpArrow(
        ctx,
        W / 2,
        arrowY,
        i === 0 ? accent : 'rgba(148, 163, 184, 0.6)',
        i === 0
      );

      ctx.save();
      ctx.fillStyle =
        this.theme.id === 'minimal' ? '#64748b' : 'rgba(200, 220, 255, 0.5)';
      ctx.font = '700 10px "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${i + 2}.`, 12, slotCenterY);
      ctx.restore();

      const scaleAlpha = i === 0 ? 0.92 : i === 1 ? 0.78 : 0.65;
      const cellSz = i === 0 ? 17 : 15;
      this.drawMiniPiece(ctx, type, W / 2 + 6, slotCenterY, cellSz, scaleAlpha, false);
    }
  }

  private drawUpArrow(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    color: string,
    isPrimaryFlow: boolean
  ): void {
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    if (isPrimaryFlow && this.theme.glow) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
    }
    const w = isPrimaryFlow ? 7 : 5;
    const h = isPrimaryFlow ? 7 : 5;
    ctx.beginPath();
    ctx.moveTo(cx, cy - h / 2);
    ctx.lineTo(cx - w, cy + h / 2);
    ctx.lineTo(cx + w, cy + h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private drawMiniPiece(
    ctx: CanvasRenderingContext2D,
    type: TetrominoType,
    centerX: number,
    centerY: number,
    cellSize: number,
    alpha: number,
    isOmega: boolean
  ): void {
    const matrix = SHAPES[type];
    let minR = matrix.length;
    let maxR = 0;
    let minC = matrix[0].length;
    let maxC = 0;

    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c]) {
          minR = Math.min(minR, r);
          maxR = Math.max(maxR, r);
          minC = Math.min(minC, c);
          maxC = Math.max(maxC, c);
        }
      }
    }

    const pieceW = (maxC - minC + 1) * cellSize;
    const pieceH = (maxR - minR + 1) * cellSize;
    const startX = centerX - pieceW / 2;
    const startY = centerY - pieceH / 2;
    const color = this.theme.colors[type];

    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        if (matrix[r][c]) {
          const px = startX + (c - minC) * cellSize;
          const py = startY + (r - minR) * cellSize;
          if (isOmega) {
            this.drawOmegaCell(ctx, px, py, cellSize, this.getRainbowColor((r + c) * 45));
          } else {
            this.drawCell(ctx, px, py, cellSize, color, alpha);
          }
        }
      }
    }
  }
}
