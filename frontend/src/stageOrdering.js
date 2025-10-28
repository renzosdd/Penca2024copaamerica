import roundOrder from './roundOrder';

export const OTHER_STAGE_KEY = '__other__';
const GROUP_STAGE_REGEX = /^Grupo\s*/i;

const normalizeGroupName = value => {
  const suffix = value.replace(GROUP_STAGE_REGEX, '').trim();
  return suffix ? `Grupo ${suffix}` : 'Grupo';
};

const normalizeStageToken = value => {
  if (!value) return '';
  return value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase();
};

const knockoutEntries = roundOrder
  .filter(label => !GROUP_STAGE_REGEX.test(label))
  .map((label, index) => ({
    label,
    index,
    normalized: normalizeStageToken(label)
  }));

const knockoutMap = new Map(knockoutEntries.map(entry => [entry.normalized, entry]));

const simplifyNormalizedToken = token => token.replace(/\b(ida|vuelta|leg|match|game|partido|ida y vuelta)\b.*$/, '').trim();

const findKnockoutEntry = label => {
  const normalized = normalizeStageToken(label);
  if (!normalized) return null;
  if (knockoutMap.has(normalized)) {
    return knockoutMap.get(normalized);
  }
  const simplified = simplifyNormalizedToken(normalized);
  if (simplified && knockoutMap.has(simplified)) {
    return knockoutMap.get(simplified);
  }
  for (const entry of knockoutEntries) {
    if (normalized.startsWith(entry.normalized) || entry.normalized.startsWith(normalized)) {
      return entry;
    }
  }
  return null;
};

export const isGroupStage = value => GROUP_STAGE_REGEX.test(value || '');

export const compareGroupStage = (a, b) => {
  const clean = value => value.replace(GROUP_STAGE_REGEX, '').trim();
  return clean(a).localeCompare(clean(b), undefined, { sensitivity: 'base', numeric: true });
};

export const canonicalStageKey = raw => {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (isGroupStage(trimmed)) {
    return normalizeGroupName(trimmed);
  }
  const entry = findKnockoutEntry(trimmed);
  if (entry) {
    return entry.label;
  }
  return trimmed;
};

export const deriveStageKey = (groupName, series) => {
  const group = groupName?.trim();
  if (group) {
    return canonicalStageKey(group);
  }
  const seriesValue = series?.trim();
  if (seriesValue) {
    const canonical = canonicalStageKey(seriesValue);
    return canonical || seriesValue;
  }
  return OTHER_STAGE_KEY;
};

export const knockoutIndexFor = label => {
  if (!label || label === OTHER_STAGE_KEY) return -1;
  const entry = findKnockoutEntry(label);
  return entry ? entry.index : -1;
};

export const stageCategoryFor = label => {
  if (!label || label === OTHER_STAGE_KEY) return 'other';
  if (isGroupStage(label)) return 'group';
  return knockoutIndexFor(label) !== -1 ? 'knockout' : 'other';
};

export const knockoutStageLabels = roundOrder.filter(label => !GROUP_STAGE_REGEX.test(label));
