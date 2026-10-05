/** Takes anything so `cond && 'class'` works whatever `cond` is, and keeps only strings. */
export const cn = (...parts: unknown[]) =>
  parts.filter((part): part is string => typeof part === 'string' && part !== '').join(' ');
