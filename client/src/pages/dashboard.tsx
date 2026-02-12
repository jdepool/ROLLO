import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package,
  AlertTriangle,
  XCircle,
  Clock,
  DollarSign,
  TrendingUp,
  ArrowRightLeft,
} from "lucide-react";
import type { StockSummary, InventoryWithDetails, MovementWithDetails } from "@shared/schema";

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = "default",
  loading,
  testId,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: typeof Package;
  variant?: "default" | "warning" | "danger" | "success";
  loading?: boolean;
  testId: string;
}) {
  const variantStyles = {
    default: "text-foreground",
    warning: "text-amber-600 dark:text-amber-400",
    danger: "text-red-600 dark:text-red-400",
    success: "text-emerald-600 dark:text-emerald-400",
  };

  const iconBg = {
    default: "bg-primary/10",
    warning: "bg-amber-100 dark:bg-amber-900/30",
    danger: "bg-red-100 dark:bg-red-900/30",
    success: "bg-emerald-100 dark:bg-emerald-900/30",
  };

  const iconColor = {
    default: "text-primary",
    warning: "text-amber-600 dark:text-amber-400",
    danger: "text-red-600 dark:text-red-400",
    success: "text-emerald-600 dark:text-emerald-400",
  };

  return (
    <Card data-testid={testId}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-20 mt-1" />
            ) : (
              <p className={`text-2xl font-bold mt-1 ${variantStyles[variant]}`} data-testid={`${testId}-value`}>
                {value}
              </p>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className={`flex items-center justify-center w-10 h-10 rounded-md ${iconBg[variant]}`}>
            <Icon className={`w-5 h-5 ${iconColor[variant]}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MovementTypeLabel({ type }: { type: string }) {
  const labels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    entrada: { label: "Entry", variant: "default" },
    salida: { label: "Exit", variant: "secondary" },
    ajuste: { label: "Adjustment", variant: "outline" },
    transfer: { label: "Transfer", variant: "secondary" },
  };
  const cfg = labels[type] || { label: type, variant: "outline" as const };
  return <Badge variant={cfg.variant} className="text-xs">{cfg.label}</Badge>;
}

export default function Dashboard() {
  const { data: summary, isLoading: summaryLoading } = useQuery<StockSummary>({
    queryKey: ["/api/inventory/summary"],
  });

  const { data: lowStock, isLoading: lowStockLoading } = useQuery<InventoryWithDetails[]>({
    queryKey: ["/api/inventory", "?low_stock=true"],
  });

  const { data: movements, isLoading: movementsLoading } = useQuery<MovementWithDetails[]>({
    queryKey: ["/api/inventory/movements", "?limit=8"],
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Overview of your inventory status
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Products"
          value={summary?.totalProducts ?? 0}
          icon={Package}
          loading={summaryLoading}
          testId="stat-total-products"
        />
        <StatCard
          title="Inventory Value"
          value={summary ? `$${Number(summary.totalValue || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "$0.00"}
          icon={DollarSign}
          variant="success"
          loading={summaryLoading}
          testId="stat-total-value"
        />
        <StatCard
          title="Low Stock"
          value={summary?.lowStockCount ?? 0}
          subtitle="Items below minimum"
          icon={AlertTriangle}
          variant="warning"
          loading={summaryLoading}
          testId="stat-low-stock"
        />
        <StatCard
          title="Out of Stock"
          value={summary?.outOfStockCount ?? 0}
          icon={XCircle}
          variant="danger"
          loading={summaryLoading}
          testId="stat-out-of-stock"
        />
        <StatCard
          title="Expiring Soon"
          value={summary?.expiringSoonCount ?? 0}
          subtitle="Within 3 days"
          icon={Clock}
          variant="warning"
          loading={summaryLoading}
          testId="stat-expiring"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Low Stock Alerts
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {lowStock?.length ?? 0} items
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            {lowStockLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !lowStock?.length ? (
              <div className="p-6 text-center">
                <TrendingUp className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">All stock levels are healthy</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {lowStock.slice(0, 6).map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-5 py-3 gap-3" data-testid={`alert-item-${item.id}`}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">{item.warehouseName}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                          {Number(item.quantity)} {item.unit}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          min: {Number(item.minStock)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-primary" />
              Recent Movements
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {movementsLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !movements?.length ? (
              <div className="p-6 text-center">
                <ArrowRightLeft className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No movements recorded yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {movements.slice(0, 6).map((mov) => (
                  <div key={mov.id} className="flex items-center justify-between px-5 py-3 gap-3" data-testid={`movement-item-${mov.id}`}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{mov.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        {mov.warehouseName} &middot;{" "}
                        {mov.createdAt
                          ? new Date(mov.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={`text-sm font-mono font-semibold ${Number(mov.quantity) > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                        {Number(mov.quantity) > 0 ? "+" : ""}{Number(mov.quantity)}
                      </span>
                      <MovementTypeLabel type={mov.movementType} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
