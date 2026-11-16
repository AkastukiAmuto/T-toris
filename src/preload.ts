import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('storageApi', {
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  saveSettings: (data: Record<string, unknown>) => ipcRenderer.invoke('save-settings', data),
  shakeWindow: (intensity: number, durationMs: number) =>
    ipcRenderer.send('shake-window', intensity, durationMs),
});
