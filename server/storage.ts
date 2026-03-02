import { eq, sql, and, lte, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import {
  stores, warehouses, productCategories, suppliers, products, inventory, inventoryMovements,
  purchaseOrders, purchaseOrderItems,
  type Store, type InsertStore,
  type Warehouse, type InsertWarehouse,
  type ProductCategory, type InsertCategory,
  type Supplier, type InsertSupplier,
  type Product, type InsertProduct,
  type Inventory, type InsertInventory,
  type InventoryMovement, type InsertMovement,
  type InventoryWithDetails, type StockSummary, type MovementWithDetails,
  type PurchaseOrder, type InsertPurchaseOrder,
  type PurchaseOrderItem, type InsertPurchaseOrderItem,
  type PurchaseOrderWithItems,
} from "@shared/schema";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool);

export interface IStorage {
  getStores(): Promise<Store[]>;
  createStore(store: InsertStore): Promise<Store>;
  updateStore(id: number, data: Partial<InsertStore>): Promise<Store>;
  deleteStore(id: number): Promise<void>;
  getWarehouses(): Promise<(Warehouse & { storeName?: string | null })[]>;
  createWarehouse(warehouse: InsertWarehouse): Promise<Warehouse>;
  updateWarehouse(id: number, data: Partial<InsertWarehouse>): Promise<Warehouse>;
  deleteWarehouse(id: number): Promise<void>;
  getMainWarehouse(): Promise<(Warehouse & { storeName?: string | null }) | null>;
  getCategories(): Promise<ProductCategory[]>;
  createCategory(category: InsertCategory): Promise<ProductCategory>;
  updateCategory(id: number, data: Partial<InsertCategory>): Promise<ProductCategory>;
  deleteCategory(id: number): Promise<void>;
  getSuppliers(): Promise<Supplier[]>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  getProducts(): Promise<(Product & { categoryName?: string | null; supplierName?: string | null })[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  getInventory(filters?: { warehouseId?: number; lowStock?: boolean }): Promise<InventoryWithDetails[]>;
  getInventorySummary(): Promise<StockSummary>;
  addInventory(inv: InsertInventory): Promise<Inventory>;
  adjustInventory(id: number, quantity: string, reason?: string): Promise<void>;
  getMovements(limit?: number): Promise<MovementWithDetails[]>;
  createMovement(movement: InsertMovement): Promise<InventoryMovement>;
  transferInventory(items: { productId: number; quantity: number }[], sourceWarehouseId: number, destWarehouseId: number): Promise<void>;
  createPurchaseOrder(po: InsertPurchaseOrder): Promise<PurchaseOrder>;
  getPurchaseOrders(): Promise<PurchaseOrderWithItems[]>;
  getPurchaseOrder(id: number): Promise<PurchaseOrderWithItems | null>;
  addPurchaseOrderItems(items: InsertPurchaseOrderItem[]): Promise<PurchaseOrderItem[]>;
  updatePurchaseOrderStatus(id: number, status: string): Promise<void>;
  confirmPurchaseOrder(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getStores(): Promise<Store[]> {
    return db.select().from(stores);
  }

  async createStore(store: InsertStore): Promise<Store> {
    const [result] = await db.insert(stores).values(store).returning();
    return result;
  }

  async updateStore(id: number, data: Partial<InsertStore>): Promise<Store> {
    const [result] = await db.update(stores).set(data).where(eq(stores.id, id)).returning();
    return result;
  }

  async deleteStore(id: number): Promise<void> {
    const storeWarehouses = await db.select({ id: warehouses.id }).from(warehouses).where(eq(warehouses.storeId, id));
    const whIds = storeWarehouses.map((w) => w.id);
    if (whIds.length > 0) {
      for (const whId of whIds) {
        await this.deleteWarehouse(whId);
      }
    }
    await db.delete(stores).where(eq(stores.id, id));
  }

  async getWarehouses(): Promise<(Warehouse & { storeName?: string })[]> {
    const rows = await db
      .select({
        id: warehouses.id,
        storeId: warehouses.storeId,
        name: warehouses.name,
        location: warehouses.location,
        isMain: warehouses.isMain,
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

  async updateWarehouse(id: number, data: Partial<InsertWarehouse>): Promise<Warehouse> {
    const [result] = await db.update(warehouses).set(data).where(eq(warehouses.id, id)).returning();
    return result;
  }

  async deleteWarehouse(id: number): Promise<void> {
    await db.delete(inventoryMovements).where(eq(inventoryMovements.warehouseId, id));
    await db.delete(inventory).where(eq(inventory.warehouseId, id));
    const pos = await db.select({ id: purchaseOrders.id }).from(purchaseOrders).where(eq(purchaseOrders.warehouseId, id));
    for (const po of pos) {
      await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, po.id));
    }
    await db.delete(purchaseOrders).where(eq(purchaseOrders.warehouseId, id));
    await db.delete(warehouses).where(eq(warehouses.id, id));
  }

  async getMainWarehouse(): Promise<(Warehouse & { storeName?: string }) | null> {
    const rows = await db
      .select({
        id: warehouses.id,
        storeId: warehouses.storeId,
        name: warehouses.name,
        location: warehouses.location,
        isMain: warehouses.isMain,
        storeName: stores.name,
      })
      .from(warehouses)
      .leftJoin(stores, eq(warehouses.storeId, stores.id))
      .where(eq(warehouses.isMain, true))
      .limit(1);
    return rows[0] || null;
  }

  async getCategories(): Promise<ProductCategory[]> {
    return db.select().from(productCategories);
  }

  async createCategory(category: InsertCategory): Promise<ProductCategory> {
    const [result] = await db.insert(productCategories).values(category).returning();
    return result;
  }

  async updateCategory(id: number, data: Partial<InsertCategory>): Promise<ProductCategory> {
    const [result] = await db.update(productCategories).set(data).where(eq(productCategories.id, id)).returning();
    return result;
  }

  async deleteCategory(id: number): Promise<void> {
    await db.update(products).set({ categoryId: null }).where(eq(products.categoryId, id));
    await db.delete(productCategories).where(eq(productCategories.id, id));
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

  async transferInventory(items: { productId: number; quantity: number }[], sourceWarehouseId: number, destWarehouseId: number): Promise<void> {
    for (const item of items) {
      if (item.quantity <= 0) continue;

      const [sourceInv] = await db.select().from(inventory)
        .where(and(eq(inventory.warehouseId, sourceWarehouseId), eq(inventory.productId, item.productId)));
      if (!sourceInv) throw new Error(`Producto ID ${item.productId} no existe en almacen origen`);

      const currentQty = Number(sourceInv.quantity);
      if (item.quantity > currentQty) throw new Error(`Cantidad insuficiente para producto ID ${item.productId}. Disponible: ${currentQty}`);

      await db.update(inventory)
        .set({ quantity: String(currentQty - item.quantity) })
        .where(eq(inventory.id, sourceInv.id));

      await db.insert(inventoryMovements).values({
        warehouseId: sourceWarehouseId,
        productId: item.productId,
        movementType: "salida",
        quantity: String(-item.quantity),
        unitCost: sourceInv.unitCost,
        notes: `Traspaso a almacen destino`,
        referenceType: "transfer",
      });

      const [destInv] = await db.select().from(inventory)
        .where(and(eq(inventory.warehouseId, destWarehouseId), eq(inventory.productId, item.productId)));

      if (destInv) {
        await db.update(inventory)
          .set({ quantity: String(Number(destInv.quantity) + item.quantity) })
          .where(eq(inventory.id, destInv.id));
      } else {
        await db.insert(inventory).values({
          warehouseId: destWarehouseId,
          productId: item.productId,
          quantity: String(item.quantity),
          unitCost: sourceInv.unitCost,
        });
      }

      await db.insert(inventoryMovements).values({
        warehouseId: destWarehouseId,
        productId: item.productId,
        movementType: "entrada",
        quantity: String(item.quantity),
        unitCost: sourceInv.unitCost,
        notes: `Traspaso desde almacen origen`,
        referenceType: "transfer",
      });
    }
  }

  async createPurchaseOrder(po: InsertPurchaseOrder): Promise<PurchaseOrder> {
    const [result] = await db.insert(purchaseOrders).values(po).returning();
    return result;
  }

  async getPurchaseOrders(): Promise<PurchaseOrderWithItems[]> {
    const orders = await db
      .select({
        id: purchaseOrders.id,
        invoiceNumber: purchaseOrders.invoiceNumber,
        supplierName: purchaseOrders.supplierName,
        supplierId: purchaseOrders.supplierId,
        warehouseId: purchaseOrders.warehouseId,
        subtotal: purchaseOrders.subtotal,
        tax: purchaseOrders.tax,
        total: purchaseOrders.total,
        status: purchaseOrders.status,
        imageData: purchaseOrders.imageData,
        createdAt: purchaseOrders.createdAt,
        warehouseName: warehouses.name,
      })
      .from(purchaseOrders)
      .leftJoin(warehouses, eq(purchaseOrders.warehouseId, warehouses.id))
      .orderBy(desc(purchaseOrders.createdAt));

    const result: PurchaseOrderWithItems[] = [];
    for (const order of orders) {
      const items = await db
        .select()
        .from(purchaseOrderItems)
        .where(eq(purchaseOrderItems.purchaseOrderId, order.id));
      result.push({ ...order, items });
    }
    return result;
  }

  async getPurchaseOrder(id: number): Promise<PurchaseOrderWithItems | null> {
    const [order] = await db
      .select({
        id: purchaseOrders.id,
        invoiceNumber: purchaseOrders.invoiceNumber,
        supplierName: purchaseOrders.supplierName,
        supplierId: purchaseOrders.supplierId,
        warehouseId: purchaseOrders.warehouseId,
        subtotal: purchaseOrders.subtotal,
        tax: purchaseOrders.tax,
        total: purchaseOrders.total,
        status: purchaseOrders.status,
        imageData: purchaseOrders.imageData,
        createdAt: purchaseOrders.createdAt,
        warehouseName: warehouses.name,
      })
      .from(purchaseOrders)
      .leftJoin(warehouses, eq(purchaseOrders.warehouseId, warehouses.id))
      .where(eq(purchaseOrders.id, id));

    if (!order) return null;

    const items = await db
      .select()
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.purchaseOrderId, id));

    return { ...order, items };
  }

  async addPurchaseOrderItems(items: InsertPurchaseOrderItem[]): Promise<PurchaseOrderItem[]> {
    if (!items.length) return [];
    const result = await db.insert(purchaseOrderItems).values(items).returning();
    return result;
  }

  async updatePurchaseOrderStatus(id: number, status: string): Promise<void> {
    await db.update(purchaseOrders).set({ status }).where(eq(purchaseOrders.id, id));
  }

  async confirmPurchaseOrder(id: number): Promise<void> {
    const po = await this.getPurchaseOrder(id);
    if (!po) throw new Error("Purchase order not found");
    if (po.status === "confirmed") throw new Error("Already confirmed");

    const warehouseId = po.warehouseId;
    if (!warehouseId) throw new Error("No warehouse assigned");

    if (po.supplierName) {
      const existingSuppliers = await db.select().from(suppliers).where(eq(suppliers.name, po.supplierName));
      if (existingSuppliers.length === 0) {
        await db.insert(suppliers).values({ name: po.supplierName });
      }
    }

    for (const item of po.items) {
      let productId = item.productId;
      const qty = item.actualQty || item.quantity;

      if (!productId) {
        const existingProducts = await db.select().from(products).where(eq(products.name, item.productName));
        if (existingProducts.length > 0) {
          productId = existingProducts[0].id;
        } else {
          const [newProduct] = await db.insert(products).values({
            name: item.productName,
            unit: "unidad",
            costPrice: item.unitPrice,
          }).returning();
          productId = newProduct.id;
        }
      }

      const existingInv = await db.select().from(inventory)
        .where(and(
          eq(inventory.warehouseId, warehouseId),
          eq(inventory.productId, productId)
        ));

      if (existingInv.length > 0) {
        const newQty = Number(existingInv[0].quantity) + Number(qty);
        await db.update(inventory)
          .set({ quantity: String(newQty), unitCost: item.unitPrice })
          .where(eq(inventory.id, existingInv[0].id));
      } else {
        await db.insert(inventory).values({
          warehouseId,
          productId,
          quantity: qty,
          unitCost: item.unitPrice,
        });
      }

      await db.insert(inventoryMovements).values({
        warehouseId,
        productId,
        movementType: "entrada",
        quantity: qty,
        unitCost: item.unitPrice,
        notes: `Purchase Order #${po.invoiceNumber || po.id}`,
        referenceType: "purchase_order",
        createdBy: "system",
      });
    }

    await this.updatePurchaseOrderStatus(id, "confirmed");
  }
}

export const storage = new DatabaseStorage();
