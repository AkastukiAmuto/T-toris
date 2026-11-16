import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

app.commandLine.appendSwitch('no-sandbox');

// Determine writable save-data directory:
// - Packaged (distribution): `<exe_dir>/savedata` (portable, self-contained) with fallback to `%APPDATA%/t-toris`
// - Development: workspace root (`../.userdata` and `../user-settings.json`)
function resolveDataPaths(): { userDataDir: string; settingsFilePath: string } {
  if (app.isPackaged) {
    const portableBase = path.join(path.dirname(process.execPath), 'savedata');
    try {
      if (!fs.existsSync(portableBase)) {
        fs.mkdirSync(portableBase, { recursive: true });
      }
      return {
        userDataDir: path.join(portableBase, 'userdata'),
        settingsFilePath: path.join(portableBase, 'user-settings.json'),
      };
    } catch {
      const appDataBase = app.getPath('userData');
      return {
        userDataDir: appDataBase,
        settingsFilePath: path.join(appDataBase, 'user-settings.json'),
      };
    }
  }

  return {
    userDataDir: path.join(__dirname, '../.userdata'),
    settingsFilePath: path.join(__dirname, '../user-settings.json'),
  };
}

const { userDataDir, settingsFilePath } = resolveDataPaths();
try {
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }
  app.setPath('userData', userDataDir);
} catch (err) {
  console.error('[MAIN] Failed to set userData path:', err);
}

ipcMain.handle('load-settings', () => {
  try {
    if (fs.existsSync(settingsFilePath)) {
      const raw = fs.readFileSync(settingsFilePath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('[MAIN] Error reading user-settings.json:', err);
  }
  return null;
});

ipcMain.handle('save-settings', (_event, data: Record<string, unknown>) => {
  try {
    let existing: Record<string, unknown> = {};
    if (fs.existsSync(settingsFilePath)) {
      try {
        existing = JSON.parse(fs.readFileSync(settingsFilePath, 'utf-8'));
      } catch {
        existing = {};
      }
    }
    const merged = { ...existing, ...data };
    fs.writeFileSync(settingsFilePath, JSON.stringify(merged, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[MAIN] Error writing user-settings.json:', err);
    return false;
  }
});

ipcMain.handle('get-app-info', () => {
  try {
    const pkgPath = path.join(__dirname, '../package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as {
        version?: string;
        githubRepo?: string;
      };
      return {
        version: pkg.version || app.getVersion(),
        githubRepo: pkg.githubRepo || '',
      };
    }
  } catch (err) {
    console.error('[MAIN] Error reading package.json:', err);
  }
  return { version: app.getVersion(), githubRepo: '' };
});

ipcMain.handle('launch-updater', () => {
  try {
    const candidates = app.isPackaged
      ? [path.join(path.dirname(process.execPath), 'T-TORIS-Updater.exe')]
      : [
          path.join(__dirname, '../release/T-TORIS-Updater.exe'),
          path.join(path.dirname(process.execPath), 'T-TORIS-Updater.exe'),
        ];

    const updaterPath = candidates.find((p) => fs.existsSync(p));
    if (!updaterPath) {
      return {
        ok: false,
        error: 'T-TORIS-Updater.exe が見つかりませんでした。',
      };
    }

    const child = spawn(updaterPath, [], {
      cwd: path.dirname(updaterPath),
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: (err as Error).message || 'アップデーターの起動に失敗しました。',
    };
  }
});

let mainWindow: BrowserWindow | null = null;
let shakeInterval: NodeJS.Timeout | null = null;
let shakeOrigin: { x: number; y: number } | null = null;

ipcMain.on('shake-window', (_event, intensity: number, durationMs: number) => {
  if (!mainWindow || mainWindow.isDestroyed() || mainWindow.isMaximized()) return;

  if (!shakeOrigin) {
    const [x, y] = mainWindow.getPosition();
    shakeOrigin = { x, y };
  }
  if (shakeInterval) {
    clearInterval(shakeInterval);
  }

  const startTime = Date.now();
  const maxMag = Math.min(28, Math.max(4, intensity));

  shakeInterval = setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed() || !shakeOrigin) {
      if (shakeInterval) clearInterval(shakeInterval);
      shakeInterval = null;
      return;
    }

    const elapsed = Date.now() - startTime;
    if (elapsed >= durationMs) {
      clearInterval(shakeInterval!);
      shakeInterval = null;
      mainWindow.setPosition(shakeOrigin.x, shakeOrigin.y);
      shakeOrigin = null;
      return;
    }

    const decay = 1 - elapsed / durationMs;
    const mag = maxMag * decay;
    const dx = Math.round((Math.random() - 0.5) * 2 * mag);
    const dy = Math.round((Math.random() - 0.5) * 2 * mag);
    mainWindow.setPosition(shakeOrigin.x + dx, shakeOrigin.y + dy);
  }, 16);
});

function forceShowWindow(win: BrowserWindow, tag: string): void {
  if (win.isDestroyed()) return;
  win.show();
  if (!win.isVisible()) {
    win.hide();
    win.show();
  }
  if (win.isMinimized()) {
    win.restore();
  }
  win.show();
  win.focus();
  win.moveTop();
  console.log(`[MAIN] (${tag}) final -> isVisible=${win.isVisible()}`);
}

function createWindow(): void {
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1040,
    height: 840,
    minWidth: 880,
    minHeight: 720,
    center: true,
    title: 'T-TORIS // Desktop Tetris',
    backgroundColor: '#090b10',
    autoHideMenuBar: true,
    show: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    console.log(`[RENDERER L${level}] ${message} (${sourceId}:${line})`);
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error(`[MAIN] Failed to load: ${errorCode} - ${errorDescription}`);
  });

  mainWindow.once('ready-to-show', () => {
    if (!mainWindow) return;
    forceShowWindow(mainWindow, 'ready-to-show');
  });

  mainWindow.webContents.on('did-finish-load', () => {
    if (!mainWindow) return;
    forceShowWindow(mainWindow, 'did-finish-load');
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        forceShowWindow(mainWindow, 'timeout-500ms');
      }
    }, 500);
  });

  const indexPath = path.join(__dirname, '../index.html');
  mainWindow.loadFile(indexPath);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
