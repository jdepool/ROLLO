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
      toast({ title: "Stock added successfully" });
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
        <Button data-testid="button-add-inventory">
          <Plus className="w-4 h-4 mr-2" />
          Add Stock
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Inventory</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Warehouse</Label>
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger data-testid="select-warehouse">
                <SelectValue placeholder="Select warehouse" />
              </SelectTrigger>
              <SelectContent>
                {warehouses?.map((w) => (
                  <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Product</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger data-testid="select-product">
                <SelectValue placeholder="Select product" />
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
              <Label>Quantity</Label>
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
              <Label>Unit Cost</Label>
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
              <Label>Expiry Date</Label>
              <Input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                data-testid="input-expiry-date"
              />
            </div>
            <div className="space-y-2">
              <Label>Batch #</Label>
              <Input
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                placeholder="Optional"
                data-testid="input-batch"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
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
            {mutation.isPending ? "Adding..." : "Add Stock"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AdjustDialog({ item, onSuccess }: { item: InventoryWithDetails; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [newQty, setNewQty] = useState(String(Number(item.quantity)));
  const [reason, setReason] = useState("");
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", `/api/inventory/${item.id}/adjust`, {
        quantity: newQty,
        reason,
      });
    },
    onSuccess: () => {
      toast({ title: "Stock adjusted" });
      setOpen(false);
      onSuccess();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" data-testid={`button-adjust-${item.id}`}>
          <Pencil className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Adjust: {item.productName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Current: {Number(item.quantity)} {item.unit}</Label>
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
            <Label>Reason</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for adjustment..."
              className="resize-none"
              data-testid="input-adjust-reason"
            />
          </div>
          <Button
            className="w-full"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            data-testid="button-submit-adjust"
          >
            {mutation.isPending ? "Saving..." : "Save Adjustment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
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

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
    queryClient.invalidateQueries({ queryKey: ["/api/inventory/summary"] });
  };

  const filtered = inventoryItems?.filter((item) => {
    const matchSearch = !search || item.productName.toLowerCase().includes(search.toLowerCase());
    const matchWarehouse = filterWarehouse === "all" || String(item.warehouseId) === filterWarehouse;
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
          <h1 className="text-2xl font-bold" data-testid="text-inventory-title">Inventory</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your stock across all warehouses
          </p>
        </div>
        <AddInventoryDialog onSuccess={invalidate} />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search-inventory"
              />
            </div>
            <Select value={filterWarehouse} onValueChange={setFilterWarehouse}>
              <SelectTrigger className="w-[180px]" data-testid="select-filter-warehouse">
                <SelectValue placeholder="All warehouses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Warehouses</SelectItem>
                {warehouses?.map((w) => (
                  <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px]" data-testid="select-filter-status">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="low">Low Stock</SelectItem>
                <SelectItem value="expiring">Expiring Soon</SelectItem>
                <SelectItem value="ok">Healthy</SelectItem>
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
              <p className="text-muted-foreground">No inventory items found</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Add stock using the button above
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Product</th>
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Warehouse</th>
                    <th className="text-right px-5 py-3 font-medium text-muted-foreground">Qty</th>
                    <th className="text-right px-5 py-3 font-medium text-muted-foreground">Unit Cost</th>
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Batch</th>
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Expiry</th>
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Status</th>
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
                      <td className="px-5 py-3 text-right font-mono">
                        {item.unitCost ? `$${Number(item.unitCost).toFixed(2)}` : "-"}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground font-mono text-xs">
                        {item.batchNumber || "-"}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground text-xs">
                        {item.expiryDate
                          ? new Date(item.expiryDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                          : "-"}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          {item.isLowStock && (
                            <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700 text-xs gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Low
                            </Badge>
                          )}
                          {item.expiringSoon && (
                            <Badge variant="outline" className="text-red-600 dark:text-red-400 border-red-300 dark:border-red-700 text-xs gap-1">
                              <Clock className="w-3 h-3" />
                              Expiring
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
