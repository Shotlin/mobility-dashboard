import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi, formatPaise } from '../../services/adminService';
import { hasPermission } from '../../services/session';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../common/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { useDebounce } from '../../hooks/useDebounce';

const STATUS_VARIANT: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'neutral'> = {
  COMPLETED: 'success', CANCELLED: 'danger', NO_DRIVER_FOUND: 'danger',
  SEARCHING: 'warning', ASSIGNED: 'info', DRIVER_EN_ROUTE: 'info',
  DRIVER_ARRIVED: 'info', IN_PROGRESS: 'info',
};

/** Ride operations search + detail drawer + audited admin cancel (spec 11 §4-§5). */
export function RidesPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const debounced = useDebounce(search, 350);
  const queryClient = useQueryClient();

  const rides = useQuery({
    queryKey: ['admin-rides', debounced, status],
    queryFn: () => adminApi.listRides({ search: debounced || undefined, status: status || undefined, limit: 25 }),
    refetchInterval: 15_000,
  });

  const detail = useQuery({
    queryKey: ['admin-ride', selected],
    queryFn: () => adminApi.getRideDetail(selected!),
    enabled: Boolean(selected),
  });

  const cancel = useMutation({
    mutationFn: ({ rideId, reason }: { rideId: string; reason: string }) => adminApi.cancelRide(rideId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-rides'] });
      queryClient.invalidateQueries({ queryKey: ['admin-ride', selected] });
    },
  });

  const [cancelReason, setCancelReason] = useState('');
  const canCancel = hasPermission('ride.cancel');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Ride Operations</h1>
        <p className="text-sm text-muted-foreground">Search rides by phone / registration; filter by status.</p>
      </div>

      <div className="flex gap-2">
        <Input placeholder="Passenger/driver phone or registration…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" data-testid="ride-search" />
        <select className="border rounded px-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)} data-testid="ride-status-filter">
          <option value="">All statuses</option>
          {['SEARCHING', 'ASSIGNED', 'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_DRIVER_FOUND'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ride</TableHead><TableHead>Status</TableHead><TableHead>Category</TableHead>
              <TableHead>Passenger</TableHead><TableHead>Driver</TableHead>
              <TableHead>Fare</TableHead><TableHead>Incidents</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rides.data?.rides.map((r) => (
              <TableRow key={r.rideId} className="cursor-pointer" onClick={() => setSelected(r.rideId)} data-testid={`ride-row-${r.rideId}`}>
                <TableCell className="font-mono text-xs">{String(r.rideId).slice(0, 8)}…</TableCell>
                <TableCell><Badge variant={STATUS_VARIANT[String(r.status)] ?? 'neutral'}>{String(r.status)}</Badge></TableCell>
                <TableCell>{String(r.category)}</TableCell>
                <TableCell>{String(r.passengerPhone)}</TableCell>
                <TableCell>{String(r.driverPhone ?? '—')}</TableCell>
                <TableCell>{formatPaise(r.finalTotalPaise)}</TableCell>
                <TableCell>{r.incidentCount > 0 ? <span className="font-semibold text-red-600">{r.incidentCount}</span> : '0'}</TableCell>
              </TableRow>
            ))}
            {rides.data?.rides.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground">No rides match.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Ride detail</DialogTitle></DialogHeader>
          {detail.isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
          {detail.data && (
            <div className="space-y-4 text-sm">
              <section className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Status:</span> <Badge variant={STATUS_VARIANT[String(detail.data.ride.status)] ?? 'neutral'}>{String(detail.data.ride.status)}</Badge></div>
                <div><span className="text-muted-foreground">Payment:</span> {String(detail.data.ride.paymentMethod)} {detail.data.payment ? `(${String(detail.data.payment.status)}, ${formatPaise(detail.data.payment.amountPaise)})` : ''}</div>
                <div><span className="text-muted-foreground">Passenger:</span> {String(detail.data.passenger.phone)}</div>
                <div>
                  <span className="text-muted-foreground">Driver:</span>{' '}
                  {detail.data.driver ? `${String(detail.data.driver.phone ?? '')} · ${String(detail.data.driver.registrationNumber ?? '')}` : '—'}
                </div>
                <div><span className="text-muted-foreground">Dispatch waves:</span> {String(detail.data.ride.searchWaveCount ?? 0)}</div>
                <div><span className="text-muted-foreground">Final fare:</span> {formatPaise(detail.data.ride.finalTotalPaise as number | null)}</div>
              </section>

              <section>
                <h3 className="mb-1 font-medium">Timeline</h3>
                <ol className="space-y-1">
                  {detail.data.timeline.map((t) => (
                    <li key={t.version} className="text-xs">
                      <span className="font-mono">v{t.version}</span> · {t.type} · {new Date(t.at).toLocaleTimeString('en-IN')}
                    </li>
                  ))}
                </ol>
              </section>

              <section>
                <h3 className="mb-1 font-medium">Dispatch history</h3>
                <Table>
                  <TableHeader><TableRow><TableHead>Wave</TableHead><TableHead>Driver</TableHead><TableHead>State</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {detail.data.offers.map((o) => (
                      <TableRow key={o.offerId}>
                        <TableCell>{o.wave}</TableCell><TableCell>{o.driverPhone}</TableCell><TableCell>{o.state}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </section>

              {canCancel && !['COMPLETED', 'CANCELLED', 'NO_DRIVER_FOUND'].includes(detail.data.ride.status as string) && (
                <DialogFooter>
                  <Textarea placeholder="Cancellation reason (required, audited)" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
                  <Button
                    variant="destructive"
                    disabled={cancelReason.trim().length < 4 || cancel.isPending}
                    onClick={() => selected && cancel.mutate({ rideId: selected, reason: cancelReason.trim() })}
                    data-testid="admin-cancel"
                  >
                    Cancel ride (audited)
                  </Button>
                </DialogFooter>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
