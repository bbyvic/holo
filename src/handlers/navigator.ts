import { Incoming } from '../protocol/headers.ts';
import type { Router } from '../net/router.ts';
import type { Hotel } from '../game/hotel.ts';
import * as compose from './composers.ts';

export function registerNavigator(router: Router, hotel: Hotel): void {
  router.on(Incoming.NavigatorSearch, (session, message) => {
    const searchCode = message.string();
    const query = message.string().trim().toLowerCase();

    const rooms = hotel
      .loadedRooms()
      .filter((room) => query === '' || room.data.name.toLowerCase().includes(query));

    session.send(compose.navigatorResults(searchCode, query, rooms));
  });
}
