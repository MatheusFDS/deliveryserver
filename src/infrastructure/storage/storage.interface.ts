// src/infrastructure/storage/storage.interface.ts

export const STORAGE_PROVIDER = 'StorageProvider';

/**
 * Representa o arquivo a ser salvo.
 * O buffer contém os dados binários do arquivo.
 */
export interface FilePayload {
  fileName: string;
  buffer: Buffer;
  mimetype: string;
}

/**
 * Define o contrato para um provedor de armazenamento.
 */
export interface IStorageProvider {
  /**
   * Salva um arquivo em um destino de armazenamento.
   * @param file O payload do arquivo a ser salvo.
   * @param folder A pasta/prefixo onde o arquivo deve ser salvo.
   * @returns O caminho público relativo do arquivo salvo.
   */
  save(file: FilePayload, folder: string): Promise<string>;
}
