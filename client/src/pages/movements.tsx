import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useToast } from "@/hooks/use-toast";
import { ArrowRightLeft, ArrowDown, ArrowUp, RefreshCw, Loader2, Check, Repeat2, AlertTriangle, TrendingDown } from "lucide-react";
import type { MovementWithDetails, Warehouse, InventoryWithDetails, LossSummary } from "@shared/schema";

function MovementIcon({ type, referenceType }: { type: string; referenceType?: string | null }) {
  if (referenceType === "merma") return <AlertTriangle className="w-4 h-4 text-orange-500" />;
  if (type === "entrada") return <ArrowDown className="w-4 h-4 text-emerald-500" />;
  if (type === "salida") return <ArrowUp className="w-4 h-4 text-red-500" />;
  return <RefreshCw className="w-4 h-4 text-blue-500" />;
}

function MovementTypeBadge({ type, referenceType }: { type: string; referenceType?: string | null }) {
  if (referenceType === "merma") {
    return <Badge variant="destructive" className="text-xs">Merma</Badge>;
  }
  const cfg: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
    entrada: { label: "Entrada", variant: "default" },
    salida: { label: "Salida", variant: "secondary" },
    ajuste: { label: "Ajuste", variant: "outline" },
  };
  const c = cfg[type] || { label: type, variant: "outline" as const };
  return <Badge variant={c.variant} className="text-xs">{c.label}</Badge>;
}

type TransferLine = {
  productId: number;
  productName: string;
  unit: string;
  sourceQty: number;
  destQty: number;
  transferQty: number;
  lastEdited: "transfer" | "resultDest" | null;
  resultDestInput: string;
};

function TransferDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [sourceId, setSourceId] = useState("");
  const [destId, setDestId] = useState("");
  const [lines, setLines] = useState<TransferLine[]>([]);
  const { toast } = useToast();

  const { data: warehouses } = useQuery<(Warehouse & { storeName?: string })[]>({
    queryKey: ["/api/warehouses"],
  });

  const { data: sourceInventory } = useQuery<InventoryWithDetails[]>({
    queryKey: ["/api/inventory", { warehouse_id: sourceId }],
    queryFn: async () => {
      if (!sourceId) return [];
      const res = await fetch(`/api/inventory?warehouse_id=${sourceId}`);
      return res.json();
    },
    enabled: !!sourceId,
  });

  const { data: destInventory } = useQuery<InventoryWithDetails[]>({
    queryKey: ["/api/inventory", { warehouse_id: destId }],
    queryFn: async () => {
      if (!destId) return [];
      const res = await fetch(`/api/inventory?warehouse_id=${destId}`);
      return res.json();
    },
    enabled: !!destId,
  });

  const destInventoryMap = useMemo(() => {
    const map: Record<number, number> = {};
    if (destInventory) {
      for (const item of destInventory) {
        map[item.product_id] = Number(item.quantity);
      }
    }
    return map;
  }, [destInventory]);

  const buildLines = () => {
    if (!sourceInventory) return;
    const newLines: TransferLine[] = sourceInventory
      .filter((item) => Number(item.quantity) > 0)
      .map((item) => ({
        productId: item.product_id,
        productName: item.productName,
        unit: item.unit,
        sourceQty: Number(item.quantity),
        destQty: destInventoryMap[item.product_id] || 0,
        transferQty: 0,
        lastEdited: null,
        resultDestInput: "",
      }));
    setLines(newLines);
  };

  const handleSourceChange = (val: string) => {
    setSourceId(val);
    setLines([]);
  };

  const handleDestChange = (val: string) => {
    setDestId(val);
    setLines([]);
  };

  const updateLine = (index: number, field: "transferQty" | "resultDest", value: string) => {
    const updated = [...lines];
    const line = { ...updated[index] };

    if (field === "transferQty") {
      const raw = Number(value) || 0;
      const qty = Math.max(0, Math.min(raw, line.sourceQty));
      line.transferQty = qty;
      line.resultDestInput = String(line.destQty + qty);
      line.lastEdited = "transfer";
    } else if (field === "resultDest") {
      line.resultDestInput = value;
      const desired = Number(value) || 0;
      const maxDest = line.destQty + line.sourceQty;
      const clamped = Math.max(line.destQty, Math.min(desired, maxDest));
      line.transferQty = clamped - line.destQty;
      line.lastEdited = "resultDest";
    }

    updated[index] = line;
    setLines(updated);
  };

  const transferMutation = useMutation({
    mutationFn: async () => {
      const items = lines
        .filter((l) => l.transferQty > 0)
        .map((l) => ({ productId: l.productId, quantity: l.transferQty }));
      if (!items.length) throw new Error("No hay articulos para transferir");
      await apiRequest("POST", "/api/inventory/transfer", {
        sourceWarehouseId: Number(sourceId),
        destWarehouseId: Number(destId),
        items,
      });
    },
    onSuccess: () => {
      toast({ title: "Traspaso completado" });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/movements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/summary"] });
      resetAndClose();
      onSuccess();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const resetAndClose = () => {
    setSourceId("");
    setDestId("");
    setLines([]);
    setOpen(false);
  };

  const hasTransferItems = lines.some((l) => l.transferQty > 0);

  const sourceName = warehouses?.find((w) => w.id === Number(sourceId))?.name || "";
  const destName = warehouses?.find((w) => w.id === Number(destId))?.name || "";

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} data-testid="button-open-transfer">
        <Repeat2 className="w-4 h-4 mr-2" />
        Traspaso entre Almacenes
      </Button>
      <Dialog open={open} onOpenChange={(v) => { if (!v) resetAndClose(); }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Traspaso entre Almacenes</DialogTitle>
            <DialogDescription>Transfiere productos de un almacen a otro</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground font-medium">Almacen Origen</Label>
                <Select value={sourceId} onValueChange={handleSourceChange}>
                  <SelectTrigger data-testid="select-source-warehouse">
                    <SelectValue placeholder="Seleccionar origen" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses?.filter((w) => String(w.id) !== destId).map((w) => (
                      <SelectItem key={w.id} value={String(w.id)}>{w.name} {w.storeName ? `(${w.storeName})` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground font-medium">Almacen Destino</Label>
                <Select value={destId} onValueChange={handleDestChange}>
                  <SelectTrigger data-testid="select-dest-warehouse">
                    <SelectValue placeholder="Seleccionar destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses?.filter((w) => String(w.id) !== sourceId).map((w) => (
                      <SelectItem key={w.id} value={String(w.id)}>{w.name} {w.storeName ? `(${w.storeName})` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {sourceId && destId && !lines.length && (
              <Button variant="outline" className="w-full" onClick={buildLines} data-testid="button-load-products">
                Cargar Productos del Almacen Origen
              </Button>
            )}

            {lines.length > 0 && (
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2 font-medium text-muted-foreground">Producto</th>
                      <th className="text-right p-2 font-medium text-muted-foreground whitespace-nowrap">
                        <span className="block text-[10px]">Inv. Origen</span>
                        {sourceName}
                      </th>
                      <th className="text-center p-2 font-medium text-muted-foreground">Cantidad</th>
                      <th className="text-right p-2 font-medium text-muted-foreground whitespace-nowrap">Resultante Origen</th>
                      <th className="text-right p-2 font-medium text-muted-foreground whitespace-nowrap">
                        <span className="block text-[10px]">Inv. Destino</span>
                        {destName}
                      </th>
                      <th className="text-right p-2 font-medium text-muted-foreground whitespace-nowrap">Resultante Destino</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {lines.map((line, i) => {
                      const finalSource = line.sourceQty - line.transferQty;
                      const finalDest = line.destQty + line.transferQty;
                      return (
                        <tr key={line.productId} data-testid={`transfer-row-${line.productId}`}>
                          <td className="p-2">
                            <span className="font-medium">{line.productName}</span>
                            <span className="text-xs text-muted-foreground ml-1">({line.unit})</span>
                          </td>
                          <td className="p-2 text-right font-mono">{line.sourceQty}</td>
                          <td className="p-2 text-center">
                            <Input
                              type="number"
                              min="0"
                              max={line.sourceQty}
                              value={line.transferQty > 0 ? line.transferQty : ""}
                              onChange={(e) => updateLine(i, "transferQty", e.target.value)}
                              className="w-20 h-8 text-center mx-auto"
                              placeholder="0"
                              data-testid={`input-transfer-qty-${line.productId}`}
                            />
                          </td>
                          <td className="p-2 text-right">
                            {line.transferQty > 0 ? (
                              <span className="font-mono font-semibold text-red-600 dark:text-red-400">
                                {finalSource}
                              </span>
                            ) : (
                              <span className="text-muted-foreground font-mono">-</span>
                            )}
                          </td>
                          <td className="p-2 text-right font-mono">{line.destQty}</td>
                          <td className="p-2 text-right">
                            <Input
                              type="number"
                              min={line.destQty}
                              max={line.destQty + line.sourceQty}
                              value={line.lastEdited === "resultDest" ? line.resultDestInput : (line.transferQty > 0 ? String(finalDest) : "")}
                              onChange={(e) => updateLine(i, "resultDest", e.target.value)}
                              className={`w-20 h-8 text-center ml-auto ${line.transferQty > 0 ? "border-emerald-400 text-emerald-600 dark:text-emerald-400 font-semibold" : ""}`}
                              placeholder={String(line.destQty)}
                              data-testid={`input-result-dest-${line.productId}`}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {lines.length > 0 && (
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="text-sm text-muted-foreground">
                  {lines.filter((l) => l.transferQty > 0).length} producto(s) a transferir
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={resetAndClose} data-testid="button-cancel-transfer">
                    Cancelar
                  </Button>
                  <Button
                    className="bg-[#ccdd53]"
                    onClick={() => transferMutation.mutate()}
                    disabled={!hasTransferItems || transferMutation.isPending}
                    data-testid="button-execute-transfer"
                  >
                    {transferMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4 mr-2" />
                    )}
                    Ejecutar Traspaso
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function MermasSection() {
  const { data: losses, isLoading } = useQuery<LossSummary[]>({
    queryKey: ["/api/inventory/losses"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-5">
          <Skeleton className="h-6 w-48 mb-4" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!losses?.length) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <TrendingDown className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">No hay mermas registradas</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Producto</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Unidad</th>
                <th className="text-right px-5 py-3 font-medium text-muted-foreground">Total Perdido</th>
                <th className="text-right px-5 py-3 font-medium text-muted-foreground">Total Ingresado</th>
                <th className="text-right px-5 py-3 font-medium text-muted-foreground">% Merma</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {losses.map((loss) => (
                <tr key={loss.productId} data-testid={`row-loss-${loss.productId}`}>
                  <td className="px-5 py-3 font-medium">{loss.productName}</td>
                  <td className="px-5 py-3 text-muted-foreground">{loss.unit}</td>
                  <td className="px-5 py-3 text-right font-mono text-red-600 dark:text-red-400">
                    {Number(loss.totalLost).toFixed(2)}
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-muted-foreground">
                    {Number(loss.totalEntries).toFixed(2)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Badge
                      variant={Number(loss.lossPercentage) > 10 ? "destructive" : "outline"}
                      className="font-mono"
                      data-testid={`badge-loss-pct-${loss.productId}`}
                    >
                      {Number(loss.lossPercentage).toFixed(1)}%
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MovementsPage() {
  const [activeTab, setActiveTab] = useState<"movimientos" | "mermas">("movimientos");
  const { data: movements, isLoading } = useQuery<MovementWithDetails[]>({
    queryKey: ["/api/inventory/movements"],
  });

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-movements-title">Historial de Movimientos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Registra todas las entradas, salidas y ajustes de inventario
          </p>
        </div>
        <TransferDialog onSuccess={() => {}} />
      </div>

      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab("movimientos")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "movimientos" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          data-testid="tab-movimientos"
        >
          <ArrowRightLeft className="w-4 h-4 inline mr-1.5" />
          Movimientos
        </button>
        <button
          onClick={() => setActiveTab("mermas")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "mermas" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          data-testid="tab-mermas"
        >
          <TrendingDown className="w-4 h-4 inline mr-1.5" />
          Mermas
        </button>
      </div>

      {activeTab === "mermas" ? <MermasSection /> : (
      <>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : !movements?.length ? (
            <div className="p-10 text-center">
              <ArrowRightLeft className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No hay movimientos registrados</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Los movimientos apareceran aqui cuando se agregue o ajuste stock
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Tipo</th>
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Producto</th>
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Almacen</th>
                    <th className="text-right px-5 py-3 font-medium text-muted-foreground">Cantidad</th>
                    <th className="text-right px-5 py-3 font-medium text-muted-foreground">Costo Unit.</th>
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Notas</th>
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {movements.map((mov) => (
                    <tr key={mov.id} data-testid={`row-movement-${mov.id}`}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <MovementIcon type={mov.movementType} referenceType={mov.referenceType} />
                          <MovementTypeBadge type={mov.movementType} referenceType={mov.referenceType} />
                        </div>
                      </td>
                      <td className="px-5 py-3 font-medium">{mov.productName}</td>
                      <td className="px-5 py-3 text-muted-foreground">{mov.warehouseName || "-"}</td>
                      <td className="px-5 py-3 text-right">
                        <span className={`font-mono font-semibold ${Number(mov.quantity) > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                          {Number(mov.quantity) > 0 ? "+" : ""}{Number(mov.quantity)} {mov.unit}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-muted-foreground">
                        {mov.unitCost ? `$${Number(mov.unitCost).toFixed(2)}` : "-"}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground text-xs max-w-[200px] truncate">
                        {mov.notes || "-"}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground text-xs whitespace-nowrap">
                        {mov.createdAt
                          ? new Date(mov.createdAt).toLocaleDateString("es-MX", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      </>
      )}
    </div>
  );
}
