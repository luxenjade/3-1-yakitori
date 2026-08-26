-- Festival yakitori PWA schema (matches README)

CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price INT NOT NULL,
  initial_stock INT NOT NULL,
  current_stock INT NOT NULL CHECK (current_stock >= 0),
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE temporary_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_code VARCHAR(6) NOT NULL,
  total_price INT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 minutes'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX temporary_orders_short_code_idx ON temporary_orders (short_code);

CREATE TABLE temporary_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  temporary_order_id UUID REFERENCES temporary_orders(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id),
  quantity INT NOT NULL CHECK (quantity > 0)
);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number SERIAL,
  total_price INT NOT NULL,
  payment_method TEXT NOT NULL, -- 'cash' | 'ic'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'cooking' | 'ready' | 'completed'
  order_source TEXT NOT NULL, -- 'mobile' | 'pos'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id),
  quantity INT NOT NULL
);

-- Seed yakitori items (optional; replace UUIDs as needed)
INSERT INTO items (name, price, initial_stock, current_stock, status) VALUES
  ('もも（タレ）', 200, 80, 80, 'active'),
  ('ねぎま（タレ）', 200, 70, 70, 'active'),
  ('つくね（タレ）', 220, 60, 60, 'active'),
  ('かわ（塩）', 180, 50, 50, 'active'),
  ('ささみ（塩）', 200, 40, 40, 'active'),
  ('お茶', 100, 100, 100, 'active');
