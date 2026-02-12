import { db } from "./storage";
import { sql } from "drizzle-orm";
import { seedDatabase } from "./seed";

export async function initDatabase() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS stores (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT,
        phone TEXT
      );

      CREATE TABLE IF NOT EXISTS warehouses (
        id SERIAL PRIMARY KEY,
        store_id INTEGER NOT NULL REFERENCES stores(id),
        name TEXT NOT NULL,
        location TEXT,
        is_main BOOLEAN DEFAULT false
      );

      CREATE TABLE IF NOT EXISTS product_categories (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT DEFAULT '#6366f1',
        icon TEXT DEFAULT 'Package'
      );

      CREATE TABLE IF NOT EXISTS suppliers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        contact TEXT,
        phone TEXT,
        email TEXT
      );

      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        unit TEXT NOT NULL DEFAULT 'unidad',
        min_stock NUMERIC NOT NULL DEFAULT 5,
        cost_price NUMERIC NOT NULL DEFAULT 0,
        shelf_life_days INTEGER,
        category_id INTEGER REFERENCES product_categories(id),
        supplier_id INTEGER REFERENCES suppliers(id)
      );

      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
        product_id INTEGER NOT NULL REFERENCES products(id),
        quantity NUMERIC NOT NULL DEFAULT 0,
        unit_cost NUMERIC,
        expiry_date DATE,
        manufacture_date DATE,
        batch_number TEXT,
        notes TEXT
      );

      CREATE TABLE IF NOT EXISTS inventory_movements (
        id SERIAL PRIMARY KEY,
        warehouse_id INTEGER REFERENCES warehouses(id),
        product_id INTEGER NOT NULL REFERENCES products(id),
        movement_type TEXT NOT NULL,
        quantity NUMERIC NOT NULL,
        unit_cost NUMERIC,
        notes TEXT,
        created_by TEXT,
        reference_type TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS purchase_orders (
        id SERIAL PRIMARY KEY,
        invoice_number TEXT,
        supplier_name TEXT,
        supplier_id INTEGER REFERENCES suppliers(id),
        warehouse_id INTEGER REFERENCES warehouses(id),
        subtotal NUMERIC,
        tax NUMERIC,
        total NUMERIC,
        status TEXT NOT NULL DEFAULT 'draft',
        image_data TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS purchase_order_items (
        id SERIAL PRIMARY KEY,
        purchase_order_id INTEGER NOT NULL REFERENCES purchase_orders(id),
        product_name TEXT NOT NULL,
        product_id INTEGER REFERENCES products(id),
        quantity NUMERIC NOT NULL,
        unit_price NUMERIC NOT NULL,
        total_price NUMERIC NOT NULL
      );

      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    await db.execute(sql`
      ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS is_main BOOLEAN DEFAULT false;
    `);

    console.log("Database tables initialized");
    await seedDatabase();
  } catch (err) {
    console.error("Database initialization error:", err);
    throw err;
  }
}
