import { db } from "./storage";
import { stores, warehouses, productCategories, suppliers, products, inventory, inventoryMovements } from "@shared/schema";
import { sql } from "drizzle-orm";

export async function seedDatabase() {
  const existing = await db.select().from(stores);
  if (existing.length > 0) return;

  console.log("Seeding database...");

  const [store1] = await db.insert(stores).values([
    { name: "Downtown Restaurant", address: "123 Main Street", phone: "(555) 100-2000" },
    { name: "Airport Cafe", address: "Terminal B, Gate 12", phone: "(555) 200-3000" },
  ]).returning();

  const [wh1, wh2, wh3] = await db.insert(warehouses).values([
    { storeId: store1.id, name: "Main Kitchen", location: "Ground Floor" },
    { storeId: store1.id, name: "Cold Storage", location: "Basement" },
    { storeId: store1.id + 1, name: "Cafe Pantry", location: "Back Room" },
  ]).returning();

  const [catDairy, catProduce, catMeat, catGrains, catBeverage] = await db.insert(productCategories).values([
    { name: "Dairy", color: "#3b82f6", icon: "Milk" },
    { name: "Produce", color: "#22c55e", icon: "Leaf" },
    { name: "Meat & Poultry", color: "#ef4444", icon: "Beef" },
    { name: "Grains & Dry Goods", color: "#f59e0b", icon: "Wheat" },
    { name: "Beverages", color: "#8b5cf6", icon: "Coffee" },
  ]).returning();

  const [supFarm, supDist, supLocal] = await db.insert(suppliers).values([
    { name: "Fresh Farms Co.", contact: "Maria Lopez", phone: "(555) 300-4000", email: "maria@freshfarms.com" },
    { name: "National Distributors", contact: "James Chen", phone: "(555) 400-5000", email: "james@natdist.com" },
    { name: "Local Harvest", contact: "Sarah Kim", phone: "(555) 500-6000", email: "sarah@localharvest.com" },
  ]).returning();

  const prodList = await db.insert(products).values([
    { name: "Whole Milk", unit: "lt", minStock: "10", costPrice: "3.50", shelfLifeDays: 7, categoryId: catDairy.id, supplierId: supFarm.id },
    { name: "Cheddar Cheese", unit: "kg", minStock: "5", costPrice: "12.00", shelfLifeDays: 30, categoryId: catDairy.id, supplierId: supFarm.id },
    { name: "Fresh Tomatoes", unit: "kg", minStock: "8", costPrice: "4.00", shelfLifeDays: 5, categoryId: catProduce.id, supplierId: supLocal.id },
    { name: "Romaine Lettuce", unit: "unidad", minStock: "15", costPrice: "2.50", shelfLifeDays: 4, categoryId: catProduce.id, supplierId: supLocal.id },
    { name: "Chicken Breast", unit: "kg", minStock: "10", costPrice: "8.50", shelfLifeDays: 3, categoryId: catMeat.id, supplierId: supDist.id },
    { name: "Ground Beef", unit: "kg", minStock: "8", costPrice: "11.00", shelfLifeDays: 3, categoryId: catMeat.id, supplierId: supDist.id },
    { name: "Basmati Rice", unit: "kg", minStock: "20", costPrice: "2.80", shelfLifeDays: 365, categoryId: catGrains.id, supplierId: supDist.id },
    { name: "All-Purpose Flour", unit: "kg", minStock: "15", costPrice: "1.50", shelfLifeDays: 180, categoryId: catGrains.id, supplierId: supDist.id },
    { name: "Orange Juice", unit: "lt", minStock: "12", costPrice: "4.50", shelfLifeDays: 14, categoryId: catBeverage.id, supplierId: supFarm.id },
    { name: "Coffee Beans", unit: "kg", minStock: "5", costPrice: "18.00", shelfLifeDays: 90, categoryId: catBeverage.id, supplierId: supLocal.id },
  ]).returning();

  const today = new Date();
  const daysFromNow = (d: number) => {
    const date = new Date(today);
    date.setDate(date.getDate() + d);
    return date.toISOString().split("T")[0];
  };

  await db.insert(inventory).values([
    { warehouseId: wh1.id, productId: prodList[0].id, quantity: "25", unitCost: "3.50", expiryDate: daysFromNow(5), batchNumber: "MLK-001" },
    { warehouseId: wh1.id, productId: prodList[1].id, quantity: "3", unitCost: "12.00", expiryDate: daysFromNow(20), batchNumber: "CHD-014" },
    { warehouseId: wh1.id, productId: prodList[2].id, quantity: "6", unitCost: "4.00", expiryDate: daysFromNow(2), batchNumber: "TOM-220" },
    { warehouseId: wh1.id, productId: prodList[3].id, quantity: "4", unitCost: "2.50", expiryDate: daysFromNow(1), batchNumber: "LET-089" },
    { warehouseId: wh2.id, productId: prodList[4].id, quantity: "15", unitCost: "8.50", expiryDate: daysFromNow(2), batchNumber: "CKN-331" },
    { warehouseId: wh2.id, productId: prodList[5].id, quantity: "5", unitCost: "11.00", expiryDate: daysFromNow(1), batchNumber: "GBF-102" },
    { warehouseId: wh1.id, productId: prodList[6].id, quantity: "50", unitCost: "2.80", expiryDate: daysFromNow(300), batchNumber: "RCE-500" },
    { warehouseId: wh1.id, productId: prodList[7].id, quantity: "10", unitCost: "1.50", expiryDate: daysFromNow(150), batchNumber: "FLR-210" },
    { warehouseId: wh3.id, productId: prodList[8].id, quantity: "8", unitCost: "4.50", expiryDate: daysFromNow(10), batchNumber: "OJ-088" },
    { warehouseId: wh3.id, productId: prodList[9].id, quantity: "2", unitCost: "18.00", expiryDate: daysFromNow(60), batchNumber: "COF-770" },
  ]);

  await db.insert(inventoryMovements).values([
    { warehouseId: wh1.id, productId: prodList[0].id, movementType: "entrada", quantity: "25", unitCost: "3.50", notes: "Weekly milk delivery", createdBy: "admin" },
    { warehouseId: wh1.id, productId: prodList[2].id, movementType: "entrada", quantity: "20", unitCost: "4.00", notes: "Fresh produce shipment", createdBy: "admin" },
    { warehouseId: wh1.id, productId: prodList[2].id, movementType: "salida", quantity: "-14", notes: "Used for lunch service", createdBy: "chef" },
    { warehouseId: wh2.id, productId: prodList[4].id, movementType: "entrada", quantity: "15", unitCost: "8.50", notes: "Chicken delivery", createdBy: "admin" },
    { warehouseId: wh1.id, productId: prodList[6].id, movementType: "entrada", quantity: "50", unitCost: "2.80", notes: "Bulk rice order", createdBy: "admin" },
    { warehouseId: wh3.id, productId: prodList[9].id, movementType: "entrada", quantity: "5", unitCost: "18.00", notes: "Premium coffee beans", createdBy: "admin" },
    { warehouseId: wh3.id, productId: prodList[9].id, movementType: "salida", quantity: "-3", notes: "Used for cafe operations", createdBy: "barista" },
    { warehouseId: wh1.id, productId: prodList[1].id, movementType: "ajuste", quantity: "-2", notes: "Spoilage - removed expired block", createdBy: "admin", referenceType: "manual_adjustment" },
  ]);

  console.log("Database seeded successfully!");
}
