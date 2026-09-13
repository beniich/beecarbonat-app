export const API_ROUTES = {
    auth: {
        login: '/auth/login',
        register: '/auth/register',
        me: '/auth/me',
        refresh: '/auth/refresh',
        logout: '/auth/logout'
    },
    complaints: {
        root: '/complaints',
        byId: (id: string) => `/complaints/${id}`,
        status: (id: string) => `/complaints/${id}/status`,
    },
    teams: {
        root: '/teams',
        byId: (id: string) => `/teams/${id}`,
        status: (id: string) => `/teams/${id}/status`,
    },
    inventory: {
        root: '/inventory/requisitions', // Updated to match microservice prefix
        byId: (id: string) => `/inventory/requisitions/${id}`,
        approve: (id: string) => `/inventory/requests/${id}/approve`,
        reject: (id: string) => `/inventory/requests/${id}/reject`,
    },
    analytics: {
        dashboard: '/analytics/dashboard',
        metrics: '/analytics/metrics',
    }
};

export enum UserRole {
    ADMIN = 'admin',
    DISPATCHER = 'dispatcher',
    STAFF = 'staff',
    CITIZEN = 'citizen',
    TECHNICIAN = 'technician'
}

export enum ComplaintStatus {
    NEW = 'nouvelle',
    IN_PROGRESS = 'en cours',
    RESOLVED = 'résolue',
    CLOSED = 'fermée',
    REJECTED = 'rejetée'
}

export * from './wasm-loader';

