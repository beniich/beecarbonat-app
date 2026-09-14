import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { addPendingAction, flushPendingActions } from './syncService';
import { localCache } from './localCache';
import { v4 as uuidv4 } from 'uuid';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
      return Promise.reject(err);
    }
    
    // Intercept network errors (offline) for mutations (POST/PUT/DELETE)
    const isMutation = ['post', 'put', 'patch', 'delete'].includes(err.config?.method?.toLowerCase());
    const isNetworkError = !err.response || err.code === 'ERR_NETWORK';
    const isRetry = err.config?.headers?.['X-Offline-Retry'];

    if (isMutation && isNetworkError && !isRetry) {
      console.log('[Offline] Network error detected. Queueing mutation for later sync.');
      
      const config = err.config;
      let data = config.data ? JSON.parse(config.data) : null;
      
      await addPendingAction(config.method, config.url, data);

      // Create a fake successful response so the UI doesn't crash
      return Promise.resolve({
        status: 200,
        statusText: 'OK (Offline Queued)',
        data: { 
          id: config.method.toLowerCase() === 'post' ? `temp-${uuidv4()}` : undefined,
          ...data,
          _isOfflineQueued: true
        }
      });
    }

    return Promise.reject(err);
  }
);

// ── Work Orders & CMMS API Helpers ──────────────────────────

export const getWorkOrders = async () => {
  if (!localCache.isOnline()) {
    return await localCache.getCachedWorkOrders();
  }
  try {
    const res = await api.get('/workorders');
    if (Array.isArray(res.data) && res.data.length > 0) {
      await localCache.saveCachedWorkOrders(res.data);
      return res.data;
    }
  } catch (e) {
    console.warn('Network error fetching work orders, returning cached:', e);
  }
  return await localCache.getCachedWorkOrders();
};

export const getWorkOrderById = async (id) => {
  try {
    const res = await api.get(`/workorders/${id}`);
    return res.data;
  } catch (e) {
    const cached = await localCache.getCachedWorkOrders();
    return cached.find(w => w.id === id || w.ticketNumber === id) || null;
  }
};

export const createWorkOrder = async (workOrder) => {
  try {
    const res = await api.post('/workorders', workOrder);
    const created = res.data || workOrder;
    const cached = await localCache.getCachedWorkOrders();
    await localCache.saveCachedWorkOrders([created, ...cached.filter(w => w.id !== created.id)]);
    return created;
  } catch (e) {
    console.warn('Create work order fallback:', e);
    const fallback = { ...workOrder, id: workOrder.id || `wo-${Date.now()}` };
    const cached = await localCache.getCachedWorkOrders();
    await localCache.saveCachedWorkOrders([fallback, ...cached]);
    return fallback;
  }
};

export const updateWorkOrder = async (id, updates) => {
  await localCache.updateCachedWorkOrder(id, updates);
  try {
    const res = await api.put(`/workorders/${id}`, updates);
    return res.data;
  } catch (e) {
    console.warn('Network error on updateWorkOrder, local cache updated:', e);
    return updates;
  }
};

export const updateWorkOrderStatus = async (id, status) => {
  await localCache.updateCachedWorkOrder(id, { status });
  try {
    const res = await api.patch(`/workorders/${id}/status`, { status });
    return res.data;
  } catch (e) {
    console.warn('Network error on updateWorkOrderStatus, local cache updated:', e);
    return { id, status };
  }
};

export const deleteWorkOrder = async (id) => {
  await localCache.deleteCachedWorkOrder(id);
  try {
    const res = await api.delete(`/workorders/${id}`);
    return res.data;
  } catch (e) {
    console.warn('Network error on deleteWorkOrder, deleted from local cache:', e);
    return { success: true, id };
  }
};

export const getBuildings = async () => {
  try {
    const res = await api.get('/buildings');
    if (Array.isArray(res.data) && res.data.length > 0) return res.data;
  } catch (e) {
    console.warn('Could not fetch buildings:', e);
  }
  return [
    { id: 'bld-01', name: 'Spider Cybernetics Tower A', address: '42 Avenue des Champs-Élysées', city: 'Paris, 75008' },
    { id: 'bld-02', name: 'Tour Montparnasse Tech Hub', address: '33 Avenue du Maine', city: 'Paris, 75015' }
  ];
};

export const getAssets = async () => {
  try {
    const res = await api.get('/assets');
    if (Array.isArray(res.data) && res.data.length > 0) {
      await localCache.saveCachedAssets(res.data);
      return res.data;
    }
  } catch (e) {
    console.warn('Could not fetch assets:', e);
  }
  return await localCache.getCachedAssets();
};

export const getIntervenants = async () => {
  try {
    const res = await api.get('/cmms/technicians');
    if (Array.isArray(res.data) && res.data.length > 0) return res.data;
  } catch (e) {}
  return [];
};

export const syncOfflineData = async () => {
  return await flushPendingActions();
};

// Attach helpers directly on api object
api.getWorkOrders = getWorkOrders;
api.getWorkOrderById = getWorkOrderById;
api.createWorkOrder = createWorkOrder;
api.updateWorkOrder = updateWorkOrder;
api.updateWorkOrderStatus = updateWorkOrderStatus;
api.deleteWorkOrder = deleteWorkOrder;
api.getBuildings = getBuildings;
api.getAssets = getAssets;
api.getIntervenants = getIntervenants;
api.syncOfflineData = syncOfflineData;

export default api;
