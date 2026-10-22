-- Esquema mínimo para HOLO_STORAGE=mysql.

CREATE TABLE IF NOT EXISTS users (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username    VARCHAR(32)  NOT NULL,
  look        VARCHAR(255) NOT NULL DEFAULT 'hd-180-1.ch-210-66.lg-270-82',
  motto       VARCHAR(76)  NOT NULL DEFAULT '',
  gender      ENUM('M','F') NOT NULL DEFAULT 'M',
  credits     INT          NOT NULL DEFAULT 0,
  `rank`      TINYINT      NOT NULL DEFAULT 1,
  sso_ticket  VARCHAR(64)  NOT NULL DEFAULT '',
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username),
  KEY ix_users_sso (sso_ticket)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS rooms (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name            VARCHAR(64)  NOT NULL,
  description     VARCHAR(255) NOT NULL DEFAULT '',
  owner_id        INT UNSIGNED NOT NULL,
  owner_name      VARCHAR(32)  NOT NULL,
  max_users       SMALLINT     NOT NULL DEFAULT 25,
  model_map       TEXT         NOT NULL,
  door_x          SMALLINT     NOT NULL DEFAULT 0,
  door_y          SMALLINT     NOT NULL DEFAULT 0,
  door_direction  TINYINT      NOT NULL DEFAULT 2,
  paint_floor     VARCHAR(16)  NOT NULL DEFAULT '101',
  paint_wall      VARCHAR(16)  NOT NULL DEFAULT '201',
  paint_landscape VARCHAR(16)  NOT NULL DEFAULT '1.1',
  PRIMARY KEY (id),
  KEY ix_rooms_owner (owner_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS items (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  room_id       INT UNSIGNED NOT NULL,
  sprite_id     INT UNSIGNED NOT NULL,
  name          VARCHAR(64)  NOT NULL,
  stack_height  DECIMAL(5,2) NOT NULL DEFAULT 0,
  walkable      TINYINT(1)   NOT NULL DEFAULT 0,
  sittable      TINYINT(1)   NOT NULL DEFAULT 0,
  x             SMALLINT     NOT NULL DEFAULT 0,
  y             SMALLINT     NOT NULL DEFAULT 0,
  z             DECIMAL(5,2) NOT NULL DEFAULT 0,
  rotation      TINYINT      NOT NULL DEFAULT 0,
  state         VARCHAR(32)  NOT NULL DEFAULT '0',
  -- Si está seteado, el furni es de pared y x/y/z/rotation se ignoran.
  wall_position VARCHAR(64)  DEFAULT NULL,
  PRIMARY KEY (id),
  KEY ix_items_room (room_id),
  CONSTRAINT fk_items_room FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
