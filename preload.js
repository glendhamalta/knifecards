const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('icloud', {
  load: () => ipcRenderer.invoke('load-from-icloud'),
  save: (data) => ipcRenderer.invoke('save-to-icloud', data),
  getPath: () => ipcRenderer.invoke('get-storage-path'),
});
