import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import * as admin from 'firebase-admin';

@WebSocketGateway({
  namespace: '/',
  pingInterval: 25000,
  pingTimeout: 50000,
  maxHttpBufferSize: 1e6,
  allowEIO3: true,
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, Set<string>>();

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token;

      if (!token) {
        client.emit('error', { message: 'Token de autenticação necessário' });
        client.disconnect();
        return;
      }

      try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        const userId = decodedToken.uid; // O ID do usuário no Firebase é 'uid'

        if (!this.connectedUsers.has(userId)) {
          this.connectedUsers.set(userId, new Set());
        }
        this.connectedUsers.get(userId)!.add(client.id);

        client.data.userId = userId;
        client.emit('connected', { message: 'Conectado com sucesso' });
      } catch (error) {
        // O erro pode ser de token inválido, expirado, etc.
        client.emit('error', {
          message: 'Autenticação falhou: Token inválido',
        });
        client.disconnect();
        return;
      }
    } catch (err) {
      client.emit('error', { message: 'Erro interno do servidor' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;

    if (userId && this.connectedUsers.has(userId)) {
      const sockets = this.connectedUsers.get(userId)!;
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.connectedUsers.delete(userId);
      }
    }
  }

  @SubscribeMessage('register')
  handleRegister(client: Socket, userId: string): void {
    if (client.data.userId === userId) {
      client.emit('registered', {
        message: 'Registro confirmado',
        userId,
      });
    } else {
      client.emit('error', {
        message: 'ID de usuário não corresponde ao token',
      });
    }
  }

  @SubscribeMessage('ping')
  handlePing(client: Socket): void {
    client.emit('pong', { timestamp: Date.now() });
  }

  sendToUser(userId: string, event: string, data: any): void {
    try {
      if (!userId) {
        return;
      }

      if (!this.connectedUsers) {
        return;
      }

      const socketIds = this.connectedUsers.get(userId);

      if (!socketIds || socketIds.size === 0) {
        return;
      }

      const socketsToRemove: string[] = [];

      socketIds.forEach((socketId) => {
        try {
          if (!this.server?.sockets?.sockets) {
            return;
          }

          const socket = this.server.sockets.sockets.get(socketId);

          if (!socket) {
            socketsToRemove.push(socketId);
            return;
          }

          if (!socket.connected) {
            socketsToRemove.push(socketId);
            return;
          }

          socket.emit(event, {
            ...data,
            timestamp: Date.now(),
            eventType: event,
          });
        } catch (socketError) {
          socketsToRemove.push(socketId);
        }
      });

      socketsToRemove.forEach((socketId) => {
        socketIds.delete(socketId);
      });

      if (socketIds.size === 0) {
        this.connectedUsers.delete(userId);
      }
    } catch (error) {
      // Silent error handling
    }
  }

  getConnectionStats(): {
    totalUsers: number;
    totalConnections: number;
    users: Array<{ userId: string; connections: number }>;
  } {
    const users = Array.from(this.connectedUsers.entries()).map(
      ([userId, sockets]) => ({
        userId,
        connections: sockets.size,
      }),
    );

    return {
      totalUsers: this.connectedUsers.size,
      totalConnections: users.reduce((sum, user) => sum + user.connections, 0),
      users,
    };
  }
}
