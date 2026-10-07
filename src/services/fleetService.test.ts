import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useFleetSnapshot } from './fleetService'

const getMock = vi.fn()
vi.mock('./apiClient', () => ({
  apiClient: { get: (...args: unknown[]) => getMock(...args) },
}))

describe('useFleetSnapshot (spec 11 §3 data layer)', () => {
  it('does not poll until a city + category are selected', () => {
    getMock.mockResolvedValue({ drivers: [], rides: [] })
    renderHook(() => useFleetSnapshot(null, null))
    expect(getMock).not.toHaveBeenCalled()
  })

  it('polls live/drivers and live/rides and splits searching rides', async () => {
    getMock.mockImplementation((url: string) => {
      if (url === '/api/v1/admin/live/drivers') {
        return Promise.resolve({
          drivers: [{ driverId: 'd1', location: { lat: 22.5, lng: 88.3 }, freshnessS: 5, operationalState: 'ONLINE_IDLE' }],
        })
      }
      if (url === '/api/v1/admin/live/rides') {
        return Promise.resolve({
          rides: [
            { rideId: 'r1', status: 'SEARCHING', searchAgeS: 8, waveCount: 1, pickup: { lat: 22.5, lng: 88.3 } },
            { rideId: 'r2', status: 'IN_PROGRESS', searchAgeS: null, waveCount: 0, pickup: { lat: 22.5, lng: 88.3 } },
          ],
        })
      }
      return Promise.reject(new Error('unknown url'))
    })

    const { result } = renderHook(() => useFleetSnapshot('city-1', 'cat-1'))
    await waitFor(() => expect(result.current.drivers.length).toBe(1))
    expect(result.current.rides.length).toBe(2)
    expect(result.current.searching.map((r) => r.rideId)).toEqual(['r1'])
    expect(getMock).toHaveBeenCalledWith('/api/v1/admin/live/drivers', { cityId: 'city-1', vehicleCategoryId: 'cat-1' })
  })
})
