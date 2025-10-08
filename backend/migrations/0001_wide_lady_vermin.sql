PRAGMA foreign_keys=OFF;

CREATE TABLE IF NOT EXISTS user (
    id text PRIMARY KEY NOT NULL,
    created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
    email text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL
);

CREATE TABLE IF NOT EXISTS zone (
    id text PRIMARY KEY NOT NULL,
    user_id text NOT NULL,
    zone_name text NOT NULL,
    created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
    description text,
    FOREIGN KEY (user_id) REFERENCES user(id) ON UPDATE NO ACTION ON DELETE NO ACTION
);

CREATE TABLE IF NOT EXISTS deviceReadings (
    id text PRIMARY KEY NOT NULL,
    zone_id text NOT NULL,
    json_data blob NOT NULL,
    received_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (zone_id) REFERENCES zone(id) ON UPDATE NO ACTION ON DELETE NO ACTION
);

CREATE TABLE IF NOT EXISTS alert (
    id text PRIMARY KEY NOT NULL,
    user_id text NOT NULL,
    message text NOT NULL,
    severity text,
    statis text,
    FOREIGN KEY (user_id) REFERENCES user(id) ON UPDATE NO ACTION ON DELETE NO ACTION
);

CREATE TABLE IF NOT EXISTS automations (
    id text PRIMARY KEY NOT NULL
);

CREATE TABLE IF NOT EXISTS integrations (
    id text PRIMARY KEY NOT NULL,
    user_id text NOT NULL,
    provider text NOT NULL,
    access_token text,
    refresh_token text,
    expires_at integer,
    FOREIGN KEY (user_id) REFERENCES user(id) ON UPDATE NO ACTION ON DELETE NO ACTION
);

CREATE TABLE IF NOT EXISTS plant (
    id text PRIMARY KEY NOT NULL,
    user_id text NOT NULL,
    plant_type text,
    plant_name text,
    zone_id text NOT NULL,
    FOREIGN KEY (user_id) REFERENCES user(id) ON UPDATE NO ACTION ON DELETE NO ACTION,
    FOREIGN KEY (zone_id) REFERENCES zone(id) ON UPDATE NO ACTION ON DELETE NO ACTION
);

CREATE TABLE IF NOT EXISTS rasPi (
    id text PRIMARY KEY NOT NULL,
    received_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status text DEFAULT 'unpaired' NOT NULL
);

PRAGMA foreign_keys=ON;
