import {
  OTHER_STAGE_KEY,
  compareGroupStage,
  deriveStageKey,
  knockoutIndexFor,
  stageCategoryFor
} from './stageOrdering';
import { getMatchKickoffDate, matchKickoffValue } from './kickoffUtils';

export const defaultMatchTimeValue = match => matchKickoffValue(match);

export const getDateKey = match => {
  if (match?.date) return match.date;
  if (match?.originalDate) return match.originalDate;
  const kickoffDate = getMatchKickoffDate(match);
  if (kickoffDate) {
    return kickoffDate.toISOString().slice(0, 10);
  }
  return null;
};

export const formatDateLabel = (date, t) => {
  if (!date) return t ? t('scheduleTbd') : '';
  try {
    const formatter = new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
    return formatter.format(new Date(`${date}T12:00:00Z`));
  } catch (error) {
    console.error('date format error', error);
    return date;
  }
};

const defaultStageLabelForKey = (key, t) => {
  if (key === OTHER_STAGE_KEY) {
    return t ? t('otherMatches') : 'Other matches';
  }
  return key;
};

export const buildStageSections = (
  matches,
  {
    t,
    matchTimeValue = defaultMatchTimeValue,
    stageLabelForKey = key => defaultStageLabelForKey(key, t),
    dateLabelForKey = dateKey => (dateKey ? formatDateLabel(dateKey, t) : t ? t('dateToBeDefined') : 'Date to be defined')
  } = {}
) => {
  const stageMap = new Map();

  matches.forEach(match => {
    const stageKey = deriveStageKey(match.group_name, match.series) || OTHER_STAGE_KEY;
    const stageLabel = stageLabelForKey(stageKey);
    const category = stageCategoryFor(stageKey);
    const stageEntry = stageMap.get(stageKey) || {
      key: stageKey,
      label: stageLabel,
      category,
      knockoutIndex: knockoutIndexFor(stageKey),
      order: Number.POSITIVE_INFINITY,
      dates: new Map()
    };

    stageEntry.label = stageLabel;
    stageEntry.category = category;
    stageEntry.knockoutIndex = knockoutIndexFor(stageKey);

    const dateKey = getDateKey(match);
    const normalizedDateKey = dateKey || `unknown-${match._id}`;
    const label = dateLabelForKey(dateKey);
    const dateEntry = stageEntry.dates.get(normalizedDateKey) || {
      key: normalizedDateKey,
      label,
      order: matchTimeValue(match),
      matches: []
    };

    dateEntry.order = Math.min(dateEntry.order, matchTimeValue(match));
    dateEntry.label = label;
    dateEntry.matches.push(match);
    stageEntry.dates.set(normalizedDateKey, dateEntry);
    stageEntry.order = Math.min(stageEntry.order, matchTimeValue(match));
    stageMap.set(stageKey, stageEntry);
  });

  const comparator = (a, b) => {
    if (a.category === 'group' && b.category === 'group') return compareGroupStage(a.key, b.key);
    if (a.category === 'group') return -1;
    if (b.category === 'group') return 1;
    if (a.category === 'knockout' || b.category === 'knockout') {
      const aIndex = a.knockoutIndex ?? Number.POSITIVE_INFINITY;
      const bIndex = b.knockoutIndex ?? Number.POSITIVE_INFINITY;
      if (aIndex !== bIndex) return aIndex - bIndex;
      return a.order - b.order;
    }
    return a.order - b.order;
  };

  return Array.from(stageMap.values())
    .map(stage => ({
      ...stage,
      dates: Array.from(stage.dates.values()).sort((a, b) => a.order - b.order)
    }))
    .sort(comparator);
};

export const countMatchesInStage = stage => {
  if (!stage?.dates) return 0;
  return stage.dates.reduce((acc, date) => acc + date.matches.length, 0);
};

export const buildDateSections = (
  matches,
  {
    t,
    matchTimeValue = defaultMatchTimeValue,
    dateLabelForKey = dateKey => (dateKey ? formatDateLabel(dateKey, t) : t ? t('dateToBeDefined') : 'Date to be defined')
  } = {}
) => {
  const map = new Map();

  matches.forEach(match => {
    const dateKey = getDateKey(match);
    const normalizedKey = dateKey || `unknown-${match._id}`;
    const label = dateLabelForKey(dateKey);
    const entry = map.get(normalizedKey) || {
      key: normalizedKey,
      label,
      order: matchTimeValue(match),
      matches: []
    };

    entry.order = Math.min(entry.order, matchTimeValue(match));
    entry.label = label;
    entry.matches.push(match);
    map.set(normalizedKey, entry);
  });

  return Array.from(map.values())
    .sort((a, b) => a.order - b.order)
    .map(entry => ({
      ...entry,
      label: entry.label || dateLabelForKey(entry.key)
    }));
};
