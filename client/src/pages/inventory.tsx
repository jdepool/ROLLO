import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  AlertTriangle,
  Clock,
  Pencil,
  Package,
  FlaskConical,
  ShoppingBag,
  Trash2,
  Loader2,
} from "lucide-react";
import type {
  InventoryWithDetails,
  Warehouse,
  Product,
} from "@shared/schema";

function AddInventoryDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [warehouseId, setWarehouseId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [notes, setNotes] = useState("");
  const { toast } = useToast();

  const { data: warehouses } = useQuery<Warehouse[]>({ queryKey: ["/api/warehouses"] });
  const { data: products } = useQuery<Product[]>({ queryKey: ["/api/products"] });

  const mutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/inventory", {
        warehouseId: Number(warehouseId),
        productId: Number(productId),
        quantity,
        unitCost: unitCost || undefined,
        expiryDate: expiryDate || undefined,
        batchNumber: batchNumber || undefined,
        notes: notes || undefined,
      });
    },
    onSuccess: () => {
      toast({ title: "Stock agregado exitosamente" });
      setOpen(false);
      resetForm();
      onSuccess();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setWarehouseId("");
    setProductId("");
    setQuantity("");
    setUnitCost("");
    setExpiryDate("");
    setBatchNumber("");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#ccdd53]" data-testid="button-add-inventory">
          <Plus className="w-4 h-4 mr-2" />
          Agregar Stock
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar Inventario</DialogTitle>
          <DialogDescription>Registra nuevo stock en un almacen</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Almacen</Label>
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger data-testid="select-warehouse">
                <SelectValue placeholder="Seleccionar almacen" />
              </SelectTrigger>
              <SelectContent>
                {warehouses?.map((w) => (
                  <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Producto</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger data-testid="select-product">
                <SelectValue placeholder="Seleccionar producto" />
              </SelectTrigger>
              <SelectContent>
                {products?.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Cantidad</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                data-testid="input-quantity"
              />
            </div>
            <div className="space-y-2">
              <Label>Costo Unitario</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                placeholder="0.00"
                data-testid="input-unit-cost"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Fecha de Vencimiento</Label>
              <Input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                data-testid="input-expiry-date"
              />
            </div>
            <div className="space-y-2">
              <Label>Lote #</Label>
              <Input
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                placeholder="Opcional"
                data-testid="input-batch"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas opcionales..."
              className="resize-none"
              data-testid="input-notes"
            />
          </div>
          <Button
            className="w-full"
            onClick={() => mutation.mutate()}
            disabled={!warehouseId || !productId || !quantity || mutation.isPending}
            data-testid="button-submit-inventory"
          >
            {mutation.isPending ? "Agregando..." : "Agregar Stock"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const LOSS_REASONS = [
  { value: "producto_expiro", label: "Producto Expiró" },
  { value: "producto_danado", label: "Producto Dañado" },
  { value: "accidente", label: "Accidente" },
  { value: "otros", label: "Otros" },
] as const;

function AdjustDialog({ item, onSuccess }: { item: InventoryWithDetails; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [newQty, setNewQty] = useState(String(Number(item.quantity)));
  const [newMinStock, setNewMinStock] = useState(String(Number(item.minStock || 0)));
  const [lossReason, setLossReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [notes, setNotes] = useState("");
  const { toast } = useToast();

  const currentQty = Number(item.quantity);
  const isDecrease = Number(newQty) < currentQty;

  const mutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, string | undefined> = {
        quantity: newQty,
      };
      if (isDecrease) {
        body.lossReason = lossReason;
        if (lossReason === "otros" && customReason) {
          body.reason = customReason;
        }
      } else {
        body.reason = notes || undefined;
      }
      await apiRequest("PUT", `/api/inventory/${item.id}/adjust`, body);
      if (String(Number(newMinStock)) !== String(Number(item.minStock || 0))) {
        await apiRequest("PUT", `/api/inventory/${item.id}/min-stock`, { minStock: newMinStock });
      }
    },
    onSuccess: () => {
      toast({ title: "Stock ajustado" });
      setOpen(false);
      onSuccess();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (v) {
      setNewQty(String(Number(item.quantity)));
      setNewMinStock(String(Number(item.minStock || 0)));
      setLossReason("");
      setCustomReason("");
      setNotes("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" data-testid={`button-adjust-${item.id}`}>
          <Pencil className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Ajustar: {item.productName}</DialogTitle>
          <DialogDescription>Modifica la cantidad actual del producto</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Cantidad actual: {currentQty} {item.unit}</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={newQty}
              onChange={(e) => setNewQty(e.target.value)}
              data-testid="input-adjust-quantity"
            />
          </div>
          <div className="space-y-2">
            <Label>Stock Minimo</Label>
            <Input
              type="number"
              min="0"
              step="1"
              value={newMinStock}
              onChange={(e) => setNewMinStock(e.target.value)}
              data-testid="input-adjust-min-stock"
            />
          </div>
          {isDecrease ? (
            <>
              <div className="space-y-2">
                <Label>Razón de la merma</Label>
                <Select value={lossReason} onValueChange={setLossReason}>
                  <SelectTrigger data-testid="select-loss-reason">
                    <SelectValue placeholder="Seleccionar razón" />
                  </SelectTrigger>
                  <SelectContent>
                    {LOSS_REASONS.map((r) => (
                      <SelectItem key={r.value} value={r.value} data-testid={`option-loss-reason-${r.value}`}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {lossReason === "otros" && (
                <div className="space-y-2">
                  <Label>Especificar razón</Label>
                  <Textarea
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Describe la razón..."
                    className="resize-none"
                    data-testid="input-custom-loss-reason"
                  />
                </div>
              )}
            </>
          ) : (
            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas del ajuste..."
                className="resize-none"
                data-testid="input-adjust-notes"
              />
            </div>
          )}
          <Button
            className="w-full"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || (isDecrease && !lossReason)}
            data-testid="button-submit-adjust"
          >
            {mutation.isPending ? "Guardando..." : "Guardar Ajuste"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type ProductionLine = {
  productId: string;
  quantity: string;
  unitCost?: string;
};

function SaleDialog({ warehouseId, onSuccess }: { warehouseId: number; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<{ productId: string; quantity: string }[]>([{ productId: "", quantity: "" }]);
  const [notes, setNotes] = useState("");
  const { toast } = useToast();

  const { data: inventoryData } = useQuery<InventoryWithDetails[]>({
    queryKey: ["/api/inventory", { warehouseId }],
    queryFn: async () => {
      const res = await fetch(`/api/inventory?warehouseId=${warehouseId}`);
      return res.json();
    },
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/inventory/sale", {
        warehouseId,
        items: items.filter(i => i.productId && Number(i.quantity) > 0),
        notes,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Venta registrada" });
      setItems([{ productId: "", quantity: "" }]);
      setNotes("");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/movements"] });
      onSuccess();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const addItem = () => setItems([...items, { productId: "", quantity: "" }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: string, value: string) => {
    const updated = [...items];
    (updated[idx] as any)[field] = value;
    setItems(updated);
  };

  const availableProducts = inventoryData?.filter(inv => Number(inv.quantity) > 0) || [];

  const hasValidItems = items.some(i => i.productId && Number(i.quantity) > 0);

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v);
      if (!v) {
        setItems([{ productId: "", quantity: "" }]);
        setNotes("");
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="default" className="gap-2 bg-green-600 hover:bg-green-700" data-testid="button-open-sale">
          <ShoppingBag className="w-4 h-4" />
          Registrar Venta
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle data-testid="text-sale-dialog-title">Registrar Venta</DialogTitle>
          <DialogDescription>Registra la salida de productos por venta</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-3">
            <Label className="font-semibold">Productos</Label>
            {items.map((item, idx) => (
              <div key={idx} className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  {idx === 0 && <Label className="text-xs text-muted-foreground">Producto</Label>}
                  <Select value={item.productId} onValueChange={(v) => updateItem(idx, "productId", v)}>
                    <SelectTrigger data-testid={`select-sale-product-${idx}`}>
                      <SelectValue placeholder="Seleccionar producto" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableProducts.map((inv) => (
                        <SelectItem key={inv.id} value={String((inv as any).product_id || inv.productId)}>
                          {inv.productName} ({Number(inv.quantity)} {inv.unit || "u"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-24 space-y-1">
                  {idx === 0 && <Label className="text-xs text-muted-foreground">Cantidad</Label>}
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                    data-testid={`input-sale-qty-${idx}`}
                  />
                </div>
                {items.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="h-9 w-9" data-testid={`button-remove-sale-item-${idx}`}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addItem} className="gap-1" data-testid="button-add-sale-item">
              <Plus className="w-3.5 h-3.5" /> Agregar producto
            </Button>
          </div>
          <div className="space-y-1">
            <Label>Notas (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas de la venta..."
              data-testid="input-sale-notes"
            />
          </div>
          <Button
            className="w-full gap-2 bg-green-600 hover:bg-green-700"
            onClick={() => mutation.mutate()}
            disabled={!hasValidItems || mutation.isPending}
            data-testid="button-submit-sale"
          >
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingBag className="w-4 h-4" />}
            {mutation.isPending ? "Registrando..." : "Registrar Venta"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProductionDialog({ warehouseId, onSuccess }: { warehouseId: number; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [inputs, setInputs] = useState<ProductionLine[]>([{ productId: "", quantity: "" }]);
  const [outputs, setOutputs] = useState<ProductionLine[]>([{ productId: "", quantity: "", unitCost: "" }]);
  const [productionDate, setProductionDate] = useState(new Date().toISOString().slice(0, 10));
  const { toast } = useToast();

  const { data: labInventory } = useQuery<InventoryWithDetails[]>({
    queryKey: ["/api/inventory", { warehouse_id: String(warehouseId) }],
    queryFn: async () => {
      const res = await fetch(`/api/inventory?warehouse_id=${warehouseId}`);
      return res.json();
    },
    enabled: open,
  });

  const { data: allProducts } = useQuery<(Product & { categoryName?: string | null })[]>({
    queryKey: ["/api/products"],
    enabled: open,
  });

  const availableInputProducts = labInventory?.filter((item) => Number(item.quantity) > 0) || [];

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/inventory/production", {
        warehouseId,
        productionDate,
        inputs: inputs.filter((i) => i.productId && Number(i.quantity) > 0).map((i) => ({
          productId: Number(i.productId),
          quantity: Number(i.quantity),
        })),
        outputs: outputs.filter((o) => o.productId && Number(o.quantity) > 0).map((o) => ({
          productId: Number(o.productId),
          quantity: Number(o.quantity),
          unitCost: o.unitCost ? Number(o.unitCost) : undefined,
        })),
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Produccion registrada", description: `Lote: ${data.batchNumber}` });
      resetAndClose();
      onSuccess();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const resetAndClose = () => {
    setInputs([{ productId: "", quantity: "" }]);
    setOutputs([{ productId: "", quantity: "", unitCost: "" }]);
    setProductionDate(new Date().toISOString().slice(0, 10));
    setOpen(false);
  };

  const updateInput = (index: number, field: keyof ProductionLine, value: string) => {
    const updated = [...inputs];
    updated[index] = { ...updated[index], [field]: value };
    setInputs(updated);
  };

  const updateOutput = (index: number, field: keyof ProductionLine, value: string) => {
    const updated = [...outputs];
    updated[index] = { ...updated[index], [field]: value };
    setOutputs(updated);
  };

  const addInput = () => setInputs([...inputs, { productId: "", quantity: "" }]);
  const removeInput = (i: number) => setInputs(inputs.filter((_, idx) => idx !== i));
  const addOutput = () => setOutputs([...outputs, { productId: "", quantity: "", unitCost: "" }]);
  const removeOutput = (i: number) => setOutputs(outputs.filter((_, idx) => idx !== i));

  const hasValidData = inputs.some((i) => i.productId && Number(i.quantity) > 0) ||
    outputs.some((o) => o.productId && Number(o.quantity) > 0);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} data-testid="button-open-production">
        <FlaskConical className="w-4 h-4 mr-2" />
        Registrar Produccion
      </Button>
      <Dialog open={open} onOpenChange={(v) => { if (!v) resetAndClose(); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-orange-500" />
              Registrar Produccion
            </DialogTitle>
            <DialogDescription>
              Registra los insumos consumidos y los productos obtenidos en este laboratorio
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Fecha de Produccion</Label>
              <Input
                type="date"
                value={productionDate}
                onChange={(e) => setProductionDate(e.target.value)}
                data-testid="input-production-date"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-red-600 dark:text-red-400">Insumos Consumidos (Salidas)</Label>
                <Button size="sm" variant="outline" onClick={addInput} data-testid="button-add-input">
                  <Plus className="w-3 h-3 mr-1" /> Agregar
                </Button>
              </div>
              {inputs.map((input, i) => {
                const selectedInv = availableInputProducts.find((p) => String(p.product_id) === input.productId);
                return (
                  <div key={i} className="flex items-end gap-2" data-testid={`production-input-row-${i}`}>
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs text-muted-foreground">Producto</Label>
                      <Select value={input.productId} onValueChange={(v) => updateInput(i, "productId", v)}>
                        <SelectTrigger data-testid={`select-input-product-${i}`}>
                          <SelectValue placeholder="Seleccionar insumo" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableInputProducts.map((inv) => (
                            <SelectItem key={inv.product_id} value={String(inv.product_id)}>
                              {inv.productName} ({inv.quantity} {inv.unit} disponibles)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-24 space-y-1">
                      <Label className="text-xs text-muted-foreground">Cantidad</Label>
                      <Input
                        type="number"
                        min="0"
                        max={selectedInv ? Number(selectedInv.quantity) : undefined}
                        value={input.quantity}
                        onChange={(e) => updateInput(i, "quantity", e.target.value)}
                        placeholder="0"
                        data-testid={`input-input-qty-${i}`}
                      />
                    </div>
                    {selectedInv && (
                      <span className="text-xs text-muted-foreground pb-2 whitespace-nowrap">{selectedInv.unit}</span>
                    )}
                    {inputs.length > 1 && (
                      <Button size="sm" variant="ghost" className="h-9 w-9 p-0 text-destructive" onClick={() => removeInput(i)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="border-t" />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Productos Obtenidos (Entradas)</Label>
                <Button size="sm" variant="outline" onClick={addOutput} data-testid="button-add-output">
                  <Plus className="w-3 h-3 mr-1" /> Agregar
                </Button>
              </div>
              {outputs.map((output, i) => (
                <div key={i} className="flex items-end gap-2" data-testid={`production-output-row-${i}`}>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-muted-foreground">Producto</Label>
                    <Select value={output.productId} onValueChange={(v) => updateOutput(i, "productId", v)}>
                      <SelectTrigger data-testid={`select-output-product-${i}`}>
                        <SelectValue placeholder="Seleccionar producto" />
                      </SelectTrigger>
                      <SelectContent>
                        {allProducts?.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.name} {p.categoryName ? `(${p.categoryName})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-24 space-y-1">
                    <Label className="text-xs text-muted-foreground">Cantidad</Label>
                    <Input
                      type="number"
                      min="0"
                      value={output.quantity}
                      onChange={(e) => updateOutput(i, "quantity", e.target.value)}
                      placeholder="0"
                      data-testid={`input-output-qty-${i}`}
                    />
                  </div>
                  <div className="w-28 space-y-1">
                    <Label className="text-xs text-muted-foreground">Costo Unit.</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={output.unitCost || ""}
                      onChange={(e) => updateOutput(i, "unitCost", e.target.value)}
                      placeholder="Opcional"
                      data-testid={`input-output-cost-${i}`}
                    />
                  </div>
                  {outputs.length > 1 && (
                    <Button size="sm" variant="ghost" className="h-9 w-9 p-0 text-destructive" onClick={() => removeOutput(i)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={resetAndClose}>Cancelar</Button>
              <Button
                onClick={() => mutation.mutate()}
                disabled={!hasValidData || mutation.isPending}
                data-testid="button-submit-production"
              >
                {mutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FlaskConical className="w-4 h-4 mr-2" />
                )}
                Registrar Produccion
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function InventoryPage() {
  const [search, setSearch] = useState("");
  const [filterWarehouse, setFilterWarehouse] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: inventoryItems, isLoading } = useQuery<InventoryWithDetails[]>({
    queryKey: ["/api/inventory"],
  });

  const { data: warehouses } = useQuery<Warehouse[]>({
    queryKey: ["/api/warehouses"],
  });

  const selectedWarehouse = warehouses?.find((w) => String(w.id) === filterWarehouse);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
    queryClient.invalidateQueries({ queryKey: ["/api/inventory/summary"] });
    queryClient.invalidateQueries({ queryKey: ["/api/inventory/movements"] });
  };

  const filtered = inventoryItems?.filter((item) => {
    const matchSearch = !search || item.productName.toLowerCase().includes(search.toLowerCase());
    const matchWarehouse = filterWarehouse === "all" || String(item.warehouse_id) === filterWarehouse;
    const matchStatus =
      filterStatus === "all" ||
      (filterStatus === "low" && item.isLowStock) ||
      (filterStatus === "expiring" && item.expiringSoon) ||
      (filterStatus === "ok" && !item.isLowStock && !item.expiringSoon);
    return matchSearch && matchWarehouse && matchStatus;
  });

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-inventory-title">Inventario</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Administra tu stock en todos los almacenes
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedWarehouse?.type === "laboratorio" && (
            <ProductionDialog warehouseId={Number(filterWarehouse)} onSuccess={invalidate} />
          )}
          {selectedWarehouse?.type === "venta" && (
            <SaleDialog warehouseId={Number(filterWarehouse)} onSuccess={invalidate} />
          )}
          <AddInventoryDialog onSuccess={invalidate} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b" data-testid="warehouse-tabs">
        <button
          onClick={() => setFilterWarehouse("all")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${filterWarehouse === "all" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"}`}
          data-testid="tab-warehouse-all"
        >
          Todos
        </button>
        {warehouses?.slice().sort((a, b) => {
          const order = ["PRINCIPAL", "TEMPORAL", "Laboratorio I", "Laboratorio II", "Producto Intermedio", "Dark Kitchen"];
          const ai = order.indexOf(a.name);
          const bi = order.indexOf(b.name);
          return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
        }).map((w) => (
          <button
            key={w.id}
            onClick={() => setFilterWarehouse(String(w.id))}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-1.5 ${filterWarehouse === String(w.id) ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"}`}
            data-testid={`tab-warehouse-${w.id}`}
          >
            {w.type === "laboratorio" && <FlaskConical className="w-3.5 h-3.5 text-orange-500" />}
            {w.type === "venta" && <ShoppingBag className="w-3.5 h-3.5 text-green-500" />}
            {w.name}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar productos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search-inventory"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px]" data-testid="select-filter-status">
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los Estados</SelectItem>
                <SelectItem value="low">Stock Bajo</SelectItem>
                <SelectItem value="expiring">Por Vencer</SelectItem>
                <SelectItem value="ok">Normal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : !filtered?.length ? (
            <div className="p-10 text-center">
              <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No se encontraron productos</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Agrega stock usando el boton de arriba
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Producto</th>
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Almacen</th>
                    <th className="text-right px-5 py-3 font-medium text-muted-foreground">Cant.</th>
                    <th className="text-right px-5 py-3 font-medium text-muted-foreground">Stock Min.</th>
                    <th className="text-right px-5 py-3 font-medium text-muted-foreground">Costo Unit.</th>
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Lote</th>
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Vencimiento</th>
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Estado</th>
                    <th className="text-right px-5 py-3 font-medium text-muted-foreground"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((item) => (
                    <tr key={item.id} data-testid={`row-inventory-${item.id}`}>
                      <td className="px-5 py-3">
                        <div>
                          <p className="font-medium">{item.productName}</p>
                          {item.categoryName && (
                            <p className="text-xs text-muted-foreground">{item.categoryName}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{item.warehouseName}</td>
                      <td className="px-5 py-3 text-right font-mono font-semibold">
                        {Number(item.quantity)} <span className="text-muted-foreground font-normal">{item.unit}</span>
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-muted-foreground" data-testid={`text-min-stock-${item.id}`}>
                        {Number(item.minStock || 0)}
                      </td>
                      <td className="px-5 py-3 text-right font-mono">
                        {(item as any).unit_cost ? `$${Number((item as any).unit_cost).toFixed(2)}` : "-"}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground font-mono text-xs">
                        {(item as any).batch_number || "-"}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground text-xs">
                        {(item as any).expiry_date
                          ? new Date((item as any).expiry_date).toLocaleDateString("es-MX", { month: "short", day: "numeric", year: "numeric" })
                          : "-"}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          {item.isLowStock && (
                            <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700 text-xs gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Bajo
                            </Badge>
                          )}
                          {item.expiringSoon && (
                            <Badge variant="outline" className="text-red-600 dark:text-red-400 border-red-300 dark:border-red-700 text-xs gap-1">
                              <Clock className="w-3 h-3" />
                              Por Vencer
                            </Badge>
                          )}
                          {!item.isLowStock && !item.expiringSoon && (
                            <Badge variant="secondary" className="text-xs">OK</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <AdjustDialog item={item} onSuccess={invalidate} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
