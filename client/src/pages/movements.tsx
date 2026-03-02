import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRightLeft, ArrowDown, ArrowUp, RefreshCw } from "lucide-react";
import type { MovementWithDetails } from "@shared/schema";

function MovementIcon({ type }: { type: string }) {
  if (type === "entrada") return <ArrowDown className="w-4 h-4 text-emerald-500" />;
  if (type === "salida") return <ArrowUp className="w-4 h-4 text-red-500" />;
  return <RefreshCw className="w-4 h-4 text-blue-500" />;
}

function MovementTypeBadge({ type }: { type: string }) {
  const cfg: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
    entrada: { label: "Entrada", variant: "default" },
    salida: { label: "Salida", variant: "secondary" },
    ajuste: { label: "Ajuste", variant: "outline" },
  };
  const c = cfg[type] || { label: type, variant: "outline" as const };
  return <Badge variant={c.variant} className="text-xs">{c.label}</Badge>;
}

export default function MovementsPage() {
  const { data: movements, isLoading } = useQuery<MovementWithDetails[]>({
    queryKey: ["/api/inventory/movements"],
  });

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-movements-title">Historial de Movimientos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Registra todas las entradas, salidas y ajustes de inventario
        </p>
      </div>

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
                          <MovementIcon type={mov.movementType} />
                          <MovementTypeBadge type={mov.movementType} />
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
    </div>
  );
}
