import { eq, sql, and, lte, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import {
  stores, warehouses, productCategories, suppliers, products, inventory, inventoryMovements,
  type Store, type InsertStore,
  type Warehouse, type InsertWarehouse,
  type ProductCategory, type InsertCategory,
  type Supplier, type InsertSupplier,
  type Product, type InsertProduct,
  type Inventory, type InsertInventory,
  type InventoryMovement, type InsertMovement,
  type InventoryWithDetails, type StockSummary, type MovementWithDetails,
} from "@shared/schema";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool);

export interface IStorage {
  getStores(): Promise<Store[]>;
  createStore(store: InsertStore): Promise<Store>;
  getWarehouses(): Promise<(Warehouse & { storeName?: string })[]>;
  createWarehouse(warehouse: InsertWarehouse): Promise<Warehouse>;
  getCategories(): Promise<ProductCategory[]>;
  createCategory(category: InsertCategory): Promise<ProductCategory>;
  getSuppliers(): Promise<Supplier[]>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  getProducts(): Promise<(Product & { categoryName?: string; supplierName?: string })[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  getInventory(filters?: { warehouseId?: number; lowStock?: boolean }): Promise<InventoryWithDetails[]>;
  getInventorySummary(): Promise<StockSummary>;
  addInventory(inv: InsertInventory): Promise<Inventory>;
  adjustInventory(id: number, quantity: string, reason?: string): Promise<void>;
  getMovements(limit?: number): Promise<MovementWithDetails[]>;
  createMovement(movement: InsertMovement): Promise<InventoryMovement>;
}

export class DatabaseStorage implements IStorage {
  async getStores(): Promise<Store[]> {
    return db.select().from(stores);
  }

  async createStore(store: InsertStore): Promise<Store> {
    const [result] = await db.insert(stores).values(store).returning();
    return result;
  }

  async getWarehouses(): Promise<(Warehouse & { storeName?: string })[]> {
    const rows = await db
      .select({
        id: warehouses.id,
        storeId: warehouses.storeId,
        name: warehouses.name,
        location: warehouses.location,
        storeName: stores.name,
      })
      .from(warehouses)
      .leftJoin(stores, eq(warehouses.storeId, stores.id));
    return rows;
  }

  async createWarehouse(warehouse: InsertWarehouse): Promise<Warehouse> {
    const [result] = await db.insert(warehouses).values(warehouse).returning();
    return result;
  }

  async getCategories(): Promise<ProductCategory[]> {
    return db.select().from(productCategories);
  }

  async createCategory(category: InsertCategory): Promise<ProductCategory> {
    const [result] = await db.insert(productCategories).values(category).returning();
    return result;
  }

  async getSuppliers(): Promise<Supplier[]> {
    return db.select().from(suppliers);
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const [result] = await db.insert(suppliers).values(supplier).returning();
    return result;
  }

  async getProducts(): Promise<(Product & { categoryName?: string; supplierName?: string })[]> {
    const rows = await db
      .select({
        id: products.id,
        name: products.name,
        unit: products.unit,
        minStock: products.minStock,
        costPrice: products.costPrice,
        shelfLifeDays: products.shelfLifeDays,
        categoryId: products.categoryId,
        supplierId: products.supplierId,
        categoryName: productCategories.name,
        supplierName: suppliers.name,
      })
      .from(products)
      .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
      .leftJoin(suppliers, eq(products.supplierId, suppliers.id));
    return rows;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [result] = await db.insert(products).values(product).returning();
    return result;
  }

