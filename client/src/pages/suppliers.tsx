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
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Truck, Phone, Mail, User } from "lucide-react";
import type { Supplier } from "@shared/schema";

function AddSupplierDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/suppliers", {
        name,
        contact: contact || null,
        phone: phone || null,
        email: email || null,
      });
    },
    onSuccess: () => {
      toast({ title: "Proveedor creado" });
      setOpen(false);
      setName("");
      setContact("");
      setPhone("");
      setEmail("");
      onSuccess();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#ccdd53]" data-testid="button-add-supplier">
          <Plus className="w-4 h-4 mr-2" />
          Agregar Proveedor
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo Proveedor</DialogTitle>
          <DialogDescription>Agrega un proveedor de productos</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Nombre de la Empresa</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del proveedor" data-testid="input-supplier-name" />
          </div>
          <div className="space-y-2">
            <Label>Persona de Contacto</Label>
            <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Opcional" data-testid="input-supplier-contact" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Telefono</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Opcional" data-testid="input-supplier-phone" />
            </div>
            <div className="space-y-2">
              <Label>Correo</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Opcional" data-testid="input-supplier-email" />
            </div>
          </div>
          <Button
            className="w-full"
            onClick={() => mutation.mutate()}
            disabled={!name || mutation.isPending}
            data-testid="button-submit-supplier"
          >
            {mutation.isPending ? "Creando..." : "Crear Proveedor"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function SuppliersPage() {
  const { data: suppliers, isLoading } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
  };

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-suppliers-title">Proveedores</h1>
          <p className="text-sm text-muted-foreground mt-1">Administra tus proveedores de productos</p>
        </div>
        <AddSupplierDialog onSuccess={invalidate} />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : !suppliers?.length ? (
        <Card>
          <CardContent className="p-10 text-center">
            <Truck className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No hay proveedores</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Agrega tu primer proveedor para comenzar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map((sup) => (
            <Card key={sup.id} data-testid={`card-supplier-${sup.id}`}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Truck className="w-5 h-5 text-primary" />
                  </div>
                  <p className="font-semibold truncate">{sup.name}</p>
                </div>
                <div className="space-y-1.5 text-sm text-muted-foreground">
                  {sup.contact && (
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5" />
                      <span className="truncate">{sup.contact}</span>
                    </div>
                  )}
                  {sup.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{sup.phone}</span>
                    </div>
                  )}
                  {sup.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5" />
                      <span className="truncate">{sup.email}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
