import { describe, it, expect } from 'vitest';
import { API_ROUTES, UserRole, ComplaintStatus } from './index';

describe('Shared package constants', () => {
    it('should have correct API routes defined', () => {
        expect(API_ROUTES.auth.login).toBe('/auth/login');
        expect(API_ROUTES.complaints.root).toBe('/complaints');
        expect(API_ROUTES.complaints.byId('123')).toBe('/complaints/123');
    });

    it('should have correct enums', () => {
        expect(UserRole.ADMIN).toBe('admin');
        expect(ComplaintStatus.NEW).toBe('nouvelle');
    });
});
