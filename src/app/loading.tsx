import { PawIcon } from "@/components/layout/logo";

export default function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Cargando">
      <PawIcon className="h-12 w-12 animate-bounce text-brand-400" />
    </div>
  );
}
