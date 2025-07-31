declare module 'express' {
  export interface Request {
    user?: {
      driverId: string;
      id: string;
      userId: string;
      email: string;
      role: string;
      tenantId: string;
    };
  }
}
