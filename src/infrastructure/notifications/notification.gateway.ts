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

@WebSocketGateway({
  cors: {
    origin: '*', // Em produção, restrinja para o seu domínio do frontend
  },
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private connectedUsers = new Map<string, string>(); // Mapeia userId para socketId

  handleConnection(client: Socket) {
    this.logger.log(`Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    for (const [userId, socketId] of this.connectedUsers.entries()) {
      if (socketId === client.id) {
        this.connectedUsers.delete(userId);
        this.logger.log(`Usuário desconectado e desregistrado: ${userId}`);
        break;
      }
    }
    this.logger.log(`Cliente desconectado: ${client.id}`);
  }

  @SubscribeMessage('register')
  handleRegister(client: Socket, userId: string): void {
    // Em uma aplicação real, você validaria o userId com o token JWT do handshake
    this.logger.log(`Registrando usuário ${userId} para o socket ${client.id}`);
    this.connectedUsers.set(userId, client.id);
  }

  sendToUser(userId: string, event: string, data: any): void {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.logger.log(
        `Enviando evento '${event}' para usuário ${userId} no socket ${socketId}`,
      );
      this.server.to(socketId).emit(event, data);
    } else {
      this.logger.warn(
        `Não foi possível enviar evento '${event}'. Usuário ${userId} não está conectado.`,
      );
    }
  }
}
