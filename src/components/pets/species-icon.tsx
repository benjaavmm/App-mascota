import { Bird, Cat, Dog, PawPrint, Rabbit, Rat, type LucideProps } from "lucide-react";

import type { Enums } from "@/types/database";

const ICONS = {
  dog: Dog,
  cat: Cat,
  rabbit: Rabbit,
  rodent: Rat,
  bird: Bird,
  horse: PawPrint,
  other: PawPrint,
};

export function SpeciesIcon({ species, ...props }: { species: Enums<"species"> } & LucideProps) {
  const Icon = ICONS[species] ?? PawPrint;
  return <Icon aria-hidden {...props} />;
}
