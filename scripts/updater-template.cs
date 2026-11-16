using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Net;
using System.Text;
using System.Text.RegularExpressions;
using System.Windows.Forms;

namespace TTorisUpdater
{
    public class UpdaterForm : Form
    {
        private const string BuiltVersion = "__TARGET_VERSION__";
        private const string DefaultGithubRepo = "__GITHUB_REPO__";
        private const string UpdateAssetName = "T-TORIS-app-update.zip";

        private TextBox pathTextBox;
        private Button browseBtn;
        private TextBox repoTextBox;
        private Button checkBtn;
        private Label statusLabel;
        private Label versionLabel;
        private Label saveDataLabel;
        private ProgressBar progressBar;
        private Button updateBtn;
        private Button launchBtn;

        private string selectedDir = "";
        private string currentVersion = "";
        private string remoteVersion = "";
        private string remoteDownloadUrl = "";
        private string localZipPath = "";
        private bool updateCompleted = false;

        public UpdaterForm()
        {
            ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072; // TLS 1.2
            InitializeUi();
            AutoDetectInstallFolder();
            CheckSourceOnStartup();
        }

        private void InitializeUi()
        {
            this.Text = "T-TORIS Online Updater";
            this.ClientSize = new Size(540, 365);
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = Color.FromArgb(14, 18, 34);
            this.ForeColor = Color.FromArgb(238, 244, 255);
            this.Font = new Font("Yu Gothic UI", 9.5f, FontStyle.Regular);

            var titleLabel = new Label();
            titleLabel.Text = "T-TORIS // GITHUB ONLINE UPDATER";
            titleLabel.Font = new Font("Yu Gothic UI", 13.5f, FontStyle.Bold);
            titleLabel.ForeColor = Color.FromArgb(0, 240, 255);
            titleLabel.Location = new Point(22, 14);
            titleLabel.AutoSize = true;
            this.Controls.Add(titleLabel);

            var subLabel = new Label();
            subLabel.Text = "GitHub Releases から最新版を自動取得し、savedata を保護して更新します";
            subLabel.ForeColor = Color.FromArgb(165, 180, 210);
            subLabel.Location = new Point(24, 42);
            subLabel.AutoSize = true;
            this.Controls.Add(subLabel);

            var folderLabel = new Label();
            folderLabel.Text = "T-TORIS.exe があるフォルダ:";
            folderLabel.Location = new Point(24, 72);
            folderLabel.AutoSize = true;
            this.Controls.Add(folderLabel);

            pathTextBox = new TextBox();
            pathTextBox.Location = new Point(24, 94);
            pathTextBox.Size = new Size(392, 25);
            pathTextBox.BackColor = Color.FromArgb(24, 30, 52);
            pathTextBox.ForeColor = Color.White;
            pathTextBox.BorderStyle = BorderStyle.FixedSingle;
            pathTextBox.ReadOnly = true;
            this.Controls.Add(pathTextBox);

            browseBtn = new Button();
            browseBtn.Text = "フォルダ選択...";
            browseBtn.Location = new Point(422, 93);
            browseBtn.Size = new Size(94, 27);
            browseBtn.BackColor = Color.FromArgb(34, 44, 74);
            browseBtn.ForeColor = Color.White;
            browseBtn.FlatStyle = FlatStyle.Flat;
            browseBtn.FlatAppearance.BorderColor = Color.FromArgb(0, 200, 230);
            browseBtn.Click += BrowseBtn_Click;
            this.Controls.Add(browseBtn);

            var repoLabel = new Label();
            repoLabel.Text = "GitHub リポジトリ (owner/repo):";
            repoLabel.Location = new Point(24, 128);
            repoLabel.AutoSize = true;
            this.Controls.Add(repoLabel);

            repoTextBox = new TextBox();
            repoTextBox.Location = new Point(24, 150);
            repoTextBox.Size = new Size(392, 25);
            repoTextBox.BackColor = Color.FromArgb(24, 30, 52);
            repoTextBox.ForeColor = Color.FromArgb(140, 230, 255);
            repoTextBox.BorderStyle = BorderStyle.FixedSingle;
            repoTextBox.Text = DefaultGithubRepo;
            this.Controls.Add(repoTextBox);

            checkBtn = new Button();
            checkBtn.Text = "更新を確認";
            checkBtn.Location = new Point(422, 149);
            checkBtn.Size = new Size(94, 27);
            checkBtn.BackColor = Color.FromArgb(34, 44, 74);
            checkBtn.ForeColor = Color.White;
            checkBtn.FlatStyle = FlatStyle.Flat;
            checkBtn.FlatAppearance.BorderColor = Color.FromArgb(0, 200, 230);
            checkBtn.Click += CheckBtn_Click;
            this.Controls.Add(checkBtn);

            versionLabel = new Label();
            versionLabel.Text = "バージョン: 確認待ち";
            versionLabel.Location = new Point(24, 186);
            versionLabel.Size = new Size(492, 20);
            versionLabel.ForeColor = Color.FromArgb(255, 225, 110);
            this.Controls.Add(versionLabel);

            saveDataLabel = new Label();
            saveDataLabel.Text = "セーブデータ: -";
            saveDataLabel.Location = new Point(24, 208);
            saveDataLabel.Size = new Size(492, 20);
            saveDataLabel.ForeColor = Color.FromArgb(140, 230, 175);
            this.Controls.Add(saveDataLabel);

            progressBar = new ProgressBar();
            progressBar.Location = new Point(24, 240);
            progressBar.Size = new Size(492, 18);
            progressBar.Style = ProgressBarStyle.Continuous;
            this.Controls.Add(progressBar);

            statusLabel = new Label();
            statusLabel.Text = "準備中...";
            statusLabel.Location = new Point(24, 266);
            statusLabel.Size = new Size(492, 30);
            statusLabel.ForeColor = Color.FromArgb(190, 205, 235);
            this.Controls.Add(statusLabel);

            updateBtn = new Button();
            updateBtn.Text = "アップデート実行";
            updateBtn.Location = new Point(24, 306);
            updateBtn.Size = new Size(305, 40);
            updateBtn.Font = new Font("Yu Gothic UI", 10.5f, FontStyle.Bold);
            updateBtn.BackColor = Color.FromArgb(0, 195, 225);
            updateBtn.ForeColor = Color.FromArgb(10, 14, 26);
            updateBtn.FlatStyle = FlatStyle.Flat;
            updateBtn.FlatAppearance.BorderSize = 0;
            updateBtn.Enabled = false;
            updateBtn.Click += UpdateBtn_Click;
            this.Controls.Add(updateBtn);

            launchBtn = new Button();
            launchBtn.Text = "T-TORIS を起動";
            launchBtn.Location = new Point(342, 306);
            launchBtn.Size = new Size(174, 40);
            launchBtn.Font = new Font("Yu Gothic UI", 10f, FontStyle.Bold);
            launchBtn.BackColor = Color.FromArgb(40, 52, 85);
            launchBtn.ForeColor = Color.White;
            launchBtn.FlatStyle = FlatStyle.Flat;
            launchBtn.FlatAppearance.BorderColor = Color.FromArgb(0, 220, 150);
            launchBtn.Enabled = false;
            launchBtn.Click += LaunchBtn_Click;
            this.Controls.Add(launchBtn);
        }

