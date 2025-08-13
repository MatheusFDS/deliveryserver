export const AUTH_PROVIDER = 'AUTH_PROVIDER';

export interface DecodedToken {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
}

export interface UserWithRole {
  id: string;
  email: string;
  name: string;
  roleId: string;
  tenantId: string | null;
  isActive: boolean;
  firebaseUid: string;
  role: {
    id: string;
    name: string;
    isPlatformRole: boolean;
  };
}

export interface IAuthProvider {
  validateToken(token: string): Promise<DecodedToken>;
  findOrCreateUser(decodedToken: DecodedToken): Promise<UserWithRole>;
  getUserWithRoleDetails(userId: string): Promise<UserWithRole>;

  /**
   * Cria um novo usuário no provedor de autenticação (Firebase).
   */
  createUser(data: {
    email: string;
    password?: string;
    displayName?: string;
  }): Promise<{ uid: string }>;

  /**
   * Atualiza um usuário existente no provedor de autenticação (Firebase).
   */
  updateUser(
    uid: string,
    data: { password?: string; disabled?: boolean; displayName?: string },
  ): Promise<void>;

  /**
   * Deleta um usuário permanentemente do provedor de autenticação (Firebase).
   */
  deleteUser(uid: string): Promise<void>;

  /**
   * Gera um link para o usuário redefinir sua senha.
   */
  generatePasswordResetLink(email: string): Promise<string>;
}
