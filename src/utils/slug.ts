import slugify from 'slugify';

export const normalizeSlug = (
  value: string,
  maxLength: number = Number(process.env.MAX_SLUG_LENGTH) || 60,
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

export const appendSlugSuffix = (
  baseSlug: string,
  suffix: number,
  maxLength: number = Number(process.env.MAX_SLUG_LENGTH) || 60,
): string => {
  const suffixText = `-${suffix}`;

  const trimmedBase = baseSlug.slice(
    0,
    Math.max(1, maxLength - suffixText.length),
  );

  return `${trimmedBase.replace(/-+$/g, '')}${suffixText}`;
};
