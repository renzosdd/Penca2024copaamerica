const KLAVIYO_EVENTS_URL = 'https://a.klaviyo.com/api/events/';

const privateKey = process.env.KLAVIYO_PRIVATE_KEY || '';
const publicApiKey = process.env.KLAVIYO_PUBLIC_API_KEY || 'VtZcng';
const revision = process.env.KLAVIYO_REVISION || '2024-10-15';

function isConfigured() {
  return Boolean(privateKey);
}

function profileAttributes(player) {
  return {
    email: player.email,
    first_name: player.name || player.displayName || player.username,
    last_name: player.surname || undefined,
    properties: {
      username: player.username,
      displayName: player.displayName,
      penca: 'Mundial 2026'
    }
  };
}

async function createEvent({ metricName, player, properties = {}, time = new Date() }) {
  if (!isConfigured() || !player?.email) {
    console.info('[klaviyoService] Event not sent', {
      configured: isConfigured(),
      metricName,
      email: player?.email
    });
    return false;
  }

  const payload = {
    data: {
      type: 'event',
      attributes: {
        properties: {
          ...properties,
          publicApiKey
        },
        time: time.toISOString(),
        metric: {
          data: {
            type: 'metric',
            attributes: {
              name: metricName
            }
          }
        },
        profile: {
          data: {
            type: 'profile',
            attributes: profileAttributes(player)
          }
        }
      }
    }
  };

  const response = await fetch(KLAVIYO_EVENTS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Klaviyo-API-Key ${privateKey}`,
      accept: 'application/vnd.api+json',
      revision,
      'content-type': 'application/vnd.api+json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Klaviyo event failed: ${response.status} ${body}`);
  }

  return true;
}

function notifyApproval({ player, penca, dashboardUrl }) {
  return createEvent({
    metricName: 'Penca Player Approved',
    player,
    properties: {
      pencaName: penca?.name || 'Penca Mundial 2026',
      dashboardUrl
    }
  });
}

function notifyMissingPredictions({ player, missingCount, nextMatch, dashboardUrl }) {
  return createEvent({
    metricName: 'Penca Missing Predictions Reminder',
    player,
    properties: {
      missingCount,
      nextMatch: nextMatch
        ? {
            team1: nextMatch.team1,
            team2: nextMatch.team2,
            kickoff: nextMatch.kickoff,
            group: nextMatch.group_name
          }
        : null,
      dashboardUrl
    }
  });
}

module.exports = {
  createEvent,
  isConfigured,
  notifyApproval,
  notifyMissingPredictions
};
