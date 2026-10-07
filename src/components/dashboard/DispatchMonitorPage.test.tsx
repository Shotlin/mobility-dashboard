import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DispatchMonitorPage } from './DispatchMonitorPage'

vi.mock('../../services/apiClient', () => ({
  apiClient: { get: vi.fn() },
}))
import { apiClient } from '../../services/apiClient'

describe('DispatchMonitorPage (spec 11 §5)', () => {
  it('shows only SEARCHING rides with age + wave badges', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      rides: [
        { rideId: 'r1', status: 'SEARCHING', searchAgeS: 8, waveCount: 1, category: 'Auto', passengerPhone: '+911' },
        { rideId: 'r2', status: 'IN_PROGRESS', searchAgeS: null, waveCount: 0, category: 'Bike', passengerPhone: '+912' },
      ],
    })
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <DispatchMonitorPage />
      </QueryClientProvider>,
    )
    expect(await screen.findByTestId('searching-r1')).toBeDefined()
    expect(screen.queryByTestId('searching-r2')).toBeNull()
  })

  it('empty state when nothing is searching', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ rides: [] })
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <DispatchMonitorPage />
      </QueryClientProvider>,
    )
    expect(await screen.findByText('No rides searching right now.')).toBeDefined()
  })
})
