import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';

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

  private readonly logger = new Logger(NotificationGateway.name);
  private connectedUsers = new Map<string, Set<string>>();

  async handleConnection(client: Socket) {
    try {
      this.logger.log(`Tentativa de conexão: ${client.id}`);

      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '') ||
        client.handshake.query?.token;

      if (!token) {
        this.logger.warn(`Conexão recusada: token ausente (${client.id})`);
        client.emit('error', { message: 'Token de autenticação necessário' });
        client.disconnect();
        return;
      }

      let decoded: any;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET || 'sua_chave_aqui');
      } catch (jwtError) {
        this.logger.warn(`Token inválido (${client.id}): ${jwtError.message}`);
        client.emit('error', { message: 'Token inválido' });
        client.disconnect();
        return;
      }

      const userId = decoded?.sub || decoded?.userId;

      if (!userId) {
        this.logger.warn(`Token sem userId (${client.id})`);
        client.emit('error', { message: 'Token não contém ID do usuário' });
        client.disconnect();
        return;
      }

      if (!this.connectedUsers.has(userId)) {
        this.connectedUsers.set(userId, new Set());
      }
      this.connectedUsers.get(userId)!.add(client.id);

      client.data.userId = userId;
      client.data.connectedAt = new Date();

      this.logger.log(`Cliente conectado: ${client.id} (usuário ${userId})`);

      client.emit('connected', {
        message: 'Conectado com sucesso',
        userId,
        socketId: client.id,
      });
    } catch (err) {
      this.logger.error(
        `Falha na autenticação do socket (${client.id})`,
        err.message,
      );
      client.emit('error', { message: 'Erro interno do servidor' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    const connectedAt = client.data.connectedAt;
    const duration = connectedAt ? Date.now() - connectedAt.getTime() : 0;

    if (userId && this.connectedUsers.has(userId)) {
      const sockets = this.connectedUsers.get(userId)!;
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.connectedUsers.delete(userId);
      }
      this.logger.log(
        `Cliente desconectado: ${client.id} (usuário ${userId}, duração: ${duration}ms)`,
      );
    } else {
      this.logger.log(
        `Cliente desconectado: ${client.id} (sem usuário associado, duração: ${duration}ms)`,
      );
    }
  }

  @SubscribeMessage('register')
  handleRegister(client: Socket, userId: string): void {
    if (client.data.userId === userId) {
      this.logger.log(
        `Usuário ${userId} confirmou registro no socket ${client.id}`,
      );
      client.emit('registered', {
        message: 'Registro confirmado',
        userId,
      });
    } else {
      this.logger.warn(
        `Tentativa de registro inválida: token userId=${client.data.userId}, registro userId=${userId}`,
      );
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
        this.logger.warn('UserId é obrigatório para envio de notificação');
        return;
      }

      if (!this.connectedUsers) {
        this.logger.error('Map de usuários conectados não foi inicializado');
        return;
      }

      const socketIds = this.connectedUsers.get(userId);

      if (!socketIds || socketIds.size === 0) {
        this.logger.warn(
          `Usuário ${userId} não está conectado para receber evento '${event}'`,
        );
        return;
      }

      this.logger.log(
        `Enviando evento '${event}' para usuário ${userId} (${socketIds.size} conexões)`,
      );

      const socketsToRemove: string[] = [];

      socketIds.forEach((socketId) => {
        try {
          if (!this.server?.sockets?.sockets) {
            this.logger.error('Server sockets não está disponível');
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
          this.logger.error(
            `Erro ao enviar para socket ${socketId}:`,
            socketError,
          );
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
      this.logger.error(
        `Erro geral no sendToUser para usuário ${userId}:`,
        error,
      );
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