  async getInventory(filters?: { warehouseId?: number; lowStock?: boolean }): Promise<InventoryWithDetails[]> {
    const warehouseFilter = filters?.warehouseId
      ? sql`AND i.warehouse_id = ${filters.warehouseId}`
      : sql``;
    const lowStockFilter = filters?.lowStock
      ? sql`AND CAST(i.quantity AS numeric) <= CAST(p.min_stock AS numeric)`
      : sql``;

    const result = await db.execute(sql`
      SELECT i.*,
        p.name AS "productName", p.unit, p.min_stock AS "minStock", p.cost_price AS "costPrice",
        p.shelf_life_days AS "shelfLifeDays",
        pc.name AS "categoryName", pc.color AS "categoryColor", pc.icon AS "categoryIcon",
        s.name AS "supplierName",
        w.name AS "warehouseName",
        st.name AS "storeName",
        CASE WHEN CAST(i.quantity AS numeric) <= CAST(p.min_stock AS numeric) THEN true ELSE false END AS "isLowStock",
        CASE WHEN i.expiry_date IS NOT NULL AND i.expiry_date <= CURRENT_DATE + INTERVAL '3 days' THEN true ELSE false END AS "expiringSoon"
      FROM inventory i
      JOIN products p ON p.id = i.product_id
      LEFT JOIN product_categories pc ON pc.id = p.category_id
      LEFT JOIN suppliers s ON s.id = p.supplier_id
      JOIN warehouses w ON w.id = i.warehouse_id
      JOIN stores st ON st.id = w.store_id
      WHERE 1=1 ${warehouseFilter} ${lowStockFilter}
      ORDER BY p.name
    `);
    return result.rows as InventoryWithDetails[];
  }

  async getInventorySummary(): Promise<StockSummary> {
    const result = await db.execute(sql`
      SELECT
        COUNT(DISTINCT i.product_id)::int AS "totalProducts",
        COALESCE(SUM(CAST(i.quantity AS numeric) * COALESCE(CAST(i.unit_cost AS numeric), CAST(p.cost_price AS numeric))), 0) AS "totalValue",
        COUNT(CASE WHEN CAST(i.quantity AS numeric) <= CAST(p.min_stock AS numeric) AND CAST(i.quantity AS numeric) > 0 THEN 1 END)::int AS "lowStockCount",
        COUNT(CASE WHEN CAST(i.quantity AS numeric) = 0 THEN 1 END)::int AS "outOfStockCount",
        COUNT(CASE WHEN i.expiry_date IS NOT NULL AND i.expiry_date <= CURRENT_DATE + INTERVAL '3 days' THEN 1 END)::int AS "expiringSoonCount"
      FROM inventory i
      JOIN products p ON p.id = i.product_id
    `);
    const row = result.rows[0] as any;
    return {
      totalProducts: row?.totalProducts || 0,
      totalValue: Number(row?.totalValue || 0),
      lowStockCount: row?.lowStockCount || 0,
      outOfStockCount: row?.outOfStockCount || 0,
      expiringSoonCount: row?.expiringSoonCount || 0,
    };
  }

  async addInventory(inv: InsertInventory): Promise<Inventory> {
    const [result] = await db.insert(inventory).values(inv).returning();
    await db.insert(inventoryMovements).values({
      warehouseId: inv.warehouseId,
      productId: inv.productId,
      movementType: "entrada",
      quantity: inv.quantity,
      unitCost: inv.unitCost,
      notes: inv.notes,
    });
    return result;
  }

  async adjustInventory(id: number, quantity: string, reason?: string): Promise<void> {
    const [existing] = await db.select().from(inventory).where(eq(inventory.id, id));
    if (!existing) throw new Error("Inventory record not found");

    const diff = Number(quantity) - Number(existing.quantity);
    await db.update(inventory).set({ quantity }).where(eq(inventory.id, id));
    await db.insert(inventoryMovements).values({
      warehouseId: existing.warehouseId,
      productId: existing.productId,
      movementType: "ajuste",
      quantity: String(diff),
      notes: reason,
      referenceType: "manual_adjustment",
    });
  }

  async getMovements(limit = 50): Promise<MovementWithDetails[]> {
    const result = await db.execute(sql`
      SELECT im.*,
        p.name AS "productName", p.unit,
        w.name AS "warehouseName"
      FROM inventory_movements im
      JOIN products p ON p.id = im.product_id
      LEFT JOIN warehouses w ON w.id = im.warehouse_id
      ORDER BY im.created_at DESC
      LIMIT ${limit}
    `);
    return result.rows as MovementWithDetails[];
  }

  async createMovement(movement: InsertMovement): Promise<InventoryMovement> {
    const [result] = await db.insert(inventoryMovements).values(movement).returning();
    return result;
  }
}

export const storage = new DatabaseStorage();
