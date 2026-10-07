import { describe, it, expect, vi, beforeEach } from 'vitest'

const meMock = vi.fn()
const loginMock = vi.fn()
vi.mock('./apiClient', () => ({
  apiClient: {
    get: (...args: unknown[]) => meMock(...args),
    post: (...args: unknown[]) => loginMock(...args),
  },
  setUnauthorizedHandler: vi.fn(),
  setToken: vi.fn(),
  getToken: vi.fn(() => null),
}))

import { sessionStore, restore, login, hasPermission } from './session'

describe('session store', () => {
  beforeEach(() => {
    loginMock.mockReset()
    meMock.mockReset()
  })

  it('restore with no token → unauthenticated without hitting /me', async () => {
    await restore()
    expect(sessionStore.getSnapshot().status).toBe('unauthenticated')
    expect(meMock).not.toHaveBeenCalled()
  })

  it('login stores the user + permissions; authenticated only via verified response', async () => {
    loginMock.mockResolvedValue({
      accessToken: 'tok',
      user: { id: 'u1', role: 'SUPER_ADMIN', fullName: 'Admin' },
      permissions: ['ride.read', 'driver.approve'],
    })
    await login('+919999000001', 'pw')
    const snap = sessionStore.getSnapshot()
    expect(snap.status).toBe('authenticated')
    expect(snap.user?.role).toBe('SUPER_ADMIN')
    expect(hasPermission('driver.approve')).toBe(true)
    expect(hasPermission('payment.refund')).toBe(false)
  })

  it('restore with a bad token ends unauthenticated (never trusts storage)', async () => {
    ;(window.localStorage as Storage).setItem('mobility.admin.token', 'stale')
    meMock.mockRejectedValue(new Error('401'))
    await restore()
    expect(sessionStore.getSnapshot().status).toBe('unauthenticated')
  })
})
