import Link from "next/link";
import { CurrencySettings } from "@/components/settings/CurrencySettings";

// #437 — general settings page; currently hosts the display-currency toggle.
export default function SettingsPage() {
  return (
    <main className="container mx-auto max-w-2xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <CurrencySettings />
      <Link
        href="/settings/notifications"
        className="inline-block text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        Notification preferences →
      </Link>
    </main>
  );
}
