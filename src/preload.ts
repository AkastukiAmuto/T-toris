import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('storageApi', {
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  saveSettings: (data: Record<string, unknown>) => ipcRenderer.invoke('save-settings', data),
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  applyInAppUpdate: (downloadUrl: string) => ipcRenderer.invoke('apply-in-app-update', downloadUrl),
  launchUpdater: () => ipcRenderer.invoke('launch-updater'),
  shakeWindow: (intensity: number, durationMs: number) =>
    ipcRenderer.send('shake-window', intensity, durationMs),
});
