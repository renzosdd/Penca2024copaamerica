export function getMatchKickoffDate(match) {
  if (match?.kickoff) {
    const date = new Date(match.kickoff);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }
  if (match?.date && match?.time) {
    const date = new Date(`${match.date}T${match.time}`);
    if (!Number.isNaN(date.getTime())) {
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
