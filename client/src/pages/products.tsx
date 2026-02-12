import { useState } from "react";
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
import { Plus, Search, Package } from "lucide-react";
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
      toast({ title: "Product created" });
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
          Add Product
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Product</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Product name" data-testid="input-product-name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Unit</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger data-testid="select-unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unidad">Unit</SelectItem>
                  <SelectItem value="kg">Kg</SelectItem>
                  <SelectItem value="lb">Lb</SelectItem>
                  <SelectItem value="lt">Liter</SelectItem>
                  <SelectItem value="oz">Oz</SelectItem>
                  <SelectItem value="box">Box</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Min Stock</Label>
              <Input type="number" min="0" value={minStock} onChange={(e) => setMinStock(e.target.value)} data-testid="input-min-stock" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Cost Price</Label>
              <Input type="number" min="0" step="0.01" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} data-testid="input-cost-price" />
            </div>
            <div className="space-y-2">
              <Label>Shelf Life (days)</Label>
              <Input type="number" min="0" value={shelfLifeDays} onChange={(e) => setShelfLifeDays(e.target.value)} placeholder="Optional" data-testid="input-shelf-life" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger data-testid="select-category">
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger data-testid="select-supplier">
                  <SelectValue placeholder="Optional" />
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
            {mutation.isPending ? "Creating..." : "Create Product"}
          </Button>
        </div>
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
          <h1 className="text-2xl font-bold" data-testid="text-products-title">Products</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your product catalog</p>
        </div>
        <AddProductDialog onSuccess={invalidate} />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
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
              <p className="text-muted-foreground">No products found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Name</th>
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Category</th>
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Supplier</th>
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Unit</th>
                    <th className="text-right px-5 py-3 font-medium text-muted-foreground">Min Stock</th>
                    <th className="text-right px-5 py-3 font-medium text-muted-foreground">Cost</th>
                    <th className="text-right px-5 py-3 font-medium text-muted-foreground">Shelf Life</th>
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
