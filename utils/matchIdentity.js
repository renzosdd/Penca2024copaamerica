const DEFAULT_PREFIX_SEPARATOR = '::';

function normalizeValue(value) {
  if (value == null) {
    return '';
  }
  const str = String(value).trim();
  if (!str || str === 'undefined' || str === 'null') {
    return '';
  }
  return str;
}

function collectCandidateIds(match = {}) {
  const directKeys = [
    'importId',
    'id',
    'matchId',
    'match_id',
    'fixtureId',
    'fixture_id',
    'apiId',
    'api_id',
    'externalId',
    'external_id',
    'slug',
    'uuid',
    'guid',
    'code',
    'key',
    'number'
  ];

  const values = [];
  for (const key of directKeys) {
    if (Object.prototype.hasOwnProperty.call(match, key)) {
      values.push(match[key]);
    }
  }

  const fixture = match.fixture;
  if (fixture && typeof fixture === 'object') {
    const fixtureKeys = ['id', 'matchId', 'fixtureId'];
    for (const key of fixtureKeys) {
      if (Object.prototype.hasOwnProperty.call(fixture, key)) {
        values.push(fixture[key]);
      }
    }
  }

  return values
    .map(normalizeValue)
    .filter(Boolean);
}

function deriveMatchImportId(match = {}, competitionName = '', index = 0) {
  const prefix = normalizeValue(competitionName);
  const candidates = collectCandidateIds(match);
  if (candidates.length > 0) {
    return prefix ? `${prefix}${DEFAULT_PREFIX_SEPARATOR}${candidates[0]}` : candidates[0];
  }

  const parts = [];
  const team1 = normalizeValue(match.team1);
  const team2 = normalizeValue(match.team2);
  const date = normalizeValue(match.date || match.originalDate);
  const time = normalizeValue(match.time || match.originalTime);
  if (team1 && team2) {
    parts.push(team1, team2);
  }
  if (date) {
    parts.push(date);
  }
  if (time) {
    parts.push(time);
  }
  if (!parts.length) {
    const stage = normalizeValue(match.group_name || match.series);
    if (stage) {
      parts.push(stage);
    }
  }

  if (parts.length) {
    const slug = parts
      .join('-')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');
    if (slug) {
      return prefix
        ? `${prefix}${DEFAULT_PREFIX_SEPARATOR}${slug}-${index}`
        : `${slug}-${index}`;
    }
  }

  const fallback = `auto-${index}`;
  return prefix ? `${prefix}${DEFAULT_PREFIX_SEPARATOR}${fallback}` : fallback;
}

module.exports = { deriveMatchImportId };
