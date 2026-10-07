import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../services/apiClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../common/Badge';

interface LiveRide {
  rideId: string;
  status: string;
  createdAt: string;
  searchAgeS: number | null;
  waveCount: number;
  category: string;
  passengerPhone: string;
}

/**
 * Dispatch monitor (spec 11 §5): rides currently SEARCHING with search
 * duration, wave count, and no-driver reasons — the ops view over the
 * dispatch engine.
 */
export function DispatchMonitorPage() {
  const rides = useQuery({
    queryKey: ['live-rides'],
    queryFn: () => apiClient.get<{ rides: LiveRide[] }>('/api/v1/admin/live/rides'),
    refetchInterval: 5_000,
  });

  const searching = (rides.data?.rides ?? []).filter((r) => r.status === 'SEARCHING');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Dispatch Monitor</h1>
        <p className="text-sm text-muted-foreground">
          Rides currently SEARCHING: age, wave count, category (spec 11 §5). 5s refresh.
        </p>
      </div>

      <div className="rounded-md border" data-testid="dispatch-monitor">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ride</TableHead><TableHead>Search age</TableHead>
              <TableHead>Waves</TableHead><TableHead>Category</TableHead><TableHead>Passenger</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {searching.map((r) => (
              <TableRow key={r.rideId} data-testid={`searching-${r.rideId}`}>
                <TableCell className="font-mono text-xs">{String(r.rideId).slice(0, 8)}…</TableCell>
                <TableCell>
                  <Badge variant={(r.searchAgeS ?? 0) > 30 ? 'danger' : (r.searchAgeS ?? 0) > 15 ? 'warning' : 'success'}>
                    {r.searchAgeS ?? 0}s
                  </Badge>
                </TableCell>
                <TableCell>{r.waveCount}</TableCell>
                <TableCell>{String(r.category)}</TableCell>
                <TableCell>{String(r.passengerPhone)}</TableCell>
              </TableRow>
            ))}
            {searching.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground">No rides searching right now.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
