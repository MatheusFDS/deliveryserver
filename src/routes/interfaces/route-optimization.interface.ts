// src/routes/interfaces/route-optimization.interface.ts

import { OptimizeRouteDto } from '../dto/optimize-route.dto';

// --- Tipos Base ---

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Waypoint {
  id: string;
  address: string;
  clientName?: string;
  orderNumber?: string;
}

// --- Tipos de Resultado da API ---

export interface OptimizedRouteResult {
  optimizedWaypoints: Array<
    Waypoint & {
      order: number;
      distanceFromPreviousInMeters: number;
      durationFromPreviousInSeconds: number;
    }
  >;
  totalDistanceInMeters: number;
  totalDurationInSeconds: number;
  polyline: string;
  hasTolls: boolean;
  mapUrl?: string;
}

export interface DistanceResult {
  distanceInMeters: number;
  durationInSeconds: number;
}

// CORREÇÃO APLICADA AQUI
// A interface agora tem 'lat' e 'lng' no nível principal,
// alinhando-se com a implementação do adapter e com o uso no frontend.
export interface GeocodeResult {
  originalAddress: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  success: boolean;
  error?: string;
}

export interface RouteLeg {
  startAddress: string;
  endAddress: string;
  distanceInMeters: number;
  durationInSeconds: number;
}

export interface InteractiveRouteResult {
  totalDistanceInMeters: number;
  totalDurationInSeconds: number;
  polyline: string;
  legs: RouteLeg[];
}

export interface StaticMapResult {
  mapUrl: string;
}

// --- Interface do Adaptador ---

export const MAPS_ADAPTER = 'MapsAdapter';

export interface IMapsAdapter {
  optimizeRoute(options: OptimizeRouteDto): Promise<OptimizedRouteResult>;

  calculateDistance(
    origin: string | LatLng,
    destination: string | LatLng,
  ): Promise<DistanceResult>;

  geocodeAddresses(addresses: string[]): Promise<GeocodeResult[]>;

  calculateInteractiveRoute(
    origin: LatLng,
    destination: LatLng,
    waypoints: LatLng[],
  ): Promise<InteractiveRouteResult>;

  generateStaticMapUrl(options: {
    markers: Array<{ location: LatLng; label?: string; color?: string }>;
    polyline?: string;
    size?: string;
  }): Promise<StaticMapResult>;
}
