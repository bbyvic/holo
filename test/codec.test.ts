import { describe, expect, it } from 'vitest';
import { PacketDecoder } from '../src/protocol/codec.ts';
import { ServerMessage } from '../src/protocol/outgoing.ts';
import { MalformedPacketError } from '../src/protocol/incoming.ts';
import { Outgoing } from '../src/protocol/headers.ts';

function frame(header: number, body: Buffer): Buffer {
  const out = Buffer.allocUnsafe(6 + body.length);
  out.writeInt32BE(2 + body.length, 0);
  out.writeInt16BE(header, 4);
  body.copy(out, 6);
  return out;
}

describe('ServerMessage', () => {
  it('escribe el largo sin contar los 4 bytes del propio largo', () => {
    const buffer = new ServerMessage(Outgoing.Pong).int(7).toBuffer();
    expect(buffer.readInt32BE(0)).toBe(6);
    expect(buffer.readInt16BE(4)).toBe(Outgoing.Pong);
    expect(buffer.readInt32BE(6)).toBe(7);
    expect(buffer.length).toBe(10);
  });

  it('prefija los strings con su largo en bytes, no en caracteres', () => {
    const buffer = new ServerMessage(Outgoing.Notification).string('ñandú').toBuffer();
    expect(buffer.readInt16BE(6)).toBe(Buffer.byteLength('ñandú', 'utf8'));
  });

  it('escribe listas con el conteo adelante', () => {
    const buffer = new ServerMessage(Outgoing.RoomUsers)
      .list([1, 2, 3], (value, packet) => packet.int(value))
      .toBuffer();
    expect(buffer.readInt32BE(6)).toBe(3);
    expect(buffer.readInt32BE(10)).toBe(1);
    expect(buffer.readInt32BE(18)).toBe(3);
  });
});

describe('PacketDecoder', () => {
  it('lee varios paquetes de un mismo chunk', () => {
    const decoder = new PacketDecoder();
    const chunk = Buffer.concat([
      frame(10, Buffer.from([0, 0, 0, 1])),
      frame(11, Buffer.alloc(0)),
    ]);

    const messages = decoder.push(chunk);
    expect(messages.map((m) => m.header)).toEqual([10, 11]);
    expect(messages[0]!.int()).toBe(1);
  });

  it('espera a tener el paquete completo cuando llega partido', () => {
    const decoder = new PacketDecoder();
    const packet = frame(12, Buffer.from([0, 3, 97, 98, 99]));

    expect(decoder.push(packet.subarray(0, 4))).toHaveLength(0);
    expect(decoder.push(packet.subarray(4, 7))).toHaveLength(0);

    const messages = decoder.push(packet.subarray(7));
    expect(messages).toHaveLength(1);
    expect(messages[0]!.string()).toBe('abc');
  });

  it('rechaza largos imposibles', () => {
    const decoder = new PacketDecoder();
    const bad = Buffer.allocUnsafe(4);
    bad.writeInt32BE(999_999, 0);
    expect(() => decoder.push(bad)).toThrow(/largo de paquete inválido/);
  });
});

describe('ClientMessage', () => {
  it('avisa cuando el cuerpo se queda corto en lugar de leer basura', () => {
    const decoder = new PacketDecoder();
    const [message] = decoder.push(frame(13, Buffer.from([0, 0])));
    expect(() => message!.int()).toThrow(MalformedPacketError);
  });
});
