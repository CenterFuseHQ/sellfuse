BEGIN;

CREATE SCHEMA IF NOT EXISTS centerfuse;
CREATE SCHEMA IF NOT EXISTS sellfuse;
CREATE SCHEMA IF NOT EXISTS buyfuse;

CREATE TABLE IF NOT EXISTS centerfuse.users (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS centerfuse.organizations (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS centerfuse.organization_members (
  organization_id uuid NOT NULL REFERENCES centerfuse.organizations(id),
  user_id uuid NOT NULL REFERENCES centerfuse.users(id),
  role text NOT NULL CHECK (role IN ('OWNER', 'MEMBER')),
  PRIMARY KEY (organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS centerfuse.product_entitlements (
  user_id uuid NOT NULL REFERENCES centerfuse.users(id),
  product_id text NOT NULL CHECK (product_id IN ('CENTERFUSE', 'SELLFUSE', 'BUYFUSE')),
  status text NOT NULL CHECK (status IN ('ACTIVE', 'SUSPENDED')),
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  PRIMARY KEY (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS centerfuse.integration_connections (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES centerfuse.users(id),
  provider_id text NOT NULL,
  encrypted_token_reference text,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider_id)
);

CREATE TABLE IF NOT EXISTS sellfuse.canonical_listings (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES centerfuse.users(id),
  sku text,
  title text NOT NULL,
  description text NOT NULL,
  price numeric(12,2),
  currency char(3) NOT NULL DEFAULT 'USD',
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  condition text,
  category text NOT NULL,
  fulfillment jsonb NOT NULL DEFAULT '{}'::jsonb,
  seller_reviewed boolean NOT NULL DEFAULT false,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sellfuse.listing_media (
  id uuid PRIMARY KEY,
  listing_id uuid NOT NULL REFERENCES sellfuse.canonical_listings(id),
  storage_reference text NOT NULL,
  media_type text NOT NULL,
  alt_text text,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sellfuse.channel_publications (
  id uuid PRIMARY KEY,
  listing_id uuid NOT NULL REFERENCES sellfuse.canonical_listings(id),
  provider_id text NOT NULL,
  external_id text,
  status text NOT NULL,
  overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text NOT NULL,
  last_synchronized_at timestamptz,
  provider_error_code text,
  provider_error_message text,
  UNIQUE (listing_id, provider_id),
  UNIQUE (provider_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS buyfuse.workspaces (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES centerfuse.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS buyfuse.saved_items (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES buyfuse.workspaces(id),
  title text NOT NULL,
  source_url text,
  notes text,
  status text NOT NULL CHECK (status IN ('CONSIDERING', 'PURCHASED', 'ARCHIVED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS channel_publications_listing_idx ON sellfuse.channel_publications(listing_id);
CREATE INDEX IF NOT EXISTS saved_items_workspace_idx ON buyfuse.saved_items(workspace_id);

COMMIT;
