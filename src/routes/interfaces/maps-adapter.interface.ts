// src/routes/interfaces/maps-adapter.interface.ts

// Justificativa: Este arquivo define o contrato de MÉTODOS para qualquer
// provedor de mapas. Qualquer classe que implemente esta interface será
// compatível com o nosso sistema, seja ela para o Google, Mapbox ou uma solução própria.

import {
  DistanceResult,
  GeocodeResult,
  InteractiveRouteResult,
  OptimizedRouteResult,
  StaticMapResult,
  LatLng,
} from './route-optimization.interface';

// Define os dados necessários para otimizar uma rota.
// Usamos o DTO aqui pois ele já define a entrada de dados da nossa API.
import { OptimizeRouteDto } from '../dto/optimize-route.dto';

// Criamos um Injection Token para que a interface IMapsAdapter possa ser injetada.
// O NestJS usará este token para encontrar o provedor concreto (ex: GoogleMapsAdapter).
export const MAPS_ADAPTER = 'MapsAdapter';

export interface IMapsAdapter {
  /**
   * Otimiza uma rota com base em um ponto de partida e uma lista de pedidos (paradas).
   * @param options - Os dados de otimização, como ponto de partida e pedidos.
   * @returns Uma promessa que resolve para um objeto OptimizedRouteResult.
   */
  optimizeRoute(options: OptimizeRouteDto): Promise<OptimizedRouteResult>;

  /**
   * Calcula a distância e a duração entre um ponto de origem e um de destino.
   * @param origin - Endereço ou coordenada de origem.
   * @param destination - Endereço ou coordenada de destino.
   * @returns Uma promessa que resolve para um objeto DistanceResult.
   */
  calculateDistance(
    origin: string | LatLng,
    destination: string | LatLng,
  ): Promise<DistanceResult>;

  /**
   * Converte uma lista de endereços em coordenadas geográficas (Geocoding).
   * @param addresses - Um array de strings de endereço.
   * @returns Uma promessa que resolve para um array de objetos GeocodeResult.
   */
  geocodeAddresses(addresses: string[]): Promise<GeocodeResult[]>;

  /**
   * Calcula uma rota interativa com base em coordenadas.
   * @param origin - Coordenada de origem.
   * @param destination - Coordenada de destino.
   * @param waypoints - Array de coordenadas de paradas intermediárias.
   * @returns Uma promessa que resolve para um objeto InteractiveRouteResult.
   */
  calculateInteractiveRoute(
    origin: LatLng,
    destination: LatLng,
    waypoints: LatLng[],
  ): Promise<InteractiveRouteResult>;

  /**
   * Gera a URL para um mapa estático com base em marcadores e caminhos.
   * @param markers - Pontos a serem marcados no mapa.
   * @param polyline - O polyline codificado para desenhar a rota.
   * @returns Uma promessa que resolve para um objeto StaticMapResult.
   */
  generateStaticMapUrl(options: {
    markers: Array<{ location: LatLng; label?: string; color?: string }>;
    polyline?: string;
    size?: string;
  }): Promise<StaticMapResult>;
}
