import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  FileText,
  Check,
  Loader2,
  Trash2,
  Eye,
  Image as ImageIcon,
  FileSpreadsheet,
  Plus,
  PenLine,
} from "lucide-react";
import type { PurchaseOrderWithItems, Warehouse } from "@shared/schema";

type ExtractedItem = {
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  actualQty: number;
  verified: boolean;
};

type ExtractedData = {
  invoiceNumber: string | null;
  supplierName: string | null;
  items: ExtractedItem[];
  subtotal: number | null;
  tax: number | null;
  total: number | null;
};

function ReviewForm({
  extractedData,
  setExtractedData,
  mainWarehouse,
  onSave,
  onBack,
  saving,
  imageBase64,
}: {
  extractedData: ExtractedData;
  setExtractedData: (d: ExtractedData) => void;
  mainWarehouse: Warehouse | null | undefined;
  onSave: () => void;
  onBack: () => void;
  saving: boolean;
  imageBase64: string | null;
}) {
  const updateItem = (index: number, field: keyof ExtractedItem, value: string) => {
    const items = [...extractedData.items];
    if (field === "productName") {
      items[index] = { ...items[index], [field]: value };
    } else {
      items[index] = { ...items[index], [field]: Number(value) || 0 };
    }
    setExtractedData({ ...extractedData, items });
  };

  const removeItem = (index: number) => {
    const items = extractedData.items.filter((_, i) => i !== index);
    setExtractedData({ ...extractedData, items });
  };

  const addEmptyItem = () => {
    const items = [...extractedData.items, { productName: "", quantity: 1, unitPrice: 0, totalPrice: 0, actualQty: 1, verified: false }];
    setExtractedData({ ...extractedData, items });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Numero de Factura</Label>
          <Input
            value={extractedData.invoiceNumber || ""}
            onChange={(e) => setExtractedData({ ...extractedData, invoiceNumber: e.target.value })}
            data-testid="input-invoice-number"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Proveedor</Label>
          <Input
            value={extractedData.supplierName || ""}
            onChange={(e) => setExtractedData({ ...extractedData, supplierName: e.target.value })}
            data-testid="input-supplier-name"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">
          Destino: {mainWarehouse?.name || "Sin almacen principal"}
        </Label>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground font-medium">Articulos ({extractedData.items.length})</Label>
          <Button variant="ghost" size="sm" onClick={addEmptyItem} data-testid="button-add-po-item">
            <Plus className="w-3 h-3 mr-1" />
            Agregar
          </Button>
        </div>
        <div className="space-y-3">
          {extractedData.items.map((item, i) => (
            <div key={i} className="space-y-2 p-3 rounded-md bg-muted/30" data-testid={`po-item-${i}`}>
              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-4 space-y-1">
                  {i === 0 && <Label className="text-[10px] text-muted-foreground">Producto</Label>}
                  <Input
                    value={item.productName}
                    onChange={(e) => updateItem(i, "productName", e.target.value)}
                    placeholder="Nombre del producto"
                    data-testid={`input-item-name-${i}`}
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  {i === 0 && <Label className="text-[10px] text-muted-foreground">Cant. Factura</Label>}
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(i, "quantity", e.target.value)}
                    data-testid={`input-item-qty-${i}`}
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  {i === 0 && <Label className="text-[10px] text-muted-foreground">Precio $</Label>}
                  <Input
                    type="number"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(i, "unitPrice", e.target.value)}
                    data-testid={`input-item-price-${i}`}
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  {i === 0 && <Label className="text-[10px] text-muted-foreground">Total</Label>}
                  <Input
                    type="number"
                    step="0.01"
                    value={item.totalPrice}
                    onChange={(e) => updateItem(i, "totalPrice", e.target.value)}
                    data-testid={`input-item-total-${i}`}
                  />
                </div>
                <div className="col-span-2 flex items-end gap-1">
                  <Button size="icon" variant="ghost" onClick={() => removeItem(i)} data-testid={`button-remove-item-${i}`}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`verified-${i}`}
                    checked={item.verified}
                    onCheckedChange={(checked) => {
                      const items = [...extractedData.items];
                      items[i] = { ...items[i], verified: checked === true };
                      setExtractedData({ ...extractedData, items });
                    }}
                    data-testid={`checkbox-verified-${i}`}
                  />
                  <Label htmlFor={`verified-${i}`} className="text-xs text-muted-foreground">Verificado</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">Cant. Real</Label>
                  <Input
                    type="number"
                    className="w-24"
                    value={item.actualQty}
                    onChange={(e) => {
                      const items = [...extractedData.items];
                      items[i] = { ...items[i], actualQty: Number(e.target.value) || 0 };
                      setExtractedData({ ...extractedData, items });
                    }}
                    data-testid={`input-actual-qty-${i}`}
                  />
                  {item.actualQty !== item.quantity && (
                    <span className="text-xs text-destructive whitespace-nowrap">
                      Dif: {item.actualQty - item.quantity > 0 ? "+" : ""}{item.actualQty - item.quantity}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 pt-2 border-t">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Subtotal</Label>
          <Input
            type="number"
            step="0.01"
            value={extractedData.subtotal || ""}
            onChange={(e) => setExtractedData({ ...extractedData, subtotal: Number(e.target.value) || null })}
            data-testid="input-subtotal"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Impuesto</Label>
          <Input
            type="number"
            step="0.01"
            value={extractedData.tax || ""}
            onChange={(e) => setExtractedData({ ...extractedData, tax: Number(e.target.value) || null })}
            data-testid="input-tax"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Total</Label>
          <Input
            type="number"
            step="0.01"
            value={extractedData.total || ""}
            onChange={(e) => setExtractedData({ ...extractedData, total: Number(e.target.value) || null })}
            data-testid="input-total"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1" onClick={onBack} data-testid="button-back">
          Volver
        </Button>
        <Button
          className="flex-1 bg-[#ccdd53]"
          onClick={onSave}
          disabled={saving || !extractedData.items.length}
          data-testid="button-save-po"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Check className="w-4 h-4 mr-2" />
          )}
          Guardar Orden de Compra
        </Button>
      </div>
    </div>
  );
}

function CreatePODialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"choose" | "scan-upload" | "scanning" | "excel-upload" | "manual" | "review">("choose");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: mainWarehouse } = useQuery<Warehouse | null>({
    queryKey: ["/api/warehouses", "main"],
    queryFn: async () => {
      const res = await fetch("/api/warehouses/main");
      return res.json();
    },
  });

  const scanMutation = useMutation({
    mutationFn: async (base64: string) => {
      const res = await apiRequest("POST", "/api/purchase-orders/scan", { imageBase64: base64 });
      return res.json();
    },
    onSuccess: (data: ExtractedData) => {
      const withDefaults = {
        ...data,
        items: data.items.map((item) => ({
          ...item,
          actualQty: item.quantity,
          verified: false,
        })),
      };
      setExtractedData(withDefaults);
      setMode("review");
    },
    onError: (err: Error) => {
      toast({ title: "Error al escanear", description: err.message, variant: "destructive" });
      setMode("scan-upload");
    },
  });

  const excelMutation = useMutation({
    mutationFn: async (file: File) => {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.readAsDataURL(file);
      });
      const res = await apiRequest("POST", "/api/purchase-orders/parse-excel", {
        fileData: base64,
        fileName: file.name,
      });
      return res.json();
    },
    onSuccess: (data: ExtractedData) => {
      const withDefaults = {
        ...data,
        items: data.items.map((item) => ({
          ...item,
          actualQty: item.actualQty ?? item.quantity,
          verified: false,
        })),
      };
      setExtractedData(withDefaults);
      setMode("review");
    },
    onError: (err: Error) => {
      toast({ title: "Error al leer archivo", description: err.message, variant: "destructive" });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!extractedData) throw new Error("Sin datos");
      const targetWarehouseId = mainWarehouse?.id;
      if (!targetWarehouseId) throw new Error("No hay almacen principal. Ve a Almacenes y establece uno primero.");

      await apiRequest("POST", "/api/purchase-orders", {
        invoiceNumber: extractedData.invoiceNumber,
        supplierName: extractedData.supplierName,
        warehouseId: targetWarehouseId,
        subtotal: extractedData.subtotal,
        tax: extractedData.tax,
        total: extractedData.total,
        items: extractedData.items.map((item) => ({
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          actualQty: item.actualQty,
          verified: item.verified,
        })),
        imageData: imageBase64,
      });
    },
    onSuccess: () => {
      toast({ title: "Orden de compra guardada" });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      resetAndClose();
      onSuccess();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const resetAndClose = () => {
    setMode("choose");
    setImagePreview(null);
    setImageBase64(null);
    setExtractedData(null);
    setExcelFile(null);
    setOpen(false);
  };

  const [dragging, setDragging] = useState(false);

  const loadFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setImagePreview(base64);
      setImageBase64(base64);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleScan = () => {
    if (!imageBase64) return;
    setMode("scanning");
    scanMutation.mutate(imageBase64);
  };

  const startManual = () => {
    setExtractedData({
      invoiceNumber: null,
      supplierName: null,
      items: [{ productName: "", quantity: 1, unitPrice: 0, totalPrice: 0, actualQty: 1, verified: false }],
      subtotal: null,
      tax: null,
      total: null,
    });
    setMode("review");
  };

  return (
    <>
      <Button className="bg-[#ccdd53]" onClick={() => setOpen(true)} data-testid="button-create-po">
        <Plus className="w-4 h-4 mr-2" />
        Nueva Orden de Compra
      </Button>
      <Dialog open={open} onOpenChange={(v) => { if (!v) resetAndClose(); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {mode === "choose" && "Nueva Orden de Compra"}
              {mode === "scan-upload" && "Escanear Imagen"}
              {mode === "scanning" && "Escaneando Documento..."}
              {mode === "excel-upload" && "Importar Excel/CSV"}
              {mode === "manual" && "Crear Manualmente"}
              {mode === "review" && "Revisar Datos"}
            </DialogTitle>
            <DialogDescription>
              {mode === "choose" && "Selecciona como deseas crear la orden de compra"}
              {mode === "scan-upload" && "Sube una foto de tu orden de compra"}
              {mode === "scanning" && "La IA esta leyendo tu documento"}
              {mode === "excel-upload" && "Sube un archivo Excel o CSV con los articulos"}
              {mode === "manual" && "Ingresa los datos manualmente"}
              {mode === "review" && "Verifica y edita los datos antes de guardar"}
            </DialogDescription>
          </DialogHeader>

          {mode === "choose" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
              <button
                className="flex flex-col items-center gap-3 p-6 rounded-lg border-2 border-dashed hover:border-primary/50 hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => setMode("scan-upload")}
                data-testid="button-mode-scan"
              >
                <ImageIcon className="w-10 h-10 text-muted-foreground/60" />
                <div className="text-center">
                  <p className="font-medium text-sm">Escanear Imagen</p>
                  <p className="text-xs text-muted-foreground mt-1">Sube una foto y la IA extrae los datos</p>
                </div>
              </button>
              <button
                className="flex flex-col items-center gap-3 p-6 rounded-lg border-2 border-dashed hover:border-primary/50 hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => setMode("excel-upload")}
                data-testid="button-mode-excel"
              >
                <FileSpreadsheet className="w-10 h-10 text-muted-foreground/60" />
                <div className="text-center">
                  <p className="font-medium text-sm">Cargar Excel/CSV</p>
                  <p className="text-xs text-muted-foreground mt-1">Importa articulos desde un archivo</p>
                </div>
              </button>
              <button
                className="flex flex-col items-center gap-3 p-6 rounded-lg border-2 border-dashed hover:border-primary/50 hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={startManual}
                data-testid="button-mode-manual"
              >
                <PenLine className="w-10 h-10 text-muted-foreground/60" />
                <div className="text-center">
                  <p className="font-medium text-sm">Manual</p>
                  <p className="text-xs text-muted-foreground mt-1">Ingresa los datos a mano</p>
                </div>
              </button>
            </div>
          )}

          {mode === "scan-upload" && (
            <div className="space-y-4">
              {!mainWarehouse && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                  No hay almacen principal. Ve a Almacenes y establece uno primero.
                </div>
              )}
              <div
                className={`border-2 border-dashed rounded-md p-8 text-center cursor-pointer transition-colors ${dragging ? "border-primary bg-primary/5" : ""}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragging(false); }}
                onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setDragging(false); const file = e.dataTransfer.files?.[0]; if (file) loadFile(file); }}
                data-testid="dropzone-upload"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={(e) => { const file = e.target.files?.[0]; if (file) loadFile(file); }}
                  className="hidden"
                  data-testid="input-file-upload"
                />
                {imagePreview ? (
                  <img src={imagePreview} alt="Vista previa" className="max-h-64 mx-auto rounded-md" data-testid="img-preview" />
                ) : (
                  <div className="space-y-2">
                    <ImageIcon className="w-12 h-12 text-muted-foreground/30 mx-auto" />
                    <p className="text-sm text-muted-foreground">Arrastra y suelta o haz clic para subir una foto</p>
                    <p className="text-xs text-muted-foreground/60">Soporta JPG, PNG, WEBP</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setImagePreview(null); setImageBase64(null); setMode("choose"); }} data-testid="button-back-to-choose">
                  Volver
                </Button>
                {imagePreview && (
                  <Button className="flex-1 bg-[#ccdd53]" onClick={handleScan} disabled={!mainWarehouse} data-testid="button-start-scan">
                    Escanear con IA
                  </Button>
                )}
              </div>
            </div>
          )}

          {mode === "scanning" && (
            <div className="py-12 text-center space-y-4">
              <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">La IA esta leyendo tu orden de compra...</p>
              <p className="text-xs text-muted-foreground/60">Esto puede tomar unos segundos</p>
            </div>
          )}

          {mode === "excel-upload" && (
            <div className="space-y-4">
              {!mainWarehouse && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                  No hay almacen principal. Ve a Almacenes y establece uno primero.
                </div>
              )}
              <div
                className="border-2 border-dashed rounded-md p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => excelInputRef.current?.click()}
                data-testid="dropzone-excel"
              >
                <input
                  type="file"
                  ref={excelInputRef}
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) setExcelFile(f); }}
                  className="hidden"
                  data-testid="input-excel-upload"
                />
                <FileSpreadsheet className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                {excelFile ? (
                  <div>
                    <p className="font-medium">{excelFile.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">{(excelFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-muted-foreground">Haz clic para seleccionar un archivo</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">.xlsx, .xls, .csv</p>
                  </div>
                )}
              </div>

              <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
                <p className="font-medium text-foreground">Formato esperado:</p>
                <div className="overflow-x-auto">
                  <table className="text-xs w-full border-collapse mt-1">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-1 pr-3 font-medium">Columna</th>
                        <th className="text-left py-1 font-medium">Nombres aceptados</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr className="border-b"><td className="py-1 pr-3">Producto *</td><td className="py-1">producto, nombre, name, product</td></tr>
                      <tr className="border-b"><td className="py-1 pr-3">Cantidad *</td><td className="py-1">cantidad, qty, quantity</td></tr>
                      <tr className="border-b"><td className="py-1 pr-3">Precio Unitario</td><td className="py-1">precio, price, unit_price, precio_unitario</td></tr>
                      <tr><td className="py-1 pr-3">Total</td><td className="py-1">total, total_price, monto</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setExcelFile(null); setMode("choose"); }} data-testid="button-back-excel">
                  Volver
                </Button>
                <Button
                  className="flex-1 bg-[#ccdd53]"
                  onClick={() => excelFile && excelMutation.mutate(excelFile)}
                  disabled={!excelFile || !mainWarehouse || excelMutation.isPending}
                  data-testid="button-parse-excel"
                >
                  {excelMutation.isPending ? "Procesando..." : "Importar Articulos"}
                </Button>
              </div>
            </div>
          )}

          {mode === "review" && extractedData && (
            <ReviewForm
              extractedData={extractedData}
              setExtractedData={setExtractedData}
              mainWarehouse={mainWarehouse}
              onSave={() => saveMutation.mutate()}
              onBack={() => setMode("choose")}
              saving={saveMutation.isPending}
              imageBase64={imageBase64}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function PODetailDialog({ po, onConfirm }: { po: PurchaseOrderWithItems; onConfirm: () => void }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const confirmMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/purchase-orders/${po.id}/confirm`);
    },
    onSuccess: () => {
      toast({ title: "Orden de compra confirmada", description: "El inventario ha sido actualizado" });
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/movements"] });
      onConfirm();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <>
      <Button size="icon" variant="ghost" onClick={() => setOpen(true)} data-testid={`button-view-po-${po.id}`}>
        <Eye className="w-4 h-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Orden de Compra {po.invoiceNumber ? `#${po.invoiceNumber}` : `#${po.id}`}</DialogTitle>
            <DialogDescription>Detalle de la orden de compra</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Proveedor:</span>
                <p className="font-medium">{po.supplierName || "Desconocido"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Almacen:</span>
                <p className="font-medium">{po.warehouseName || "No asignado"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Estado:</span>
                <div className="mt-1">
                  <Badge variant={po.status === "confirmed" ? "default" : "secondary"}>
                    {po.status === "confirmed" ? "Confirmado" : "Borrador"}
                  </Badge>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Total:</span>
                <p className="font-medium">${Number(po.total || 0).toFixed(2)}</p>
              </div>
            </div>

            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-2">Producto</th>
                    <th className="text-right p-2">Cant.</th>
                    <th className="text-right p-2">Precio $</th>
                    <th className="text-right p-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {po.items.map((item, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2">{item.productName}</td>
                      <td className="p-2 text-right">{item.quantity}</td>
                      <td className="p-2 text-right">${Number(item.unitPrice).toFixed(2)}</td>
                      <td className="p-2 text-right">${Number(item.totalPrice).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/30 border-t">
                  <tr>
                    <td className="p-2 font-medium" colSpan={3}>Subtotal</td>
                    <td className="p-2 text-right font-medium">${Number(po.subtotal || 0).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="p-2" colSpan={3}>Impuesto</td>
                    <td className="p-2 text-right">${Number(po.tax || 0).toFixed(2)}</td>
                  </tr>
                  <tr className="font-semibold border-t">
                    <td className="p-2" colSpan={3}>Total</td>
                    <td className="p-2 text-right">${Number(po.total || 0).toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {po.status === "draft" && (
              <Button
                className="w-full bg-[#ccdd53]"
                onClick={() => confirmMutation.mutate()}
                disabled={confirmMutation.isPending}
                data-testid={`button-confirm-po-${po.id}`}
              >
                {confirmMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Confirmar y Actualizar Inventario
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function PurchaseOrdersPage() {
  const { data: orders, isLoading } = useQuery<PurchaseOrderWithItems[]>({
    queryKey: ["/api/purchase-orders"],
  });

  const formatDate = (date: string | Date | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("es-MX");
  };

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-purchase-orders-title">Ordenes de Compra</h1>
          <p className="text-sm text-muted-foreground mt-1">Sube facturas y actualiza el inventario automaticamente</p>
        </div>
        <CreatePODialog onSuccess={() => {}} />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : !orders?.length ? (
        <Card>
          <CardContent className="p-10 text-center">
            <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No hay ordenes de compra</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Crea una nueva orden de compra para comenzar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <table className="w-full text-sm" data-testid="table-purchase-orders">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3">Factura #</th>
                <th className="text-left p-3">Proveedor</th>
                <th className="text-left p-3">Almacen</th>
                <th className="text-right p-3">Articulos</th>
                <th className="text-right p-3">Total</th>
                <th className="text-center p-3">Estado</th>
                <th className="text-left p-3">Fecha</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((po) => (
                <tr key={po.id} className="border-t" data-testid={`row-po-${po.id}`}>
                  <td className="p-3 font-medium">{po.invoiceNumber || `OC-${po.id}`}</td>
                  <td className="p-3">{po.supplierName || "-"}</td>
                  <td className="p-3">{po.warehouseName || "-"}</td>
                  <td className="p-3 text-right">{po.items.length}</td>
                  <td className="p-3 text-right font-medium">${Number(po.total || 0).toFixed(2)}</td>
                  <td className="p-3 text-center">
                    <Badge variant={po.status === "confirmed" ? "default" : "secondary"}>
                      {po.status === "confirmed" ? "Confirmado" : "Borrador"}
                    </Badge>
                  </td>
                  <td className="p-3 text-muted-foreground">{formatDate(po.createdAt)}</td>
                  <td className="p-3">
                    <PODetailDialog po={po} onConfirm={() => {}} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
