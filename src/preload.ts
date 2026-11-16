import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('storageApi', {
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  saveSettings: (data: Record<string, unknown>) => ipcRenderer.invoke('save-settings', data),
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  launchUpdater: () => ipcRenderer.invoke('launch-updater'),
  shakeWindow: (intensity: number, durationMs: number) =>
    ipcRenderer.send('shake-window', intensity, durationMs),
});
