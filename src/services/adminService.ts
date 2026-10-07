/**
 * Admin operations service — every dashboard API call (spec 09 §5, spec 11).
 */

import { apiClient } from './apiClient';
import type { CommandCenterData, AdminRide, AdminDriver, SafetyIncident } from '../types';

export const adminApi = {
  commandCenter: () => apiClient.get<CommandCenterData>('/api/v1/admin/command-center'),

  listRides: (params: { status?: string; search?: string; limit?: number } = {}) =>
    apiClient.get<{ rides: AdminRide[]; nextCursor: string | null }>('/api/v1/admin/rides', params),

  getRideDetail: (rideId: string) =>
    apiClient.get<{
      ride: Record<string, unknown>;
      passenger: { id: string; phone: string; name: string | null };
      driver: Record<string, unknown> | null;
      timeline: Array<{ version: number; type: string; at: string; actorRole?: string }>;
      offers: Array<{ offerId: string; driverPhone: string; wave: number; state: string; distanceToPickupM: number | null; offeredAt: string; respondedAt: string | null }>;
      incidents: Array<{ id: string; source: string; severity: string; status: string }>;
      payment: { paymentIntentId: string; method: string; status: string; amountPaise: number } | null;
    }>(`/api/v1/admin/rides/${rideId}`),

  cancelRide: (rideId: string, reason: string) =>
    apiClient.post<{ rideId: string; status: string }>(`/api/v1/admin/rides/${rideId}/cancel`, { reason }),

  listDrivers: (params: { approvalState?: string; search?: string } = {}) =>
    apiClient.get<{ drivers: AdminDriver[] }>('/api/v1/admin/drivers', params),

  approveDriver: (driverId: string) =>
    apiClient.post<{ driverId: string; approvalState: string }>(`/api/v1/admin/drivers/${driverId}/approve`),

  suspendDriver: (driverId: string, reason: string) =>
    apiClient.post<{ driverId: string; approvalState: string }>(`/api/v1/admin/drivers/${driverId}/suspend`, { reason }),

  listOpenIncidents: () =>
    apiClient.get<{ incidents: SafetyIncident[] }>('/api/v1/safety/incidents/open'),

  acknowledgeIncident: (incidentId: string) =>
    apiClient.post<{ incidentId: string; status: string }>(`/api/v1/safety/incidents/${incidentId}/acknowledge`),

  transitionIncident: (incidentId: string, status: string, note?: string) =>
    apiClient.post<{ incidentId: string; status: string }>(`/api/v1/safety/incidents/${incidentId}/transition`, { status, note }),

  systemHealth: () =>
    apiClient.get<{
      timestamp: string;
      postgres: string;
      redisClients: Record<string, string>;
      queues: Record<string, { waiting?: number; active?: number; failed?: number }>;
      olaMapsConfigured: boolean;
    }>('/api/v1/admin/system-health'),

  getOlaMaps: () =>
    apiClient.get<{
      connected: boolean;
      keyHint: string | null;
      source: 'dashboard' | 'env' | null;
      lastTestAt: string | null;
      lastTestStatus: string | null;
      updatedAt: string | null;
    }>('/api/v1/admin/platform/ola-maps'),

  testOlaMaps: (apiKey: string) =>
    apiClient.post<{ ok: boolean; latencyMs?: number; httpStatus?: number; error?: string }>(
      '/api/v1/admin/platform/ola-maps/test',
      { apiKey },
      { timeoutMs: 15000 },
    ),

  connectOlaMaps: (apiKey: string) =>
    apiClient.put<{ connected: boolean; keyHint: string | null; source: string }>(
      '/api/v1/admin/platform/ola-maps',
      { apiKey },
      { timeoutMs: 15000 },
    ),

  disconnectOlaMaps: () =>
    apiClient.delete<{ connected: boolean }>('/api/v1/admin/platform/ola-maps'),

  getPlatform: () =>
    apiClient.get<Record<string, { value: unknown; updatedAt: string }>>('/api/v1/admin/platform'),

  setPlatform: (key: string, value: unknown) =>
    apiClient.patch<{ key: string; value: unknown }>(`/api/v1/admin/platform/${key}`, value),

  listSupportTickets: () =>
    apiClient.get<{ tickets: Array<{ ticketId: string; ticketNumber: number; category: string; subject: string; status: string; createdAt: string }> }>(
      '/api/v1/support/tickets',
    ),
};

export function formatPaise(paise: number | null | undefined): string {
  if (paise == null) return '—';
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
