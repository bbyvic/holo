/**
 * Cliente mínimo para probar el servidor a mano:
 *   npm start                        (en otra terminal)
 *   node --experimental-transform-types scripts/smoke-client.ts
 *
 * Hace el login con el ticket de demo, entra a la sala 1, camina y habla.
 */
import WebSocket from 'ws';
import { Incoming } from '../src/protocol/headers.ts';
import { PacketDecoder } from '../src/protocol/codec.ts';
import { ServerMessage } from '../src/protocol/outgoing.ts';
import type { OutgoingHeader } from '../src/protocol/headers.ts';

const url = process.env.HOLO_URL ?? 'ws://127.0.0.1:2096';
const ticket = process.env.HOLO_TICKET ?? 'demo-ticket';
const socket = new WebSocket(url);
const decoder = new PacketDecoder();

function send(header: number, build: (message: ServerMessage) => void = () => {}): void {
  const message = new ServerMessage(header as OutgoingHeader);
  build(message);
  socket.send(message.toBuffer());
}

socket.on('open', () => {
  console.log(`conectado a ${url}`);
  send(Incoming.ClientHello);
  send(Incoming.SsoTicket, (m) => m.string(ticket));
  send(Incoming.InfoRetrieve);
  send(Incoming.NavigatorSearch, (m) => m.string('hotel_view').string(''));

  setTimeout(() => send(Incoming.RequestRoomLoad, (m) => m.int(1)), 200);
  setTimeout(() => send(Incoming.RoomModelReady), 400);
  setTimeout(() => send(Incoming.Move, (m) => m.int(3).int(4)), 600);
  setTimeout(() => send(Incoming.Chat, (m) => m.string('hola holo')), 1500);
  setTimeout(() => socket.close(), 3000);
});

socket.on('message', (data) => {
  for (const packet of decoder.push(data as Buffer)) {
    console.log(`<- paquete ${packet.header} (${packet.remaining} byte/s de cuerpo)`);
  }
});

socket.on('close', () => console.log('cerrado'));
socket.on('error', (error) => console.error('error', error));
