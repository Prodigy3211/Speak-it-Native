export const CATEGORIES = [
    'Prove Me Wrong',
    'Relationships',
    'War',
    'Politics',
    'Philosophy',
    'Entertainment'
] as const;

export type CategoryType = typeof CATEGORIES[number]; 