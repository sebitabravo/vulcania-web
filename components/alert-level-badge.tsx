"use client";

import { Badge } from "@/components/ui/badge";
import { getAlertLevelConfig, type AlertLevel } from "@/lib/alert-levels";
import { cn } from "@/lib/utils";

interface AlertLevelBadgeProps {
  level: AlertLevel | string;
  showIcon?: boolean;
  className?: string;
}

export function AlertLevelBadge({
  level,
  showIcon = true,
  className,
}: AlertLevelBadgeProps) {
  const config = getAlertLevelConfig(level);
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 rounded-full px-3 py-1 font-mono text-[0.68rem] uppercase tracking-[0.12em]",
        config.badgeClass,
        className
      )}
      aria-label={config.label}
    >
      {showIcon ? <Icon aria-hidden="true" className="size-3.5" /> : null}
      {config.label}
    </Badge>
  );
}
