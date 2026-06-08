import slugify from 'slugify';

const DEFAULT_MAX_SLUG_LENGTH = 120;

export const normalizeSlug = (
  value: string,
  maxLength: number = DEFAULT_MAX_SLUG_LENGTH,
): string => {
  const normalized = slugify(value, {
    lower: true,
    strict: true,
    trim: true,
  });

  if (!normalized) {
    return '';
  }

  if (maxLength <= 0 || normalized.length <= maxLength) {
    return normalized;
  }

  return normalized.slice(0, maxLength).replace(/-+$/g, '');
};
