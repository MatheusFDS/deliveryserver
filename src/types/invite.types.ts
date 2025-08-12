export enum InviteStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export interface UserInvite {
  id: string;
  email: string;
  roleId: string;
  tenantId?: string | null;
  invitedBy: string;
  status: InviteStatus;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  role: {
    id: string;
    name: string;
    isPlatformRole: boolean;
  };
  tenant?: {
    id: string;
    name: string;
  } | null;
  inviter: {
    id: string;
    name: string;
  };
}

export interface InviteDetails {
  id: string;
  email: string;
  role: {
    name: string;
    isPlatformRole: boolean;
  };
  tenant?: {
    name: string;
  } | null;
  inviter: {
    name: string;
  };
  expiresAt: Date;
}

export interface AcceptInviteDto {
  firebaseUid: string;
  name: string;
  email: string;
}

export interface AcceptInviteResponse {
  message: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: {
      name: string;
    };
    tenant?: {
      name: string;
    } | null;
  };
}

export interface InviteEmailParams {
  email: string;
  inviterName: string;
  roleName: string;
  tenantName?: string;
  inviteToken: string;
  expiresAt: Date;
}

export interface PaginatedInvitesResponse {
  data: UserInvite[];
  total: number;
  page: number;
  pageSize: number;
  lastPage: number;
}
