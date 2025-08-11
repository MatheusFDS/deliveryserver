// src/infrastructure/storage/cloudinary-storage.provider.ts

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiErrorResponse,
} from 'cloudinary';
import { IStorageProvider, FilePayload } from './storage.interface';
import * as stream from 'stream';

@Injectable()
export class CloudinaryStorageProvider implements IStorageProvider {
  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
      secure: true,
    });
  }

  async save(file: FilePayload, folder: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          public_id: file.fileName.split('.')[0], // Envia o nome do arquivo sem extensão
          resource_type: 'auto',
        },
        (
          error: UploadApiErrorResponse | undefined,
          result: UploadApiResponse | undefined,
        ) => {
          if (error) {
            return reject(
              new InternalServerErrorException(
                'Falha no upload para o Cloudinary.',
                error.message,
              ),
            );
          }
          if (result) {
            resolve(result.secure_url);
          } else {
            reject(
              new InternalServerErrorException(
                'Resultado do upload do Cloudinary está indefinido.',
              ),
            );
          }
        },
      );

      const bufferStream = new stream.PassThrough();
      bufferStream.end(file.buffer);
      bufferStream.pipe(uploadStream);
    });
  }
}
