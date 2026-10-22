/**
 * Cabeceras de paquete.
 *
 * Cada revisión del cliente renumera sus cabeceras, así que estos valores son
 * los de PRODUCTION-202102-1226895642 (los que usa Nitro por defecto). Si
 * apuntás a otra revisión, cambiá los números acá y no toques los handlers.
 */

/** Paquetes que manda el cliente. */
export const Incoming = {
  ClientHello: 4000,
  SsoTicket: 2419,
  InfoRetrieve: 357,
  Ping: 2596,
  NavigatorSearch: 2567,
  RequestRoomLoad: 2312,
  RoomModelReady: 2300,
  Move: 3320,
  Chat: 1314,
  Shout: 2085,
  Whisper: 1543,
  Dance: 2080,
  Wave: 1366,
  Sit: 3860,
} as const;

/** Paquetes que manda el servidor. */
export const Outgoing = {
  HelloOk: 1817,
  AuthenticationOk: 2491,
  UserObject: 2725,
  UserRights: 2033,
  NavigatorSettings: 3135,
  Pong: 2596,
  NavigatorSearchResults: 2690,
  RoomOpen: 758,
  RoomModel: 2753,
  RoomHeightMap: 1301,
  RoomFloorHeightMap: 2753 + 1,
  RoomPaint: 2454,
  RoomEntryInfo: 749,
  RoomUsers: 374,
  RoomUserRemove: 2661,
  RoomUserStatus: 3176,
  RoomUserChat: 1446,
  RoomUserShout: 1036,
  RoomUserWhisper: 2704,
  RoomUserAction: 1631,
  RoomUserDance: 2096,
  RoomFloorItems: 1778,
  RoomWallItems: 1369,
  Notification: 1992,
  Disconnect: 4000,
} as const;

export type IncomingHeader = (typeof Incoming)[keyof typeof Incoming];
export type OutgoingHeader = (typeof Outgoing)[keyof typeof Outgoing];
