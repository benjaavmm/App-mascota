import { PawIcon } from "@/components/layout/logo";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/card";

export default function NotFound() {
  return (
    <Container className="flex max-w-xl flex-col items-center py-20 text-center">
      <PawIcon className="h-20 w-20 text-brand-300" />
      <h1 className="mt-6 text-3xl font-extrabold">No encontramos esta página</h1>
      <p className="mt-3 text-stone-600">
        Puede que la publicación ya no esté disponible, que haya sido pausada o que el enlace sea incorrecto.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/perritos">Ver perritos</ButtonLink>
        <ButtonLink href="/" variant="secondary">
          Ir al inicio
        </ButtonLink>
      </div>
    </Container>
  );
}
