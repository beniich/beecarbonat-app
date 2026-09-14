import { db } from './db';

const cacheListeners = new Set();

const notifyListeners = () => {
  cacheListeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.warn('Cache listener error:', e);
    }
  });
};

if (typeof window !== 'undefined') {
  window.addEventListener('online', notifyListeners);
  window.addEventListener('offline', notifyListeners);
}

export const localCache = {
  subscribe(listener) {
    cacheListeners.add(listener);
    return () => cacheListeners.delete(listener);
  },

  isOnline() {
    if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
      return navigator.onLine;
    }
    return true;
  },

  isSimulatedOffline() {
    return false;
  },

  async getCachedAssets() {
    try {
      return await db.cached_assets.toArray();
    } catch (e) {
      return [];
    }
  },

  async saveCachedAssets(assets) {
    if (!assets || !Array.isArray(assets)) return;
    try {
      await db.cached_assets.clear();
      await db.cached_assets.bulkAdd(assets);
      notifyListeners();
    } catch (e) {
      console.warn('Failed to cache assets:', e);
    }
  },

  async getCachedWorkOrders() {
    try {
      const wos = await db.cached_workorders.toArray();
      return wos;
    } catch (e) {
      try {
        const raw = localStorage.getItem('cafm_cached_workorders');
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    }
  },

  async saveCachedWorkOrders(workOrders) {
    if (!workOrders || !Array.isArray(workOrders)) return;
    try {
      await db.cached_workorders.clear();
      await db.cached_workorders.bulkPut(workOrders);
      localStorage.setItem('cafm_cached_workorders', JSON.stringify(workOrders));
      notifyListeners();
    } catch (e) {
      console.warn('Failed to cache work orders:', e);
    }
  },

  async updateCachedWorkOrder(idOrTicket, updates) {
    try {
      const current = await this.getCachedWorkOrders();
      const updated = current.map(w => 
        (w.id === idOrTicket || w.ticketNumber === idOrTicket) ? { ...w, ...updates } : w
      );
      await this.saveCachedWorkOrders(updated);
      return updated.find(w => w.id === idOrTicket || w.ticketNumber === idOrTicket) || null;
    } catch (e) {
      return null;
    }
  },

  async deleteCachedWorkOrder(idOrTicket) {
    try {
      const current = await this.getCachedWorkOrders();
      const filtered = current.filter(w => w.id !== idOrTicket && w.ticketNumber !== idOrTicket);
      await this.saveCachedWorkOrders(filtered);
    } catch (e) {}
  }
};

export default localCache;
