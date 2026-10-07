import { describe, it, expect, vi, afterEach } from 'vitest'

// API client unit tests: new spec 09 §7 envelope handling.
vi.mock('./apiClient', async () => {
  const actual: Record<string, unknown> = {}
  return {
    apiClient: {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
    },
    getToken: vi.fn(() => 'test-token'),
    setToken: vi.fn(),
    setUnauthorizedHandler: vi.fn(),
    ApiError: class ApiError extends Error {
      status?: number; code?: string; isNetworkError?: boolean;
      constructor(msg: string, init: any = {}) { super(msg); Object.assign(this, init) }
    },
    ...actual,
  }
})

import { apiClient } from './apiClient'
import { adminApi, formatPaise } from './adminService'

describe('adminService', () => {
  afterEach(() => vi.clearAllMocks())

  it('commandCenter hits the live KPI endpoint', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ rides: { searching: 2 }, drivers: {} } as never)
    await adminApi.commandCenter()
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/admin/command-center')
  })

  it('cancelRide posts an audited reason', async () => {
    await adminApi.cancelRide('ride-1', 'operational decision')
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/admin/rides/ride-1/cancel', { reason: 'operational decision' })
  })

  it('acknowledge + transition target the safety endpoints', async () => {
    await adminApi.acknowledgeIncident('inc-1')
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/safety/incidents/inc-1/acknowledge')
    await adminApi.transitionIncident('inc-1', 'RESOLVED', 'done')
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/safety/incidents/inc-1/transition', { status: 'RESOLVED', note: 'done' })
  })

  it('formatPaise renders INR from integer paise', () => {
    expect(formatPaise(7250)).toMatch(/72\.50/)
    expect(formatPaise(null)).toBe('—')
  })
})