        private void AutoDetectInstallFolder()
        {
            var candidates = new List<string>();
            string exeDir = AppDomain.CurrentDomain.BaseDirectory;
            candidates.Add(exeDir);
            var parent = Directory.GetParent(exeDir.TrimEnd('\\'));
            if (parent != null)
            {
                candidates.Add(parent.FullName);
                candidates.Add(Path.Combine(parent.FullName, "T-TORIS-win32-x64"));
            }

            string desktop = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
            string docs = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);
            string userProfile = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
            string downloads = Path.Combine(userProfile, "Downloads");

            string[] roots = new[] { desktop, downloads, docs };
            foreach (var root in roots)
            {
                if (!Directory.Exists(root)) continue;
                candidates.Add(root);
                candidates.Add(Path.Combine(root, "T-TORIS-win32-x64"));
                candidates.Add(Path.Combine(root, "T-TORIS"));
                try
                {
                    foreach (var sub in Directory.GetDirectories(root, "*T-TORIS*"))
                    {
                        candidates.Add(sub);
                        candidates.Add(Path.Combine(sub, "T-TORIS-win32-x64"));
                    }
                }
                catch { }
            }

            foreach (var dir in candidates)
            {
                if (IsValidTTorisDir(dir))
                {
                    SetSelectedDir(dir);
                    return;
                }
            }

