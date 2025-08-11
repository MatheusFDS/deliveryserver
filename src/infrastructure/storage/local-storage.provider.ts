// src/infrastructure/storage/local-storage.provider.ts

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as sharp from 'sharp';
import { IStorageProvider, FilePayload } from './storage.interface';

@Injectable()
export class LocalStorageProvider implements IStorageProvider {
  async save(file: FilePayload, folder: string): Promise<string> {
    try {
      const uploadsDir = path.join(process.cwd(), 'uploads', folder);

      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const filePath = path.join(uploadsDir, file.fileName);

      // Otimiza a imagem antes de salvar
      await sharp(file.buffer)
        .resize(800, 600, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 75 })
        .toFile(filePath);

      // Retorna o caminho público relativo que será usado na URL
      return `/uploads/${folder}/${file.fileName}`;
    } catch (error) {
      throw new InternalServerErrorException(
        'Falha ao salvar o arquivo no servidor.',
      );
    }
  }
}
