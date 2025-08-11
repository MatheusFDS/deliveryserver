// src/infrastructure/storage/failover-storage.provider.ts

import { Injectable, Logger } from '@nestjs/common';
import { IStorageProvider, FilePayload } from './storage.interface';
import { CloudinaryStorageProvider } from './cloudinary-storage.provider';
import { LocalStorageProvider } from './local-storage.provider';

@Injectable()
export class FailoverStorageProvider implements IStorageProvider {
  private readonly logger = new Logger(FailoverStorageProvider.name);

  constructor(
    private readonly primaryProvider: CloudinaryStorageProvider,
    private readonly fallbackProvider: LocalStorageProvider,
  ) {}

  async save(file: FilePayload, folder: string): Promise<string> {
    try {
      this.logger.log(
        `Tentando upload com o provedor primário (Cloudinary)...`,
      );
      const primaryUrl = await this.primaryProvider.save(file, folder);
      this.logger.log(`Upload primário bem-sucedido: ${primaryUrl}`);
      return primaryUrl;
    } catch (error) {
      this.logger.error(
        `Falha no provedor primário (Cloudinary). Acionando fallback para Local Storage.`,
        error instanceof Error ? error.stack : String(error),
      );

      try {
        const fallbackUrl = await this.fallbackProvider.save(file, folder);
        this.logger.log(`Upload de fallback bem-sucedido: ${fallbackUrl}`);
        return fallbackUrl;
      } catch (fallbackError) {
        this.logger.error(
          `Falha crítica: O provedor de fallback (Local Storage) também falhou.`,
          fallbackError instanceof Error
            ? fallbackError.stack
            : String(fallbackError),
        );
        throw fallbackError;
      }
    }
  }
}
