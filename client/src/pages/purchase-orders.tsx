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
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  FileText,
  Check,
  Loader2,
  Trash2,
  Pencil,
  Eye,
  Image as ImageIcon,
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

function ScanDialog({ onSuccess }: { onSuccess: () => void }) {
  const [step, setStep] = useState<"upload" | "scanning" | "review">("upload");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: warehouses } = useQuery<(Warehouse & { storeName?: string })[]>({
    queryKey: ["/api/warehouses"],
  });
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
      setStep("review");
    },
    onError: (err: Error) => {
      toast({ title: "Scan failed", description: err.message, variant: "destructive" });
      setStep("upload");
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!extractedData) throw new Error("No data");
      const targetWarehouseId = mainWarehouse?.id;
      if (!targetWarehouseId) throw new Error("No main warehouse set. Please set a main warehouse first.");

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
      toast({ title: "Purchase order saved" });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      resetAndClose();
      onSuccess();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const resetAndClose = () => {
    setStep("upload");
    setImagePreview(null);
    setImageBase64(null);
    setExtractedData(null);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) loadFile(file);
  }, [loadFile]);

  const handleScan = () => {
    if (!imageBase64) return;
    setStep("scanning");
    scanMutation.mutate(imageBase64);
  };

  const updateItem = (index: number, field: keyof ExtractedItem, value: string) => {
    if (!extractedData) return;
    const items = [...extractedData.items];
    if (field === "productName") {
      items[index] = { ...items[index], [field]: value };
    } else {
      items[index] = { ...items[index], [field]: Number(value) || 0 };
    }
    setExtractedData({ ...extractedData, items });
  };

  const removeItem = (index: number) => {
    if (!extractedData) return;
    const items = extractedData.items.filter((_, i) => i !== index);
    setExtractedData({ ...extractedData, items });
  };

  return (
    <>
      <Button className="bg-[#ccdd53]" onClick={() => setOpen(true)} data-testid="button-scan-po">
        <Upload className="w-4 h-4 mr-2" />
        Scan Purchase Order
      </Button>
      <Dialog open={open} onOpenChange={(v) => { if (!v) resetAndClose(); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {step === "upload" && "Upload Purchase Order"}
              {step === "scanning" && "Scanning Document..."}
              {step === "review" && "Review Extracted Data"}
            </DialogTitle>
          </DialogHeader>

          {step === "upload" && (
            <div className="space-y-4">
              {!mainWarehouse && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                  No main warehouse set. Go to Warehouses and set one first.
                </div>
              )}
              <div
                className={`border-2 border-dashed rounded-md p-8 text-center cursor-pointer transition-colors ${dragging ? "border-primary bg-primary/5" : ""}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                data-testid="dropzone-upload"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  data-testid="input-file-upload"
                />
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-h-64 mx-auto rounded-md"
                    data-testid="img-preview"
                  />
                ) : (
                  <div className="space-y-2">
                    <ImageIcon className="w-12 h-12 text-muted-foreground/30 mx-auto" />
                    <p className="text-sm text-muted-foreground">Drag & drop or click to upload a photo of your purchase order</p>
                    <p className="text-xs text-muted-foreground/60">Supports JPG, PNG, WEBP</p>
                  </div>
                )}
              </div>
              {imagePreview && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => { setImagePreview(null); setImageBase64(null); }}
                    data-testid="button-clear-image"
                  >
                    Clear
                  </Button>
                  <Button
                    className="flex-1 bg-[#ccdd53]"
                    onClick={handleScan}
                    disabled={!mainWarehouse}
                    data-testid="button-start-scan"
                  >
                    Scan with AI
                  </Button>
                </div>
              )}
            </div>
          )}

          {step === "scanning" && (
            <div className="py-12 text-center space-y-4">
              <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">AI is reading your purchase order...</p>
              <p className="text-xs text-muted-foreground/60">This may take a few seconds</p>
            </div>
          )}

          {step === "review" && extractedData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Invoice Number</Label>
                  <Input
                    value={extractedData.invoiceNumber || ""}
                    onChange={(e) => setExtractedData({ ...extractedData, invoiceNumber: e.target.value })}
                    data-testid="input-invoice-number"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Supplier</Label>
                  <Input
                    value={extractedData.supplierName || ""}
                    onChange={(e) => setExtractedData({ ...extractedData, supplierName: e.target.value })}
                    data-testid="input-supplier-name"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Destination: {mainWarehouse?.name || "No main warehouse"}
                </Label>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground font-medium">Line Items ({extractedData.items.length})</Label>
                <div className="space-y-3">
                  {extractedData.items.map((item, i) => (
                    <div key={i} className="space-y-2 p-3 rounded-md bg-muted/30" data-testid={`po-item-${i}`}>
                      <div className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-4 space-y-1">
                          {i === 0 && <Label className="text-[10px] text-muted-foreground">Product</Label>}
                          <Input
                            value={item.productName}
                            onChange={(e) => updateItem(i, "productName", e.target.value)}
                            data-testid={`input-item-name-${i}`}
                          />
                        </div>
                        <div className="col-span-2 space-y-1">
                          {i === 0 && <Label className="text-[10px] text-muted-foreground">Invoice Qty</Label>}
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(i, "quantity", e.target.value)}
                            data-testid={`input-item-qty-${i}`}
                          />
                        </div>
                        <div className="col-span-2 space-y-1">
                          {i === 0 && <Label className="text-[10px] text-muted-foreground">Unit $</Label>}
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
                          <Label htmlFor={`verified-${i}`} className="text-xs text-muted-foreground">Verified</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground whitespace-nowrap">Actual Qty</Label>
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
                              Diff: {item.actualQty - item.quantity > 0 ? "+" : ""}{item.actualQty - item.quantity}
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
                  <Label className="text-xs text-muted-foreground">Tax</Label>
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
                <Button variant="outline" className="flex-1" onClick={() => setStep("upload")} data-testid="button-back">
                  Back
                </Button>
                <Button
                  className="flex-1 bg-[#ccdd53]"
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending || !extractedData.items.length}
                  data-testid="button-save-po"
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  Save Purchase Order
                </Button>
              </div>
            </div>
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
      toast({ title: "Purchase order confirmed", description: "Inventory has been updated" });
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
            <DialogTitle>Purchase Order {po.invoiceNumber ? `#${po.invoiceNumber}` : `#${po.id}`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Supplier:</span>
                <p className="font-medium">{po.supplierName || "Unknown"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Warehouse:</span>
                <p className="font-medium">{po.warehouseName || "Not assigned"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <div className="mt-1">
                  <Badge variant={po.status === "confirmed" ? "default" : "secondary"}>
                    {po.status === "confirmed" ? "Confirmed" : "Draft"}
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
                    <th className="text-left p-2">Product</th>
                    <th className="text-right p-2">Qty</th>
                    <th className="text-right p-2">Unit $</th>
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
                    <td className="p-2" colSpan={3}>Tax</td>
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
                Confirm & Update Inventory
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
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-purchase-orders-title">Purchase Orders</h1>
          <p className="text-sm text-muted-foreground mt-1">Upload invoices and update inventory automatically</p>
        </div>
        <ScanDialog onSuccess={() => {}} />
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
            <p className="text-muted-foreground">No purchase orders yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Upload a photo of a purchase order to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <table className="w-full text-sm" data-testid="table-purchase-orders">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3">Invoice #</th>
                <th className="text-left p-3">Supplier</th>
                <th className="text-left p-3">Warehouse</th>
                <th className="text-right p-3">Items</th>
                <th className="text-right p-3">Total</th>
                <th className="text-center p-3">Status</th>
                <th className="text-left p-3">Date</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((po) => (
                <tr key={po.id} className="border-t" data-testid={`row-po-${po.id}`}>
                  <td className="p-3 font-medium">{po.invoiceNumber || `PO-${po.id}`}</td>
                  <td className="p-3">{po.supplierName || "-"}</td>
                  <td className="p-3">{po.warehouseName || "-"}</td>
                  <td className="p-3 text-right">{po.items.length}</td>
                  <td className="p-3 text-right font-medium">${Number(po.total || 0).toFixed(2)}</td>
                  <td className="p-3 text-center">
                    <Badge variant={po.status === "confirmed" ? "default" : "secondary"}>
                      {po.status === "confirmed" ? "Confirmed" : "Draft"}
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
