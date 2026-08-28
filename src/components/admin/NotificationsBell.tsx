import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type Notification,
} from "@/lib/notifications";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export function NotificationsBell() {
  const qc = useQueryClient();
  const fetchNotifications = useServerFn(getNotifications);
  const markReadFn = useServerFn(markNotificationAsRead);
  const markAllReadFn = useServerFn(markAllNotificationsAsRead);

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetchNotifications(),
    refetchInterval: 30000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => markReadFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e: unknown) => {
      toast.error((e as Error)?.message || "Erreur");
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => markAllReadFn(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Toutes les notifications marquées comme lues");
    },
    onError: (e: unknown) => {
      toast.error((e as Error)?.message || "Erreur");
    },
  });

  const notifications: Notification[] = data?.notifications || [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  function formatTimeAgo(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMin / 60);
    const diffD = Math.floor(diffH / 24);

    if (diffMin < 1) return "À l'instant";
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    if (diffH < 24) return `Il y a ${diffH}h`;
    if (diffD < 7) return `Il y a ${diffD}j`;
    return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-google-red text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="font-bold text-sm">Notifications</span>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              className="inline-flex items-center gap-1 text-xs font-semibold text-google-blue hover:underline disabled:opacity-50"
            >
              {markAllReadMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <CheckCheck className="h-3 w-3" />
              )}
              Tout marquer lu
            </button>
          )}
        </div>

        <ScrollArea className="h-80">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Aucune notification</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-2 px-4 py-3 transition hover:bg-muted/40 ${!n.read ? "bg-google-blue/5" : ""}`}
                >
                  {!n.read && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-google-red" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-snug break-words">{n.message}</p>
                    <span className="text-[11px] text-muted-foreground">
                      {formatTimeAgo(n.created_at)}
                    </span>
                  </div>
                  {!n.read && (
                    <button
                      onClick={() => markReadMutation.mutate(n.id)}
                      disabled={markReadMutation.isPending}
                      className="shrink-0 text-xs font-semibold text-google-blue hover:underline disabled:opacity-50"
                    >
                      Marquer lu
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
