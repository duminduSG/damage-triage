CREATE TABLE IF NOT EXISTS claims (
  id          uuid PRIMARY KEY,
  reference   text NOT NULL UNIQUE,
  address     text NOT NULL,
  status      text NOT NULL CHECK (status IN ('open', 'triaged', 'needs_review')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS photos (
  id              uuid PRIMARY KEY,
  claim_id        uuid NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  filename        text NOT NULL,
  mime_type       text NOT NULL,
  size_bytes      integer NOT NULL CHECK (size_bytes > 0),
  sha256          text NOT NULL,
  classification  jsonb NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (claim_id, sha256)
);

CREATE INDEX IF NOT EXISTS photos_claim_id_idx ON photos (claim_id);
