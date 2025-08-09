// src/routes/providers/routes.providers.ts

// Justificativa: Este arquivo centraliza a configuração da injeção de dependência
// para os adaptadores do módulo de rotas. Ele nos permite trocar a implementação
// de um serviço externo (como o provedor de mapas) em um único local.

import { Provider } from '@nestjs/common';
import { MAPS_ADAPTER } from '../interfaces/maps-adapter.interface';
import { GoogleMapsAdapter } from '../adapters/google-maps.adapter';

// Este array contém todos os provedores customizados para o módulo de rotas.
export const routesProviders: Provider[] = [
  {
    // O 'provide' é o token que será usado para injetar a dependência.
    provide: MAPS_ADAPTER,

    // O 'useClass' é a classe concreta que o NestJS vai instanciar e injetar
    // sempre que o token MAPS_ADAPTER for solicitado.
    useClass: GoogleMapsAdapter,
  },
  // Se tivéssemos outros adaptadores (ex: FreightAdapter), eles seriam adicionados aqui.
];
