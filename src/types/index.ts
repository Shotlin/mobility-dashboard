/** Shared dashboard types for the mobility ops console. */

export type ScopeLocation = string;

export type UserRole =
  | 'SUPER_ADMIN'
  | 'OPERATIONS'
  | 'CITY_OPERATIONS'
  | 'DRIVER_KYC_REVIEWER'
  | 'FINANCE'
  | 'SAFETY_OPERATOR'
  | 'SUPPORT'
  | 'READ_ONLY_ANALYST';

export interface CommandCenterData {
  rides: {
    searching: number;
    enRoute: number;
    inProgress: number;
    noDriver24h: number;
    cancelled24h: number;
    completed24h: number;
    avgDispatchSeconds: number;
  };
  drivers: {
    onlineTotal: number;
    idle: number;
    onTrip: number;
    pendingKyc: number;
    suspended: number;
  };
  activeSafetyIncidents: number;
  pendingPayments: number;
}

export interface AdminRide {
  rideId: string;
  status: string;
  rideVersion: number;
  paymentMethod: string;
  createdAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
  finalTotalPaise: number | null;
  searchWaveCount: number;
  noDriverReason: string | null;
  pickup: { lat: number; lng: number };
  drop: { lat: number; lng: number };
  category: string;
  passengerPhone: string;
  driverPhone: string | null;
  registrationNumber: string | null;
  incidentCount: number;
}

export interface AdminDriver {
  driverId: string;
  fullName: string | null;
  phone: string;
  approvalState: string;
  operationalState: string;
  totalRides: number;
  rating: number | null;
  lastLocationAt: string | null;
  registrationNumber: string | null;
  model: string | null;
  city: string | null;
}

export interface SafetyIncident {
  incidentId: string;
  rideId: string | null;
  reporterId: string | null;
  reporterRole: string | null;
  source: string;
  severity: string;
  status: string;
  createdAt: string;
  acknowledgedAt: string | null;
  latestLocation: { lat: number; lng: number } | null;
}
