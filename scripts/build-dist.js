const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const electronDistDir = path.join(rootDir, 'node_modules', 'electron', 'dist');
const releaseRoot = path.join(rootDir, 'release');
const outAppDir = path.join(releaseRoot, 'T-TORIS-win32-x64');
const zipFilePath = path.join(releaseRoot, 'T-TORIS-win64.zip');

function copyRecursiveSync(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    for (const entry of fs.readdirSync(src)) {
      copyRecursiveSync(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

console.log('[DIST] 1/5 Cleaning previous release directory...');
if (fs.existsSync(releaseRoot)) {
  fs.rmSync(releaseRoot, { recursive: true, force: true });
}
fs.mkdirSync(outAppDir, { recursive: true });

console.log('[DIST] 2/5 Copying Electron runtime...');
copyRecursiveSync(electronDistDir, outAppDir);

// Remove default_app.asar so Electron loads resources/app and sets app.isPackaged = true
const defaultAsar = path.join(outAppDir, 'resources', 'default_app.asar');
if (fs.existsSync(defaultAsar)) {
  fs.rmSync(defaultAsar, { force: true });
}

// Rename electron.exe -> T-TORIS.exe
const srcExe = path.join(outAppDir, 'electron.exe');
const destExe = path.join(outAppDir, 'T-TORIS.exe');
if (fs.existsSync(srcExe)) {
  fs.renameSync(srcExe, destExe);
}

console.log('[DIST] 3/5 Bundling production application files (excluding personal save data)...');
const resourcesAppDir = path.join(outAppDir, 'resources', 'app');
fs.mkdirSync(resourcesAppDir, { recursive: true });

// Write a clean production package.json
const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));
const prodPkg = {
  name: pkg.name,
  version: pkg.version,
  githubRepo: pkg.githubRepo || '',
  description: pkg.description,
  main: pkg.main,
};
fs.writeFileSync(
  path.join(resourcesAppDir, 'package.json'),
  JSON.stringify(prodPkg, null, 2),
  'utf-8'
);

// Copy index.html, styles.css, and dist/
fs.copyFileSync(path.join(rootDir, 'index.html'), path.join(resourcesAppDir, 'index.html'));
fs.copyFileSync(path.join(rootDir, 'styles.css'), path.join(resourcesAppDir, 'styles.css'));
copyRecursiveSync(path.join(rootDir, 'dist'), path.join(resourcesAppDir, 'dist'));

console.log('[DIST] 4/6 Creating README_遊び方.txt...');
const readmeText = `====================================================
  T-TORIS // SUPER DOPAMINE ARCADE EDITION (v${pkg.version})
====================================================

【起動方法】
このフォルダ内の「T-TORIS.exe」をダブルクリックすると起動します。
（インストール不要でそのまま遊べます）

【セーブデータについて】
初回起動時にこのフォルダ内に「savedata」フォルダが自動作成され、
ハイスコア・解放した実績・BGM・キー設定が自動保存されます。

【基本操作（初期設定）】
・左右移動       : ← / →
・ソフトドロップ : ↓
・ハードドロップ : SPACE
・右回転 / 左回転: ↑ / Z
・ホールド       : C
・一時停止       : P (または Esc)
・リスタート     : R キー 1秒長押し
（※キー配置はゲーム内の「SETTINGS」から自由に変更できます）

【アップデート方法】
同梱の「T-TORIS-Updater.exe」を実行すると、GitHub Releases（または同フォルダに置いた
T-TORIS-app-update.zip）から savedata を残したまま最新版へ更新できます。
`;
fs.writeFileSync(path.join(outAppDir, 'README_遊び方.txt'), readmeText, 'utf-8');

console.log('[DIST] 5/6 Building online update pack (T-TORIS-app-update.zip) & T-TORIS-Updater.exe...');
const updateZipPath = path.join(releaseRoot, 'T-TORIS-app-update.zip');
const updaterExePath = path.join(releaseRoot, 'T-TORIS-Updater.exe');
const bundledUpdaterExePath = path.join(outAppDir, 'T-TORIS-Updater.exe');
const tempStageDir = path.join(releaseRoot, '.updater-stage');
const tempUpdaterCs = path.join(releaseRoot, '.updater-compiled.cs');

try {
  if (fs.existsSync(tempStageDir)) fs.rmSync(tempStageDir, { recursive: true, force: true });
  if (fs.existsSync(tempUpdaterCs)) fs.rmSync(tempUpdaterCs, { force: true });

  const stagedAppDir = path.join(tempStageDir, 'app');
  copyRecursiveSync(resourcesAppDir, stagedAppDir);
  fs.copyFileSync(path.join(outAppDir, 'README_遊び方.txt'), path.join(tempStageDir, 'README_遊び方.txt'));

  execSync(
    `powershell -NoProfile -Command "Compress-Archive -Path '${path.join(tempStageDir, '*')}' -DestinationPath '${updateZipPath}' -Force"`,
    { stdio: 'inherit' }
  );
  console.log(`[DIST] Online update pack created at: ${updateZipPath}`);

  const templatePath = path.join(rootDir, 'scripts', 'updater-template.cs');
  const safeRepo = (pkg.githubRepo || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const csSource = fs
    .readFileSync(templatePath, 'utf-8')
    .replace(/__TARGET_VERSION__/g, pkg.version)
    .replace(/__GITHUB_REPO__/g, safeRepo);
  fs.writeFileSync(tempUpdaterCs, csSource, 'utf-8');

  const windir = process.env.WINDIR || 'C:\\Windows';
  const cscCandidates = [
    path.join(windir, 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe'),
    path.join(windir, 'Microsoft.NET', 'Framework', 'v4.0.30319', 'csc.exe'),
  ];
  const cscPath = cscCandidates.find((p) => fs.existsSync(p));
  if (!cscPath) {
    throw new Error('csc.exe (.NET Framework 4.x) was not found.');
  }

  const cscCmd = [
    `"${cscPath}"`,
    '/nologo',
    '/target:winexe',
    '/optimize+',
    `/out:"${updaterExePath}"`,
    '/r:System.dll',
    '/r:System.Drawing.dll',
    '/r:System.Windows.Forms.dll',
    '/r:System.IO.Compression.dll',
    '/r:System.IO.Compression.FileSystem.dll',
    `"${tempUpdaterCs}"`,
  ].join(' ');

  execSync(cscCmd, { stdio: 'inherit' });
  fs.copyFileSync(updaterExePath, bundledUpdaterExePath);
  console.log(`[DIST] Online updater created & bundled into: ${bundledUpdaterExePath}`);
} catch (err) {
  console.warn('[DIST] Warning: Could not build online updater:', err.message || err);
} finally {
  if (fs.existsSync(tempStageDir)) fs.rmSync(tempStageDir, { recursive: true, force: true });
  if (fs.existsSync(tempUpdaterCs)) fs.rmSync(tempUpdaterCs, { force: true });
}

console.log('[DIST] 6/6 Creating distributable ZIP archive (release/T-TORIS-win64.zip)...');
try {
  execSync(
    `powershell -NoProfile -Command "Compress-Archive -Path '${outAppDir}' -DestinationPath '${zipFilePath}' -Force"`,
    { stdio: 'inherit' }
  );
  console.log(`[DIST] Done! ZIP archive created at: ${zipFilePath}`);
} catch (err) {
  console.warn('[DIST] Warning: Could not create ZIP automatically, but unpacked folder is ready:', outAppDir);
}

console.log(`[DIST] SUCCESS! Distributable folder: ${outAppDir}`);
