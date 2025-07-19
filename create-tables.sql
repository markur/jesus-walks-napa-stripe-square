
-- Create orders table if it doesn't exist
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'pending',
    total DECIMAL(10,2) NOT NULL,
    shipping_method_id INTEGER,
    shipping_address JSONB NOT NULL,
    shipping_cost DECIMAL(10,2),
    tracking_number TEXT,
    estimated_delivery_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create order_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL
);

-- Create shipping tables if they don't exist
CREATE TABLE IF NOT EXISTS shipping_methods (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    carrier TEXT NOT NULL,
    service_code TEXT NOT NULL,
    estimated_days INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL
);

CREATE TABLE IF NOT EXISTS shipping_zones (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    countries TEXT[] NOT NULL,
    regions TEXT[],
    postal_codes TEXT[]
);

CREATE TABLE IF NOT EXISTS shipping_rates (
    id SERIAL PRIMARY KEY,
    method_id INTEGER NOT NULL REFERENCES shipping_methods(id),
    zone_id INTEGER NOT NULL REFERENCES shipping_zones(id),
    base_rate DECIMAL(10,2) NOT NULL,
    per_weight_rate DECIMAL(10,2),
    minimum_weight DECIMAL(10,2),
    maximum_weight DECIMAL(10,2)
);

-- Insert some basic shipping methods
INSERT INTO shipping_methods (name, carrier, service_code, estimated_days, is_active) 
VALUES 
    ('Standard Shipping', 'USPS', 'GROUND', 5, true),
    ('Express Shipping', 'USPS', 'EXPRESS', 2, true)
ON CONFLICT DO NOTHING;
