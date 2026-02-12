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
        location TEXT
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
    `);
    console.log("Database tables initialized");
    await seedDatabase();
  } catch (err) {
    console.error("Database initialization error:", err);
    throw err;
  }
}
