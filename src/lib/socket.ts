import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

let chatSocket: Socket | null = null;
let activitySocket: Socket | null = null;

export function connectChat(token: string): Socket {
  if (chatSocket?.connected) return chatSocket;
  chatSocket = io(`${SOCKET_URL}/chat`, { auth: { token }, transports: ['websocket', 'polling'] });
  return chatSocket;
}

export function connectActivity(token: string): Socket {
  if (activitySocket?.connected) return activitySocket;
  activitySocket = io(`${SOCKET_URL}/activity`, { auth: { token }, transports: ['websocket', 'polling'] });
  return activitySocket;
}

export function getChatSocket(): Socket | null { return chatSocket; }
export function getActivitySocket(): Socket | null { return activitySocket; }

export function disconnectAll() {
  chatSocket?.disconnect(); chatSocket = null;
  activitySocket?.disconnect(); activitySocket = null;
}
