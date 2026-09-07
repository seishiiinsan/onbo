"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = href === "/app" ? pathname === "/app" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        "rounded-lg px-3 py-2 text-sm transition-colors",
        active
          ? "bg-[var(--color-brand-soft)] font-medium text-[var(--color-brand-ink)]"
          : "text-[var(--color-muted)] hover:bg-black/[0.04] hover:text-[var(--color-ink)]",
      )}
    >
      {children}
    </Link>
  );
}
