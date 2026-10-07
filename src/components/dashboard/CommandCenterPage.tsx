import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/adminService';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

function Kpi({ title, value, tone }: { title: string; value: string | number; tone?: 'danger' | 'warn' | 'ok' }) {
  const toneClass = tone === 'danger' ? 'text-red-600' : tone === 'warn' ? 'text-amber-600' : tone === 'ok' ? 'text-emerald-600' : '';
  return (
    <Card data-testid={`kpi-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardHeader className="pb-1">
        <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-semibold ${toneClass}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

/** Home / Command Center — live KPIs (spec 11 §2). */
export function CommandCenterPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['command-center'],
    queryFn: adminApi.commandCenter,
    refetchInterval: 10_000,
  });

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading live KPIs…</div>;
  if (isError) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTitle>Command center unavailable</AlertTitle>
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      </div>
    );
  }
  const d = data!;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Command Center</h1>
        <p className="text-sm text-muted-foreground">Live supply, demand, and platform health (10s refresh).</p>
      </div>

      {d.activeSafetyIncidents > 0 && (
        <Alert data-testid="safety-alert" className="border-red-300 bg-red-50">
          <AlertTitle className="text-red-700">{d.activeSafetyIncidents} active safety incident(s)</AlertTitle>
          <AlertDescription>Open the Safety Center — incidents outrank normal operations (spec 10 §13).</AlertDescription>
        </Alert>
      )}

      <section>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Supply</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Kpi title="Drivers Online" value={d.drivers.onlineTotal} />
          <Kpi title="Idle" value={d.drivers.idle} />
          <Kpi title="On Trip / To Pickup" value={d.drivers.onTrip} />
          <Kpi title="Pending KYC" value={d.drivers.pendingKyc} tone={d.drivers.pendingKyc > 0 ? 'warn' : undefined} />
          <Kpi title="Suspended" value={d.drivers.suspended} />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Demand (24h)</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <Kpi title="Searching Now" value={d.rides.searching} tone={d.rides.searching > 0 ? 'warn' : 'ok'} />
          <Kpi title="En Route" value={d.rides.enRoute} />
          <Kpi title="In Progress" value={d.rides.inProgress} />
          <Kpi title="No Driver Found" value={d.rides.noDriver24h} tone={d.rides.noDriver24h > 5 ? 'danger' : undefined} />
          <Kpi title="Cancellations" value={d.rides.cancelled24h} />
          <Kpi title="Completed" value={d.rides.completed24h} tone="ok" />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Dispatch & Payments</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-2">
          <Kpi title="Avg Dispatch Time (24h)" value={`${d.rides.avgDispatchSeconds}s`} />
          <Kpi title="Payments Pending" value={d.pendingPayments} tone={d.pendingPayments > 0 ? 'warn' : 'ok'} />
        </div>
      </section>
    </div>
  );
}
