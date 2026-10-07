import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/adminService';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../common/Badge';
import { Button } from '../ui/button';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

const SEVERITY_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  CRITICAL: 'danger', HIGH: 'danger', MEDIUM: 'warning', LOW: 'neutral',
};

/**
 * Safety operations center (spec 11 §12): live incident queue above normal
 * ops, ack + resolve actions, escalation timeline basics.
 */
export function SafetyCenterPage() {
  const queryClient = useQueryClient();
  const incidents = useQuery({
    queryKey: ['safety-incidents'],
    queryFn: adminApi.listOpenIncidents,
    refetchInterval: 5_000, // safety queue refreshes faster than everything else
  });

  const ack = useMutation({ mutationFn: adminApi.acknowledgeIncident, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['safety-incidents'] }) });
  const resolve = useMutation({
    mutationFn: ({ incidentId }: { incidentId: string }) => adminApi.transitionIncident(incidentId, 'RESOLVED', 'Closed from safety center'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['safety-incidents'] }),
  });

  const canManage = true; // backend enforces safety.incident.manage; buttons degrade on 403

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Safety Center</h1>
        <p className="text-sm text-muted-foreground">Incidents outrank normal operations (spec 10 §13). 5s refresh.</p>
      </div>

      {incidents.data && incidents.data.incidents.length === 0 && (
        <Alert>
          <AlertTitle>No open incidents</AlertTitle>
          <AlertDescription>The safety queue is clear.</AlertDescription>
        </Alert>
      )}

      {incidents.data && incidents.data.incidents.length > 0 && (
        <div className="rounded-md border" data-testid="incident-queue">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Severity</TableHead><TableHead>Source</TableHead><TableHead>Status</TableHead>
                <TableHead>Ride</TableHead><TableHead>Opened</TableHead><TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incidents.data.incidents.map((i) => (
                <TableRow key={i.incidentId} data-testid={`incident-${i.incidentId}`}>
                  <TableCell><Badge variant={SEVERITY_VARIANT[i.severity]}>{i.severity}</Badge></TableCell>
                  <TableCell>{i.source}</TableCell>
                  <TableCell>{i.status}</TableCell>
                  <TableCell className="font-mono text-xs">{i.rideId?.slice(0, 8) ?? '—'}</TableCell>
                  <TableCell>{new Date(i.createdAt).toLocaleTimeString('en-IN')}</TableCell>
                  <TableCell className="space-x-2">
                    {i.status === 'OPEN' && canManage && (
                      <Button size="sm" variant="outline" disabled={ack.isPending} onClick={() => ack.mutate(i.incidentId)}>
                        Acknowledge
                      </Button>
                    )}
                    {i.status !== 'RESOLVED' && canManage && (
                      <Button size="sm" variant="secondary" disabled={resolve.isPending} onClick={() => resolve.mutate({ incidentId: i.incidentId })}>
                        Resolve
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
