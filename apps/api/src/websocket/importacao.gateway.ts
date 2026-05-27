import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'

@WebSocketGateway({
  cors: {
    origin: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
    credentials: true,
  },
  namespace: '/',
})
export class ImportacaoGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  handleConnection(client: Socket) {
    console.log(`WS conectado: ${client.id}`)
  }

  handleDisconnect(client: Socket) {
    console.log(`WS desconectado: ${client.id}`)
  }

  @SubscribeMessage('join-import')
  handleJoinImport(@MessageBody() data: { importacaoId: string }, @ConnectedSocket() client: Socket) {
    const room = `import:${data.importacaoId}`
    client.join(room)
    return { event: 'joined', data: { room } }
  }

  @SubscribeMessage('leave-import')
  handleLeaveImport(@MessageBody() data: { importacaoId: string }, @ConnectedSocket() client: Socket) {
    client.leave(`import:${data.importacaoId}`)
  }

  emitProgress(importacaoId: string, data: object) {
    this.server.to(`import:${importacaoId}`).emit('progress', { ...data, timestamp: new Date().toISOString() })
  }

  emitCompleted(importacaoId: string, data: object) {
    this.server.to(`import:${importacaoId}`).emit('completed', { ...data, timestamp: new Date().toISOString() })
  }

  emitError(importacaoId: string, data: object) {
    this.server.to(`import:${importacaoId}`).emit('error', { ...data, timestamp: new Date().toISOString() })
  }

  emitToAll(event: string, data: object) {
    this.server.emit(event, { ...data, timestamp: new Date().toISOString() })
  }
}
