"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import {
  Heart,
  LayoutDashboard,
  PiggyBank,
  Users,
  Music4,
  FolderOpen,
  LogOut,
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  return (
    <main className="min-h-screen bg-[#f5efe8] text-stone-900">
      <div className="mx-auto max-w-[1380px] px-4 py-4 md:px-6 md:py-6">
        <div className="space-y-6">
          
          {/* HEADER */}
          <header className="sticky top-4 z-40 rounded-[28px] border border-stone-200 bg-[#fbf7f2]/95 px-5 py-4 backdrop-blur">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-900 text-white">
                  <Heart className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-lg font-semibold">Marryplan</div>
                  <div className="text-sm text-stone-500">
                    Wedding Dashboard
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex flex-wrap items-center gap-2">
                <NavItem
                  href="/dashboard"
                  label="Übersicht"
                  active={pathname === "/dashboard"}
                  icon={LayoutDashboard}
                />
                <NavItem
                  href="/dashboard/budget"
                  label="Budgetplaner"
                  active={pathname === "/dashboard/budget"}
                  icon={PiggyBank}
                />
                <NavItem
                  href="/dashboard/sitzplan"
                  label="Sitzplan"
                  active={pathname === "/dashboard/sitzplan"}
                  icon={Users}
                />
                <NavItem
                  href="/dashboard"
                  label="Musik"
                  icon={Music4}
                />
                <NavItem
                  href="/dashboard"
                  label="Dokumente"
                  icon={FolderOpen}
                />
              </div>

              {/* Right */}
              <button
                onClick={handleLogout}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-stone-900 px-4 py-3 text-sm font-medium text-white"
              >
                <LogOut className="h-4 w-4" />
                Ausloggen
              </button>
            </div>
          </header>

          {/* CONTENT */}
          {children}
        </div>
      </div>
    </main>
  );
}

function NavItem({
  href,
  label,
  active,
  icon: Icon,
}: {
  href: string;
  label: string;
  active?: boolean;
  icon: any;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm ${
        active
          ? "bg-stone-900 text-white"
          : "text-stone-600 hover:bg-stone-100"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}