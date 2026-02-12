import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, numeric, timestamp, boolean, date } from "drizzle-orm/pg-core";
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

export const insertStoreSchema = createInsertSchema(stores).omit({ id: true });
export const insertWarehouseSchema = createInsertSchema(warehouses).omit({ id: true });
export const insertCategorySchema = createInsertSchema(productCategories).omit({ id: true });
export const insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export const insertInventorySchema = createInsertSchema(inventory).omit({ id: true });
export const insertMovementSchema = createInsertSchema(inventoryMovements).omit({ id: true, createdAt: true });

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
