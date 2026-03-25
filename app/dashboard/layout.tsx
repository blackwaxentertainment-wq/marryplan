"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import {
  CalendarCheck,
  FolderOpen,
  Heart,
  LayoutDashboard,
  Menu,
  Music4,
  PiggyBank,
  Users,
  X,
  CheckSquare,
  LogOut,
} from "lucide-react";

const navItems = [
  {
    href: "/dashboard",
    label: "Übersicht",
    icon: LayoutDashboard,
  },
  {
    href: "/dashboard/budget",
    label: "Budgetplaner",
    icon: PiggyBank,
  },
  {
    href: "/dashboard/sitzplan",
    label: "Sitzplan",
    icon: Users,
  },
  {
    href: "/dashboard/musik",
    label: "Musik",
    icon: Music4,
  },
  {
    href: "/dashboard/dokumente",
    label: "Dokumente",
    icon: FolderOpen,
  },
  {
    href: "/dashboard/todos",
    label: "To do Liste",
    icon: CheckSquare,
  },
];

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  mobile = false,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active?: boolean;
  mobile?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={
        mobile
          ? `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition ${
              active
                ? "bg-stone-900 text-white"
                : "bg-stone-50 text-stone-700 hover:bg-stone-100"
            }`
          : `inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm transition ${
              active
                ? "bg-stone-900 text-white"
                : "bg-stone-100 text-stone-700 hover:bg-stone-200"
            }`
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </Link>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeLabel = useMemo(() => {
    const item = navItems.find((entry) => entry.href === pathname);
    return item?.label || "Übersicht";
  }, [pathname]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  return (
    <main className="min-h-screen bg-[#f5efe8] text-stone-900">
      <div className="mx-auto max-w-[1380px] px-3 py-3 md:px-6 md:py-6">
        <div className="space-y-6">
          <header className="sticky top-3 z-50 rounded-[28px] border border-stone-200 bg-[#fbf7f2]/95 px-4 py-4 backdrop-blur md:px-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-900 text-white">
                  <Heart className="h-5 w-5" />
                </div>

                <div>
                  <div className="text-base font-semibold md:text-lg">
                    Marryplan
                  </div>
                  <div className="text-xs text-stone-500 md:text-sm">
                    {activeLabel}
                  </div>
                </div>
              </div>

              <div className="hidden xl:flex xl:flex-1 xl:justify-center">
                <nav className="flex flex-wrap items-center gap-2">
                  {navItems.map((item) => (
                    <NavItem
                      key={item.href}
                      href={item.href}
                      label={item.label}
                      icon={item.icon}
                      active={pathname === item.href}
                    />
                  ))}
                </nav>
              </div>

              <div className="hidden xl:flex xl:items-center xl:gap-3">
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
                >
                  <LogOut className="h-4 w-4" />
                  Ausloggen
                </button>
              </div>

              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-stone-200 bg-white xl:hidden"
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
            </div>

            <div className="mt-4 hidden xl:block">
              <div className="h-px bg-stone-200" />
            </div>

            {mobileMenuOpen ? (
              <div className="mt-4 grid gap-2 xl:hidden">
                {navItems.map((item) => (
                  <NavItem
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                    active={pathname === item.href}
                    mobile
                    onClick={() => setMobileMenuOpen(false)}
                  />
                ))}

                <button
                  onClick={handleLogout}
                  className="mt-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-stone-900 px-4 py-3 text-sm font-medium text-white"
                >
                  <LogOut className="h-4 w-4" />
                  Ausloggen
                </button>
              </div>
            ) : null}
          </header>

          {children}
        </div>
      </div>
    </main>
  );
}