"use client";
import { I18nProvider } from "@/components/providers/I18nProvider";
import { CatalogProvider } from "@/components/providers/CatalogProvider";
import { StoreProvider } from "@/components/providers/StoreProvider";
import { ToastProvider } from "@/components/Toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <CatalogProvider>
        <StoreProvider>
          <ToastProvider>{children}</ToastProvider>
        </StoreProvider>
      </CatalogProvider>
    </I18nProvider>
  );
}
