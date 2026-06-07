import { getMaintenanceState } from "@/lib/admin/settings";
import { Wrench } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MaintenancePage() {
  const { message } = await getMaintenanceState();

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-[var(--ios-bg)] px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ios-blue/12 text-ios-blue">
        <Wrench size={28} />
      </div>
      <h1 className="text-2xl font-bold text-foreground">Em manutenção</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        {message || "Estamos fazendo alguns ajustes no Solara. Voltamos em breve 💛"}
      </p>
    </div>
  );
}
