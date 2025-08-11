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
}
