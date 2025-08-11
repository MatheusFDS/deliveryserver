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
  cors: { origin: '*' },
  pingInterval: 30000, // 30s
  pingTimeout: 60000, // 60s
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
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Conexão recusada: token ausente (${client.id})`);
        client.disconnect();
        return;
      }

      // Valida token (substituir pela sua chave secreta real)
      const decoded: any = jwt.verify(
        token,
        process.env.JWT_SECRET || 'sua_chave_aqui',
      );
      const userId = decoded?.sub || decoded?.userId;

      if (!userId) {
        this.logger.warn(`Conexão recusada: token inválido (${client.id})`);
        client.disconnect();
        return;
      }

      // Registra conexão
      if (!this.connectedUsers.has(userId)) {
        this.connectedUsers.set(userId, new Set());
      }
      this.connectedUsers.get(userId)!.add(client.id);

      this.logger.log(`Cliente conectado: ${client.id} (usuário ${userId})`);
      client.data.userId = userId; // salva no socket para uso no disconnect
    } catch (err) {
      this.logger.error(
        `Falha na autenticação do socket (${client.id})`,
        err.message,
      );
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
      this.logger.log(`Cliente desconectado: ${client.id} (usuário ${userId})`);
    } else {
      this.logger.log(
        `Cliente desconectado: ${client.id} (sem usuário associado)`,
      );
    }
  }

  @SubscribeMessage('register') // opcional agora, pois já autenticamos no handshake
  handleRegister(client: Socket, userId: string): void {
    // Poderia validar se userId bate com o do token
    this.logger.log(
      `Usuário ${userId} confirmou registro no socket ${client.id}`,
    );
  }

  sendToUser(userId: string, event: string, data: any): void {
    const socketIds = this.connectedUsers.get(userId);
    if (socketIds && socketIds.size > 0) {
      this.logger.log(
        `Enviando evento '${event}' para usuário ${userId} (${socketIds.size} conexões)`,
      );
      socketIds.forEach((socketId) => {
        this.server.to(socketId).emit(event, data);
      });
    } else {
      this.logger.warn(
        `Não foi possível enviar evento '${event}'. Usuário ${userId} não está conectado.`,
      );
    }
  }
}
