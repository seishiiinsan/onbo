"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/actions/notifications";
import { cn } from "@/lib/utils";

/**
 * Centre de notifications (issue #39).
 *
 * Une pastille sur le rail, un panneau deroulant : ce qui vient d'arriver,
 * non lu en gras. Le clic ouvre le projet et marque la ligne comme lue.
 */
export type NotificationItem = {
  id: string;
  title: string;
  body: string | null;
  url: string | null;
  at: string;
  read: boolean;
};

type Props = {
  items: NotificationItem[];
  unread: number;
  compact: boolean;
};

export function NotificationsBell({ items, unread, compact }: Props) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={
          unread > 0 ? `Notifications (${unread} non lues)` : "Notifications"
        }
        aria-expanded={open}
        className={cn(
          "focusable relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[var(--color-muted)] transition-colors hover:bg-black/[0.04] hover:text-[var(--color-ink)]",
          compact && "justify-center px-0",
        )}
      >
        <Bell size={16} className="shrink-0" />
        {!compact && "Notifications"}
        {unread > 0 && (
          <span
            className={cn(
              "ml-auto rounded-full bg-[var(--color-brand-soft)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--color-brand-ink)]",
              compact && "absolute right-1 top-1 ml-0 px-1 py-0",
            )}
          >
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 z-30 mt-1 w-72 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-2 shadow-lg">
          <div className="flex items-center justify-between px-1.5 pb-1.5">
            <span className="section-label">Notifications</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={() =>
                  startTransition(async () => {
                    await markAllNotificationsRead();
                  })
                }
                className="text-xs text-[var(--color-muted)] underline-offset-2 hover:underline"
              >
                Tout marquer comme lu
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <p className="px-1.5 py-3 text-xs text-[var(--color-muted)]">
              Rien de neuf. Les dépôts, messages et blocages arrivent ici.
            </p>
          ) : (
            <ul className="max-h-80 space-y-0.5 overflow-y-auto">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.url ?? "/app"}
                    onClick={() => {
                      setOpen(false);
                      if (!item.read) {
                        startTransition(async () => {
                          await markNotificationRead(item.id);
                        });
                      }
                    }}
                    className="focusable block rounded-lg px-1.5 py-2 hover:bg-black/[0.04]"
                  >
                    <span
                      className={cn(
                        "block text-xs",
                        item.read
                          ? "text-[var(--color-muted)]"
                          : "font-medium text-[var(--color-ink)]",
                      )}
                    >
                      {item.title}
                    </span>
                    {item.body && (
                      <span className="mt-0.5 block line-clamp-2 text-xs text-[var(--color-muted)]">
                        {item.body}
                      </span>
                    )}
                    <span className="mt-0.5 block text-[11px] text-[var(--color-muted)]">
                      {item.at}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
