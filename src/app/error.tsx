"use client";

import { RefreshCw } from "lucide-react";
import { useEffect } from "react";

import { PawIcon } from "@/components/layout/logo";
import { Button, ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/card";

export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Container className="flex max-w-xl flex-col items-center py-20 text-center">
      <PawIcon className="h-20 w-20 text-brand-300" />
      <h1 className="mt-6 text-3xl font-extrabold">Algo salió mal</h1>
      <p className="mt-3 text-stone-600">Tuvimos un problema al cargar esta página. Inténtalo nuevamente en unos segundos.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={() => retry()}>
          <RefreshCw className="h-4 w-4" />
          Reintentar
        </Button>
        <ButtonLink href="/" variant="secondary">
          Ir al inicio
        </ButtonLink>
      </div>
    </Container>
  );
}
