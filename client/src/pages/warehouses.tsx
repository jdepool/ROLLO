import { useState } from "react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Plus, Warehouse, MapPin, Store, Star, Pencil, Trash2 } from "lucide-react";
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
        <Button className="bg-[#ccdd53]" data-testid="button-add-store">
          <Plus className="w-4 h-4 mr-2" />
          Add Store
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New Store</DialogTitle>
          <DialogDescription>Add a new store location</DialogDescription>
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

function EditStoreDialog({ store, onSuccess }: { store: StoreType; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(store.name);
  const [address, setAddress] = useState(store.address || "");
  const [phone, setPhone] = useState(store.phone || "");
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", `/api/stores/${store.id}`, {
        name,
        address: address || null,
        phone: phone || null,
      });
    },
    onSuccess: () => {
      toast({ title: "Store updated" });
      setOpen(false);
      onSuccess();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setName(store.name);
      setAddress(store.address || "");
      setPhone(store.phone || "");
    }
    setOpen(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" data-testid={`button-edit-store-${store.id}`}>
          <Pencil className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Store</DialogTitle>
          <DialogDescription>Modify store details</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Store name" data-testid="input-edit-store-name" />
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Optional" data-testid="input-edit-store-address" />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" data-testid="input-edit-store-phone" />
          </div>
          <Button className="w-full" onClick={() => mutation.mutate()} disabled={!name || mutation.isPending} data-testid="button-submit-edit-store">
            {mutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditWarehouseDialog({ warehouse, onSuccess }: { warehouse: WarehouseType & { storeName?: string }; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(warehouse.name);
  const [location, setLocation] = useState(warehouse.location || "");
  const [storeId, setStoreId] = useState(String(warehouse.storeId));
  const { toast } = useToast();

  const { data: stores } = useQuery<StoreType[]>({ queryKey: ["/api/stores"] });

  const mutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", `/api/warehouses/${warehouse.id}`, {
        name,
        location: location || null,
        storeId: Number(storeId),
      });
    },
    onSuccess: () => {
      toast({ title: "Warehouse updated" });
      setOpen(false);
      onSuccess();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setName(warehouse.name);
      setLocation(warehouse.location || "");
      setStoreId(String(warehouse.storeId));
    }
    setOpen(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" data-testid={`button-edit-warehouse-${warehouse.id}`}>
          <Pencil className="w-3.5 h-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Warehouse</DialogTitle>
          <DialogDescription>Modify warehouse details</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Store</Label>
            <Select value={storeId} onValueChange={setStoreId}>
              <SelectTrigger data-testid="select-edit-warehouse-store">
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
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Warehouse name" data-testid="input-edit-warehouse-name" />
          </div>
          <div className="space-y-2">
            <Label>Location</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Optional" data-testid="input-edit-warehouse-location" />
          </div>
          <Button className="w-full" onClick={() => mutation.mutate()} disabled={!name || !storeId || mutation.isPending} data-testid="button-submit-edit-warehouse">
            {mutation.isPending ? "Saving..." : "Save Changes"}
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
  const [isMain, setIsMain] = useState(false);
  const { toast } = useToast();

  const { data: stores } = useQuery<StoreType[]>({ queryKey: ["/api/stores"] });

  const mutation = useMutation({
    mutationFn: async () => {
      const result = await apiRequest("POST", "/api/warehouses", {
        name,
        location: location || null,
        storeId: Number(storeId),
        isMain,
      });
      if (isMain) {
        const wh = await result.json();
        await apiRequest("PATCH", `/api/warehouses/${wh.id}/set-main`);
      }
    },
    onSuccess: () => {
      toast({ title: "Warehouse created" });
      setOpen(false);
      setName("");
      setLocation("");
      setStoreId("");
      setIsMain(false);
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
          <DialogDescription>Add a new warehouse location</DialogDescription>
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
          <div className="flex items-center gap-2">
            <Checkbox
              id="is-main"
              checked={isMain}
              onCheckedChange={(checked) => setIsMain(checked === true)}
              data-testid="checkbox-is-main"
            />
            <Label htmlFor="is-main" className="text-sm">Set as main receiving warehouse</Label>
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
  const { toast } = useToast();
  const [deleteStoreId, setDeleteStoreId] = useState<number | null>(null);
  const [deleteWarehouseId, setDeleteWarehouseId] = useState<number | null>(null);

  const setMainMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PATCH", `/api/warehouses/${id}/set-main`);
    },
    onSuccess: () => {
      toast({ title: "Main warehouse updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/warehouses"] });
    },
  });

  const deleteStoreMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/stores/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Store deleted" });
      setDeleteStoreId(null);
      invalidate();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteWarehouseMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/warehouses/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Warehouse deleted" });
      setDeleteWarehouseId(null);
      invalidate();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/stores"] });
    queryClient.invalidateQueries({ queryKey: ["/api/warehouses"] });
  };

  const isLoading = storesLoading || warehousesLoading;

  const deleteStoreName = stores?.find((s) => s.id === deleteStoreId)?.name;
  const deleteWarehouseName = warehouses?.find((w) => w.id === deleteWarehouseId)?.name;

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
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{store.name}</p>
                      {store.address && (
                        <p className="text-xs text-muted-foreground">{store.address}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <EditStoreDialog store={store} onSuccess={invalidate} />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => setDeleteStoreId(store.id)}
                        data-testid={`button-delete-store-${store.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {!storeWarehouses.length ? (
                    <p className="text-sm text-muted-foreground ml-13">No warehouses assigned</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 ml-0">
                      {storeWarehouses.map((wh) => (
                        <div
                          key={wh.id}
                          className="flex items-center justify-between gap-3 p-3 rounded-md bg-muted/40"
                          data-testid={`item-warehouse-${wh.id}`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Warehouse className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-medium truncate">{wh.name}</p>
                                {(wh as any).isMain && (
                                  <Badge variant="secondary" className="text-[10px] gap-1">
                                    <Star className="w-3 h-3" />
                                    Main
                                  </Badge>
                                )}
                              </div>
                              {wh.location && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {wh.location}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <EditWarehouseDialog warehouse={wh} onSuccess={invalidate} />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              onClick={() => setDeleteWarehouseId(wh.id)}
                              data-testid={`button-delete-warehouse-${wh.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                            {!(wh as any).isMain && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs flex-shrink-0"
                                onClick={() => setMainMutation.mutate(wh.id)}
                                disabled={setMainMutation.isPending}
                                data-testid={`button-set-main-${wh.id}`}
                              >
                                Set Main
                              </Button>
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

      <AlertDialog open={deleteStoreId !== null} onOpenChange={(open) => !open && setDeleteStoreId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Store</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteStoreName}"? This will also delete all warehouses assigned to this store. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-store">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteStoreId && deleteStoreMutation.mutate(deleteStoreId)}
              data-testid="button-confirm-delete-store"
            >
              {deleteStoreMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteWarehouseId !== null} onOpenChange={(open) => !open && setDeleteWarehouseId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Warehouse</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteWarehouseName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-warehouse">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteWarehouseId && deleteWarehouseMutation.mutate(deleteWarehouseId)}
              data-testid="button-confirm-delete-warehouse"
            >
              {deleteWarehouseMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}