            statusLabel.Text = "T-TORIS.exe が見つかりません。「フォルダ選択...」から指定してください。";
        }

        private bool IsValidTTorisDir(string dir)
        {
            if (string.IsNullOrEmpty(dir) || !Directory.Exists(dir)) return false;
            return File.Exists(Path.Combine(dir, "T-TORIS.exe")) && Directory.Exists(Path.Combine(dir, "resources"));
        }

        private void SetSelectedDir(string dir)
        {
            selectedDir = dir;
            pathTextBox.Text = dir;

            currentVersion = ReadInstalledField(dir, "version");
            string pkgRepo = ReadInstalledField(dir, "githubRepo");
            if (!string.IsNullOrEmpty(pkgRepo) && string.IsNullOrEmpty(repoTextBox.Text.Trim()))
            {
                repoTextBox.Text = pkgRepo;
            }

            RefreshVersionLabel();

            string saveDir = Path.Combine(dir, "savedata");
            if (Directory.Exists(saveDir))
            {
                saveDataLabel.Text = "セーブデータ (savedata): 検出済み・そのまま保護されます";
                saveDataLabel.ForeColor = Color.FromArgb(120, 240, 175);
            }
            else
            {
                saveDataLabel.Text = "セーブデータ (savedata): 未作成（初回起動時に自動作成されます）";
                saveDataLabel.ForeColor = Color.FromArgb(180, 195, 220);
            }

            launchBtn.Enabled = true;
            UpdateActionButtonsState();
        }

        private void RefreshVersionLabel()
        {
            string curText = string.IsNullOrEmpty(currentVersion) ? "不明" : "v" + currentVersion;
            if (!string.IsNullOrEmpty(remoteVersion))
            {
                versionLabel.Text = "現在: " + curText + "  →  最新 (GitHub): v" + remoteVersion.TrimStart('v', 'V');
            }
            else if (!string.IsNullOrEmpty(localZipPath))
            {
                versionLabel.Text = "現在: " + curText + "  →  ローカル更新パック検出済み";
            }
            else
            {
                versionLabel.Text = "現在: " + curText + "  (ビルド時基準: v" + BuiltVersion + ")";
            }
        }

        private string ReadInstalledField(string dir, string fieldName)
        {
            try
            {
                string pkgPath = Path.Combine(dir, "resources", "app", "package.json");
                if (!File.Exists(pkgPath)) return "";
                string json = File.ReadAllText(pkgPath, Encoding.UTF8);
                var m = Regex.Match(json, "\"" + Regex.Escape(fieldName) + "\"\\s*:\\s*\"([^\"]*)\"");
                return m.Success ? m.Groups[1].Value : "";
            }
            catch
            {
                return "";
            }
        }

        private void CheckSourceOnStartup()
        {
            string exeLocalZip = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, UpdateAssetName);
            if (File.Exists(exeLocalZip))
            {
                localZipPath = exeLocalZip;
                RefreshVersionLabel();
                UpdateActionButtonsState();
                statusLabel.Text = "同フォルダに " + UpdateAssetName + " を検出しました。アップデート可能です。";
                return;
            }

