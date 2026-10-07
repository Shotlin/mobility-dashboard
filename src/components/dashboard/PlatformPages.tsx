import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/adminService';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Input } from '../ui/input';

type OlaStatus = {
  connected: boolean;
  keyHint: string | null;
  source: 'dashboard' | 'env' | null;
  lastTestAt: string | null;
  lastTestStatus: string | null;
  updatedAt: string | null;
};

/**
 * Ola Maps connection (spec 11 §10) — paste the provider key here; the
 * backend probes it live and stores it (AES-256-GCM encrypted, write-only)
 * ONLY when the probe succeeds. The key is never shown again, only ••••last4.
 */
function OlaMapsConnectionCard() {
  const queryClient = useQueryClient();
  const [apiKey, setApiKey] = useState('');
  const [testError, setTestError] = useState<string | null>(null);

  const status = useQuery({ queryKey: ['ola-maps-status'], queryFn: adminApi.getOlaMaps });
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['ola-maps-status'] });
    queryClient.invalidateQueries({ queryKey: ['system-health'] });
  };

  const connect = useMutation({
    mutationFn: (key: string) => adminApi.connectOlaMaps(key),
    onSuccess: () => {
      setApiKey('');
      setTestError(null);
      invalidate();
    },
    onError: (err: Error) => setTestError(err.message),
  });

  const testOnly = useMutation({
    mutationFn: (key: string) => adminApi.testOlaMaps(key),
    onSuccess: (res) => {
      setTestError(res.ok ? null : (res.error ?? 'Connection test failed'));
      if (res.ok) invalidate();
    },
    onError: (err: Error) => setTestError(err.message),
  });

  const disconnect = useMutation({
    mutationFn: () => adminApi.disconnectOlaMaps(),
    onSuccess: () => {
      setTestError(null);
      invalidate();
    },
  });

  const st: OlaStatus | undefined = status.data;
  const busy = connect.isPending || testOnly.isPending || disconnect.isPending;

  return (
    <Card data-testid="ola-maps-card">
      <CardHeader>
        <CardTitle className="text-sm">Ola Maps connection</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${st?.connected ? 'bg-emerald-500' : 'bg-zinc-400'}`}
            data-testid="ola-maps-dot"
          />
          {status.isLoading ? (
            <span className="text-muted-foreground">Checking connection…</span>
          ) : st?.connected ? (
            <span>
              Connected <span className="text-muted-foreground">({st.keyHint})</span>
            </span>
          ) : st?.source === 'env' ? (
            <span>
              Connected via server environment <span className="text-muted-foreground">(key from .env, not editable here)</span>
            </span>
          ) : (
            <span className="text-muted-foreground">Not connected</span>
          )}
        </div>

        {st?.lastTestStatus && (
          <div className="text-xs text-muted-foreground">
            Last test: {st.lastTestStatus}
            {st.lastTestAt ? ` · ${new Date(st.lastTestAt).toLocaleString()}` : ''}
          </div>
        )}

        <div className="flex gap-2">
          <Input
            type="password"
            placeholder="Paste Ola Maps API key…"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            disabled={busy}
            className="max-w-sm"
            data-testid="ola-maps-key-input"
          />
          <Button
            variant="outline"
            disabled={busy || apiKey.trim().length < 8}
            onClick={() => testOnly.mutate(apiKey.trim())}
          >
            {testOnly.isPending ? 'Testing…' : 'Test'}
          </Button>
          <Button
            disabled={busy || apiKey.trim().length < 8}
            onClick={() => connect.mutate(apiKey.trim())}
            data-testid="ola-maps-connect"
          >
            {connect.isPending ? 'Testing & connecting…' : 'Test & Connect'}
          </Button>
          {st?.connected && st?.source === 'dashboard' && (
            <Button variant="ghost" disabled={busy} onClick={() => disconnect.mutate()}>
              Disconnect
            </Button>
          )}
        </div>

        {testError && (
          <Alert variant="destructive">
            <AlertTitle>Connection test failed — not connected</AlertTitle>
            <AlertDescription>{testError}</AlertDescription>
          </Alert>
        )}
        <p className="text-xs text-muted-foreground">
          The key is tested against Ola's live API first; it is saved (encrypted, write-only) only when the test
          passes. It is never displayed again and never leaves the server.
        </p>
      </CardContent>
    </Card>
  );
}

/** System health page (spec 11 §15) — read-only, no secrets. */
export function SystemHealthPage() {
  const health = useQuery({ queryKey: ['system-health'], queryFn: adminApi.systemHealth, refetchInterval: 15_000 });

  if (health.isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading health…</div>;
  const h = health.data;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">System Health</h1>
        <p className="text-sm text-muted-foreground">Read-only operational health. No secrets are exposed (spec 11 §15).</p>
      </div>
      {!h ? (
        <Alert variant="destructive"><AlertTitle>Unreachable</AlertTitle><AlertDescription>Health endpoint did not respond.</AlertDescription></Alert>
      ) : (
        <>
          <Card>
            <CardHeader><CardTitle className="text-sm">Dependencies</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div>PostgreSQL: <span className={h.postgres === 'up' ? 'text-emerald-600' : 'text-red-600'}>{h.postgres}</span></div>
              <div>Ola Maps configured: {h.olaMapsConfigured ? 'yes' : 'no'}</div>
              {Object.entries(h.redisClients).map(([name, status]) => (
                <div key={name}>Redis {name}: <span className={status === 'up' ? 'text-emerald-600' : 'text-amber-600'}>{status}</span></div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Queues (waiting / active / failed)</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              {Object.entries(h.queues).map(([name, q]) => (
                <div key={name} data-testid={`queue-${name}`}>
                  {name}: {q.waiting ?? '—'} / {q.active ?? '—'} / {q.failed ?? '—'}
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

/** Platform controls (spec 11 §14): maintenance mode + minimum app versions. */
export function PlatformPage() {
  const queryClient = useQueryClient();
  const platform = useQuery({ queryKey: ['platform'], queryFn: adminApi.getPlatform });
  const save = useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) => adminApi.setPlatform(key, value),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['platform'] }),
  });

  const maintenanceEnabled = Boolean(
    (platform.data?.maintenance_mode?.value as { enabled?: boolean } | undefined)?.enabled,
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Platform Controls</h1>
        <p className="text-sm text-muted-foreground">Maintenance mode, minimum app versions. All changes audited.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Maintenance mode</CardTitle></CardHeader>
        <CardContent className="flex items-center gap-3">
          <Switch
            data-testid="maintenance-switch"
            checked={maintenanceEnabled}
            disabled={save.isPending}
            onCheckedChange={(enabled) => save.mutate({ key: 'maintenance_mode', value: { enabled } })}
          />
          <span className="text-sm">{maintenanceEnabled ? 'MAINTENANCE ON — bookings blocked (safety/health exempt)' : 'Off'}</span>
        </CardContent>
      </Card>

      <OlaMapsConnectionCard />

      <Card>
        <CardHeader><CardTitle className="text-sm">Minimum app versions</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Managed via PATCH /api/v1/admin/platform/min_passenger_app_version and min_driver_app_version.
        </CardContent>
      </Card>
    </div>
  );
}
