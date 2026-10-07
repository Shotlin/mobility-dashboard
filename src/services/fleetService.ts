/**
 * Fleet map data layer (spec 11 §3) — snapshot polling + socket deltas.
 * MapLibre renders markers; this hook owns the data so the map component
 * stays thin and the data layer is unit-testable (jsdom has no WebGL).
 */

import { useEffect, useMemo, useState } from 'react';
import { apiClient } from './apiClient';
import type { AdminDriver, AdminRide } from '../types';

export interface LiveDriver extends AdminDriver {
  location: { lat: number; lng: number };
  freshnessS: number;
}

export interface LiveRide {
  rideId: string;
  status: string;
  searchAgeS: number | null;
  waveCount: number;
  pickup: { lat: number; lng: number };
  category: string;
}

interface Reference {
  cities: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; code: string; display_name: string }>;
}

export function useReferenceData() {
  const [refs, setRefs] = useState<Reference>({ cities: [], categories: [] });
  useEffect(() => {
    // Reference data comes from public config endpoints; keep it cached.
    void Promise.all([
      apiClient.get<{ id: string; name: string }[]>('/api/v1/admin/reference/cities').catch(() => []),
      apiClient.get<{ id: string; code: string; display_name: string }[]>('/api/v1/admin/reference/categories').catch(() => []),
    ]).then(([cities, categories]) => setRefs({ cities, categories }));
  }, []);
  return refs;
}

export function useFleetSnapshot(cityId: string | null, vehicleCategoryId: string | null) {
  const [drivers, setDrivers] = useState<LiveDriver[]>([]);
  const [rides, setRides] = useState<LiveRide[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cityId || !vehicleCategoryId) {
      setDrivers([]);
      setRides([]);
      return;
    }
    let cancelled = false;

    async function poll() {
      try {
        const [d, r] = await Promise.all([
          apiClient.get<{ drivers: LiveDriver[] }>('/api/v1/admin/live/drivers', { cityId, vehicleCategoryId }),
          apiClient.get<{ rides: LiveRide[] }>('/api/v1/admin/live/rides', { cityId }),
        ]);
        if (cancelled) return;
        setDrivers(d.drivers);
        setRides(r.rides);
        setError(null);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      }
    }

    void poll();
    const timer = setInterval(poll, 10_000); // throttled snapshot polling (spec 11 §17)
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [cityId, vehicleCategoryId]);

  const searching = useMemo(() => rides.filter((r) => r.status === 'SEARCHING'), [rides]);

  return { drivers, rides, searching, error };
}