            if (!string.IsNullOrEmpty(repoTextBox.Text.Trim()))
            {
                CheckGithubLatestRelease();
            }
            else
            {
                statusLabel.Text = "GitHubリポジトリ未設定です。owner/repo を入力して「更新を確認」するか、同フォルダに " + UpdateAssetName + " を置いてください。";
            }
        }

        private void CheckBtn_Click(object sender, EventArgs e)
        {
            localZipPath = "";
            string exeLocalZip = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, UpdateAssetName);
            if (File.Exists(exeLocalZip))
            {
                localZipPath = exeLocalZip;
            }
            CheckGithubLatestRelease();
        }

        private void CheckGithubLatestRelease()
        {
            string repo = repoTextBox.Text.Trim();
            if (string.IsNullOrEmpty(repo) || !repo.Contains("/"))
            {
                statusLabel.Text = "GitHubリポジトリを「ユーザー名/リポジトリ名」形式で入力してください。";
                return;
            }

            checkBtn.Enabled = false;
            updateBtn.Enabled = false;
            remoteVersion = "";
            remoteDownloadUrl = "";
            statusLabel.Text = "GitHub Releases に接続して最新版を確認しています...";
            Application.DoEvents();

            try
            {
                string apiUrl = "https://api.github.com/repos/" + repo + "/releases/latest";
                string json;
                using (var wc = new WebClient())
                {
                    wc.Encoding = Encoding.UTF8;
                    wc.Headers.Add("User-Agent", "T-TORIS-Updater");
                    wc.Headers.Add("Accept", "application/vnd.github+json");
                    json = wc.DownloadString(apiUrl);
                }

                var tagMatch = Regex.Match(json, "\"tag_name\"\\s*:\\s*\"([^\"]+)\"");
                if (tagMatch.Success)
                {
                    remoteVersion = tagMatch.Groups[1].Value;
                }

                var assetPattern = "\"browser_download_url\"\\s*:\\s*\"([^\"]*" + Regex.Escape(UpdateAssetName) + ")\"";
                var urlMatch = Regex.Match(json, assetPattern, RegexOptions.IgnoreCase);
                if (!urlMatch.Success)
                {
                    var anyZipMatch = Regex.Match(json, "\"browser_download_url\"\\s*:\\s*\"([^\"]*\\.zip)\"", RegexOptions.IgnoreCase);
                    if (anyZipMatch.Success)
                    {
                        remoteDownloadUrl = anyZipMatch.Groups[1].Value;
                    }
                }
                else
                {
                    remoteDownloadUrl = urlMatch.Groups[1].Value;
                }

                RefreshVersionLabel();

                if (string.IsNullOrEmpty(remoteDownloadUrl))
                {
                    statusLabel.Text = "最新リリース (" + remoteVersion + ") に " + UpdateAssetName + " が見つかりませんでした。";
                }
                else if (!string.IsNullOrEmpty(currentVersion) && CompareVersions(currentVersion, remoteVersion) >= 0)
                {
                    statusLabel.Text = "現在すでに最新バージョン (v" + currentVersion + ") です！（再適用も可能です）";
                }
                else
                {
                    statusLabel.Text = "新しいバージョン (" + remoteVersion + ") が利用可能です！「アップデート実行」を押してください。";
                }
            }
            catch (WebException wex)
            {
                statusLabel.Text = "GitHub取得エラー: リリース未公開、または通信エラー (" + wex.Message + ")";
            }
            catch (Exception ex)
            {
                statusLabel.Text = "確認エラー: " + ex.Message;
            }
            finally
            {
                checkBtn.Enabled = true;
                UpdateActionButtonsState();
            }
        }

        private static int CompareVersions(string a, string b)
        {
            string[] pa = a.TrimStart('v', 'V').Split('.');
            string[] pb = b.TrimStart('v', 'V').Split('.');
            int max = Math.Max(pa.Length, pb.Length);
            for (int i = 0; i < max; i++)
            {
                int va = 0;
                int vb = 0;
                if (i < pa.Length) int.TryParse(Regex.Match(pa[i], "\\d+").Value, out va);
                if (i < pb.Length) int.TryParse(Regex.Match(pb[i], "\\d+").Value, out vb);
                if (va != vb) return va.CompareTo(vb);
            }
            return 0;
        }

        private void UpdateActionButtonsState()
        {
            bool hasTarget = IsValidTTorisDir(selectedDir);
            bool hasSource = !string.IsNullOrEmpty(remoteDownloadUrl) || !string.IsNullOrEmpty(localZipPath);
            updateBtn.Enabled = hasTarget && hasSource && !updateCompleted;
            if (!string.IsNullOrEmpty(remoteVersion))
            {
                updateBtn.Text = "アップデート実行 (" + remoteVersion + ")";
            }
            else if (!string.IsNullOrEmpty(localZipPath))
            {
                updateBtn.Text = "ローカルZIPからアップデート";
            }
            else
            {
                updateBtn.Text = "アップデート実行";
            }
        }

        private void BrowseBtn_Click(object sender, EventArgs e)
        {
            using (var dlg = new FolderBrowserDialog())
            {
                dlg.Description = "T-TORIS.exe が入っているフォルダを選択してください";
                if (!string.IsNullOrEmpty(selectedDir) && Directory.Exists(selectedDir))
                {
                    dlg.SelectedPath = selectedDir;
                }
                if (dlg.ShowDialog(this) == DialogResult.OK)
                {
                    if (IsValidTTorisDir(dlg.SelectedPath))
                    {
                        SetSelectedDir(dlg.SelectedPath);
                    }
                    else
                    {
                        MessageBox.Show(
                            this,
                            "選択したフォルダ内に T-TORIS.exe が見つかりませんでした。",
                            "フォルダ確認",
                            MessageBoxButtons.OK,
                            MessageBoxIcon.Warning
                        );
                    }
                }
            }
        }

        private bool EnsureAppNotRunning()
        {
            var procs = Process.GetProcessesByName("T-TORIS");
            if (procs.Length == 0) return true;

            var res = MessageBox.Show(
                this,
                "現在 T-TORIS.exe が起動中です。\nアップデートのため T-TORIS を終了して続行しますか？",
                "起動中の確認",
                MessageBoxButtons.YesNo,
                MessageBoxIcon.Question
            );

            if (res != DialogResult.Yes) return false;

            foreach (var p in procs)
            {
                try
                {
                    if (!p.HasExited)
                    {
                        p.CloseMainWindow();
                        if (!p.WaitForExit(2000))
                        {
                            p.Kill();
                            p.WaitForExit(2000);
                        }
                    }
                }
                catch { }
            }
            return true;
        }

        private void UpdateBtn_Click(object sender, EventArgs e)
        {
            if (!IsValidTTorisDir(selectedDir)) return;
            if (!EnsureAppNotRunning()) return;

            updateBtn.Enabled = false;
            browseBtn.Enabled = false;
            checkBtn.Enabled = false;
            launchBtn.Enabled = false;
            progressBar.Value = 10;
            Application.DoEvents();

            string resourcesDir = Path.Combine(selectedDir, "resources");
            string appDir = Path.Combine(resourcesDir, "app");
            string backupDir = Path.Combine(resourcesDir, "app.updater_backup");
            string tempExtractDir = Path.Combine(Path.GetTempPath(), "ttoris_update_" + Guid.NewGuid().ToString("N"));

            try
            {
                Directory.CreateDirectory(tempExtractDir);
                string tempZip = Path.Combine(tempExtractDir, "payload.zip");

                if (!string.IsNullOrEmpty(remoteDownloadUrl))
                {
                    statusLabel.Text = "GitHub からアップデートをダウンロード中...";
                    Application.DoEvents();
                    using (var wc = new WebClient())
                    {
                        wc.Headers.Add("User-Agent", "T-TORIS-Updater");
                        wc.DownloadFile(remoteDownloadUrl, tempZip);
                    }
                }
                else if (!string.IsNullOrEmpty(localZipPath) && File.Exists(localZipPath))
                {
                    statusLabel.Text = "ローカル更新パックを読み込み中...";
                    Application.DoEvents();
                    File.Copy(localZipPath, tempZip, true);
                }
                else
                {
                    throw new InvalidOperationException("アップデートデータの取得元がありません。");
                }

                progressBar.Value = 45;
                statusLabel.Text = "ファイルを検証・展開中...";
                Application.DoEvents();

                string unpackedDir = Path.Combine(tempExtractDir, "unpacked");
                ZipFile.ExtractToDirectory(tempZip, unpackedDir);

                string newAppDir = Path.Combine(unpackedDir, "app");
                if (!Directory.Exists(newAppDir))
                {
                    throw new InvalidOperationException("アップデートパッケージの構成が不正です (app フォルダが見つかりません)。");
                }

                progressBar.Value = 75;
                statusLabel.Text = "アプリ本体を更新中 (savedata は保護されます)...";
                Application.DoEvents();

                if (Directory.Exists(backupDir))
                {
                    Directory.Delete(backupDir, true);
                }
                if (Directory.Exists(appDir))
                {
                    Directory.Move(appDir, backupDir);
                }

                try
                {
                    CopyDirectory(newAppDir, appDir);
                    string newReadme = Path.Combine(unpackedDir, "README_遊び方.txt");
                    if (File.Exists(newReadme))
                    {
                        File.Copy(newReadme, Path.Combine(selectedDir, "README_遊び方.txt"), true);
                    }
                }
                catch
                {
                    if (Directory.Exists(appDir)) Directory.Delete(appDir, true);
                    if (Directory.Exists(backupDir)) Directory.Move(backupDir, appDir);
                    throw;
                }

                if (Directory.Exists(backupDir))
                {
                    try { Directory.Delete(backupDir, true); } catch { }
                }

                progressBar.Value = 100;
                updateCompleted = true;
                SetSelectedDir(selectedDir);
                statusLabel.Text = "アップデート完了！右のボタンから T-TORIS を起動できます。";
                updateBtn.Text = "アップデート完了 ✔";
                updateBtn.Enabled = false;
                launchBtn.Enabled = true;
                launchBtn.BackColor = Color.FromArgb(0, 210, 140);
                launchBtn.ForeColor = Color.FromArgb(10, 16, 28);

                MessageBox.Show(
                    this,
                    "T-TORIS のアップデートが完了しました！\nセーブデータはそのまま保持されています。",
                    "アップデート完了",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information
                );
            }
            catch (Exception ex)
            {
                progressBar.Value = 0;
                statusLabel.Text = "エラー: " + ex.Message;
                browseBtn.Enabled = true;
                checkBtn.Enabled = true;
                launchBtn.Enabled = true;
                UpdateActionButtonsState();
                MessageBox.Show(
                    this,
                    "アップデート中にエラーが発生しました:\n" + ex.Message,
                    "アップデート失敗",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
            finally
            {
                try
                {
                    if (Directory.Exists(tempExtractDir))
                    {
                        Directory.Delete(tempExtractDir, true);
                    }
                }
                catch { }
            }
        }

        private void LaunchBtn_Click(object sender, EventArgs e)
        {
            string exePath = Path.Combine(selectedDir, "T-TORIS.exe");
            if (File.Exists(exePath))
            {
                Process.Start(new ProcessStartInfo(exePath) { WorkingDirectory = selectedDir });
                if (updateCompleted)
                {
                    this.Close();
                }
            }
        }

        private static void CopyDirectory(string srcDir, string destDir)
        {
            Directory.CreateDirectory(destDir);
            foreach (var file in Directory.GetFiles(srcDir))
            {
                File.Copy(file, Path.Combine(destDir, Path.GetFileName(file)), true);
            }
            foreach (var dir in Directory.GetDirectories(srcDir))
            {
                CopyDirectory(dir, Path.Combine(destDir, Path.GetFileName(dir)));
            }
        }

        [STAThread]
        public static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new UpdaterForm());
        }
    }
}
