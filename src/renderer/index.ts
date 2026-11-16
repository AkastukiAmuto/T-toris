import { SoundEngine } from './audio.js';
import { TetrisCpuAI } from './cpu.js';
import { TetrisEngine } from './engine.js';
import { NetBoardState, NetConnectionStatus, NetMessage, P2PClient } from './network.js';
import { GameRenderer } from './renderer.js';
import {
  AchievementFilter,
  AchievementId,
  ACHIEVEMENTS,
  BGM_TRACKS,
  BgmTrackId,
  CPU_LEVEL_CONFIGS,
  CpuLevel,
  DEFAULT_KEY_BINDINGS,
  formatKeyCode,
  GameMode,
  KEY_ACTION_LABELS,
  KeyAction,
  KeyBindings,
  ThemeId,
  THEMES,
} from './types.js';

interface PersistedSettings {
  theme?: ThemeId;
  mode?: GameMode;
  ghost?: boolean;
  keyBindings?: Partial<KeyBindings>;
  bgmVolume?: number;
  seVolume?: number;
  bgmEnabled?: boolean;
  seEnabled?: boolean;
  bgmTrack?: BgmTrackId;
  unlockedAchievements?: AchievementId[];
  highScoreNormal?: number;
  highScoreDopamine?: number;
}

declare global {
  interface Window {
    storageApi?: {
      loadSettings: () => Promise<PersistedSettings | null>;
      saveSettings: (data: PersistedSettings) => Promise<boolean>;
      getAppInfo?: () => Promise<{ version: string; githubRepo: string }>;
      launchUpdater?: () => Promise<{ ok: boolean; error?: string }>;
      shakeWindow?: (intensity: number, durationMs: number) => void;
    };
  }
}

const KEY_ACTION_ORDER: KeyAction[] = [
  'moveLeft',
  'moveRight',
  'softDrop',
  'hardDrop',
  'rotateCW',
  'rotateCCW',
  'hold',
  'pause',
  'restart',
];

class AppController {
  private engine: TetrisEngine;
  private renderer: GameRenderer;
  private sound: SoundEngine;

  // VS CPU Mode State & Instances
  private isVsCpuMode: boolean = false;
  private isVsSetupOpen: boolean = false;
  private pendingVsRule: GameMode = 'normal';
  private cpuLevel: CpuLevel = 3;
  private cpuEngine: TetrisEngine;
  private cpuRenderer: GameRenderer;
  private cpuAi: TetrisCpuAI;
  private vsPlayerWins: number = 0;
  private vsCpuWins: number = 0;
  private vsMatchEnded: boolean = false;

  // VS Online (P2P Invite Code) State & Instances
  private isVsOnlineMode: boolean = false;
  private isOnlineModalOpen: boolean = false;
  private pendingOnlineRule: GameMode = 'normal';
  private onlineStateTimer: number = 0;
  private onlineRematchRequested: boolean = false;
  private onlineDisconnected: boolean = false;
  private p2p: P2PClient;

  private currentTheme: ThemeId = 'neon';
  private currentMode: GameMode = 'normal';
  private keyBindings: KeyBindings = { ...DEFAULT_KEY_BINDINGS };
  private unlockedAchievements: Set<AchievementId> = new Set<AchievementId>(['default_unlock']);
  private currentAchFilter: AchievementFilter = 'all';
  private listeningAction: KeyAction | null = null;
  private isSettingsOpen: boolean = false;
  private isAchievementsOpen: boolean = false;
  private isOnOpeningScreen: boolean = true;
  private isOpeningLogoReady: boolean = false;
  private isOnHomeScreen: boolean = true;
  private openingTimers: number[] = [];
  private isPreviewingBgm: boolean = false;
  private previewingTrackId: BgmTrackId | null = null;
  private pausedBySettings: boolean = false;
  private saveStatusTimeout: number | null = null;
  private toastTimeout: number | null = null;

  // Per-session achievement counters
  private sessionHoldCount: number = 0;
  private sessionHardDropCount: number = 0;
  private sessionB2BCount: number = 0;
  private sessionOmegaCount: number = 0;

  private hasStarted: boolean = false;
  private lastTime: number = 0;

  // DAS / ARR state for smooth horizontal & soft-drop movement
  private moveDir: -1 | 0 | 1 = 0;
  private dasTimer: number = 0;
  private arrTimer: number = 0;
  private softDropHeld: boolean = false;
  private softDropTimer: number = 0;
  private restartKeyHeld: boolean = false;
  private restartHoldTimer: number = 0;
  private readonly DAS_MS = 140;
  private readonly ARR_MS = 35;
  private readonly SOFT_DROP_MS = 40;
  private readonly RESTART_HOLD_MS = 1000;

  // Opening Screen Elements & Live FX State
  private openingScreenEl!: HTMLElement;
  private openingCanvas!: HTMLCanvasElement;
  private openingCtx!: CanvasRenderingContext2D;
  private openingFlashEl!: HTMLElement;
  private openingBootBoxEl!: HTMLElement;
  private openingBootLinesEl!: HTMLElement;
  private openingBootBarEl!: HTMLElement;
  private openingLogoStageEl!: HTMLElement;
  private openingEnterBtn!: HTMLButtonElement;
  private openingSkipBtn!: HTMLButtonElement;
  private homeReplayOpBtn!: HTMLButtonElement;
  private homeVersionTagEl!: HTMLElement;
  private homeUpdateBtn!: HTMLButtonElement;

