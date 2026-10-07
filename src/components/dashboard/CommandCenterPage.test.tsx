import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CommandCenterPage } from './CommandCenterPage'
import { adminApi } from '../../services/adminService'

vi.mock('../../services/adminService', () => ({
  adminApi: { commandCenter: vi.fn() },
  formatPaise: (p: number | null) => (p == null ? '—' : `₹${(p / 100).toFixed(2)}`),
}))

const DATA = {
  rides: { searching: 3, enRoute: 4, inProgress: 10, noDriver24h: 2, cancelled24h: 5, completed24h: 120, avgDispatchSeconds: 9 },
  drivers: { onlineTotal: 25, idle: 15, onTrip: 10, pendingKyc: 3, suspended: 1 },
  activeSafetyIncidents: 2,
  pendingPayments: 1,
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <CommandCenterPage />
    </QueryClientProvider>,
  )
}

describe('CommandCenterPage (spec 11 §2)', () => {
  it('renders live KPIs and surfaces active safety incidents above the fold', async () => {
    vi.mocked(adminApi.commandCenter).mockResolvedValue(DATA)
    renderPage()
    expect(await screen.findByTestId('safety-alert')).toBeDefined()
    expect(screen.getByTestId('kpi-searching-now').textContent).toContain('3')
    expect(screen.getByTestId('kpi-drivers-online').textContent).toContain('25')
    expect(screen.getByTestId('kpi-completed').textContent).toContain('120')
  })

  it('renders an error state when the API is unreachable', async () => {
    vi.mocked(adminApi.commandCenter).mockRejectedValue(new Error('Unable to reach the server'))
    renderPage()
    expect(await screen.findByText('Command center unavailable')).toBeDefined()
  })
})
