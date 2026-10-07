import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/adminService';
import { hasPermission } from '../../services/session';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../common/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Textarea } from '../ui/textarea';

const APPROVAL_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  APPROVED: 'success', PENDING: 'warning', SUSPENDED: 'danger', REJECTED: 'danger', EXPIRED_DOCUMENTS: 'danger',
};

/** Driver management + KYC approval/suspension (spec 11 §6). */
export function DriversPage() {
  const [search, setSearch] = useState('');
  const [approval, setApproval] = useState('');
  const [suspendTarget, setSuspendTarget] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const queryClient = useQueryClient();

  const drivers = useQuery({
    queryKey: ['admin-drivers', search, approval],
    queryFn: () => adminApi.listDrivers({ search: search || undefined, approvalState: approval || undefined }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-drivers'] });
  const approve = useMutation({ mutationFn: adminApi.approveDriver, onSuccess: invalidate });
  const suspend = useMutation({
    mutationFn: ({ driverId, r }: { driverId: string; r: string }) => adminApi.suspendDriver(driverId, r),
    onSuccess: () => {
      setSuspendTarget(null);
      setReason('');
      invalidate();
    },
  });

  const canApprove = hasPermission('driver.approve');
  const canSuspend = hasPermission('driver.suspend');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Driver Management</h1>
        <p className="text-sm text-muted-foreground">Approval, suspension, operational state, GPS freshness.</p>
      </div>

      <div className="flex gap-2">
        <Input placeholder="Name / phone / registration…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" data-testid="driver-search" />
        <select className="border rounded px-2 text-sm" value={approval} onChange={(e) => setApproval(e.target.value)} data-testid="driver-approval-filter">
          <option value="">All approval states</option>
          {['PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED', 'EXPIRED_DOCUMENTS'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Driver</TableHead><TableHead>Phone</TableHead><TableHead>Approval</TableHead>
              <TableHead>State</TableHead><TableHead>Rides</TableHead><TableHead>Rating</TableHead>
              <TableHead>Vehicle</TableHead><TableHead>GPS</TableHead><TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {drivers.data?.drivers.map((d) => (
              <TableRow key={d.driverId}>
                <TableCell>{d.fullName ?? '—'}</TableCell>
                <TableCell>{d.phone}</TableCell>
                <TableCell><Badge variant={APPROVAL_VARIANT[d.approvalState]}>{d.approvalState}</Badge></TableCell>
                <TableCell>{d.operationalState}</TableCell>
                <TableCell>{d.totalRides}</TableCell>
                <TableCell>{d.rating ?? '—'}</TableCell>
                <TableCell>{d.registrationNumber ?? '—'}</TableCell>
                <TableCell>{d.lastLocationAt ? new Date(d.lastLocationAt).toLocaleTimeString('en-IN') : 'never'}</TableCell>
                <TableCell className="space-x-2">
                  {canApprove && d.approvalState !== 'APPROVED' && (
                    <Button size="sm" variant="outline" disabled={approve.isPending} onClick={() => approve.mutate(d.driverId)} data-testid={`approve-${d.driverId}`}>
                      Approve
                    </Button>
                  )}
                  {canSuspend && d.approvalState === 'APPROVED' && (
                    <Button size="sm" variant="destructive" onClick={() => setSuspendTarget(d.driverId)} data-testid={`suspend-${d.driverId}`}>
                      Suspend
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={Boolean(suspendTarget)} onOpenChange={(open) => !open && setSuspendTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Suspend driver (audited)</DialogTitle></DialogHeader>
          <Textarea placeholder="Reason (required)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={reason.trim().length < 4 || suspend.isPending}
              onClick={() => suspendTarget && suspend.mutate({ driverId: suspendTarget, r: reason.trim() })}
            >
              Suspend
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
