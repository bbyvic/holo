# habbo-holo

Emulador de hotel estilo Habbo en Node + TypeScript: protocolo binario,
salas con heightmap, pathfinding A*, chat y furnis.

Habla el protocolo del cliente (WebSocket, tramas
`int32 largo | int16 cabecera | cuerpo`), así que un cliente tipo Nitro se
conecta directo. No incluye cliente ni assets.

## Arrancar

```bash
npm install
cp .env.example .env     # el default ya trae un hotel de demo en memoria
npm start                # ws://0.0.0.0:2096
```

Para probarlo sin cliente gráfico, en otra terminal:

```bash
node --experimental-transform-types scripts/smoke-client.ts
```

Hace login con el ticket `demo-ticket`, entra al Lobby, camina hasta una silla
y habla. En el log del servidor se ve cada paso.

```bash
npm test         # 23 tests: protocolo, pathfinding, sala
npm run typecheck
```

## Conectar un cliente

El cliente necesita que su config apunte acá y que use las mismas cabeceras:

- `socket.url`: `ws://tu-host:2096`
- `HOLO_PORT` y `HOLO_HOST` en `.env` definen dónde escucha el servidor.
- Las cabeceras de `src/protocol/headers.ts` son las de
  `PRODUCTION-202102-1226895642`. Si tu cliente es de otra revisión, cambiá
  los números ahí y no hace falta tocar nada más.

El login es por ticket SSO: la web del hotel guarda un ticket para el usuario
y el cliente lo manda en el primer paquete. En el modo `memory` hay dos
usuarios de demo (`demo-ticket` y `demo-ticket-2`).

## Persistencia

`HOLO_STORAGE=memory` (default) levanta un hotel de demo sin base de datos:
dos usuarios y dos salas, una con mesa y sillas.

`HOLO_STORAGE=mysql` lee usuarios, salas y furnis de MySQL/MariaDB:

```bash
mysql -u root holo < sql/schema.sql
```

y completá `HOLO_DB_*` en `.env`. Agregar otro backend (Postgres, Supabase) es
implementar la interfaz `Storage` de `src/storage/types.ts`.

## Cómo está armado

```
src/protocol/   tramas y cabeceras: codec.ts (parseo), incoming/outgoing
src/net/        WebSocket, sesiones y router de paquetes
src/handlers/   un archivo por área: handshake, navigator, room, chat
                composers.ts arma todos los paquetes salientes
src/game/       modelo de sala, pathfinder, avatares, furnis, loop del juego
src/storage/    drivers de datos (memory, mysql)
```

Detalles que importan si vas a extenderlo:

- **Tick del juego**: 2 por segundo, como Habbo (`HOLO_TPS`). Cada tick avanza
  un tile por avatar que esté caminando y manda **un solo** paquete de status
  por sala con los que cambiaron.
- **Un paso se anuncia antes de concretarse**: el status `mv x,y,z` del tick
  actual es la posición del tick siguiente. Así el cliente interpola el
  movimiento en lugar de teletransportar el avatar.
- **Pathfinding**: A* con diagonales. No corta esquinas (una diagonal exige
  que los dos tiles ortogonales también se puedan pisar) y no sube escalones
  de más de 1.5 de altura.
- **Tiles bloqueados**: tile vacío (`x` en el modelo), furni no pisable, u otro
  avatar parado encima. El tile de la puerta nunca se bloquea, si no nadie más
  podría entrar.
- **Paquetes serializados por sesión**: los handlers son asíncronos, así que
  cada sesión encola sus paquetes y los procesa en orden. Sin eso, un cliente
  que manda el ticket y el `InfoRetrieve` juntos se adelanta a su propio login.

## Qué hay y qué falta

Implementado: handshake y login por ticket, perfil de usuario, navigator con
búsqueda, entrada y salida de salas, heightmap, furnis de piso y pared,
caminata con A*, sentarse en sillas, chat, grito, susurro con rango, baile y
saludo, cierre de conexiones zombis.

Sin implementar todavía: catálogo y compra, mover y rotar furnis desde el
cliente, mensajería y amigos, permisos y moderación, puertas con timbre,
wired, mascotas, bots, trades, salas privadas con contraseña y persistencia de
lo que cambia en la sala (hoy los furnis se leen pero no se vuelven a guardar).
