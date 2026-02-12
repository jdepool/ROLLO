import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, numeric, timestamp, boolean, date, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const stores = pgTable("stores", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  address: text("address"),
  phone: text("phone"),
});

export const warehouses = pgTable("warehouses", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  storeId: integer("store_id").notNull().references(() => stores.id),
  name: text("name").notNull(),
  location: text("location"),
  isMain: boolean("is_main").default(false),
});

export const productCategories = pgTable("product_categories", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  color: text("color").default("#6366f1"),
  icon: text("icon").default("Package"),
});

export const suppliers = pgTable("suppliers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  contact: text("contact"),
  phone: text("phone"),
  email: text("email"),
});

export const products = pgTable("products", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  unit: text("unit").notNull().default("unidad"),
  minStock: numeric("min_stock").notNull().default("5"),
  costPrice: numeric("cost_price").notNull().default("0"),
  shelfLifeDays: integer("shelf_life_days"),
  categoryId: integer("category_id").references(() => productCategories.id),
  supplierId: integer("supplier_id").references(() => suppliers.id),
});

export const inventory = pgTable("inventory", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  warehouseId: integer("warehouse_id").notNull().references(() => warehouses.id),
  productId: integer("product_id").notNull().references(() => products.id),
  quantity: numeric("quantity").notNull().default("0"),
  unitCost: numeric("unit_cost"),
  expiryDate: date("expiry_date"),
  manufactureDate: date("manufacture_date"),
  batchNumber: text("batch_number"),
  notes: text("notes"),
});

export const inventoryMovements = pgTable("inventory_movements", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  warehouseId: integer("warehouse_id").references(() => warehouses.id),
  productId: integer("product_id").notNull().references(() => products.id),
  movementType: text("movement_type").notNull(),
  quantity: numeric("quantity").notNull(),
  unitCost: numeric("unit_cost"),
  notes: text("notes"),
  createdBy: text("created_by"),
  referenceType: text("reference_type"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const purchaseOrders = pgTable("purchase_orders", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  invoiceNumber: text("invoice_number"),
  supplierName: text("supplier_name"),
  supplierId: integer("supplier_id").references(() => suppliers.id),
  warehouseId: integer("warehouse_id").references(() => warehouses.id),
  subtotal: numeric("subtotal"),
  tax: numeric("tax"),
  total: numeric("total"),
  status: text("status").notNull().default("draft"),
  imageData: text("image_data"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  purchaseOrderId: integer("purchase_order_id").notNull().references(() => purchaseOrders.id),
  productName: text("product_name").notNull(),
  productId: integer("product_id").references(() => products.id),
  quantity: numeric("quantity").notNull(),
  unitPrice: numeric("unit_price").notNull(),
  totalPrice: numeric("total_price").notNull(),
});

export const insertStoreSchema = createInsertSchema(stores).omit({ id: true });
export const insertWarehouseSchema = createInsertSchema(warehouses).omit({ id: true });
export const insertCategorySchema = createInsertSchema(productCategories).omit({ id: true });
export const insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export const insertInventorySchema = createInsertSchema(inventory).omit({ id: true });
export const insertMovementSchema = createInsertSchema(inventoryMovements).omit({ id: true, createdAt: true });
export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders).omit({ id: true, createdAt: true });
export const insertPurchaseOrderItemSchema = createInsertSchema(purchaseOrderItems).omit({ id: true });

export type Store = typeof stores.$inferSelect;
export type InsertStore = z.infer<typeof insertStoreSchema>;
export type Warehouse = typeof warehouses.$inferSelect;
export type InsertWarehouse = z.infer<typeof insertWarehouseSchema>;
export type ProductCategory = typeof productCategories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Inventory = typeof inventory.$inferSelect;
export type InsertInventory = z.infer<typeof insertInventorySchema>;
export type InventoryMovement = typeof inventoryMovements.$inferSelect;
export type InsertMovement = z.infer<typeof insertMovementSchema>;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;
export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type InsertPurchaseOrderItem = z.infer<typeof insertPurchaseOrderItemSchema>;

export type InventoryWithDetails = Inventory & {
  productName: string;
  unit: string;
  minStock: string;
  costPrice: string;
  shelfLifeDays: number | null;
  categoryName: string | null;
  categoryColor: string | null;
  categoryIcon: string | null;
  supplierName: string | null;
  warehouseName: string;
  storeName: string;
  isLowStock: boolean;
  expiringSoon: boolean;
};

export type StockSummary = {
  totalProducts: number;
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  expiringSoonCount: number;
};

export type MovementWithDetails = InventoryMovement & {
  productName: string;
  unit: string;
  warehouseName: string | null;
};

export type PurchaseOrderWithItems = PurchaseOrder & {
  items: PurchaseOrderItem[];
  warehouseName?: string | null;
};

export * from "./models/chat";
