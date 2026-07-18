"use client";

import { Check } from "lucide-react";
import { BottomSheet } from "@/components/glass/BottomSheet";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useHaptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { TIER_CONFIG, TIER_ORDER, type FrontTier } from "@/lib/front";
import type { TranslationKey } from "@/lib/i18n";

interface RolePickerProps {
  open: boolean;
  onClose: () => void;
  /** The member's name, shown in the sheet title for context. */
  memberName?: string;
  /** Currently selected role, or null when the member has no role. */
  value: FrontTier | null;
  /** Called with the chosen role, or null to clear it. */
  onSelect: (tier: FrontTier | null) => void;
}

/**
 * A bottom-sheet modal for picking a member's front role. Roles are optional —
 * "No role" is always offered and is the default state, keeping the feature
 * fully opt-in.
 */
export function RolePicker({ open, onClose, memberName, value, onSelect }: RolePickerProps) {
  const { t } = useLanguage();
  const { selection } = useHaptics();

  function choose(tier: FrontTier | null) {
    selection();
    onSelect(tier);
    onClose();
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={memberName ? t("front.roleFor", { name: memberName }) : t("front.chooseRole")}
    >
      <div className="rounded-ios-lg overflow-hidden border border-border/50">
        {/* No role — always available so roles stay optional */}
        <RoleRow
          label={t("front.noRole")}
          description={t("front.noRoleDesc")}
          color="#8E8E93"
          hollow
          selected={value === null}
          onClick={() => choose(null)}
        />
        {TIER_ORDER.map((tier, idx) => {
          const cfg = TIER_CONFIG[tier];
          return (
            <RoleRow
              key={tier}
              label={t(cfg.labelKey as TranslationKey)}
              description={t(cfg.descKey as TranslationKey)}
              color={cfg.color}
              selected={value === tier}
              onClick={() => choose(tier)}
              isLast={idx === TIER_ORDER.length - 1}
            />
          );
        })}
      </div>
    </BottomSheet>
  );
}

function RoleRow({
  label,
  description,
  color,
  selected,
  onClick,
  hollow = false,
  isLast = false,
}: {
  label: string;
  description: string;
  color: string;
  selected: boolean;
  onClick: () => void;
  hollow?: boolean;
  isLast?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 text-left ios-transition",
        !isLast && "border-b border-border/50",
        selected ? "bg-ios-blue/8" : "active:bg-muted/50"
      )}
    >
      <span
        className="inline-block w-3 h-3 rounded-full flex-shrink-0"
        style={
          hollow
            ? { border: `2px solid ${color}`, background: "transparent" }
            : { background: color }
        }
      />
      <div className="flex-1 min-w-0">
        <p className={cn("text-body font-semibold truncate", selected ? "text-ios-blue" : "text-foreground")}>
          {label}
        </p>
        <p className="text-caption-1 text-muted-foreground truncate">{description}</p>
      </div>
      {selected && <Check size={18} className="text-ios-blue flex-shrink-0" strokeWidth={3} />}
    </button>
  );
}
