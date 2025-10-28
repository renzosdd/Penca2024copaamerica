const toDate = value => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeTimezone = tz => {
  if (!tz) return '';
  if (/^[+-]\d{2}:?\d{2}$/.test(tz)) {
    return tz.includes(':') ? tz : `${tz.slice(0, 3)}:${tz.slice(3)}`;
  }
  if (/^[+-]\d{1,2}$/.test(tz)) {
    const sign = tz.startsWith('-') ? '-' : '+';
    const hours = tz.replace(/[+-]/, '').padStart(2, '0');
    return `${sign}${hours}:00`;
  }
  const match = /^UTC([+-]\d{1,2})(?::?(\d{2}))?$/.exec(tz.trim());
  if (match) {
    const sign = match[1].startsWith('-') ? '-' : '+';
    const hours = match[1].replace(/[+-]/, '').padStart(2, '0');
    const minutes = (match[2] || '0').padStart(2, '0');
    return `${sign}${hours}:${minutes}`;
  }
  return '';
};

export function getMatchKickoffDate(match) {
  if (match?.kickoff) {
    const date = toDate(match.kickoff);
    if (date) {
      return date;
    }
  }
  if (match?.date && match?.time) {
    const date = toDate(`${match.date}T${match.time}`);
    if (date) {
      return date;
    }
  }
  if (match?.date && !match?.time) {
    const date = toDate(`${match.date}T12:00:00`);
    if (date) {
      return date;
    }
  }
  if (match?.originalDate && match?.originalTime) {
    const tz = normalizeTimezone(match.originalTimezone);
    const date = toDate(`${match.originalDate}T${match.originalTime}${tz}`);
    if (date) {
      return date;
    }
  }
  if (match?.originalDate) {
    const date = toDate(`${match.originalDate}T12:00:00`);
    if (date) {
      return date;
    }
  }
  return null;
}

export function matchKickoffValue(match) {
  const date = getMatchKickoffDate(match);
  return date ? date.getTime() : Number.POSITIVE_INFINITY;
}

export function formatLocalKickoff(match, options) {
  const date = getMatchKickoffDate(match);
  if (!date) {
    return null;
  }
  const formatOptions = options || { dateStyle: 'medium', timeStyle: 'short' };
  return date.toLocaleString(undefined, formatOptions);
}

export function minutesUntilKickoff(match) {
  const date = getMatchKickoffDate(match);
  if (!date) {
    return Number.POSITIVE_INFINITY;
  }
  return (date.getTime() - Date.now()) / 60000;
}
