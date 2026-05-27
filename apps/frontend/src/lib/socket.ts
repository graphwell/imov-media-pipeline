import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'wss://pipeline-api.somar.ia.br'
    socket = io(WS_URL, {
      autoConnect: false,
      transports: ['websocket'],
    })
  }
  return socket
}

export function connectSocket(): Socket {
  const s = getSocket()
  if (!s.connected) s.connect()
  return s
}

export function disconnectSocket() {
  socket?.disconnect()
}

export function joinImportRoom(importacaoId: string) {
  const s = getSocket()
  if (!s.connected) s.connect()
  s.emit('join-import', { importacaoId })
}

export function leaveImportRoom(importacaoId: string) {
  socket?.emit('leave-import', { importacaoId })
}
