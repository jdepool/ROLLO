import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { GoogleGenAI } from "@google/genai";
import * as XLSX from "xlsx";
import {
  insertStoreSchema,
  insertWarehouseSchema,
  insertCategorySchema,
  insertSupplierSchema,
  insertProductSchema,
  insertInventorySchema,
} from "@shared/schema";

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY!,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL!,
  },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/stores", async (_req, res) => {
    try {
      const result = await storage.getStores();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/stores", async (req, res) => {
    try {
      const parsed = insertStoreSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const result = await storage.createStore(parsed.data);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/stores/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const parsed = insertStoreSchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const result = await storage.updateStore(id, parsed.data);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/stores/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      await storage.deleteStore(id);
      res.json({ message: "Store deleted" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/warehouses", async (_req, res) => {
    try {
      const result = await storage.getWarehouses();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/warehouses", async (req, res) => {
    try {
      const parsed = insertWarehouseSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const result = await storage.createWarehouse(parsed.data);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/warehouses/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const parsed = insertWarehouseSchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const result = await storage.updateWarehouse(id, parsed.data);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/warehouses/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      await storage.deleteWarehouse(id);
      res.json({ message: "Warehouse deleted" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/warehouses/:id/set-main", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { db } = await import("./storage");
      const { warehouses } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      await db.update(warehouses).set({ isMain: false }).where(eq(warehouses.isMain, true));
      await db.update(warehouses).set({ isMain: true }).where(eq(warehouses.id, id));
      res.json({ message: "Main warehouse updated" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/warehouses/main", async (_req, res) => {
    try {
      const result = await storage.getMainWarehouse();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/categories", async (_req, res) => {
    try {
      const result = await storage.getCategories();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/categories", async (req, res) => {
    try {
      const parsed = insertCategorySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const result = await storage.createCategory(parsed.data);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/categories/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const parsed = insertCategorySchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const result = await storage.updateCategory(id, parsed.data);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/categories/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      await storage.deleteCategory(id);
      res.json({ message: "Category deleted" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/suppliers", async (_req, res) => {
    try {
      const result = await storage.getSuppliers();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/suppliers", async (req, res) => {
    try {
      const parsed = insertSupplierSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const result = await storage.createSupplier(parsed.data);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/products", async (_req, res) => {
    try {
      const result = await storage.getProducts();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const parsed = insertProductSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const result = await storage.createProduct(parsed.data);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/products/bulk-upload", async (req, res) => {
    try {
      const { fileData, fileName } = req.body;
      if (!fileData) return res.status(400).json({ error: "No file data provided" });

      const ext = (fileName || "").toLowerCase().split(".").pop();
      if (!["xlsx", "xls", "csv"].includes(ext || "")) {
        return res.status(400).json({ error: "Formato no soportado. Use .xlsx, .xls o .csv" });
      }

      const buffer = Buffer.from(fileData, "base64");
      if (buffer.length > 5 * 1024 * 1024) {
        return res.status(400).json({ error: "El archivo excede el límite de 5MB" });
      }

      let workbook;
      try {
        workbook = XLSX.read(buffer, { type: "buffer" });
      } catch {
        return res.status(400).json({ error: "No se pudo leer el archivo. Verifique que sea un Excel o CSV válido" });
      }
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      if (!rows.length) return res.status(400).json({ error: "El archivo está vacío" });
      if (rows.length > 1000) return res.status(400).json({ error: "Máximo 1000 filas por archivo" });

      const headers = Object.keys(rows[0]).map((h) => h.toLowerCase().trim());
      const nameCol = headers.find((h) => ["nombre", "name", "producto", "product"].includes(h));
      if (!nameCol) {
        return res.status(400).json({
          error: "No se encontró columna de nombre. Use: nombre, name, producto o product",
          headers: Object.keys(rows[0]),
        });
      }

      const origHeaders = Object.keys(rows[0]);
      const headerMap: Record<string, string> = {};
      origHeaders.forEach((h) => { headerMap[h.toLowerCase().trim()] = h; });

      const unitCol = headers.find((h) => ["unidad", "unit"].includes(h));
      const minStockCol = headers.find((h) => ["stock_minimo", "stock minimo", "min_stock", "minstock", "stock_min"].includes(h));
      const costCol = headers.find((h) => ["precio", "costo", "cost", "price", "cost_price", "precio_costo"].includes(h));
      const shelfCol = headers.find((h) => ["vida_util", "vida util", "shelf_life", "shelf_life_days", "dias"].includes(h));

      const created: any[] = [];
      const errors: { row: number; name: string; error: string }[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const productName = String(row[headerMap[nameCol!]] || "").trim();
        if (!productName) {
          errors.push({ row: i + 2, name: "(vacío)", error: "Nombre vacío" });
          continue;
        }

        const productData: any = { name: productName };
        if (unitCol) {
          const u = String(row[headerMap[unitCol]] || "").trim().toLowerCase();
          if (u) productData.unit = u;
        }
        if (minStockCol) {
          const v = Number(row[headerMap[minStockCol]]);
          if (!isNaN(v)) productData.minStock = String(v);
        }
        if (costCol) {
          const v = Number(row[headerMap[costCol]]);
          if (!isNaN(v)) productData.costPrice = String(v);
        }
        if (shelfCol) {
          const v = Number(row[headerMap[shelfCol]]);
          if (!isNaN(v) && v > 0) productData.shelfLifeDays = v;
        }

        const parsed = insertProductSchema.safeParse(productData);
        if (!parsed.success) {
          errors.push({ row: i + 2, name: productName, error: parsed.error.issues.map((e) => e.message).join(", ") });
          continue;
        }

        try {
          const result = await storage.createProduct(parsed.data);
          created.push(result);
        } catch (err: any) {
          errors.push({ row: i + 2, name: productName, error: err.message });
        }
      }

      res.json({ created: created.length, errors, total: rows.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/inventory", async (req, res) => {
    try {
      const filters: any = {};
      if (req.query.warehouse_id) filters.warehouseId = Number(req.query.warehouse_id);
      if (req.query.low_stock === "true") filters.lowStock = true;
      const result = await storage.getInventory(Object.keys(filters).length ? filters : undefined);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/inventory/summary", async (_req, res) => {
    try {
      const result = await storage.getInventorySummary();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/inventory", async (req, res) => {
    try {
      const parsed = insertInventorySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const result = await storage.addInventory(parsed.data);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/inventory/:id/adjust", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { quantity, reason } = req.body;
      await storage.adjustInventory(id, quantity, reason);
      res.json({ message: "Adjusted" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/inventory/movements", async (req, res) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const result = await storage.getMovements(limit);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/purchase-orders/scan", async (req, res) => {
    try {
      const { imageBase64 } = req.body;
      if (!imageBase64) return res.status(400).json({ error: "Image data is required" });

      const base64Data = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
      const mimeMatch = imageBase64.match(/^data:(image\/\w+);/);
      const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";

      const prompt = `Analyze this purchase order / invoice image and extract all information in JSON format. Return ONLY valid JSON with this exact structure:
{
  "invoiceNumber": "string or null",
  "supplierName": "string or null",
  "items": [
    {
      "productName": "string",
      "quantity": number,
      "unitPrice": number,
      "totalPrice": number
    }
  ],
  "subtotal": number or null,
  "tax": number or null,
  "total": number or null
}

Rules:
- Extract ALL line items from the invoice/purchase order
- For each item, get the product name, quantity, unit price, and total price
- If a value is not clearly visible, use null
- Numbers should be plain numbers without currency symbols
- Return ONLY the JSON object, no markdown, no explanation`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                inlineData: {
                  data: base64Data,
                  mimeType,
                },
              },
            ],
          },
        ],
      });

      const responseText = response.text || "";
      let parsed;
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No JSON found in response");
        }
      } catch (parseErr) {
        console.error("AI response parse error:", responseText);
        return res.status(500).json({ error: "Failed to parse AI response" });
      }

      res.json(parsed);
    } catch (err: any) {
      console.error("Purchase order scan error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/purchase-orders", async (_req, res) => {
    try {
      const result = await storage.getPurchaseOrders();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/purchase-orders/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const result = await storage.getPurchaseOrder(id);
      if (!result) return res.status(404).json({ error: "Not found" });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/purchase-orders", async (req, res) => {
    try {
      const { invoiceNumber, supplierName, warehouseId, subtotal, tax, total, items, imageData } = req.body;

      const po = await storage.createPurchaseOrder({
        invoiceNumber,
        supplierName,
        warehouseId: warehouseId ? Number(warehouseId) : null,
        subtotal: subtotal ? String(subtotal) : null,
        tax: tax ? String(tax) : null,
        total: total ? String(total) : null,
        status: "draft",
        imageData: imageData || null,
      });

      if (items && items.length > 0) {
        const itemsToInsert = items.map((item: any) => ({
          purchaseOrderId: po.id,
          productName: item.productName,
          productId: item.productId || null,
          quantity: String(item.quantity),
          actualQty: item.actualQty != null ? String(item.actualQty) : String(item.quantity),
          unitPrice: String(item.unitPrice),
          totalPrice: String(item.totalPrice),
          verified: item.verified || false,
        }));
        await storage.addPurchaseOrderItems(itemsToInsert);
      }

      const result = await storage.getPurchaseOrder(po.id);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/purchase-orders/:id/confirm", async (req, res) => {
    try {
      const id = Number(req.params.id);
      await storage.confirmPurchaseOrder(id);
      res.json({ message: "Purchase order confirmed and inventory updated" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return httpServer;
}
