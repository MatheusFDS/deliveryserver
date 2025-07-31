export interface OptimizedOrder {
  id: string;
  optimizedOrder: number;
  address: string;
  cliente: string;
  numero: string;
  distanceFromPrevious?: number;
  estimatedTime?: number;
}

export interface OptimizeRouteResponse {
  success: boolean;
  optimizedOrders?: OptimizedOrder[];
  totalDistance?: number;
  totalTime?: number;
  mapUrl?: string;
  error?: string;
  polyline?: string;
  hasTolls?: boolean; // Adicionado
}

export interface GoogleMapsDirectionsResponse {
  routes: Array<{
    waypoint_order: number[];
    legs: Array<{
      distance: { text: string; value: number };
      duration: { text: string; value: number };
      start_address: string;
      end_address: string;
      // Propriedades do Google Maps API que podem indicar pedágios
      steps: Array<any>; // Steps podem conter informações sobre pedágios
      tolls?: any[]; // A API do Google Maps pode incluir isso, dependendo da versão/config
    }>;
    overview_polyline: { points: string };
    // Propriedades do Google Maps API que podem indicar pedágios
    warnings?: string[];
    // Outras propriedades obrigatórias para DirectionsRoute
    bounds: {
      northeast: { lat: number; lng: number };
      southwest: { lat: number; lng: number };
    };
    copyrights: string;
    summary: string;
  }>;
  status: string;
}

export interface DistanceCalculationResponse {
  distance: {
    text: string;
    value: number;
  };
  duration: {
    text: string;
    value: number;
  };
}

export interface GeocodeResult {
  address: string;
  lat: number;
  lng: number;
  formatted_address: string;
  success: boolean;
  error?: string;
}

export interface RouteCalculationResult {
  distance: number;
  duration: number;
  polyline: string;
  legs: Array<{
    distance: number;
    duration: number;
    start_address: string;
    end_address: string;
  }>;
}

// Adicione essas duas interfaces ao seu arquivo route-optimization.interface.ts existente

export interface DistanceMatrixResponse {
  status: string;
  rows: {
    elements: {
      status: string;
      distance: {
        text: string;
        value: number;
      };
      duration: {
        text: string;
        value: number;
      };
    }[];
  }[];
}

export interface GeocodeResponse {
  status: string;
  results: {
    formatted_address: string;
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
  }[];
}
