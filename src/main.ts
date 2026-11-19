import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import { execSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as https from 'https';
import * as os from 'os';
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

function isNewerVersion(remote: string, current: string): boolean {
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

function fetchTextWithRedirects(url: string, maxRedirects = 5): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          'User-Agent': 'T-E-T-R-I-S-App',
          Accept: 'application/vnd.github+json',
        },
        timeout: 8000,
      },
      (res) => {
        const code = res.statusCode || 0;
        if ((code === 301 || code === 302 || code === 307 || code === 308) && res.headers.location && maxRedirects > 0) {
          res.resume();
          fetchTextWithRedirects(res.headers.location, maxRedirects - 1).then(resolve, reject);
          return;
        }
        if (code !== 200) {
          res.resume();
          reject(new Error(`HTTP ${code}`));
          return;
        }
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => resolve(body));
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
  });
}

function downloadFileWithRedirects(url: string, destPath: string, maxRedirects = 6): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: { 'User-Agent': 'T-E-T-R-I-S-App' },
        timeout: 20000,
      },
      (res) => {
        const code = res.statusCode || 0;
        if ((code === 301 || code === 302 || code === 307 || code === 308) && res.headers.location && maxRedirects > 0) {
          res.resume();
          downloadFileWithRedirects(res.headers.location, destPath, maxRedirects - 1).then(resolve, reject);
          return;
        }
        if (code !== 200) {
          res.resume();
          reject(new Error(`Download failed: HTTP ${code}`));
          return;
        }
        const file = fs.createWriteStream(destPath);
        res.pipe(file);
        file.on('finish', () => {
          file.close(() => resolve());
        });
        file.on('error', (err) => {
          try { fs.unlinkSync(destPath); } catch { }
          reject(err);
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Download timed out'));
    });
  });
}

function copyDirRecursiveSync(src: string, dest: string): void {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  for (const entry of fs.readdirSync(src)) {
    const srcPath = path.join(src, entry);
    const destPath = path.join(dest, entry);
    if (fs.statSync(srcPath).isDirectory()) {
      copyDirRecursiveSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

ipcMain.handle('check-for-updates', async () => {
  try {
    const pkgPath = path.join(__dirname, '../package.json');
    if (!fs.existsSync(pkgPath)) {
      return { hasUpdate: false, currentVersion: app.getVersion(), latestVersion: '', downloadUrl: '' };
    }
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as {
      version?: string;
      githubRepo?: string;
    };
    const currentVersion = pkg.version || app.getVersion();
    const repo = (pkg.githubRepo || '').trim();
    if (!repo) {
      return { hasUpdate: false, currentVersion, latestVersion: '', downloadUrl: '' };
    }

    const body = await fetchTextWithRedirects(`https://api.github.com/repos/${repo}/releases/latest`);
    const parsed = JSON.parse(body) as {
      tag_name?: string;
      assets?: Array<{ name?: string; browser_download_url?: string }>;
    };
    const latestTag = parsed.tag_name || '';
    if (!latestTag) {
      return { hasUpdate: false, currentVersion, latestVersion: '', downloadUrl: '' };
    }

    const assets = parsed.assets || [];
    const targetAsset =
      assets.find((a) => (a.name || '').toLowerCase() === 't-toris-app-update.zip') ||
      assets.find((a) => (a.name || '').toLowerCase().endsWith('.zip') && !(a.name || '').toLowerCase().includes('win64'));
    const downloadUrl = targetAsset?.browser_download_url || '';

    return {
      hasUpdate: Boolean(downloadUrl) && isNewerVersion(latestTag, currentVersion),
      currentVersion,
      latestVersion: latestTag.replace(/^v/i, ''),
      downloadUrl,
    };
  } catch {
    return { hasUpdate: false, currentVersion: app.getVersion(), latestVersion: '', downloadUrl: '' };
  }
});

ipcMain.handle('apply-in-app-update', async (_event, downloadUrl: string) => {
  if (!app.isPackaged) {
    return {
      ok: false,
      error: '開発モード（npm start）では上書き更新をスキップします。配布版アプリから実行してください。',
    };
  }
  if (!downloadUrl || !downloadUrl.startsWith('https://')) {
    return { ok: false, error: '更新用ダウンロードURLが無効です。' };
  }

  const tempRoot = path.join(os.tmpdir(), `ttoris_inapp_update_${Date.now()}`);
  const tempZip = path.join(tempRoot, 'update.zip');
  const unpackedDir = path.join(tempRoot, 'unpacked');

  const exeDir = path.dirname(process.execPath);
  const resourcesDir = path.join(exeDir, 'resources');
  const appDir = path.join(resourcesDir, 'app');
  const backupDir = path.join(resourcesDir, 'app.updater_backup');

  try {
    fs.mkdirSync(unpackedDir, { recursive: true });
    await downloadFileWithRedirects(downloadUrl, tempZip);

    execSync(
      `powershell -NoProfile -Command "Expand-Archive -Path '${tempZip}' -DestinationPath '${unpackedDir}' -Force"`,
      { stdio: 'ignore' }
    );

    const newAppDir = path.join(unpackedDir, 'app');
    if (!fs.existsSync(newAppDir)) {
      throw new Error('更新パッケージ内に app フォルダが見つかりませんでした。');
    }

    if (fs.existsSync(backupDir)) {
      fs.rmSync(backupDir, { recursive: true, force: true });
    }
    if (fs.existsSync(appDir)) {
      fs.renameSync(appDir, backupDir);
    }

    try {
      copyDirRecursiveSync(newAppDir, appDir);
      const newReadme = path.join(unpackedDir, 'README_遊び方.txt');
      if (fs.existsSync(newReadme)) {
        fs.copyFileSync(newReadme, path.join(exeDir, 'README_遊び方.txt'));
      }
    } catch (copyErr) {
      if (fs.existsSync(appDir)) fs.rmSync(appDir, { recursive: true, force: true });
      if (fs.existsSync(backupDir)) fs.renameSync(backupDir, appDir);
      throw copyErr;
    }

    if (fs.existsSync(backupDir)) {
      try { fs.rmSync(backupDir, { recursive: true, force: true }); } catch { }
    }

    try { fs.rmSync(tempRoot, { recursive: true, force: true }); } catch { }

    setTimeout(() => {
      app.relaunch();
      app.exit(0);
    }, 300);

    return { ok: true };
  } catch (err) {
    try { fs.rmSync(tempRoot, { recursive: true, force: true }); } catch { }
    return {
      ok: false,
      error: (err as Error).message || 'アップデート処理に失敗しました。',
    };
  }
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
    title: 'T.E.T.R.I.S. // Tactical Execution Tetrad Resonance Interface System',
    icon: path.join(__dirname, '../assets/icon.png'),
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
