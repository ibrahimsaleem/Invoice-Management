import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, FileText, PlusCircle, CreditCard, Droplets, BarChart2, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/invoices/new", label: "New", icon: PlusCircle },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/balances", label: "Balances", icon: BarChart2 },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const isActive = (href: string) =>
    href === "/dashboard"
      ? location === "/" || location === "/dashboard"
      : href === "/invoices/new"
      ? location === "/invoices/new"
      : href === "/invoices"
      ? location.startsWith("/invoices") && location !== "/invoices/new"
      : location.startsWith(href);

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-60 border-r border-sidebar-border bg-sidebar flex-shrink-0">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <Droplets className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <div className="font-semibold text-sm leading-tight">Power Clean Pro</div>
            <div className="text-xs text-muted-foreground">Business Manager</div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                isActive(href)
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          ))}
        </nav>
        {user && (
          <div className="px-4 py-3 border-t border-sidebar-border flex items-center justify-between gap-2 bg-sidebar-accent/10">
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate text-sidebar-foreground">{user.username}</p>
              <p className="text-[10px] text-muted-foreground">Logged in</p>
            </div>
            <button
              onClick={() => logout()}
              className="p-1.5 rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-destructive transition-colors cursor-pointer"
              title="Log Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="px-6 py-4 border-t border-sidebar-border text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Power Clean Pro
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-background flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <Droplets className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm">Power Clean Pro</span>
          </div>
          {user && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground font-medium">{user.username}</span>
              <button
                onClick={() => logout()}
                className="p-1.5 rounded-md text-muted-foreground hover:text-destructive active:bg-muted transition-colors cursor-pointer"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </header>

        {/* Page content — extra bottom padding on mobile for the bottom nav */}
        <main className="flex-1 overflow-auto pb-20 md:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border flex items-stretch h-16 safe-area-bottom">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors min-w-0",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5 transition-all",
                  active ? "scale-110" : ""
                )}
              />
              <span className="truncate w-full text-center px-0.5">{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