  private opParticles: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    alpha: number;
    life: number;
    maxLife: number;
  }> = [];
  private opRings: Array<{
    x: number;
    y: number;
    r: number;
    maxR: number;
    color: string;
    alpha: number;
    width: number;
  }> = [];
  private opFallingBlocks: Array<{
    x: number;
    y: number;
    vy: number;
    size: number;
    color: string;
    rot: number;
    vrot: number;
  }> = [];

  // Home Screen Elements
  private homeScreenEl!: HTMLElement;
  private appShellEl!: HTMLElement;
  private homeBtnNormal!: HTMLButtonElement;
  private homeBtnDopamine!: HTMLButtonElement;
  private homeBtnVsCpu!: HTMLButtonElement;
  private homeBtnVsOnline!: HTMLButtonElement;
  private homeBtnAchievements!: HTMLButtonElement;

  // VS Online Modal Elements
  private onlineModalEl!: HTMLElement;
  private closeOnlineBtn!: HTMLButtonElement;
  private cancelOnlineBtn!: HTMLButtonElement;
  private onlineStatusDotEl!: HTMLElement;
  private onlineStatusTextEl!: HTMLElement;
  private onlineTabHostBtn!: HTMLButtonElement;
  private onlineTabGuestBtn!: HTMLButtonElement;
  private onlinePanelHostEl!: HTMLElement;
  private onlinePanelGuestEl!: HTMLElement;
  private onlineRuleCards!: NodeListOf<HTMLButtonElement>;
  private hostCreateOfferBtn!: HTMLButtonElement;
  private hostCopyOfferBtn!: HTMLButtonElement;
  private hostOfferTextarea!: HTMLTextAreaElement;
  private hostAnswerInput!: HTMLTextAreaElement;
  private hostConnectBtn!: HTMLButtonElement;
  private guestOfferInput!: HTMLTextAreaElement;
  private guestCreateAnswerBtn!: HTMLButtonElement;
  private guestCopyAnswerBtn!: HTMLButtonElement;
  private guestAnswerTextarea!: HTMLTextAreaElement;

  // VS CPU Setup & Arena Elements
  private vsSetupModalEl!: HTMLElement;
  private closeVsSetupBtn!: HTMLButtonElement;
  private cancelVsSetupBtn!: HTMLButtonElement;
  private startVsBattleBtn!: HTMLButtonElement;
  private vsRuleCards!: NodeListOf<HTMLButtonElement>;
  private vsLevelCards!: NodeListOf<HTMLButtonElement>;
  private cpuLvBadgeEl!: HTMLElement;
  private cpuNameLabelEl!: HTMLElement;
  private cpuScoreLabelEl!: HTMLElement;
  private vsPlayerWinsEl!: HTMLElement;
  private vsCpuWinsEl!: HTMLElement;
  private garbageMeterPlayerFillEl!: HTMLElement;
  private garbageMeterPlayerCountEl!: HTMLElement;
  private garbageMeterCpuFillEl!: HTMLElement;
  private garbageMeterCpuCountEl!: HTMLElement;
  private homeBtnSettings!: HTMLButtonElement;
  private homeBtnQuit!: HTMLButtonElement;
  private homeHighScoreNormalEl!: HTMLElement;
  private homeHighScoreDopamineEl!: HTMLElement;
  private homeAchievementCountEl!: HTMLElement;
  private homeThemeNameEl!: HTMLElement;
  private homeBgmTitleEl!: HTMLElement;
  private homeBgmSubEl!: HTMLElement;
  private homeBgmPrevBtn!: HTMLButtonElement;
  private homeBgmNextBtn!: HTMLButtonElement;
  private homeBgmPreviewBtn!: HTMLButtonElement;
  private backHomeTopBtn!: HTMLButtonElement;
  private overlayHomeBtn!: HTMLButtonElement;

  // Achievement Toast & Modal Elements
  private achievementToastEl!: HTMLElement;
  private toastIconEl!: HTMLElement;
  private toastTitleEl!: HTMLElement;
  private toastRewardEl!: HTMLElement;
  private achievementsModalEl!: HTMLElement;
  private closeAchievementsBtn!: HTMLButtonElement;
  private doneAchievementsBtn!: HTMLButtonElement;
  private achievementsProgressTextEl!: HTMLElement;
  private achievementsCurrentBgmEl!: HTMLElement;
  private achievementsListEl!: HTMLElement;
  private achFilterBtns!: NodeListOf<HTMLButtonElement>;

  // Settings Modal BGM Switcher
  private modalBgmPrevBtn!: HTMLButtonElement;
  private modalBgmNextBtn!: HTMLButtonElement;
  private modalBgmTitleEl!: HTMLElement;

  // DOM Elements
  private scoreEl!: HTMLElement;
  private highScoreEl!: HTMLElement;
  private levelEl!: HTMLElement;
  private linesEl!: HTMLElement;
  private comboEl!: HTMLElement;
  private headerThemeNameEl!: HTMLElement;
  private boardFrameEl!: HTMLElement;

  // Overdrive / Dopamine UI Elements
  private multiplierEl!: HTMLElement;
  private gaugeFillEl!: HTMLElement;
  private gaugeTextEl!: HTMLElement;
  private overdriveStatusEl!: HTMLElement;

  private overlayEl!: HTMLElement;
  private overlayModeBadgeEl!: HTMLElement;
  private overlayTitleEl!: HTMLElement;
  private overlaySubEl!: HTMLElement;
  private startBtn!: HTMLButtonElement;
  private overlaySettingsBtn!: HTMLButtonElement;
  private restartHoldIndicatorEl!: HTMLElement;
  private restartHoldLabelEl!: HTMLElement;
  private restartHoldBarFillEl!: HTMLElement;

  private pauseBtn!: HTMLButtonElement;
  private restartBtn!: HTMLButtonElement;
  private ghostToggleBtn!: HTMLButtonElement;
  private modalGhostBtn!: HTMLButtonElement;
  private bgmToggleBtn!: HTMLButtonElement;
  private seToggleBtn!: HTMLButtonElement;
  private bgmSlider!: HTMLInputElement;
  private seSlider!: HTMLInputElement;

  // Settings Modal Elements
  private settingsModalEl!: HTMLElement;
  private openSettingsBtn!: HTMLButtonElement;
  private openSettingsSideBtn!: HTMLButtonElement;
  private editKeysShortcutBtn!: HTMLButtonElement;
  private closeSettingsBtn!: HTMLButtonElement;
  private saveSettingsOnlyBtn!: HTMLButtonElement;
  private doneSettingsBtn!: HTMLButtonElement;
  private saveStatusMsgEl!: HTMLElement;
  private resetKeysBtn!: HTMLButtonElement;
  private keybindListEl!: HTMLElement;
  private themeCards!: NodeListOf<HTMLButtonElement>;
  private modeButtons!: NodeListOf<HTMLButtonElement>;

  constructor() {
    const boardCanvas = document.getElementById('board-canvas') as HTMLCanvasElement;
    const holdCanvas = document.getElementById('hold-canvas') as HTMLCanvasElement;
    const nextCanvas = document.getElementById('next-canvas') as HTMLCanvasElement;

    const cpuBoardCanvas = document.getElementById('cpu-board-canvas') as HTMLCanvasElement;
    const cpuHoldCanvas = document.getElementById('cpu-hold-canvas') as HTMLCanvasElement;
    const cpuNextCanvas = document.getElementById('cpu-next-canvas') as HTMLCanvasElement;

    this.sound = new SoundEngine();
    this.renderer = new GameRenderer(boardCanvas, holdCanvas, nextCanvas);
    this.cpuRenderer = new GameRenderer(cpuBoardCanvas, cpuHoldCanvas, cpuNextCanvas, { isSecondary: true });
    this.cpuAi = new TetrisCpuAI();
    this.cpuAi.setLevel(this.cpuLevel);
    this.p2p = new P2PClient({
      onStatusChange: (status, detail) => this.handleNetStatusChange(status, detail),
      onMessage: (msg) => this.handleNetMessage(msg),
    });

    this.engine = new TetrisEngine({
      onHardDrop: (ev) => {
        this.sound.playHardDrop();
        this.renderer.triggerHardDropEffect(ev, this.currentMode === 'dopamine');
        if (this.isVsOnlineMode) {
          this.p2p.send({ type: 'fx_hard_drop', event: ev });
        }
        this.sessionHardDropCount++;
        if (this.sessionHardDropCount >= 25) {
          this.unlockAchievement('hard_dropper');
        }
        this.checkScoreAndLevelAchievements();
      },
      onPieceLock: (ev) => {
        this.sound.playLock();
        this.renderer.triggerPieceLockEffect(ev);
      },
      onGaugeMax: () => {
        this.sound.playGaugeMax();
        this.renderer.triggerGaugeMaxEffect();
      },
      onOmegaExplosion: (ev) => {
        this.sound.playOmegaExplosion();
        if (ev.levelUp) {
          this.sound.setLevel(this.engine.level);
        }
        this.renderer.triggerOmegaExplosionEffect(ev);
        if (this.isVsOnlineMode) {
          this.p2p.send({ type: 'fx_omega', event: ev });
        }
        this.sessionOmegaCount++;
        this.unlockAchievement('demolition_expert');
        if (this.sessionOmegaCount >= 3) {
          this.unlockAchievement('omega_triple');
        }
        this.checkScoreAndLevelAchievements();
      },
      onLineClear: (ev) => {
        this.sound.playLineClear(
          ev.clearedRows.length,
          ev.isTSpin,
          ev.combo,
          ev.isBackToBack
        );
        if (ev.levelUp) {
          this.sound.setLevel(this.engine.level);
          this.sound.playLevelUp();
        }
        this.renderer.triggerLineClearEffect(ev, this.currentMode === 'dopamine');
        if (this.isVsOnlineMode) {
          this.p2p.send({ type: 'fx_line_clear', event: ev });
        }

        if (ev.clearedRows.length >= 1) {
          this.unlockAchievement('first_line');
        }
        if (ev.clearedRows.length >= 4) {
          this.unlockAchievement('first_tetris');
          if (!this.renderer.isGhostVisible()) {
            this.unlockAchievement('no_ghost_clear');
          }
        }
        if (ev.combo >= 4) {
          this.unlockAchievement('combo_master');
        }
        if (ev.combo >= 7) {
          this.unlockAchievement('combo_god');
        }
        if (ev.isTSpin || ev.isBackToBack) {
          this.unlockAchievement('trick_spinner');
        }
        if (ev.isBackToBack) {
          this.sessionB2BCount++;
          if (this.sessionB2BCount >= 3) {
            this.unlockAchievement('b2b_chain');
          }
        }
        if (this.engine.lines >= 20) {
          this.unlockAchievement('demolition_expert');
        }
        this.checkScoreAndLevelAchievements();
      },
      onAttack: (lines) => {
        if (this.isVsCpuMode && !this.vsMatchEnded) {
          this.cpuEngine.receiveGarbage(lines);
          this.updateGarbageMetersUI();
        } else if (this.isVsOnlineMode && !this.vsMatchEnded) {
          this.p2p.send({ type: 'attack', lines });
          this.sendOnlineBoardState();
        }
      },
      onGameOver: () => {
        if (this.isVsCpuMode) {
          this.handleVsCpuLose();
          return;
        }
        if (this.isVsOnlineMode) {
          this.handleVsOnlineLose();
          return;
        }
        this.sound.stopBgm();
        this.sound.playGameOver();
        void this.persistAllSettings(false);
        this.showOverlay(
          'GAME OVER',
          `FINAL SCORE: ${this.engine.score.toLocaleString()}`,
          'PLAY AGAIN'
        );
      },
    });

    this.cpuEngine = new TetrisEngine({
      isCpu: true,
      onHardDrop: (ev) => {
        this.cpuRenderer.triggerHardDropEffect(ev, this.currentMode === 'dopamine');
      },
      onPieceLock: (ev) => {
        this.cpuRenderer.triggerPieceLockEffect(ev);
      },
      onOmegaExplosion: (ev) => {
        this.cpuRenderer.triggerOmegaExplosionEffect(ev);
      },
      onLineClear: (ev) => {
        this.cpuRenderer.triggerLineClearEffect(ev, this.currentMode === 'dopamine');
      },
      onAttack: (lines) => {
        if (this.isVsCpuMode && !this.vsMatchEnded) {
          this.engine.receiveGarbage(lines);
          this.updateGarbageMetersUI();
        }
      },
      onGameOver: () => {
        if (this.isVsCpuMode) {
          this.handleVsCpuWin();
        }
      },
    });

    this.bindDom();
    this.loadLocalPreferences();
    void this.loadDiskPreferences();
    void this.loadAppVersionAndCheckUpdates();
    this.renderKeybindRows();
    this.updateControlHintsUI();
    this.updateBgmUI();
    this.bindEvents();
    this.updateStatsUI();
    this.startOpeningSequence();

    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  private bindDom(): void {
    this.openingScreenEl = document.getElementById('opening-screen')!;
    this.openingCanvas = document.getElementById('opening-canvas') as HTMLCanvasElement;
    this.openingCtx = this.openingCanvas.getContext('2d')!;
    this.openingFlashEl = document.getElementById('opening-flash')!;
    this.openingBootBoxEl = document.getElementById('opening-boot-box')!;
    this.openingBootLinesEl = document.getElementById('opening-boot-lines')!;
    this.openingBootBarEl = document.getElementById('opening-boot-bar')!;
    this.openingLogoStageEl = document.getElementById('opening-logo-stage')!;
    this.openingEnterBtn = document.getElementById('opening-enter-btn') as HTMLButtonElement;
    this.openingSkipBtn = document.getElementById('opening-skip-btn') as HTMLButtonElement;
    this.homeReplayOpBtn = document.getElementById('home-replay-op-btn') as HTMLButtonElement;
    this.homeVersionTagEl = document.getElementById('home-version-tag')!;
    this.homeUpdateBtn = document.getElementById('home-update-btn') as HTMLButtonElement;

    this.homeScreenEl = document.getElementById('home-screen')!;
    this.appShellEl = document.getElementById('app-shell')!;
    this.homeBtnNormal = document.getElementById('home-btn-normal') as HTMLButtonElement;
    this.homeBtnDopamine = document.getElementById('home-btn-dopamine') as HTMLButtonElement;
    this.homeBtnVsCpu = document.getElementById('home-btn-vs-cpu') as HTMLButtonElement;
    this.homeBtnVsOnline = document.getElementById('home-btn-vs-online') as HTMLButtonElement;
    this.homeBtnAchievements = document.getElementById('home-btn-achievements') as HTMLButtonElement;

    this.onlineModalEl = document.getElementById('online-modal')!;
    this.closeOnlineBtn = document.getElementById('btn-close-online') as HTMLButtonElement;
    this.cancelOnlineBtn = document.getElementById('btn-cancel-online') as HTMLButtonElement;
    this.onlineStatusDotEl = document.getElementById('online-status-dot')!;
    this.onlineStatusTextEl = document.getElementById('online-status-text')!;
    this.onlineTabHostBtn = document.getElementById('online-tab-host') as HTMLButtonElement;
    this.onlineTabGuestBtn = document.getElementById('online-tab-guest') as HTMLButtonElement;
    this.onlinePanelHostEl = document.getElementById('online-panel-host')!;
    this.onlinePanelGuestEl = document.getElementById('online-panel-guest')!;
    this.onlineRuleCards = document.querySelectorAll('.online-rule-card');
    this.hostCreateOfferBtn = document.getElementById('btn-host-create-offer') as HTMLButtonElement;
    this.hostCopyOfferBtn = document.getElementById('btn-host-copy-offer') as HTMLButtonElement;
    this.hostOfferTextarea = document.getElementById('host-offer-textarea') as HTMLTextAreaElement;
    this.hostAnswerInput = document.getElementById('host-answer-input') as HTMLTextAreaElement;
    this.hostConnectBtn = document.getElementById('btn-host-connect') as HTMLButtonElement;
    this.guestOfferInput = document.getElementById('guest-offer-input') as HTMLTextAreaElement;
    this.guestCreateAnswerBtn = document.getElementById('btn-guest-create-answer') as HTMLButtonElement;
    this.guestCopyAnswerBtn = document.getElementById('btn-guest-copy-answer') as HTMLButtonElement;
    this.guestAnswerTextarea = document.getElementById('guest-answer-textarea') as HTMLTextAreaElement;

    this.vsSetupModalEl = document.getElementById('vs-setup-modal')!;
    this.closeVsSetupBtn = document.getElementById('btn-close-vs-setup') as HTMLButtonElement;
    this.cancelVsSetupBtn = document.getElementById('btn-cancel-vs-setup') as HTMLButtonElement;
    this.startVsBattleBtn = document.getElementById('btn-start-vs-battle') as HTMLButtonElement;
    this.vsRuleCards = document.querySelectorAll('.vs-rule-card');
    this.vsLevelCards = document.querySelectorAll('.vs-level-card');
    this.cpuLvBadgeEl = document.getElementById('cpu-lv-badge')!;
    this.cpuNameLabelEl = document.getElementById('cpu-name-label')!;
    this.cpuScoreLabelEl = document.getElementById('cpu-score-label')!;
    this.vsPlayerWinsEl = document.getElementById('vs-player-wins')!;
    this.vsCpuWinsEl = document.getElementById('vs-cpu-wins')!;
    this.garbageMeterPlayerFillEl = document.getElementById('garbage-meter-player-fill')!;
    this.garbageMeterPlayerCountEl = document.getElementById('garbage-meter-player-count')!;
    this.garbageMeterCpuFillEl = document.getElementById('garbage-meter-cpu-fill')!;
    this.garbageMeterCpuCountEl = document.getElementById('garbage-meter-cpu-count')!;
    this.homeBtnSettings = document.getElementById('home-btn-settings') as HTMLButtonElement;
    this.homeBtnQuit = document.getElementById('home-btn-quit') as HTMLButtonElement;
    this.homeHighScoreNormalEl = document.getElementById('home-highscore-normal')!;
    this.homeHighScoreDopamineEl = document.getElementById('home-highscore-dopamine')!;
    this.homeAchievementCountEl = document.getElementById('home-achievement-count')!;
    this.homeThemeNameEl = document.getElementById('home-theme-name')!;
    this.homeBgmTitleEl = document.getElementById('home-bgm-title')!;
    this.homeBgmSubEl = document.getElementById('home-bgm-sub')!;
    this.homeBgmPrevBtn = document.getElementById('home-bgm-prev') as HTMLButtonElement;
    this.homeBgmNextBtn = document.getElementById('home-bgm-next') as HTMLButtonElement;
    this.homeBgmPreviewBtn = document.getElementById('home-bgm-preview-btn') as HTMLButtonElement;
    this.backHomeTopBtn = document.getElementById('btn-back-home-top') as HTMLButtonElement;
    this.overlayHomeBtn = document.getElementById('overlay-home-btn') as HTMLButtonElement;

    this.achievementToastEl = document.getElementById('achievement-toast')!;
    this.toastIconEl = document.getElementById('toast-icon')!;
    this.toastTitleEl = document.getElementById('toast-title')!;
    this.toastRewardEl = document.getElementById('toast-reward')!;
    this.achievementsModalEl = document.getElementById('achievements-modal')!;
    this.closeAchievementsBtn = document.getElementById('btn-close-achievements') as HTMLButtonElement;
    this.doneAchievementsBtn = document.getElementById('btn-done-achievements') as HTMLButtonElement;
    this.achievementsProgressTextEl = document.getElementById('achievements-progress-text')!;
    this.achievementsCurrentBgmEl = document.getElementById('achievements-current-bgm')!;
    this.achievementsListEl = document.getElementById('achievements-list')!;
    this.achFilterBtns = document.querySelectorAll('.ach-filter-btn');

    this.modalBgmPrevBtn = document.getElementById('modal-bgm-prev') as HTMLButtonElement;
    this.modalBgmNextBtn = document.getElementById('modal-bgm-next') as HTMLButtonElement;
    this.modalBgmTitleEl = document.getElementById('modal-bgm-title')!;

    this.scoreEl = document.getElementById('stat-score')!;
    this.highScoreEl = document.getElementById('stat-highscore')!;
    this.levelEl = document.getElementById('stat-level')!;
    this.linesEl = document.getElementById('stat-lines')!;
    this.comboEl = document.getElementById('stat-combo')!;
    this.headerThemeNameEl = document.getElementById('header-theme-name')!;
    this.boardFrameEl = document.getElementById('board-frame')!;

    this.multiplierEl = document.getElementById('stat-multiplier')!;
    this.gaugeFillEl = document.getElementById('overdrive-gauge-fill')!;
    this.gaugeTextEl = document.getElementById('overdrive-gauge-text')!;
    this.overdriveStatusEl = document.getElementById('overdrive-status-text')!;

    this.overlayEl = document.getElementById('board-overlay')!;
    this.overlayModeBadgeEl = document.getElementById('overlay-mode-badge')!;
    this.overlayTitleEl = document.getElementById('overlay-title')!;
    this.overlaySubEl = document.getElementById('overlay-subtitle')!;
    this.startBtn = document.getElementById('overlay-action-btn') as HTMLButtonElement;
    this.overlaySettingsBtn = document.getElementById('overlay-settings-btn') as HTMLButtonElement;
    this.restartHoldIndicatorEl = document.getElementById('restart-hold-indicator')!;
    this.restartHoldLabelEl = document.getElementById('restart-hold-label')!;
    this.restartHoldBarFillEl = document.getElementById('restart-hold-bar-fill')!;

    this.pauseBtn = document.getElementById('btn-pause') as HTMLButtonElement;
    this.restartBtn = document.getElementById('btn-restart') as HTMLButtonElement;
    this.ghostToggleBtn = document.getElementById('btn-ghost') as HTMLButtonElement;
    this.modalGhostBtn = document.getElementById('modal-btn-ghost') as HTMLButtonElement;
    this.bgmToggleBtn = document.getElementById('btn-bgm') as HTMLButtonElement;
    this.seToggleBtn = document.getElementById('btn-se') as HTMLButtonElement;

    this.bgmSlider = document.getElementById('slider-bgm') as HTMLInputElement;
    this.seSlider = document.getElementById('slider-se') as HTMLInputElement;

    this.settingsModalEl = document.getElementById('settings-modal')!;
    this.openSettingsBtn = document.getElementById('btn-open-settings') as HTMLButtonElement;
    this.openSettingsSideBtn = document.getElementById('btn-open-settings-side') as HTMLButtonElement;
    this.editKeysShortcutBtn = document.getElementById('btn-edit-keys-shortcut') as HTMLButtonElement;
    this.closeSettingsBtn = document.getElementById('btn-close-settings') as HTMLButtonElement;
    this.saveSettingsOnlyBtn = document.getElementById('btn-save-settings-only') as HTMLButtonElement;
    this.doneSettingsBtn = document.getElementById('btn-done-settings') as HTMLButtonElement;
    this.saveStatusMsgEl = document.getElementById('save-status-msg')!;
    this.resetKeysBtn = document.getElementById('btn-reset-keys') as HTMLButtonElement;
    this.keybindListEl = document.getElementById('keybind-list')!;
    this.themeCards = document.querySelectorAll('.theme-card');
    this.modeButtons = document.querySelectorAll('.mode-btn');
  }

  private loadLocalPreferences(): void {
    const savedAch = localStorage.getItem('ttoris_achievements');
    if (savedAch) {
      try {
        const arr = JSON.parse(savedAch) as AchievementId[];
        if (Array.isArray(arr)) {
          arr.forEach((id) => this.unlockedAchievements.add(id));
        }
      } catch {
        // Ignore invalid JSON
      }
    }
    this.unlockedAchievements.add('default_unlock');
    this.updateThemeCardsUnlockState();

    const savedTheme = localStorage.getItem('ttoris_theme') as ThemeId | null;
    if (savedTheme && THEMES[savedTheme] && this.isThemeUnlocked(savedTheme)) {
      this.applyTheme(savedTheme, false);
    } else {
      this.applyTheme('neon', false);
    }

    const savedMode = localStorage.getItem('ttoris_mode') as GameMode | null;
    if (savedMode === 'normal' || savedMode === 'dopamine') {
      this.applyMode(savedMode, false, false);
    } else {
      this.applyMode('normal', false, false);
    }

    const savedGhost = localStorage.getItem('ttoris_ghost');
    if (savedGhost !== null) {
      this.renderer.setShowGhost(savedGhost === 'true');
    }
    this.updateGhostBtnUI();

    const savedKeys = localStorage.getItem('ttoris_keybindings');
    if (savedKeys) {
      try {
        const parsed = JSON.parse(savedKeys) as Partial<KeyBindings>;
        this.keyBindings = { ...DEFAULT_KEY_BINDINGS, ...parsed };
      } catch {
        this.keyBindings = { ...DEFAULT_KEY_BINDINGS };
      }
    }

    this.bgmSlider.value = String(Math.round(this.sound.getBgmVolume() * 100));
    this.seSlider.value = String(Math.round(this.sound.getSeVolume() * 100));
    this.updateAudioBtnUI();
  }

  private isNewerVersion(remote: string, current: string): boolean {
    const parse = (v: string) =>
      v
        .replace(/^v/i, '')
        .split('.')
        .map((n) => parseInt(n.replace(/\D/g, ''), 10) || 0);
    const r = parse(remote);
    const c = parse(current);
    const len = Math.max(r.length, c.length);
    for (let i = 0; i < len; i++) {
      const rv = r[i] || 0;
      const cv = c[i] || 0;
      if (rv !== cv) return rv > cv;
    }
    return false;
  }

  private async loadAppVersionAndCheckUpdates(): Promise<void> {
    if (!window.storageApi?.getAppInfo) return;
    try {
      const info = await window.storageApi.getAppInfo();
      const ver = info.version || '1.5.0';
      this.homeVersionTagEl.textContent = `T.E.T.R.I.S. OS // VER ${ver}`;

      if (!info.githubRepo) return;
      const res = await fetch(`https://api.github.com/repos/${info.githubRepo}/releases/latest`, {
        headers: { Accept: 'application/vnd.github+json' },
      });
      if (!res.ok) return;
      const data = (await res.json()) as { tag_name?: string };
      if (data.tag_name && this.isNewerVersion(data.tag_name, ver)) {
        const cleanTag = data.tag_name.replace(/^v/i, '');
        this.homeUpdateBtn.textContent = `🆕 v${cleanTag} 更新あり!`;
        this.homeUpdateBtn.classList.add('has-update');
      }
    } catch {
      // Offline or rate-limited: silently ignore
    }
  }

  private async loadDiskPreferences(): Promise<void> {
    if (!window.storageApi) return;
    try {
      const disk = await window.storageApi.loadSettings();
      if (!disk) return;

      if (Array.isArray(disk.unlockedAchievements)) {
        disk.unlockedAchievements.forEach((id) => this.unlockedAchievements.add(id));
      }
      this.unlockedAchievements.add('default_unlock');
      this.updateThemeCardsUnlockState();

      if (disk.bgmTrack && this.isBgmTrackUnlocked(disk.bgmTrack)) {
        this.sound.setBgmTrack(disk.bgmTrack);
      }

      if (disk.theme && THEMES[disk.theme] && this.isThemeUnlocked(disk.theme)) {
        this.applyTheme(disk.theme, false);
      }
      if (disk.mode && (disk.mode === 'normal' || disk.mode === 'dopamine')) {
        this.applyMode(disk.mode, false, false);
      }
      if (typeof disk.ghost === 'boolean') {
        this.renderer.setShowGhost(disk.ghost);
        this.updateGhostBtnUI();
      }
      if (disk.keyBindings) {
        this.keyBindings = { ...DEFAULT_KEY_BINDINGS, ...disk.keyBindings };
        this.renderKeybindRows();
        this.updateControlHintsUI();
      }
      if (typeof disk.bgmVolume === 'number') {
        this.sound.setBgmVolume(disk.bgmVolume);
        this.bgmSlider.value = String(Math.round(disk.bgmVolume * 100));
      }
      if (typeof disk.seVolume === 'number') {
        this.sound.setSeVolume(disk.seVolume);
        this.seSlider.value = String(Math.round(disk.seVolume * 100));
      }
      if (typeof disk.bgmEnabled === 'boolean' && disk.bgmEnabled !== this.sound.isBgmEnabled()) {
        this.sound.toggleBgm();
      }
      if (typeof disk.seEnabled === 'boolean' && disk.seEnabled !== this.sound.isSeEnabled()) {
        this.sound.toggleSe();
      }
      if (typeof disk.highScoreNormal === 'number') {
        this.engine.highScoreNormal = Math.max(this.engine.highScoreNormal, disk.highScoreNormal);
        if (disk.highScoreNormal >= 10000) this.unlockedAchievements.add('high_roller');
        if (disk.highScoreNormal >= 25000) this.unlockedAchievements.add('fever_addict');
        if (disk.highScoreNormal >= 50000) this.unlockedAchievements.add('legend_score');
      }
      if (typeof disk.highScoreDopamine === 'number') {
        this.engine.highScoreDopamine = Math.max(this.engine.highScoreDopamine, disk.highScoreDopamine);
        if (disk.highScoreDopamine >= 10000) this.unlockedAchievements.add('high_roller');
        if (disk.highScoreDopamine >= 25000) this.unlockedAchievements.add('fever_addict');
        if (disk.highScoreDopamine >= 50000) this.unlockedAchievements.add('legend_score');
      }

      this.updateThemeCardsUnlockState();
      this.updateAudioBtnUI();
      this.updateBgmUI();
      this.updateStatsUI();
    } catch (err) {
      console.error('Failed to load settings from disk:', err);
    }
  }

  private async persistAllSettings(showFeedback: boolean = true): Promise<void> {
    const achArray = Array.from(this.unlockedAchievements);
    localStorage.setItem('ttoris_theme', this.currentTheme);
    localStorage.setItem('ttoris_mode', this.currentMode);
    localStorage.setItem('ttoris_ghost', String(this.renderer.isGhostVisible()));
    localStorage.setItem('ttoris_keybindings', JSON.stringify(this.keyBindings));
    localStorage.setItem('ttoris_achievements', JSON.stringify(achArray));
    localStorage.setItem('ttoris_bgm_track', this.sound.getBgmTrack());

    const payload: PersistedSettings = {
      theme: this.currentTheme,
      mode: this.currentMode,
      ghost: this.renderer.isGhostVisible(),
      keyBindings: this.keyBindings,
      bgmVolume: this.sound.getBgmVolume(),
      seVolume: this.sound.getSeVolume(),
      bgmEnabled: this.sound.isBgmEnabled(),
      seEnabled: this.sound.isSeEnabled(),
      bgmTrack: this.sound.getBgmTrack(),
      unlockedAchievements: achArray,
      highScoreNormal: this.engine.highScoreNormal,
      highScoreDopamine: this.engine.highScoreDopamine,
    };

    if (window.storageApi) {
      await window.storageApi.saveSettings(payload);
    }

    if (showFeedback) {
      this.showSaveFeedback('✔ 設定を保存しました！');
    }
  }

  private showSaveFeedback(msg: string): void {
    this.saveStatusMsgEl.textContent = msg;
    this.saveStatusMsgEl.classList.add('visible');
    if (this.saveStatusTimeout !== null) {
      window.clearTimeout(this.saveStatusTimeout);
    }
    this.saveStatusTimeout = window.setTimeout(() => {
      this.saveStatusMsgEl.classList.remove('visible');
    }, 2400);
  }

  private applyMode(mode: GameMode, restartIfPlaying: boolean = true, persist: boolean = true): void {
    this.currentMode = mode;
    document.body.setAttribute('data-mode', mode);
    this.engine.setMode(mode);
    this.sound.setMode(mode);

    this.modeButtons.forEach((btn) => {
      const m = btn.getAttribute('data-mode-target');
      btn.classList.toggle('active', m === mode);
    });

    this.overlayModeBadgeEl.textContent =
      mode === 'dopamine' ? '⚡ DOPAMINE OVERDRIVE MODE' : '🎯 NORMAL MODE';

    if (persist) {
      void this.persistAllSettings(false);
    }

    if (restartIfPlaying && this.hasStarted) {
      this.startNewGame();
    } else {
      this.updateStatsUI();
    }
  }

  private isThemeUnlocked(themeId: ThemeId): boolean {
    if (themeId === 'gold') return this.unlockedAchievements.has('fever_addict');
    if (themeId === 'sakura') return this.unlockedAchievements.has('speed_demon');
    return true;
  }

  private updateThemeCardsUnlockState(): void {
    const goldCard = document.getElementById('theme-card-gold');
    if (goldCard) {
      const unlocked = this.isThemeUnlocked('gold');
      goldCard.classList.toggle('locked-theme', !unlocked);
      const sub = goldCard.querySelector('.theme-sub');
      if (sub) {
        sub.textContent = unlocked ? 'Luxury Gold Edition (解放済)' : '🔒 実績「OVERDRIVE FEVER」で解放';
      }
    }
    const sakuraCard = document.getElementById('theme-card-sakura');
    if (sakuraCard) {
      const unlocked = this.isThemeUnlocked('sakura');
      sakuraCard.classList.toggle('locked-theme', !unlocked);
      const sub = sakuraCard.querySelector('.theme-sub');
      if (sub) {
        sub.textContent = unlocked ? 'Neon Sakura Blossom (解放済)' : '🔒 実績「SPEED DEMON」で解放';
      }
    }
  }

  private applyTheme(themeId: ThemeId, persist: boolean = true): void {
    if (!this.isThemeUnlocked(themeId)) {
      this.showSaveFeedback('🔒 このテーマは実績解除で解放されます！');
      return;
    }
    this.currentTheme = themeId;
    document.body.setAttribute('data-theme', themeId);
    this.renderer.setTheme(themeId);
    this.sound.setTheme(themeId);

    this.headerThemeNameEl.textContent = `THEME: ${THEMES[themeId].name}`;
    this.homeThemeNameEl.textContent = THEMES[themeId].name;

    this.themeCards.forEach((card) => {
      const t = card.getAttribute('data-theme-target');
      card.classList.toggle('active', t === themeId);
    });

    if (this.isAchievementsOpen) {
      this.renderAchievementsList();
    }

    if (persist) {
      void this.persistAllSettings(true);
    }
  }

  private isBgmTrackUnlocked(trackId: BgmTrackId): boolean {
    const def = BGM_TRACKS.find((t) => t.id === trackId);
    if (!def) return false;
    return this.unlockedAchievements.has(def.achievementId);
  }

  private getUnlockedBgmTracks(): BgmTrackId[] {
    return BGM_TRACKS.filter((t) => this.unlockedAchievements.has(t.achievementId)).map((t) => t.id);
  }

  private cycleUnlockedBgm(dir: -1 | 1): void {
    const unlocked = this.getUnlockedBgmTracks();
    if (unlocked.length <= 1) {
      this.sound.playMove();
      return;
    }
    const curr = this.sound.getBgmTrack();
    let idx = unlocked.indexOf(curr);
    if (idx === -1) idx = 0;
    const nextIdx = (idx + dir + unlocked.length) % unlocked.length;
    this.selectBgmTrack(unlocked[nextIdx], this.isPreviewingBgm);
  }

  private selectBgmTrack(trackId: BgmTrackId, restartPreviewIfPlaying: boolean = false): void {
    if (!this.isBgmTrackUnlocked(trackId)) return;
    this.sound.setBgmTrack(trackId);
    this.sound.playMove();

    if (restartPreviewIfPlaying || (this.hasStarted && !this.engine.isPaused && !this.engine.isGameOver)) {
      this.sound.stopBgm();
      this.sound.startBgm(true);
    }

    this.updateBgmUI();
    if (this.isAchievementsOpen) {
      this.renderAchievementsList();
    }
    void this.persistAllSettings(false);
  }

  private toggleHomePreviewBgm(targetTrackId?: BgmTrackId): void {
    const trackToPlay = targetTrackId || this.sound.getBgmTrack();
    if (this.isPreviewingBgm && (!targetTrackId || this.previewingTrackId === trackToPlay)) {
      this.isPreviewingBgm = false;
      this.previewingTrackId = null;
      this.sound.stopBgm();
    } else {
      this.sound.setBgmTrack(trackToPlay);
      this.isPreviewingBgm = true;
      this.previewingTrackId = trackToPlay;
      this.sound.stopBgm();
      this.sound.startBgm(true);
    }
    this.updateBgmUI();
    if (this.isAchievementsOpen) {
      this.renderAchievementsList();
    }
  }

  private updateBgmUI(): void {
    const currId = this.sound.getBgmTrack();
    const def = BGM_TRACKS.find((t) => t.id === currId) || BGM_TRACKS[0];

    this.homeBgmTitleEl.textContent = def.title;
    this.homeBgmSubEl.textContent = def.subtitle;
    this.modalBgmTitleEl.textContent = def.title;
    this.achievementsCurrentBgmEl.textContent = def.title;

    const unlockedCount = this.unlockedAchievements.size;
    const totalCount = ACHIEVEMENTS.length;
    this.homeAchievementCountEl.textContent = `${unlockedCount} / ${totalCount}`;
    this.achievementsProgressTextEl.textContent = `${unlockedCount} / ${totalCount} UNLOCKED`;

    this.homeBgmPreviewBtn.textContent = this.isPreviewingBgm ? '⏹ 停止' : '▶ 試聴';
    this.homeBgmPreviewBtn.classList.toggle('playing', this.isPreviewingBgm);
  }

  private checkScoreAndLevelAchievements(): void {
    if (this.engine.level >= 5) {
      this.unlockAchievement('speed_demon');
    }
    if (this.engine.score >= 10000) {
      this.unlockAchievement('high_roller');
    }
    if (
      (this.currentMode === 'dopamine' && this.engine.dopamineMultiplier >= 4) ||
      this.engine.score >= 25000
    ) {
      this.unlockAchievement('fever_addict');
    }
    if (this.engine.score >= 50000) {
      this.unlockAchievement('legend_score');
    }
  }

  private unlockAchievement(id: AchievementId): void {
    if (this.unlockedAchievements.has(id)) return;
    this.unlockedAchievements.add(id);

    const ach = ACHIEVEMENTS.find((a) => a.id === id);
    if (!ach) return;

    this.sound.playAchievementUnlock();
    let rewardMsg = '🏆 実績トロフィー獲得！';
    if (ach.rewardType === 'bgm' && ach.rewardBgmTitle) {
      rewardMsg = `🎵 新BGM解放: ${ach.rewardBgmTitle}`;
    } else if (ach.rewardType === 'theme' && ach.rewardThemeTitle) {
      rewardMsg = `🎨 新テーマ解放: ${ach.rewardThemeTitle}`;
    }
    this.showAchievementToast(ach.icon, ach.title, rewardMsg);
    this.updateThemeCardsUnlockState();
    this.updateBgmUI();
    void this.persistAllSettings(false);
  }

  private showAchievementToast(icon: string, title: string, rewardText: string): void {
    this.toastIconEl.textContent = icon;
    this.toastTitleEl.textContent = title;
    this.toastRewardEl.textContent = rewardText;
    this.achievementToastEl.classList.remove('hidden');

    if (this.toastTimeout !== null) {
      window.clearTimeout(this.toastTimeout);
    }
    this.toastTimeout = window.setTimeout(() => {
      this.achievementToastEl.classList.add('hidden');
    }, 4200);
  }

  private openAchievementsModal(): void {
    this.isAchievementsOpen = true;
    this.renderAchievementsList();
    this.updateBgmUI();
    this.achievementsModalEl.classList.remove('hidden');
  }

  private closeAchievementsModal(): void {
    this.isAchievementsOpen = false;
    if (this.isPreviewingBgm) {
      this.isPreviewingBgm = false;
      this.previewingTrackId = null;
      this.sound.stopBgm();
    }
    this.updateBgmUI();
    this.achievementsModalEl.classList.add('hidden');
  }

  private renderAchievementsList(): void {
    this.achievementsListEl.innerHTML = '';
    const currentBgm = this.sound.getBgmTrack();

    const filtered = ACHIEVEMENTS.filter((ach) => {
      if (this.currentAchFilter === 'reward') return ach.rewardType !== 'none';
      if (this.currentAchFilter === 'trophy') return ach.rewardType === 'none';
      return true;
    });

    for (const ach of filtered) {
      const unlocked = this.unlockedAchievements.has(ach.id);
      const isSelectedBgm = ach.rewardType === 'bgm' && currentBgm === ach.rewardBgmId;
      const isSelectedTheme = ach.rewardType === 'theme' && this.currentTheme === ach.rewardThemeId;
      const isPreviewingThis =
        ach.rewardType === 'bgm' && this.isPreviewingBgm && this.previewingTrackId === ach.rewardBgmId;

      const card = document.createElement('div');
      card.className = `achievement-card ${unlocked ? 'unlocked' : 'locked'} ${
        isSelectedBgm || isSelectedTheme ? 'active-bgm' : ''
      }`;

      const left = document.createElement('div');
      left.className = 'ach-left';

      const icon = document.createElement('div');
      icon.className = 'ach-icon';
      icon.textContent = unlocked ? ach.icon : '🔒';

      const info = document.createElement('div');
      info.className = 'ach-info';

      const titleRow = document.createElement('div');
      titleRow.className = 'ach-title-row';

      const titleEl = document.createElement('span');
      titleEl.className = 'ach-title';
      titleEl.textContent = ach.title;

      const statusPill = document.createElement('span');
      statusPill.className = `ach-status-pill ${unlocked ? 'unlocked' : 'locked'}`;
      statusPill.textContent = unlocked ? 'UNLOCKED' : 'LOCKED';

      titleRow.appendChild(titleEl);
      titleRow.appendChild(statusPill);

      const condEl = document.createElement('span');
      condEl.className = 'ach-condition';
      condEl.textContent = `条件: ${ach.conditionText}`;

      const rewardEl = document.createElement('span');
      rewardEl.className = `ach-reward ${ach.rewardType === 'none' ? 'trophy-only' : ''}`;
      if (ach.rewardType === 'bgm') {
        rewardEl.textContent = unlocked
          ? `🎵 解放BGM: ${ach.rewardBgmTitle}`
          : `🔒 報酬BGM: ${ach.rewardBgmTitle}（未解放）`;
      } else if (ach.rewardType === 'theme') {
        rewardEl.textContent = unlocked
          ? `🎨 解放テーマ: ${ach.rewardThemeTitle}`
          : `🔒 報酬テーマ: ${ach.rewardThemeTitle}（未解放）`;
      } else {
        rewardEl.textContent = unlocked
          ? '🏆 トロフィー実績（達成済み・報酬なし）'
          : '🏆 トロフィー実績（達成記念・報酬なし）';
      }

      info.appendChild(titleRow);
      info.appendChild(condEl);
      info.appendChild(rewardEl);

      left.appendChild(icon);
      left.appendChild(info);

      const actions = document.createElement('div');
      actions.className = 'ach-actions';

      if (ach.rewardType === 'bgm' && ach.rewardBgmId) {
        const bgmId = ach.rewardBgmId;
        const previewBtn = document.createElement('button');
        previewBtn.className = `ach-btn ${isPreviewingThis ? 'selected' : ''}`;
        previewBtn.disabled = !unlocked;
        previewBtn.textContent = isPreviewingThis ? '⏹ 停止' : '▶ 試聴';
        previewBtn.addEventListener('click', () => {
          this.toggleHomePreviewBgm(bgmId);
        });

        const selectBtn = document.createElement('button');
        selectBtn.className = `ach-btn ${isSelectedBgm ? 'selected' : ''}`;
        selectBtn.disabled = !unlocked;
        selectBtn.textContent = isSelectedBgm ? '✔ 設定中' : '🎵 BGM設定';
        selectBtn.addEventListener('click', () => {
          this.selectBgmTrack(bgmId, false);
        });

        actions.appendChild(previewBtn);
        actions.appendChild(selectBtn);
      } else if (ach.rewardType === 'theme' && ach.rewardThemeId) {
        const themeId = ach.rewardThemeId;
        const themeBtn = document.createElement('button');
        themeBtn.className = `ach-btn ${isSelectedTheme ? 'selected' : ''}`;
        themeBtn.disabled = !unlocked;
        themeBtn.textContent = isSelectedTheme ? '✔ テーマ適用中' : '🎨 テーマ適用';
        themeBtn.addEventListener('click', () => {
          this.applyTheme(themeId, true);
          this.sound.playMove();
          this.renderAchievementsList();
        });
        actions.appendChild(themeBtn);
      } else {
        const badge = document.createElement('span');
        badge.className = 'ach-trophy-badge';
        badge.textContent = unlocked ? '🏆 EARNED' : '🔒 CHALLENGE';
        actions.appendChild(badge);
      }

      card.appendChild(left);
      card.appendChild(actions);
      this.achievementsListEl.appendChild(card);
    }
  }

  private renderKeybindRows(): void {
    this.keybindListEl.innerHTML = '';

    for (const action of KEY_ACTION_ORDER) {
      const row = document.createElement('div');
      row.className = 'keybind-row';

      const label = document.createElement('span');
      label.className = 'keybind-label';
      label.textContent = KEY_ACTION_LABELS[action];

      const btn = document.createElement('button');
      btn.className = 'keybind-btn';
      btn.setAttribute('data-key-action', action);

      if (this.listeningAction === action) {
        btn.classList.add('listening');
        btn.textContent = 'キーを入力...';
      } else {
        btn.textContent = formatKeyCode(this.keyBindings[action]);
      }

      btn.addEventListener('click', () => {
        if (this.listeningAction === action) {
          this.listeningAction = null;
        } else {
          this.listeningAction = action;
        }
        this.renderKeybindRows();
      });

      row.appendChild(label);
      row.appendChild(btn);
      this.keybindListEl.appendChild(row);
    }
  }

  private updateControlHintsUI(): void {
    for (const action of KEY_ACTION_ORDER) {
      const el = document.getElementById(`kbd-${action}`);
      if (el) {
        el.textContent = formatKeyCode(this.keyBindings[action]);
      }
    }
    const holdHint = document.getElementById('hint-hold-key');
    if (holdHint) {
      holdHint.textContent = formatKeyCode(this.keyBindings.hold);
    }
    this.updatePauseBtnLabel();
  }

  private updatePauseBtnLabel(): void {
    const pKey = formatKeyCode(this.keyBindings.pause);
    const rKey = formatKeyCode(this.keyBindings.restart);
    this.pauseBtn.textContent = this.engine.isPaused
      ? `RESUME (${pKey})`
      : `PAUSE (${pKey})`;
    this.restartBtn.textContent = `RESTART (${rKey}長押し)`;
  }

  private cancelRestartHold(): void {
    this.restartKeyHeld = false;
    this.restartHoldTimer = 0;
    this.restartHoldBarFillEl.style.width = '0%';
    this.restartHoldIndicatorEl.classList.add('hidden');
  }

  private openSettings(): void {
    this.cancelRestartHold();
    this.isSettingsOpen = true;
    this.listeningAction = null;
    this.renderKeybindRows();
    this.settingsModalEl.classList.remove('hidden');

    if (this.hasStarted && !this.engine.isGameOver && !this.engine.isPaused) {
      this.pausedBySettings = true;
      this.togglePause();
    } else {
      this.pausedBySettings = false;
    }
  }

  private closeSettings(): void {
    this.listeningAction = null;
    this.isSettingsOpen = false;
    void this.persistAllSettings(false);
    this.settingsModalEl.classList.add('hidden');

    if (this.pausedBySettings && this.engine.isPaused) {
      this.pausedBySettings = false;
      this.togglePause();
    }
  }

  private toggleGhost(): void {
    const nextState = !this.renderer.isGhostVisible();
    this.renderer.setShowGhost(nextState);
    this.updateGhostBtnUI();
    void this.persistAllSettings(true);
  }

  private clearOpeningTimers(): void {
    for (const id of this.openingTimers) {
      window.clearTimeout(id);
    }
    this.openingTimers = [];
  }

  private triggerOpeningFlash(): void {
    this.openingFlashEl.classList.add('active');
    const tid = window.setTimeout(() => {
      this.openingFlashEl.classList.remove('active');
    }, 60);
    this.openingTimers.push(tid);
  }

  private spawnOpeningSupernova(cx: number, cy: number, count: number = 140): void {
    const colors = ['#00f0ff', '#ff2afc', '#ffe600', '#00ff66', '#ff1e56', '#ffffff', '#ff8800'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 14;
      this.opParticles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.2,
        size: 3 + Math.random() * 7,
        color: colors[i % colors.length],
        alpha: 1,
        life: 0,
        maxLife: 45 + Math.random() * 55,
      });
    }

    const ringColors = ['#00f0ff', '#ff2afc', '#ffe600'];
    ringColors.forEach((col, idx) => {
      this.opRings.push({
        x: cx,
        y: cy,
        r: 15 + idx * 25,
        maxR: 620 + idx * 140,
        color: col,
        alpha: 1,
        width: 8 - idx * 2,
      });
    });
  }

  private initOpeningCanvasBlocks(): void {
    this.openingCanvas.width = window.innerWidth || 1280;
    this.openingCanvas.height = window.innerHeight || 860;
    this.opParticles = [];
    this.opRings = [];
    this.opFallingBlocks = [];

    const colors = ['#00f0ff', '#c800ff', '#ffe600', '#00ff66', '#ff1e56', '#3b5bff', '#ff8800'];
    for (let i = 0; i < 36; i++) {
      this.opFallingBlocks.push({
        x: Math.random() * this.openingCanvas.width,
        y: Math.random() * this.openingCanvas.height,
        vy: 1.8 + Math.random() * 4.5,
        size: 14 + Math.random() * 22,
        color: colors[i % colors.length],
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.06,
      });
    }
  }

  private updateAndRenderOpeningCanvas(dtMs: number): void {
    const ctx = this.openingCtx;
    const w = this.openingCanvas.width;
    const h = this.openingCanvas.height;
    const dtScale = dtMs / 16.67;

    ctx.clearRect(0, 0, w, h);

    // 1. Falling neon tetromino blocks & vertical laser trails
    for (const b of this.opFallingBlocks) {
      b.y += b.vy * dtScale;
      b.rot += b.vrot * dtScale;
      if (b.y > h + 50) {
        b.y = -40;
        b.x = Math.random() * w;
      }

      // Laser trail
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x - 1.5, b.y - b.size * 3.2, 3, b.size * 3.2);

      // Rotating neon block
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rot);
      ctx.globalAlpha = 0.42;
      ctx.fillStyle = b.color;
      ctx.fillRect(-b.size / 2, -b.size / 2, b.size, b.size);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-b.size / 2, -b.size / 2, b.size, b.size);
      ctx.restore();
    }

    // 2. Ambient rising sparks while on Logo stage
    if (this.isOpeningLogoReady && Math.random() < 0.55) {
      const colors = ['#00f0ff', '#ff2afc', '#ffe600', '#00ff66'];
      this.opParticles.push({
        x: Math.random() * w,
        y: h + 10,
        vx: (Math.random() - 0.5) * 1.8,
        vy: -2.2 - Math.random() * 4.2,
        size: 3 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 0.9,
        life: 0,
        maxLife: 65 + Math.random() * 45,
      });
    }

    // 3. Expanding shockwave rings
    for (let i = this.opRings.length - 1; i >= 0; i--) {
      const ring = this.opRings[i];
      ring.r += (ring.maxR - ring.r) * 0.08 * dtScale + 4 * dtScale;
      ring.alpha = Math.max(0, 1 - ring.r / ring.maxR);
      if (ring.alpha <= 0.02) {
        this.opRings.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = ring.alpha * 0.85;
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = ring.width;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 4. Supernova & spark particles
    for (let i = this.opParticles.length - 1; i >= 0; i--) {
      const p = this.opParticles[i];
      p.life += dtScale;
      if (p.life >= p.maxLife) {
        this.opParticles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dtScale;
      p.y += p.vy * dtScale;
      p.vx *= 0.985;
      p.vy += 0.08 * dtScale;
      const ratio = 1 - p.life / p.maxLife;
      ctx.globalAlpha = ratio * p.alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  private startOpeningSequence(): void {
    this.clearOpeningTimers();
    this.isOnOpeningScreen = true;
    this.isOpeningLogoReady = false;
    this.initOpeningCanvasBlocks();

    if (this.isPreviewingBgm) {
      this.isPreviewingBgm = false;
      this.previewingTrackId = null;
      this.sound.stopBgm();
      this.updateBgmUI();
    }

    this.openingBootLinesEl.innerHTML = '';
    this.openingBootBarEl.style.width = '0%';
    this.openingBootBoxEl.classList.remove('hidden');
    this.openingLogoStageEl.classList.add('hidden');
    this.openingSkipBtn.classList.remove('hidden');
    this.openingScreenEl.classList.remove('hidden', 'fade-out');

    const bootEntries: Array<{ delay: number; pct: number; initial: string; rest: string; status: string }> = [
      { delay: 140, pct: 16, initial: 'T', rest: 'actical      // 7-BAG SRS & MATRIX KERNEL', status: 'OK' },
      { delay: 360, pct: 33, initial: 'E', rest: 'xecution     // 60FPS HYPER-PARTICLE GPU', status: 'ACTIVE' },
      { delay: 580, pct: 50, initial: 'T', rest: 'etrad        // T-SPIN & HARD DROP CORE', status: 'READY' },
      { delay: 800, pct: 67, initial: 'R', rest: 'esonance     // DOPAMINE 5x5 OMEGA DRIVE', status: 'CHARGED' },
      { delay: 1020, pct: 84, initial: 'I', rest: 'nterface     // P2P & VS-CPU NEURAL LINK', status: 'LINKED' },
      { delay: 1240, pct: 100, initial: 'S', rest: 'ystem        // ALL MODULES SYNCHRONIZED', status: 'ONLINE' },
    ];

    bootEntries.forEach((entry, idx) => {
      const tid = window.setTimeout(() => {
        if (!this.isOnOpeningScreen || this.isOpeningLogoReady) return;
        const row = document.createElement('div');
        row.className = 'boot-line acro-line';
        row.innerHTML = `<span class="acro-word"><span class="acro-init">${entry.initial}</span><span class="acro-rest">${entry.rest}</span></span><span class="boot-ok">[ ${entry.status} ]</span>`;
        this.openingBootLinesEl.appendChild(row);
        this.openingBootBarEl.style.width = `${entry.pct}%`;
        this.sound.playBootTick(idx);
      }, entry.delay);
      this.openingTimers.push(tid);
    });

    // Phase 2: Reveal Explosive Logo Stage & Wait for User Button Press
    const stageTimer = window.setTimeout(() => {
      this.showOpeningLogoStage();
    }, 1650);
    this.openingTimers.push(stageTimer);
  }

  private showOpeningLogoStage(): void {
    if (!this.isOnOpeningScreen || this.isOpeningLogoReady) return;
    this.clearOpeningTimers();
    this.isOpeningLogoReady = true;

    this.openingBootBoxEl.classList.add('hidden');
    this.openingSkipBtn.classList.add('hidden');
    this.openingLogoStageEl.classList.remove('hidden');

    // Re-trigger CSS animations on .op-mino elements
    const minos = this.openingLogoStageEl.querySelectorAll('.op-mino');
    minos.forEach((el) => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.animation = 'none';
      void htmlEl.offsetWidth;
      htmlEl.style.animation = '';
    });

    // Trigger screen flash + massive supernova explosion + fanfare!
    this.triggerOpeningFlash();
    this.spawnOpeningSupernova(this.openingCanvas.width / 2, this.openingCanvas.height / 2, 160);
    this.sound.playOpeningJingle();
  }

  private finishOpeningSequence(): void {
    if (!this.isOnOpeningScreen) return;
    this.isOnOpeningScreen = false;
    this.isOpeningLogoReady = false;
    this.clearOpeningTimers();

    this.triggerOpeningFlash();
    this.sound.playOpeningStartConfirm();

    this.openingScreenEl.classList.add('fade-out');
    const hideTimer = window.setTimeout(() => {
      this.openingScreenEl.classList.add('hidden');
    }, 520);
    this.openingTimers.push(hideTimer);
  }

  private enterGameFromHome(mode: GameMode, isVsCpu: boolean = false, isVsOnline: boolean = false): void {
    this.isOnHomeScreen = false;
    this.isVsCpuMode = isVsCpu;
    this.isVsOnlineMode = isVsOnline;
    this.onlineDisconnected = false;
    this.onlineRematchRequested = false;
    document.body.classList.toggle('vs-cpu-active', isVsCpu || isVsOnline);
    this.isPreviewingBgm = false;
    this.previewingTrackId = null;
    this.sound.stopBgm();
    this.updateBgmUI();

    this.homeScreenEl.classList.add('hidden');
    this.appShellEl.classList.remove('hidden');

    // Recalculate board layout coordinates once app-shell is visible
    window.dispatchEvent(new Event('resize'));

    this.sound.playHold();
    this.applyMode(mode, false, true);
    this.startNewGame();
  }

  private returnToHome(): void {
    this.sound.stopBgm();
    this.sound.playMove();
    this.hasStarted = false;
    this.isVsCpuMode = false;
    if (this.isVsOnlineMode) {
      this.isVsOnlineMode = false;
      this.p2p.close(false);
    }
    this.vsMatchEnded = false;
    this.onlineDisconnected = false;
    this.onlineRematchRequested = false;
    document.body.classList.remove('vs-cpu-active');
    this.engine.isPaused = false;
    this.cpuEngine.isPaused = true;
    this.isOnHomeScreen = true;
    this.isPreviewingBgm = false;
    this.previewingTrackId = null;
    this.moveDir = 0;
    this.softDropHeld = false;
    this.cancelRestartHold();

    this.hideOverlay();
    this.appShellEl.classList.add('hidden');
    this.homeScreenEl.classList.remove('hidden');

    void this.persistAllSettings(false);
    this.updateBgmUI();
    this.updateStatsUI();
  }

  private openOnlineModal(): void {
    this.isOnlineModalOpen = true;
    this.setOnlineTab('host');
    this.hostOfferTextarea.value = '';
    this.hostAnswerInput.value = '';
    this.guestOfferInput.value = '';
    this.guestAnswerTextarea.value = '';
    this.hostCopyOfferBtn.disabled = true;
    this.hostConnectBtn.disabled = true;
    this.guestCopyAnswerBtn.disabled = true;
    this.onlineRuleCards.forEach((c) => {
      c.classList.toggle('active', c.getAttribute('data-online-rule') === this.pendingOnlineRule);
    });
    this.handleNetStatusChange('idle', '役割を選択してください（部屋を作る / 参加する）');
    this.onlineModalEl.classList.remove('hidden');
  }

  private closeOnlineModal(): void {
    this.isOnlineModalOpen = false;
    this.onlineModalEl.classList.add('hidden');
    if (!this.isVsOnlineMode) {
      this.p2p.close(false);
    }
  }

  private setOnlineTab(tab: 'host' | 'guest'): void {
    this.onlineTabHostBtn.classList.toggle('active', tab === 'host');
    this.onlineTabGuestBtn.classList.toggle('active', tab === 'guest');
    this.onlinePanelHostEl.classList.toggle('hidden', tab !== 'host');
    this.onlinePanelGuestEl.classList.toggle('hidden', tab !== 'guest');
  }

  private handleNetStatusChange(status: NetConnectionStatus, detail?: string): void {
    this.onlineStatusDotEl.className = 'online-status-dot';
    if (status === 'gathering' || status === 'waiting_answer' || status === 'waiting_connect') {
      this.onlineStatusDotEl.classList.add('busy');
    } else if (status === 'connected') {
      this.onlineStatusDotEl.classList.add('connected');
    } else if (status === 'error' || status === 'disconnected') {
      this.onlineStatusDotEl.classList.add('error');
    }

    if (detail) {
      this.onlineStatusTextEl.textContent = detail;
    }

    if (status === 'connected') {
      if (this.isOnlineModalOpen) {
        this.closeOnlineModal();
      }
      this.vsPlayerWins = 0;
      this.vsCpuWins = 0;
      if (this.p2p.getRole() === 'host') {
        this.p2p.send({ type: 'start', mode: this.pendingOnlineRule });
        this.startOnlineMatch(this.pendingOnlineRule);
      } else {
        // Guest waits briefly for host's 'start' packet (or starts immediately if needed)
        this.enterGameFromHome('normal', false, true);
        this.engine.isPaused = true;
        this.showOverlay('CONNECTED!', 'ホストの開始信号を待機中...', 'WAIT');
      }
    } else if (status === 'disconnected' && this.isVsOnlineMode) {
      this.onlineDisconnected = true;
      this.vsMatchEnded = true;
      this.engine.isPaused = true;
      this.sound.stopBgm();
      this.showOverlay('DISCONNECTED', '相手との通信が切断されました', 'BACK TO HOME');
    }
  }

  private handleNetMessage(msg: NetMessage): void {
    switch (msg.type) {
      case 'start':
        this.startOnlineMatch(msg.mode);
        break;
      case 'state':
        this.applyRemoteBoardState(msg.state);
        break;
      case 'attack':
        if (this.isVsOnlineMode && !this.vsMatchEnded) {
          this.engine.receiveGarbage(msg.lines);
          this.updateGarbageMetersUI();
        }
        break;
      case 'fx_hard_drop':
        if (this.isVsOnlineMode) {
          this.cpuRenderer.triggerHardDropEffect(msg.event, this.currentMode === 'dopamine');
        }
        break;
      case 'fx_line_clear':
        if (this.isVsOnlineMode) {
          this.cpuRenderer.triggerLineClearEffect(msg.event, this.currentMode === 'dopamine');
        }
        break;
      case 'fx_omega':
        if (this.isVsOnlineMode) {
          this.cpuRenderer.triggerOmegaExplosionEffect(msg.event);
        }
        break;
      case 'gameover':
        if (this.isVsOnlineMode) {
          this.handleVsOnlineWin();
        }
        break;
      case 'rematch_request':
        if (this.isVsOnlineMode && this.vsMatchEnded && !this.onlineDisconnected) {
          if (this.onlineRematchRequested && this.p2p.getRole() === 'host') {
            this.p2p.send({ type: 'rematch_accept', mode: this.currentMode });
            this.startOnlineMatch(this.currentMode);
          } else {
            this.showOverlay('REMATCH REQUEST!', '相手が再戦を希望しています！', 'ACCEPT REMATCH');
          }
        }
        break;
      case 'rematch_accept':
        if (this.isVsOnlineMode) {
          this.startOnlineMatch(msg.mode);
        }
        break;
    }
  }

  private startOnlineMatch(mode: GameMode): void {
    this.onlineDisconnected = false;
    this.onlineRematchRequested = false;
    if (this.isOnHomeScreen) {
      this.enterGameFromHome(mode, false, true);
    } else {
      this.isVsOnlineMode = true;
      this.isVsCpuMode = false;
      document.body.classList.add('vs-cpu-active');
      this.applyMode(mode, false, true);
      this.startNewGame();
    }
    this.sendOnlineBoardState();
  }

  private sendOnlineBoardState(): void {
    if (!this.isVsOnlineMode || !this.p2p.isConnected()) return;
    const state: NetBoardState = {
      board: this.engine.board,
      activePiece: this.engine.activePiece,
      holdPiece: this.engine.holdPiece,
      nextQueue: this.engine.nextQueue.slice(0, 4),
      score: this.engine.score,
      lines: this.engine.lines,
      level: this.engine.level,
      pendingGarbage: this.engine.pendingGarbage,
      overdriveGauge: this.engine.overdriveGauge,
      omegaReady: this.engine.omegaReady,
    };
    this.p2p.send({ type: 'state', state });
  }

  private applyRemoteBoardState(state: NetBoardState): void {
    if (!this.isVsOnlineMode) return;
    this.cpuEngine.board = state.board;
    this.cpuEngine.activePiece = state.activePiece;
    this.cpuEngine.holdPiece = state.holdPiece;
    this.cpuEngine.nextQueue = state.nextQueue;
    this.cpuEngine.score = state.score;
    this.cpuEngine.lines = state.lines;
    this.cpuEngine.level = state.level;
    this.cpuEngine.pendingGarbage = state.pendingGarbage;
    this.cpuEngine.overdriveGauge = state.overdriveGauge;
    this.cpuEngine.omegaReady = state.omegaReady;
    this.updateVsScoreboardUI();
    this.updateGarbageMetersUI();
  }

  private handleVsOnlineWin(): void {
    if (this.vsMatchEnded) return;
    this.vsMatchEnded = true;
    this.onlineRematchRequested = false;
    this.vsPlayerWins++;
    this.engine.isPaused = true;
    this.sound.stopBgm();
    this.sound.playLevelUp();
    this.updateVsScoreboardUI();
    this.showOverlay('YOU WIN!!', 'オンライン対戦に勝利しました！', 'REMATCH');
  }

  private handleVsOnlineLose(): void {
    if (this.vsMatchEnded) return;
    this.vsMatchEnded = true;
    this.onlineRematchRequested = false;
    this.vsCpuWins++;
    this.p2p.send({ type: 'gameover' });
    this.sound.stopBgm();
    this.sound.playGameOver();
    this.updateVsScoreboardUI();
    this.showOverlay('YOU LOSE...', 'オンライン対戦に敗北…', 'REMATCH');
  }

  private requestOnlineRematch(): void {
    if (this.onlineDisconnected || !this.p2p.isConnected()) {
      this.returnToHome();
      return;
    }
    this.onlineRematchRequested = true;
    this.p2p.send({ type: 'rematch_request' });
    this.showOverlay('WAITING...', '相手の再戦応答を待っています...', 'CANCEL');
  }

  private openVsSetupModal(): void {
    this.isVsSetupOpen = true;
    this.vsRuleCards.forEach((c) => {
      c.classList.toggle('active', c.getAttribute('data-vs-rule') === this.pendingVsRule);
    });
    this.vsLevelCards.forEach((c) => {
      c.classList.toggle('active', Number(c.getAttribute('data-cpu-level')) === this.cpuLevel);
    });
    this.vsSetupModalEl.classList.remove('hidden');
  }

  private closeVsSetupModal(): void {
    this.isVsSetupOpen = false;
    this.vsSetupModalEl.classList.add('hidden');
  }

  private updateVsScoreboardUI(): void {
    if (this.isVsOnlineMode) {
      this.cpuLvBadgeEl.textContent = 'P2P';
      this.cpuNameLabelEl.textContent = 'ONLINE OPPONENT';
    } else {
      const cfg = CPU_LEVEL_CONFIGS[this.cpuLevel];
      this.cpuLvBadgeEl.textContent = `LV.${this.cpuLevel}`;
      this.cpuNameLabelEl.textContent = cfg.name;
    }
    this.cpuScoreLabelEl.textContent = `SCORE: ${this.cpuEngine.score.toLocaleString()} / LINES: ${this.cpuEngine.lines}`;
    this.vsPlayerWinsEl.textContent = String(this.vsPlayerWins);
    this.vsCpuWinsEl.textContent = String(this.vsCpuWins);
  }

  private updateGarbageMetersUI(): void {
    const pGarb = this.engine.pendingGarbage;
    const cGarb = this.cpuEngine.pendingGarbage;
    const pPct = Math.min(100, (pGarb / 12) * 100);
    const cPct = Math.min(100, (cGarb / 12) * 100);
    this.garbageMeterPlayerFillEl.style.height = `${pPct}%`;
    this.garbageMeterPlayerCountEl.textContent = pGarb > 0 ? String(pGarb) : '';
    this.garbageMeterCpuFillEl.style.height = `${cPct}%`;
    this.garbageMeterCpuCountEl.textContent = cGarb > 0 ? String(cGarb) : '';
  }

  private handleVsCpuWin(): void {
    if (this.vsMatchEnded) return;
    this.vsMatchEnded = true;
    this.vsPlayerWins++;
    this.engine.isPaused = true;
    this.cpuEngine.isPaused = true;
    this.sound.stopBgm();
    this.sound.playLevelUp();

    if (this.cpuLevel >= 3) {
      this.unlockAchievement('cpu_challenger');
    }
    if (this.cpuLevel === 5) {
      this.unlockAchievement('demon_slayer');
    }

    void this.persistAllSettings(false);
    this.updateVsScoreboardUI();
    const cfg = CPU_LEVEL_CONFIGS[this.cpuLevel];
    this.showOverlay(
      'YOU WIN!!',
      `VS ${cfg.name} (LV.${this.cpuLevel}) 撃破！`,
      'REMATCH'
    );
  }

  private handleVsCpuLose(): void {
    if (this.vsMatchEnded) return;
    this.vsMatchEnded = true;
    this.vsCpuWins++;
    this.cpuEngine.isPaused = true;
    this.sound.stopBgm();
    this.sound.playGameOver();

    void this.persistAllSettings(false);
    this.updateVsScoreboardUI();
    const cfg = CPU_LEVEL_CONFIGS[this.cpuLevel];
    this.showOverlay(
      'YOU LOSE...',
      `${cfg.name} (LV.${this.cpuLevel}) に敗北…`,
      'REMATCH'
    );
  }

  private bindEvents(): void {
    this.openingEnterBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.finishOpeningSequence();
    });

    this.openingSkipBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showOpeningLogoStage();
    });

    this.openingScreenEl.addEventListener('click', (e) => {
      if (!this.isOnOpeningScreen) return;
      if (!this.isOpeningLogoReady) {
        this.showOpeningLogoStage();
      } else {
        // Clicking background on the Logo stage spawns an extra firework burst!
        this.spawnOpeningSupernova(e.clientX, e.clientY, 55);
        this.sound.playRotate();
      }
    });

    this.homeReplayOpBtn.addEventListener('click', () => {
      this.startOpeningSequence();
      this.homeReplayOpBtn.blur();
    });

    this.homeUpdateBtn.addEventListener('click', async () => {
      this.sound.playHold();
      this.homeUpdateBtn.blur();
      if (!window.storageApi?.launchUpdater) {
        alert('アップデーター起動機能が利用できません。');
        return;
      }
      const res = await window.storageApi.launchUpdater();
      if (!res.ok) {
        alert(res.error || 'T-TORIS-Updater.exe の起動に失敗しました。');
      }
    });

    this.homeBtnNormal.addEventListener('click', () => {
      this.enterGameFromHome('normal');
      this.homeBtnNormal.blur();
    });

    this.homeBtnDopamine.addEventListener('click', () => {
      this.enterGameFromHome('dopamine', false);
      this.homeBtnDopamine.blur();
    });

    this.homeBtnVsCpu.addEventListener('click', () => {
      this.sound.playMove();
      this.openVsSetupModal();
      this.homeBtnVsCpu.blur();
    });

    this.closeVsSetupBtn.addEventListener('click', () => this.closeVsSetupModal());
    this.cancelVsSetupBtn.addEventListener('click', () => this.closeVsSetupModal());
    this.vsSetupModalEl.addEventListener('click', (e) => {
      if (e.target === this.vsSetupModalEl) {
        this.closeVsSetupModal();
      }
    });

    this.vsRuleCards.forEach((card) => {
      card.addEventListener('click', () => {
        const rule = (card.getAttribute('data-vs-rule') as GameMode) || 'normal';
        this.pendingVsRule = rule;
        this.sound.playMove();
        this.vsRuleCards.forEach((c) => c.classList.toggle('active', c === card));
      });
    });

    this.vsLevelCards.forEach((card) => {
      card.addEventListener('click', () => {
        const lv = Number(card.getAttribute('data-cpu-level')) as CpuLevel;
        if (lv >= 1 && lv <= 5) {
          this.cpuLevel = lv;
          this.sound.playMove();
          this.vsLevelCards.forEach((c) => c.classList.toggle('active', c === card));
        }
      });
    });

    this.startVsBattleBtn.addEventListener('click', () => {
      this.closeVsSetupModal();
      this.vsPlayerWins = 0;
      this.vsCpuWins = 0;
      this.enterGameFromHome(this.pendingVsRule, true, false);
      this.startVsBattleBtn.blur();
    });

    this.homeBtnVsOnline.addEventListener('click', () => {
      this.sound.playMove();
      this.openOnlineModal();
      this.homeBtnVsOnline.blur();
    });

    this.closeOnlineBtn.addEventListener('click', () => this.closeOnlineModal());
    this.cancelOnlineBtn.addEventListener('click', () => this.closeOnlineModal());
    this.onlineModalEl.addEventListener('click', (e) => {
      if (e.target === this.onlineModalEl) {
        this.closeOnlineModal();
      }
    });

    this.onlineTabHostBtn.addEventListener('click', () => {
      this.sound.playMove();
      this.setOnlineTab('host');
    });
    this.onlineTabGuestBtn.addEventListener('click', () => {
      this.sound.playMove();
      this.setOnlineTab('guest');
    });

    this.onlineRuleCards.forEach((card) => {
      card.addEventListener('click', () => {
        const rule = (card.getAttribute('data-online-rule') as GameMode) || 'normal';
        this.pendingOnlineRule = rule;
        this.sound.playMove();
        this.onlineRuleCards.forEach((c) => c.classList.toggle('active', c === card));
      });
    });

    this.hostCreateOfferBtn.addEventListener('click', async () => {
      try {
        this.hostCreateOfferBtn.disabled = true;
        this.hostOfferTextarea.value = '';
        const code = await this.p2p.createHostOffer();
        this.hostOfferTextarea.value = code;
        this.hostCopyOfferBtn.disabled = false;
        this.hostConnectBtn.disabled = false;
        this.sound.playHold();
      } catch (err) {
        this.handleNetStatusChange('error', (err as Error).message || '招待コード生成に失敗しました');
      } finally {
        this.hostCreateOfferBtn.disabled = false;
      }
    });

    this.hostCopyOfferBtn.addEventListener('click', async () => {
      if (!this.hostOfferTextarea.value) return;
      await navigator.clipboard.writeText(this.hostOfferTextarea.value);
      this.sound.playRotate();
      this.hostCopyOfferBtn.textContent = '✔ コピー完了';
      setTimeout(() => {
        this.hostCopyOfferBtn.textContent = '📋 コピー';
      }, 1500);
    });

    this.hostConnectBtn.addEventListener('click', async () => {
      try {
        this.hostConnectBtn.disabled = true;
        await this.p2p.acceptGuestAnswer(this.hostAnswerInput.value);
        this.sound.playHold();
      } catch (err) {
        this.handleNetStatusChange('error', (err as Error).message || '接続に失敗しました');
        this.hostConnectBtn.disabled = false;
      }
    });

    this.guestCreateAnswerBtn.addEventListener('click', async () => {
      try {
        this.guestCreateAnswerBtn.disabled = true;
        this.guestAnswerTextarea.value = '';
        const answerCode = await this.p2p.acceptHostOffer(this.guestOfferInput.value);
        this.guestAnswerTextarea.value = answerCode;
        this.guestCopyAnswerBtn.disabled = false;
        this.sound.playHold();
      } catch (err) {
        this.handleNetStatusChange('error', (err as Error).message || '参加コードの生成に失敗しました');
      } finally {
        this.guestCreateAnswerBtn.disabled = false;
      }
    });

    this.guestCopyAnswerBtn.addEventListener('click', async () => {
      if (!this.guestAnswerTextarea.value) return;
      await navigator.clipboard.writeText(this.guestAnswerTextarea.value);
      this.sound.playRotate();
      this.guestCopyAnswerBtn.textContent = '✔ コピー完了';
      setTimeout(() => {
        this.guestCopyAnswerBtn.textContent = '📋 参加コードをコピー';
      }, 1500);
    });

    this.homeBtnAchievements.addEventListener('click', () => {
      this.sound.playMove();
      this.openAchievementsModal();
      this.homeBtnAchievements.blur();
    });

    this.homeBtnSettings.addEventListener('click', () => {
      this.sound.playMove();
      this.openSettings();
      this.homeBtnSettings.blur();
    });

    this.homeBtnQuit.addEventListener('click', () => {
      void this.persistAllSettings(false).finally(() => {
        window.close();
      });
    });

    this.homeBgmPrevBtn.addEventListener('click', () => {
      this.cycleUnlockedBgm(-1);
      this.homeBgmPrevBtn.blur();
    });

    this.homeBgmNextBtn.addEventListener('click', () => {
      this.cycleUnlockedBgm(1);
      this.homeBgmNextBtn.blur();
    });

    this.homeBgmPreviewBtn.addEventListener('click', () => {
      this.toggleHomePreviewBgm();
      this.homeBgmPreviewBtn.blur();
    });

    this.modalBgmPrevBtn.addEventListener('click', () => {
      this.cycleUnlockedBgm(-1);
      this.modalBgmPrevBtn.blur();
    });

    this.modalBgmNextBtn.addEventListener('click', () => {
      this.cycleUnlockedBgm(1);
      this.modalBgmNextBtn.blur();
    });

    this.closeAchievementsBtn.addEventListener('click', () => this.closeAchievementsModal());
    this.doneAchievementsBtn.addEventListener('click', () => this.closeAchievementsModal());
    this.achievementsModalEl.addEventListener('click', (e) => {
      if (e.target === this.achievementsModalEl) {
        this.closeAchievementsModal();
      }
    });

    this.achFilterBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const filter = (btn.getAttribute('data-ach-filter') as AchievementFilter) || 'all';
        this.currentAchFilter = filter;
        this.achFilterBtns.forEach((b) => {
          b.classList.toggle('active', b.getAttribute('data-ach-filter') === filter);
        });
        this.sound.playMove();
        this.renderAchievementsList();
      });
    });

    this.backHomeTopBtn.addEventListener('click', () => {
      this.returnToHome();
      this.backHomeTopBtn.blur();
    });

    this.overlayHomeBtn.addEventListener('click', () => {
      this.returnToHome();
      this.overlayHomeBtn.blur();
    });

    this.modeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-mode-target') as GameMode;
        if (target && target !== this.currentMode) {
          this.sound.playHold();
          this.applyMode(target, true, true);
        }
        btn.blur();
      });
    });

    this.openSettingsBtn.addEventListener('click', () => {
      this.openSettings();
      this.openSettingsBtn.blur();
    });
    this.openSettingsSideBtn.addEventListener('click', () => {
      this.openSettings();
      this.openSettingsSideBtn.blur();
    });
    this.overlaySettingsBtn.addEventListener('click', () => {
      this.openSettings();
      this.overlaySettingsBtn.blur();
    });
    this.editKeysShortcutBtn.addEventListener('click', () => {
      this.openSettings();
      this.editKeysShortcutBtn.blur();
    });

    this.closeSettingsBtn.addEventListener('click', () => this.closeSettings());
    this.saveSettingsOnlyBtn.addEventListener('click', () => {
      void this.persistAllSettings(true);
      this.sound.playHold();
    });
    this.doneSettingsBtn.addEventListener('click', () => {
      void this.persistAllSettings(true);
      this.closeSettings();
    });

    this.settingsModalEl.addEventListener('click', (e) => {
      if (e.target === this.settingsModalEl) {
        this.closeSettings();
      }
    });

    this.themeCards.forEach((card) => {
      card.addEventListener('click', () => {
        const target = card.getAttribute('data-theme-target') as ThemeId;
        if (target) {
          this.applyTheme(target, true);
          this.sound.playMove();
        }
      });
    });

    this.resetKeysBtn.addEventListener('click', () => {
      this.keyBindings = { ...DEFAULT_KEY_BINDINGS };
      this.listeningAction = null;
      this.renderKeybindRows();
      this.updateControlHintsUI();
      void this.persistAllSettings(true);
      this.sound.playHold();
    });

    this.startBtn.addEventListener('click', () => {
      this.handlePrimaryOverlayAction();
      this.startBtn.blur();
    });

    this.pauseBtn.addEventListener('click', () => {
      this.togglePause();
      this.pauseBtn.blur();
    });

    this.restartBtn.addEventListener('click', () => {
      this.startNewGame();
      this.restartBtn.blur();
    });

    this.ghostToggleBtn.addEventListener('click', () => {
      this.toggleGhost();
      this.ghostToggleBtn.blur();
    });

    this.modalGhostBtn.addEventListener('click', () => {
      this.toggleGhost();
      this.modalGhostBtn.blur();
    });

    this.bgmToggleBtn.addEventListener('click', () => {
      const enabled = this.sound.toggleBgm();
      if (enabled && this.hasStarted && !this.engine.isPaused && !this.engine.isGameOver) {
        this.sound.startBgm();
      }
      this.updateAudioBtnUI();
      void this.persistAllSettings(true);
      this.bgmToggleBtn.blur();
    });

    this.seToggleBtn.addEventListener('click', () => {
      this.sound.toggleSe();
      this.updateAudioBtnUI();
      void this.persistAllSettings(true);
      this.seToggleBtn.blur();
    });

    this.bgmSlider.addEventListener('input', () => {
      this.sound.setBgmVolume(parseInt(this.bgmSlider.value, 10) / 100);
      void this.persistAllSettings(false);
    });

    this.seSlider.addEventListener('input', () => {
      this.sound.setSeVolume(parseInt(this.seSlider.value, 10) / 100);
      void this.persistAllSettings(false);
    });

    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
  }

  private updateGhostBtnUI(): void {
    const on = this.renderer.isGhostVisible();
    this.ghostToggleBtn.textContent = on ? 'GHOST: ON' : 'GHOST: OFF';
    this.ghostToggleBtn.classList.toggle('btn-active', on);
    this.modalGhostBtn.textContent = on ? 'ON' : 'OFF';
    this.modalGhostBtn.classList.toggle('btn-active', on);
  }

  private updateAudioBtnUI(): void {
    const bgmOn = this.sound.isBgmEnabled();
    const seOn = this.sound.isSeEnabled();
    this.bgmToggleBtn.textContent = bgmOn ? 'BGM: ON' : 'BGM: MUTE';
    this.bgmToggleBtn.classList.toggle('btn-active', bgmOn);
    this.seToggleBtn.textContent = seOn ? 'SE: ON' : 'SE: MUTE';
    this.seToggleBtn.classList.toggle('btn-active', seOn);
  }

  private handlePrimaryOverlayAction(): void {
    if (this.isVsOnlineMode) {
      if (this.onlineDisconnected) {
        this.returnToHome();
        return;
      }
      if (this.vsMatchEnded) {
        if (this.onlineRematchRequested) {
          this.returnToHome();
        } else {
          this.requestOnlineRematch();
        }
      }
      return;
    }
    if (!this.hasStarted || this.engine.isGameOver || this.vsMatchEnded) {
      this.startNewGame();
    } else if (this.engine.isPaused) {
      this.togglePause();
    }
  }

  public startNewGame(): void {
    this.cancelRestartHold();
    this.hasStarted = true;
    this.vsMatchEnded = false;
    this.sessionHoldCount = 0;
    this.sessionHardDropCount = 0;
    this.sessionB2BCount = 0;
    this.sessionOmegaCount = 0;
    this.engine.reset();
    if (this.isVsCpuMode || this.isVsOnlineMode) {
      this.cpuEngine.setMode(this.currentMode);
      this.cpuEngine.reset();
      if (this.isVsCpuMode) {
        this.cpuAi.setLevel(this.cpuLevel);
        this.cpuAi.reset();
      }
      this.updateVsScoreboardUI();
      this.updateGarbageMetersUI();
    }
    this.sound.setLevel(1);
    this.hideOverlay();
    this.updatePauseBtnLabel();
    this.sound.startBgm(true);
    this.updateStatsUI();
  }

  public togglePause(): void {
    if (this.isVsOnlineMode) return;
    if (!this.hasStarted || this.engine.isGameOver || this.vsMatchEnded) return;
    this.engine.isPaused = !this.engine.isPaused;
    if (this.isVsCpuMode) {
      this.cpuEngine.isPaused = this.engine.isPaused;
    }
    this.updatePauseBtnLabel();
    if (this.engine.isPaused) {
      this.sound.stopBgm();
      const pKey = formatKeyCode(this.keyBindings.pause);
      this.showOverlay('PAUSED', `PRESS ${pKey} OR CLICK BELOW TO RESUME`, 'RESUME');
    } else {
      this.hideOverlay();
      this.sound.startBgm();
    }
  }

  private showOverlay(title: string, subtitle: string, btnLabel: string): void {
    this.overlayTitleEl.textContent = title;
    this.overlaySubEl.textContent = subtitle;
    this.startBtn.textContent = btnLabel;
    this.overlayEl.classList.remove('hidden');
  }

  private hideOverlay(): void {
    this.overlayEl.classList.add('hidden');
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (this.isOnOpeningScreen) {
      if (!e.repeat) {
        e.preventDefault();
        if (!this.isOpeningLogoReady) {
          this.showOpeningLogoStage();
        } else if (e.code === 'Enter' || e.code === 'Space') {
          this.finishOpeningSequence();
        } else {
          this.spawnOpeningSupernova(
            Math.random() * this.openingCanvas.width,
            Math.random() * this.openingCanvas.height,
            45
          );
          this.sound.playRotate();
        }
      }
      return;
    }

    if (this.isAchievementsOpen) {
      if (e.code === 'Escape' && !e.repeat) {
        e.preventDefault();
        this.closeAchievementsModal();
      }
      return;
    }

    if (this.isSettingsOpen) {
      e.preventDefault();
      if (this.listeningAction) {
        if (e.code === 'Escape') {
          this.listeningAction = null;
          this.renderKeybindRows();
          return;
        }

        const newCode = e.code;
        const targetAction = this.listeningAction;
        const prevCode = this.keyBindings[targetAction];

        for (const act of KEY_ACTION_ORDER) {
          if (act !== targetAction && this.keyBindings[act] === newCode) {
            this.keyBindings[act] = prevCode;
          }
        }

        this.keyBindings[targetAction] = newCode;
        this.listeningAction = null;
        this.renderKeybindRows();
        this.updateControlHintsUI();
        void this.persistAllSettings(true);
        this.sound.playRotate();
        return;
      }

      if (e.code === 'Escape' && !e.repeat) {
        this.closeSettings();
      }
      return;
    }

    if (this.isOnlineModalOpen) {
      if (e.code === 'Escape' && !e.repeat) {
        this.closeOnlineModal();
      }
      return;
    }

    if (this.isVsSetupOpen) {
      if (e.code === 'Escape' && !e.repeat) {
        this.closeVsSetupModal();
      }
      return;
    }

    if (this.isOnHomeScreen) {
      return;
    }

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }

    const kb = this.keyBindings;

    if ((e.code === kb.pause || e.code === 'Escape') && !e.repeat) {
      this.togglePause();
      return;
    }

    if (e.code === kb.restart && !e.repeat) {
      if (this.isVsOnlineMode) return;
      if (!this.hasStarted || this.engine.isGameOver || this.vsMatchEnded) {
        this.startNewGame();
      } else {
        this.restartKeyHeld = true;
        this.restartHoldTimer = 0;
        const rKey = formatKeyCode(kb.restart);
        this.restartHoldLabelEl.textContent = `🔄 [${rKey}] 長押しでリスタート...`;
        this.restartHoldBarFillEl.style.width = '0%';
        this.restartHoldIndicatorEl.classList.remove('hidden');
      }
      return;
    }

    if (!this.hasStarted || this.engine.isGameOver || this.vsMatchEnded) {
      if ((e.code === 'Enter' || e.code === kb.hardDrop) && !e.repeat) {
        this.startNewGame();
      }
      return;
    }

    if (this.engine.isPaused) {
      if (e.code === 'Enter' && !e.repeat) {
        this.togglePause();
      }
      return;
    }

    if (e.repeat) return;

    if (e.code === kb.moveLeft) {
      this.moveDir = -1;
      this.dasTimer = 0;
      this.arrTimer = 0;
      if (this.engine.moveHorizontal(-1)) {
        this.sound.playMove();
      }
    } else if (e.code === kb.moveRight) {
      this.moveDir = 1;
      this.dasTimer = 0;
      this.arrTimer = 0;
      if (this.engine.moveHorizontal(1)) {
        this.sound.playMove();
      }
    } else if (e.code === kb.softDrop) {
      this.softDropHeld = true;
      this.softDropTimer = 0;
      if (this.engine.softDrop()) {
        this.sound.playSoftDrop();
      }
    } else if (e.code === kb.rotateCW) {
      if (this.engine.rotate(1)) {
        this.sound.playRotate();
      }
    } else if (e.code === kb.rotateCCW) {
      if (this.engine.rotate(-1)) {
        this.sound.playRotate();
      }
    } else if (e.code === kb.hardDrop) {
      this.engine.hardDrop();
    } else if (e.code === kb.hold) {
      if (this.engine.hold()) {
        this.sound.playHold();
        this.sessionHoldCount++;
        if (this.sessionHoldCount >= 5) {
          this.unlockAchievement('hold_tactician');
        }
      }
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    const kb = this.keyBindings;
    if (e.code === kb.moveLeft && this.moveDir === -1) {
      this.moveDir = 0;
    } else if (e.code === kb.moveRight && this.moveDir === 1) {
      this.moveDir = 0;
    } else if (e.code === kb.softDrop) {
      this.softDropHeld = false;
    } else if (e.code === kb.restart) {
      this.cancelRestartHold();
    }
  }

  private updateInputRepeat(dtMs: number): void {
    if (!this.hasStarted || this.engine.isPaused || this.engine.isGameOver || this.isSettingsOpen) {
      return;
    }

    if (this.moveDir !== 0) {
      this.dasTimer += dtMs;
      if (this.dasTimer >= this.DAS_MS) {
        this.arrTimer += dtMs;
        while (this.arrTimer >= this.ARR_MS) {
          this.arrTimer -= this.ARR_MS;
          if (this.engine.moveHorizontal(this.moveDir)) {
            this.sound.playMove();
          }
        }
      }
    }

    if (this.softDropHeld) {
      this.softDropTimer += dtMs;
      while (this.softDropTimer >= this.SOFT_DROP_MS) {
        this.softDropTimer -= this.SOFT_DROP_MS;
        if (this.engine.softDrop()) {
          this.sound.playSoftDrop();
        }
      }
    }
  }

  private updateStatsUI(): void {
    this.scoreEl.textContent = this.engine.score.toLocaleString();
    this.highScoreEl.textContent = this.engine.highScore.toLocaleString();
    this.homeHighScoreNormalEl.textContent = this.engine.highScoreNormal.toLocaleString();
    this.homeHighScoreDopamineEl.textContent = this.engine.highScoreDopamine.toLocaleString();
    this.levelEl.textContent = String(this.engine.level);
    this.linesEl.textContent = String(this.engine.lines);
    this.comboEl.textContent =
      this.engine.combo > 0 ? `${this.engine.combo}x` : '-';

    const isOmegaActive = Boolean(
      this.engine.omegaReady || this.engine.activePiece?.isOmegaBomb
    );
    const gaugePct = isOmegaActive ? 100 : Math.floor(this.engine.overdriveGauge);

    this.gaugeFillEl.style.width = `${gaugePct}%`;
    this.gaugeTextEl.textContent = isOmegaActive ? 'MAX!! OMEGA!!' : `${gaugePct}%`;
    this.multiplierEl.textContent = `FEVER x${this.engine.dopamineMultiplier}`;

    this.boardFrameEl.classList.toggle(
      'omega-active',
      this.currentMode === 'dopamine' && isOmegaActive
    );

    if (this.currentMode !== 'dopamine') {
      this.overdriveStatusEl.textContent = 'ドパガキモード専用ゲージ';
      this.overdriveStatusEl.classList.remove('ready');
    } else if (this.engine.activePiece?.isOmegaBomb) {
      this.overdriveStatusEl.textContent = '🔥 ★オメガボム投下中！着地地点の5×5範囲を爆破！';
      this.overdriveStatusEl.classList.add('ready');
    } else if (this.engine.omegaReady) {
      this.overdriveStatusEl.textContent = '⚡ NEXTブロックが【★オメガボム】に変異！！';
      this.overdriveStatusEl.classList.add('ready');
    } else {
      this.overdriveStatusEl.textContent = 'ライン消去でチャージ！100%で5×5範囲爆破ボム出現';
      this.overdriveStatusEl.classList.remove('ready');
    }
  }

  private loop(now: number): void {
    const dtMs = Math.min(100, now - this.lastTime);
    this.lastTime = now;

    if (this.isOnOpeningScreen) {
      this.updateAndRenderOpeningCanvas(dtMs);
    }

    if (this.restartKeyHeld && !this.isSettingsOpen && !this.isAchievementsOpen && !this.isOnHomeScreen) {
      this.restartHoldTimer += dtMs;
      const pct = Math.min(100, (this.restartHoldTimer / this.RESTART_HOLD_MS) * 100);
      this.restartHoldBarFillEl.style.width = `${pct}%`;
      if (this.restartHoldTimer >= this.RESTART_HOLD_MS) {
        this.sound.playHold();
        this.startNewGame();
      }
    }

    if (this.hasStarted && !this.engine.isPaused && !this.engine.isGameOver && !this.isSettingsOpen && !this.vsMatchEnded) {
      this.updateInputRepeat(dtMs);
      this.engine.update(dtMs);
      if (this.isVsCpuMode) {
        this.cpuAi.update(this.cpuEngine, dtMs);
        this.cpuEngine.update(dtMs);
        this.updateVsScoreboardUI();
        this.updateGarbageMetersUI();
      } else if (this.isVsOnlineMode) {
        this.onlineStateTimer += dtMs;
        if (this.onlineStateTimer >= 80) {
          this.onlineStateTimer = 0;
          this.sendOnlineBoardState();
        }
      }
      this.updateStatsUI();
    }

    this.renderer.render(this.engine, dtMs);
    if (this.isVsCpuMode || this.isVsOnlineMode) {
      this.cpuRenderer.render(this.cpuEngine, dtMs);
    }
    requestAnimationFrame((t) => this.loop(t));
  }
}

function bootstrap(): void {
  console.log('[T-TORIS] Initializing AppController...');
  new AppController();
  console.log('[T-TORIS] AppController ready.');
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
