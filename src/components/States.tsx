"use client";
import { useCatalog } from "./providers/CatalogProvider";
import { useI18n } from "./providers/I18nProvider";
import { LogoMark } from "./Icons";

/** Renders children only once the catalog is loaded; shows friendly loading / error states. */
export function CatalogGate({ children }: { children: React.ReactNode }) {
  const { status, reload } = useCatalog();
  const { m } = useI18n();
  if (status === "ready") return <>{children}</>;
  if (status === "error")
    return (
      <div className="card mx-auto mt-10 max-w-md p-6 text-center">
        <p className="font-bold">{m.loadError}</p>
        <button className="btn btn-primary mt-4" onClick={reload}>{m.retry}</button>
      </div>
    );
  return (
    <div className="mt-16 flex flex-col items-center gap-3" role="status" aria-live="polite">
      <span className="float"><LogoMark size={56} /></span>
      <p className="font-bold text-ink-soft">{m.loading}</p>
    </div>
  );
}

export function EmptyState({ title, children, emoji = "✨" }: { title: string; children?: React.ReactNode; emoji?: string }) {
  return (
    <div className="card flex flex-col items-center gap-3 p-8 text-center">
      <span className="float text-5xl" aria-hidden>{emoji}</span>
      <p className="text-lg font-bold">{title}</p>
      {children}
    </div>
  );
}

export function PageTitle({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-ink-soft sm:text-base">{subtitle}</p>}
      </div>
      {children}
    </header>
  );
}
