/** Схема FDI: верхняя дуга — квадранты 1 и 2, нижняя — 4 и 3. */
export const FDI_ARCHES: readonly (readonly (readonly number[])[])[] = [
  [
    [18, 17, 16, 15, 14, 13, 12, 11],
    [21, 22, 23, 24, 25, 26, 27, 28],
  ],
  [
    [48, 47, 46, 45, 44, 43, 42, 41],
    [31, 32, 33, 34, 35, 36, 37, 38],
  ],
];

export const ALL_TEETH: readonly number[] = FDI_ARCHES.flat(2);

const POSITION_NAME: Record<number, string> = {
  1: 'Центральный резец',
  2: 'Боковой резец',
  3: 'Клык',
  4: 'Первый премоляр',
  5: 'Второй премоляр',
  6: 'Первый моляр',
  7: 'Второй моляр',
  8: 'Третий моляр',
};

/** toothName(17) → 'Второй моляр' */
export function toothName(tooth: number): string {
  return POSITION_NAME[tooth % 10] ?? '';
}

/** Порядок обхода дуги: 18 → 11 → 21 → 28 → 48 → 41 → 31 → 38. */
export function sortTeeth(teeth: readonly number[]): number[] {
  return [...teeth].sort((a, b) => ALL_TEETH.indexOf(a) - ALL_TEETH.indexOf(b));
}
