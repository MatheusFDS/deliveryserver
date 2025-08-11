// src/infrastructure/notifications/notification.gateway.ts

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
  // Remove o cors daqui para usar a configuração do CustomIoAdapter
  namespace: '/',
  pingInterval: 25000, // 25s
  pingTimeout: 50000, // 50s
  maxHttpBufferSize: 1e6, // 1MB
  allowEIO3: true, // Compatibilidade com versões anteriores
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);

  // userId -> Set de socketIds
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

      // Valida token
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

      // Registra conexão
      if (!this.connectedUsers.has(userId)) {
        this.connectedUsers.set(userId, new Set());
      }
      this.connectedUsers.get(userId)!.add(client.id);

      // Salva dados no socket
      client.data.userId = userId;
      client.data.connectedAt = new Date();

      this.logger.log(`Cliente conectado: ${client.id} (usuário ${userId})`);

      // Confirma conexão bem-sucedida
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
    // Valida se o userId bate com o do token
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
    const socketIds = this.connectedUsers.get(userId);
    if (socketIds && socketIds.size > 0) {
      this.logger.log(
        `Enviando evento '${event}' para usuário ${userId} (${socketIds.size} conexões)`,
      );
      socketIds.forEach((socketId) => {
        const socket = this.server.sockets.sockets.get(socketId);
        if (socket && socket.connected) {
          socket.emit(event, {
            ...data,
            timestamp: Date.now(),
            eventType: event,
          });
        } else {
          // Remove socket desconectado
          socketIds.delete(socketId);
        }
      });

      // Limpa usuário se não há mais sockets
      if (socketIds.size === 0) {
        this.connectedUsers.delete(userId);
      }
    } else {
      this.logger.warn(
        `Não foi possível enviar evento '${event}'. Usuário ${userId} não está conectado.`,
      );
    }
  }

  // Método para obter estatísticas de conexão
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
