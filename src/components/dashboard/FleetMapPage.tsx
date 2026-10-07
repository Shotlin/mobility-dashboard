import { useState } from 'react';
import Map, { Marker, Source, Layer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useReferenceData, useFleetSnapshot } from '../../services/fleetService';
import { Badge } from '../common/Badge';

const DEMO_STYLE = 'https://demotiles.maplibre.org/style.json';

/** Fleet map (spec 11 §3): clustered driver markers, searching pickups,
 * zone/category filters, freshness indicator. Throttled snapshot polling. */
export function FleetMapPage() {
  const refs = useReferenceData();
  const [cityId, setCityId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const { drivers, rides, searching, error } = useFleetSnapshot(cityId || null, categoryId || null);

  const searchingGeojson = {
    type: 'FeatureCollection' as const,
    features: searching.map((r) => ({
      type: 'Feature' as const,
      properties: { rideId: r.rideId, ageS: r.searchAgeS ?? 0 },
      geometry: { type: 'Point' as const, coordinates: [r.pickup.lng, r.pickup.lat] },
    })),
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Live Fleet Map</h1>
        <p className="text-sm text-muted-foreground">City/category filtered; snapshots every 10s with deltas via ops rooms.</p>
      </div>

      <div className="flex gap-2">
        <select className="border rounded px-2 text-sm" value={cityId} onChange={(e) => setCityId(e.target.value)} data-testid="map-city">
          <option value="">Select city…</option>
          {refs.cities.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select className="border rounded px-2 text-sm" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} data-testid="map-category">
          <option value="">Select category…</option>
          {refs.categories.map((c) => (
            <option key={c.id} value={c.id}>{c.display_name}</option>
          ))}
        </select>
        <Badge variant="info">{drivers.length} online</Badge>
        <Badge variant={searching.length > 0 ? 'warning' : 'neutral'}>{searching.length} searching</Badge>
      </div>

      {error && <p className="text-sm text-red-600" data-testid="map-error">{error}</p>}

      <div className="h-[520px] rounded-md border overflow-hidden" data-testid="fleet-map">
        {cityId && categoryId ? (
          <Map
            initialViewState={{ longitude: 88.36, latitude: 22.57, zoom: 10 }}
            style={{ width: '100%', height: '100%' }}
            mapStyle={DEMO_STYLE}
          >
            <Source id="searching-pickups" type="geojson" data={searchingGeojson}>
              <Layer
                id="searching-pickups-circle"
                type="circle"
                paint={{ 'circle-radius': 9, 'circle-color': '#f59e0b', 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' }}
              />
            </Source>
            {drivers
              .filter((d) => d.location && Number.isFinite(d.location.lat))
              .map((d) => (
                <Marker key={d.driverId} longitude={d.location.lng} latitude={d.location.lat} anchor="center">
                  <span
                    title={`${d.fullName ?? d.driverId} · ${d.freshnessS}s ago`}
                    className={`block h-3 w-3 rounded-full border border-white shadow ${
                      d.operationalState === 'ON_TRIP' || d.operationalState === 'TO_PICKUP' ? 'bg-sky-500' : 'bg-emerald-500'
                    }`}
                  />
                </Marker>
              ))}
          </Map>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Select a city and vehicle category to load the fleet snapshot.
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Green = idle · Blue = to pickup / on trip · Amber circles = searching ride pickups. Marker opacity decays with GPS staleness (spec 11 §3 driver freshness indicator).
      </p>
    </div>
  );
}
