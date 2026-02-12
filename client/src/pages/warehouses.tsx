import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Plus, Warehouse, MapPin, Store } from "lucide-react";
import type { Warehouse as WarehouseType, Store as StoreType } from "@shared/schema";

function AddStoreDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/stores", {
        name,
        address: address || null,
        phone: phone || null,
      });
    },
    onSuccess: () => {
      toast({ title: "Store created" });
      setOpen(false);
      setName("");
      setAddress("");
      setPhone("");
      onSuccess();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" data-testid="button-add-store">
          <Plus className="w-4 h-4 mr-2" />
          Add Store
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New Store</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Store name" data-testid="input-store-name" />
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Optional" data-testid="input-store-address" />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" data-testid="input-store-phone" />
          </div>
          <Button className="w-full" onClick={() => mutation.mutate()} disabled={!name || mutation.isPending} data-testid="button-submit-store">
            {mutation.isPending ? "Creating..." : "Create Store"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddWarehouseDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [storeId, setStoreId] = useState("");
  const { toast } = useToast();

  const { data: stores } = useQuery<StoreType[]>({ queryKey: ["/api/stores"] });

  const mutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/warehouses", {
        name,
        location: location || null,
        storeId: Number(storeId),
      });
    },
    onSuccess: () => {
      toast({ title: "Warehouse created" });
      setOpen(false);
      setName("");
      setLocation("");
      setStoreId("");
      onSuccess();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#ccdd53]" data-testid="button-add-warehouse">
          <Plus className="w-4 h-4 mr-2" />
          Add Warehouse
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New Warehouse</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Store</Label>
            <Select value={storeId} onValueChange={setStoreId}>
              <SelectTrigger data-testid="select-store">
                <SelectValue placeholder="Select store" />
              </SelectTrigger>
              <SelectContent>
                {stores?.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Warehouse name" data-testid="input-warehouse-name" />
          </div>
          <div className="space-y-2">
            <Label>Location</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Optional" data-testid="input-warehouse-location" />
          </div>
          <Button className="w-full" onClick={() => mutation.mutate()} disabled={!name || !storeId || mutation.isPending} data-testid="button-submit-warehouse">
            {mutation.isPending ? "Creating..." : "Create Warehouse"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function WarehousesPage() {
  const { data: stores, isLoading: storesLoading } = useQuery<StoreType[]>({
    queryKey: ["/api/stores"],
  });
  const { data: warehouses, isLoading: warehousesLoading } = useQuery<(WarehouseType & { storeName?: string })[]>({
    queryKey: ["/api/warehouses"],
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/stores"] });
    queryClient.invalidateQueries({ queryKey: ["/api/warehouses"] });
  };

  const isLoading = storesLoading || warehousesLoading;

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-warehouses-title">Stores & Warehouses</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your storage locations</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <AddStoreDialog onSuccess={invalidate} />
          <AddWarehouseDialog onSuccess={invalidate} />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : !stores?.length ? (
        <Card>
          <CardContent className="p-10 text-center">
            <Store className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No stores yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Create a store first, then add warehouses</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {stores.map((store) => {
            const storeWarehouses = warehouses?.filter((w) => w.storeId === store.id) || [];
            return (
              <Card key={store.id} data-testid={`card-store-${store.id}`}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Store className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold">{store.name}</p>
                      {store.address && (
                        <p className="text-xs text-muted-foreground">{store.address}</p>
                      )}
                    </div>
                  </div>
                  {!storeWarehouses.length ? (
                    <p className="text-sm text-muted-foreground ml-13">No warehouses assigned</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 ml-0">
                      {storeWarehouses.map((wh) => (
                        <div
                          key={wh.id}
                          className="flex items-center gap-3 p-3 rounded-md bg-muted/40"
                          data-testid={`item-warehouse-${wh.id}`}
                        >
                          <Warehouse className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{wh.name}</p>
                            {wh.location && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {wh.location}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
