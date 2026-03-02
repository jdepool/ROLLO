import { useLocation, Link } from "wouter";
import {
  LayoutDashboard,
  Package,
  Boxes,
  Tags,
  Truck,
  Warehouse,
  ArrowRightLeft,
  Moon,
  Sun,
  FileText,
} from "lucide-react";
import rolloLogo from "@assets/rollo_logo_circle_(1)_1770856818644.png";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";

const mainNav = [
  { title: "Panel", url: "/", icon: LayoutDashboard },
  { title: "Ordenes de Compra", url: "/purchase-orders", icon: FileText },
  { title: "Inventario", url: "/inventory", icon: Boxes },
  { title: "Movimientos", url: "/movements", icon: ArrowRightLeft },
];

const manageNav = [
  { title: "Productos", url: "/products", icon: Package },
  { title: "Categorias", url: "/categories", icon: Tags },
  { title: "Proveedores", url: "/suppliers", icon: Truck },
  { title: "Almacenes", url: "/warehouses", icon: Warehouse },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer" data-testid="link-logo">
            <img src={rolloLogo} alt="Rollo" className="w-9 h-9 rounded-full object-cover" />
            <div>
              <h1 className="text-base font-bold tracking-tight text-sidebar-foreground">Rollo</h1>
              <p className="text-[11px] text-sidebar-foreground/60 leading-none">Gestor de Inventario</p>
            </div>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Vista General</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`link-nav-${item.title.toLowerCase()}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Administrar</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {manageNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`link-nav-${item.title.toLowerCase()}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3">
        <Button
          size="icon"
          variant="ghost"
          onClick={toggleTheme}
          data-testid="button-theme-toggle"
        >
          {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
