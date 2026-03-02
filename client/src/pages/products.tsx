import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
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
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Package, Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
import type { Product, ProductCategory, Supplier } from "@shared/schema";

function AddProductDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("unidad");
  const [minStock, setMinStock] = useState("5");
  const [costPrice, setCostPrice] = useState("0");
  const [shelfLifeDays, setShelfLifeDays] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const { toast } = useToast();

  const { data: categories } = useQuery<ProductCategory[]>({ queryKey: ["/api/categories"] });
  const { data: suppliers } = useQuery<Supplier[]>({ queryKey: ["/api/suppliers"] });

  const mutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/products", {
        name,
        unit,
        minStock,
        costPrice,
        shelfLifeDays: shelfLifeDays ? Number(shelfLifeDays) : null,
        categoryId: categoryId ? Number(categoryId) : null,
        supplierId: supplierId ? Number(supplierId) : null,
      });
    },
    onSuccess: () => {
      toast({ title: "Producto creado" });
      setOpen(false);
      setName("");
      setUnit("unidad");
      setMinStock("5");
      setCostPrice("0");
      setShelfLifeDays("");
      setCategoryId("");
      setSupplierId("");
      onSuccess();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#ccdd53]" data-testid="button-add-product">
          <Plus className="w-4 h-4 mr-2" />
          Agregar Producto
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo Producto</DialogTitle>
          <DialogDescription>Agrega un producto al catalogo</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del producto" data-testid="input-product-name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Unidad</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger data-testid="select-unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unidad">Unidad</SelectItem>
                  <SelectItem value="kg">Kg</SelectItem>
                  <SelectItem value="lb">Lb</SelectItem>
                  <SelectItem value="lt">Litro</SelectItem>
                  <SelectItem value="oz">Oz</SelectItem>
                  <SelectItem value="box">Caja</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Stock Minimo</Label>
              <Input type="number" min="0" value={minStock} onChange={(e) => setMinStock(e.target.value)} data-testid="input-min-stock" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Precio de Costo</Label>
              <Input type="number" min="0" step="0.01" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} data-testid="input-cost-price" />
            </div>
            <div className="space-y-2">
              <Label>Vida Util (dias)</Label>
              <Input type="number" min="0" value={shelfLifeDays} onChange={(e) => setShelfLifeDays(e.target.value)} placeholder="Opcional" data-testid="input-shelf-life" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger data-testid="select-category">
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Proveedor</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger data-testid="select-supplier">
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers?.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            className="w-full"
            onClick={() => mutation.mutate()}
            disabled={!name || mutation.isPending}
            data-testid="button-submit-product"
          >
            {mutation.isPending ? "Creando..." : "Crear Producto"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BulkUploadDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<{ created: number; errors: { row: number; name: string; error: string }[]; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (file: File) => {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.readAsDataURL(file);
      });
      const res = await apiRequest("POST", "/api/products/bulk-upload", {
        fileData: base64,
        fileName: file.name,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setResult(data);
      if (data.created > 0) {
        toast({ title: `${data.created} producto(s) creado(s)` });
        onSuccess();
      }
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleReset = () => {
    setSelectedFile(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = (v: boolean) => {
    setOpen(v);
    if (!v) handleReset();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="button-bulk-upload">
          <Upload className="w-4 h-4 mr-2" />
          Cargar Excel/CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar Productos</DialogTitle>
          <DialogDescription>Sube un archivo Excel (.xlsx) o CSV con tus productos</DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4 mt-2">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              data-testid="dropzone-upload"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setSelectedFile(f);
                }}
                data-testid="input-file-upload"
              />
              <FileSpreadsheet className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              {selectedFile ? (
                <div>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-muted-foreground">Haz clic para seleccionar un archivo</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">.xlsx, .xls, .csv</p>
                </div>
              )}
            </div>

            <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
              <p className="font-medium text-foreground">Formato esperado:</p>
              <p className="text-muted-foreground">
                La primera fila debe contener los encabezados. Se requiere al menos una columna de nombre.
              </p>
              <div className="overflow-x-auto">
                <table className="text-xs w-full border-collapse mt-2">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-1 pr-3 font-medium">Columna</th>
                      <th className="text-left py-1 font-medium">Valores aceptados</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b">
                      <td className="py-1 pr-3">Nombre *</td>
                      <td className="py-1">nombre, name, producto, product</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-1 pr-3">Unidad</td>
                      <td className="py-1">unidad, unit</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-1 pr-3">Stock Min.</td>
                      <td className="py-1">stock_minimo, min_stock, stock_min</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-1 pr-3">Precio</td>
                      <td className="py-1">precio, costo, cost, price</td>
                    </tr>
                    <tr>
                      <td className="py-1 pr-3">Vida Util</td>
                      <td className="py-1">vida_util, shelf_life, dias</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={() => selectedFile && mutation.mutate(selectedFile)}
              disabled={!selectedFile || mutation.isPending}
              data-testid="button-submit-upload"
            >
              {mutation.isPending ? "Importando..." : "Importar Productos"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
              {result.created > 0 ? (
                <CheckCircle2 className="w-8 h-8 text-green-500 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-8 h-8 text-destructive flex-shrink-0" />
              )}
              <div>
                <p className="font-semibold">
                  {result.created} de {result.total} producto(s) importado(s)
                </p>
                {result.errors.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {result.errors.length} error(es)
                  </p>
                )}
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="max-h-40 overflow-y-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30 sticky top-0">
                      <th className="text-left px-3 py-2 font-medium">Fila</th>
                      <th className="text-left px-3 py-2 font-medium">Producto</th>
                      <th className="text-left px-3 py-2 font-medium">Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {result.errors.map((e, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-muted-foreground">{e.row}</td>
                        <td className="px-3 py-2">{e.name}</td>
                        <td className="px-3 py-2 text-destructive text-xs">{e.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleReset} data-testid="button-upload-another">
                Subir otro archivo
              </Button>
              <Button className="flex-1" onClick={() => handleClose(false)} data-testid="button-close-upload">
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const { data: products, isLoading } = useQuery<(Product & { categoryName?: string; supplierName?: string })[]>({
    queryKey: ["/api/products"],
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/products"] });
  };

  const filtered = products?.filter(
    (p) => !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-products-title">Productos</h1>
          <p className="text-sm text-muted-foreground mt-1">Administra tu catalogo de productos</p>
        </div>
        <div className="flex items-center gap-2">
          <BulkUploadDialog onSuccess={invalidate} />
          <AddProductDialog onSuccess={invalidate} />
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar productos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search-products"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : !filtered?.length ? (
            <div className="p-10 text-center">
              <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No se encontraron productos</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Nombre</th>
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Categoria</th>
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Proveedor</th>
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Unidad</th>
                    <th className="text-right px-5 py-3 font-medium text-muted-foreground">Stock Min.</th>
                    <th className="text-right px-5 py-3 font-medium text-muted-foreground">Costo</th>
                    <th className="text-right px-5 py-3 font-medium text-muted-foreground">Vida Util</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((p) => (
                    <tr key={p.id} data-testid={`row-product-${p.id}`}>
                      <td className="px-5 py-3 font-medium">{p.name}</td>
                      <td className="px-5 py-3">
                        {p.categoryName ? (
                          <Badge variant="secondary" className="text-xs">{p.categoryName}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{p.supplierName || "-"}</td>
                      <td className="px-5 py-3 text-muted-foreground">{p.unit}</td>
                      <td className="px-5 py-3 text-right font-mono">{Number(p.minStock)}</td>
                      <td className="px-5 py-3 text-right font-mono">${Number(p.costPrice).toFixed(2)}</td>
                      <td className="px-5 py-3 text-right text-muted-foreground">
                        {p.shelfLifeDays ? `${p.shelfLifeDays}d` : "-"}
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
