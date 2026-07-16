-- Karame Bay normalized PostgreSQL schema (Phase 1)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE user_role AS ENUM ('CUSTOMER','STORE_OWNER','RIDER','ADMIN');
CREATE TYPE approval_status AS ENUM ('PENDING','APPROVED','SUSPENDED','REJECTED');
CREATE TYPE order_status AS ENUM ('PENDING','ACCEPTED','PREPARING','READY_FOR_PICKUP','PICKED_UP','ON_THE_WAY','DELIVERED','CANCELLED','REJECTED');
CREATE TYPE payment_status AS ENUM ('PENDING_PAYMENT','PENDING_VERIFICATION','PAID','FAILED','REFUNDED');
CREATE TYPE address_kind AS ENUM ('HOME','WORK','OTHER');

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar(254) NOT NULL UNIQUE,
  phone varchar(24) NOT NULL UNIQUE,
  password_hash text NOT NULL,
  first_name varchar(80) NOT NULL,
  last_name varchar(80) NOT NULL,
  role user_role NOT NULL DEFAULT 'CUSTOMER',
  approval approval_status NOT NULL DEFAULT 'APPROVED',
  avatar_url text,
  email_verified_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label varchar(60) NOT NULL,
  kind address_kind NOT NULL DEFAULT 'OTHER',
  formatted_address text NOT NULL,
  latitude numeric(9,6) NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude numeric(9,6) NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  delivery_notes text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES users(id) ON DELETE SET NULL,
  slug varchar(120) NOT NULL UNIQUE,
  name varchar(160) NOT NULL,
  description text,
  store_type varchar(60) NOT NULL,
  logo_url text,
  cover_url text,
  phone varchar(24),
  latitude numeric(9,6) NOT NULL,
  longitude numeric(9,6) NOT NULL,
  approval approval_status NOT NULL DEFAULT 'PENDING',
  rating numeric(2,1) NOT NULL DEFAULT 0,
  rating_count integer NOT NULL DEFAULT 0,
  opens_at time NOT NULL,
  closes_at time NOT NULL,
  is_open boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(100) NOT NULL,
  slug varchar(110) NOT NULL UNIQUE,
  icon_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE store_categories (
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY (store_id, category_id)
);

CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  sku varchar(80),
  name varchar(180) NOT NULL,
  slug varchar(190) NOT NULL,
  description text,
  price_rwf integer NOT NULL CHECK (price_rwf >= 0),
  unit_label varchar(60),
  image_url text,
  keywords text[] NOT NULL DEFAULT '{}',
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, slug),
  UNIQUE NULLS NOT DISTINCT (store_id, sku)
);

CREATE TABLE carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(customer_id, store_id)
);
CREATE TABLE cart_items (
  cart_id uuid NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity > 0),
  PRIMARY KEY(cart_id, product_id)
);

CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number varchar(30) NOT NULL UNIQUE,
  customer_id uuid NOT NULL REFERENCES users(id),
  store_id uuid NOT NULL REFERENCES stores(id),
  rider_id uuid REFERENCES users(id),
  address_id uuid REFERENCES addresses(id),
  status order_status NOT NULL DEFAULT 'PENDING',
  items_subtotal_rwf integer NOT NULL CHECK (items_subtotal_rwf >= 0),
  routed_distance_m integer NOT NULL CHECK (routed_distance_m >= 0),
  routed_duration_s integer NOT NULL CHECK (routed_duration_s >= 0),
  delivery_fee_rwf integer NOT NULL CHECK (delivery_fee_rwf >= 0),
  grand_total_rwf integer NOT NULL CHECK (grand_total_rwf = items_subtotal_rwf + delivery_fee_rwf),
  delivery_latitude numeric(9,6) NOT NULL,
  delivery_longitude numeric(9,6) NOT NULL,
  delivery_address text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name varchar(180) NOT NULL,
  product_image_url text,
  unit_price_rwf integer NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  line_total_rwf integer GENERATED ALWAYS AS (unit_price_rwf * quantity) STORED
);

CREATE TABLE order_status_events (
  id bigserial PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status order_status NOT NULL,
  actor_id uuid REFERENCES users(id),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES orders(id),
  status payment_status NOT NULL DEFAULT 'PENDING_PAYMENT',
  provider varchar(40) NOT NULL DEFAULT 'MTN_MOMO',
  amount_rwf integer NOT NULL CHECK (amount_rwf > 0),
  payer_phone varchar(24),
  external_reference varchar(120),
  confirmed_at timestamptz,
  verified_by uuid REFERENCES users(id),
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  title varchar(160) NOT NULL,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES orders(id),
  customer_id uuid NOT NULL REFERENCES users(id),
  store_id uuid NOT NULL REFERENCES stores(id),
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES users(id),
  status varchar(30) NOT NULL CHECK (status IN ('UPLOADED','EXTRACTING','REVIEW','IMPORTING','COMPLETED','FAILED')),
  total_rows integer NOT NULL DEFAULT 0,
  processed_rows integer NOT NULL DEFAULT 0,
  error_rows integer NOT NULL DEFAULT 0,
  source_files jsonb NOT NULL DEFAULT '[]',
  error_log jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX products_store_available_idx ON products(store_id, is_available);
CREATE INDEX products_search_idx ON products USING gin(to_tsvector('simple', name || ' ' || coalesce(description,'') || ' ' || array_to_string(keywords,' ')));
CREATE INDEX orders_customer_created_idx ON orders(customer_id, created_at DESC);
CREATE INDEX orders_store_status_idx ON orders(store_id, status, created_at DESC);
CREATE INDEX orders_rider_status_idx ON orders(rider_id, status, created_at DESC);
CREATE INDEX notifications_user_unread_idx ON notifications(user_id, created_at DESC) WHERE read_at IS NULL;

-- Catalog duplication must run inside one transaction. Insert new product rows and
-- copy media references; never share product IDs between source and destination.
