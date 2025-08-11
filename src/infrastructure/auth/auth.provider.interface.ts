// src/infrastructure/auth/auth.provider.interface.ts

import { User as PrismaUser } from '@prisma/client';

export const AUTH_PROVIDER = 'AuthProvider';

/**
 * Representa o payload de um token após ser decodificado e validado
 * pelo provedor externo (ex: Firebase).
 */
export interface DecodedToken {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
}

/**
 * Define o contrato para um provedor de autenticação externa.
 */
export interface IAuthProvider {
  /**
   * Valida um token de ID fornecido pelo cliente.
   * Se o token for inválido, deve lançar uma UnauthorizedException.
   * @param token O ID Token JWT do provedor.
   * @returns O payload decodificado do token.
   */
  validateToken(token: string): Promise<DecodedToken>;

  /**
   * Busca um usuário em nosso banco de dados pelo seu ID externo (firebaseUid).
   * Se não encontrar, cria um novo usuário em nosso banco.
   * @param decodedToken O token decodificado contendo as informações do usuário.
   * @returns O registro completo do usuário do nosso banco de dados (Prisma).
   */
  findOrCreateUser(decodedToken: DecodedToken): Promise<PrismaUser>;
}
