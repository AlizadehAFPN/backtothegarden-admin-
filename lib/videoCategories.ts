export interface CategoryOption {
  value: string;
  label: string;
}

export const VIDEO_CATEGORIES: CategoryOption[] = [
  { value: "nutricion", label: "Nutrición" },
  { value: "cuerpoMente", label: "Cuerpo & Mente" },
  { value: "vidaFamilia", label: "Vida en Familia" },
];

export const VIDEO_SUBCATEGORIES: Record<string, CategoryOption[]> = {
  nutricion: [
    { value: "videosCocina", label: "Videos de Cocina" },
    { value: "cuerpoSanoPlantas", label: "Temas de Moda" },
    { value: "equipaCocinaSaludable", label: "Equipa tu Cocina Saludable" },
    { value: "perdidaPesoSana", label: "Pérdida de Peso Sana" },
  ],
  cuerpoMente: [
    { value: "cuidadoPielCuerpo", label: "Cuidado de Piel y Cuerpo" },
    { value: "ejercitate", label: "Ejercítate" },
    { value: "practicasBienestar", label: "Prácticas de Bienestar" },
    { value: "meditacionRespiracionGuiada", label: "Meditación y Respiración Guiada" },
  ],
  vidaFamilia: [
    { value: "vidaSanaFamilia", label: "Vida Sana en Familia" },
    { value: "viajarSanoPosible", label: "Viajar Sano es Posible" },
  ],
};

export function getCategoryLabel(key: string): string {
  return VIDEO_CATEGORIES.find((c) => c.value === key)?.label ?? key;
}

export function getSubcategoryLabel(categoryKey: string, subcategoryKey: string): string {
  return (
    VIDEO_SUBCATEGORIES[categoryKey]?.find((s) => s.value === subcategoryKey)?.label ??
    subcategoryKey
  );
}
