const Match = require('../models/Match');

const GROUP_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const standingsCache = new Map();

function normalizeCompetition(value) {
    return String(value ?? '').trim().toLowerCase();
}

function getCachedStandings(competition) {
    const key = normalizeCompetition(competition);
    const entry = standingsCache.get(key);
    if (!entry) {
        return null;
    }
    if (entry.expiresAt <= Date.now()) {
        standingsCache.delete(key);
        return null;
    }
    return entry.data;
}

function setCachedStandings(competition, data) {
    const key = normalizeCompetition(competition);
    standingsCache.set(key, {
        data,
        expiresAt: Date.now() + GROUP_CACHE_TTL_MS
    });
}

async function computeGroupStandings(competition) {
    const matches = await Match.find({ competition })
        .select('group_name team1 team2 result1 result2')
        .lean();
    const standings = {};

    for (const match of matches) {
        const group = match.group_name;
        if (!group || !group.startsWith('Grupo')) continue;

        if (!standings[group]) standings[group] = {};
        if (!standings[group][match.team1]) {
            standings[group][match.team1] = {
                team: match.team1,
                points: 0,
                gf: 0,
                ga: 0,
                gd: 0,
                wins: 0,
                draws: 0,
                losses: 0
            };
        }
        if (!standings[group][match.team2]) {
            standings[group][match.team2] = {
                team: match.team2,
                points: 0,
                gf: 0,
                ga: 0,
                gd: 0,
                wins: 0,
                draws: 0,
                losses: 0
            };
        }

        if (match.result1 === undefined || match.result2 === undefined) continue;

        const t1 = standings[group][match.team1];
        const t2 = standings[group][match.team2];
        t1.gf += match.result1;
        t1.ga += match.result2;
        t2.gf += match.result2;
        t2.ga += match.result1;

        if (match.result1 > match.result2) {
            t1.points += 3;
            t1.wins += 1;
            t2.losses += 1;
        } else if (match.result1 < match.result2) {
            t2.points += 3;
            t2.wins += 1;
            t1.losses += 1;
        } else {
            t1.points += 1;
            t2.points += 1;
            t1.draws += 1;
            t2.draws += 1;
        }
        t1.gd = t1.gf - t1.ga;
        t2.gd = t2.gf - t2.ga;
    }

    const ordered = {};
    for (const [group, teams] of Object.entries(standings)) {
        ordered[group] = Object.values(teams).sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.gd !== a.gd) return b.gd - a.gd;
            return b.gf - a.gf;
        });
    }
    return ordered;
}

async function calculateGroupStandings(competition) {
    const cached = getCachedStandings(competition);
    if (cached) {
        return cached;
    }
    const ordered = await computeGroupStandings(competition);
    setCachedStandings(competition, ordered);
    return ordered;
}

async function invalidateGroupStandings(competition) {
    if (!competition) {
        standingsCache.clear();
        return;
    }
    standingsCache.delete(normalizeCompetition(competition));
}

async function generateEliminationBracket(competition, qualifiersPerGroup = 2) {
    const standings = await calculateGroupStandings(competition);
    const letters = Object.keys(standings).map(g => g.replace('Grupo ', '')).sort();

    function t(group, pos) {
        const team = standings[`Grupo ${group}`] && standings[`Grupo ${group}`][pos];
        return team ? team.team : `${group}${pos + 1}`;
    }

    const stageCounters = new Map();
    const stageSlug = stage => String(stage || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-');
    function nextImportId(stage) {
        const slug = stageSlug(stage);
        const count = (stageCounters.get(slug) || 0) + 1;
        stageCounters.set(slug, count);
        return `${competition}::bracket-${slug}-${count}`;
    }

    const pairs = [];
    for (let i = 0; i < letters.length; i += 2) {
        const a = letters[i];
        const b = letters[i + 1];
        if (!b) break;
        if (qualifiersPerGroup >= 2) {
            pairs.push([t(a, 0), t(b, 1)]);
            pairs.push([t(b, 0), t(a, 1)]);
            for (let j = 2; j < qualifiersPerGroup; j++) {
                pairs.push([t(a, j), t(b, j)]);
            }
        } else {
            pairs.push([t(a, 0), t(b, 0)]);
        }
    }

    const totalTeams = pairs.length * 2;
    const roundNames = { 32: 'Ronda de 32', 16: 'Octavos de final', 8: 'Cuartos de final', 4: 'Semifinales' };
    const firstRound = roundNames[totalTeams] || `Ronda de ${totalTeams}`;

    const matches = [];
    pairs.forEach(([team1, team2], idx) => {
        matches.push({
            team1,
            team2,
            competition,
            group_name: firstRound,
            series: 'Eliminatorias',
            tournament: competition,
            importId: nextImportId(firstRound)
        });
    });

    let prefix = firstRound === 'Cuartos de final' ? 'QF'
        : firstRound === 'Ronda de 32' ? 'R32'
        : firstRound === 'Octavos de final' ? 'R16'
        : firstRound === 'Semifinales' ? 'SF'
        : firstRound.replace(/\s+/g, '');

    let current = matches.map((_, i) => `Ganador ${prefix}-${i + 1}`);
    while (current.length > 1) {
        const next = [];
        const roundTotal = current.length;
        const name = roundNames[roundTotal] || (roundTotal === 2 ? 'Final' : `Ronda de ${roundTotal}`);
        for (let i = 0; i < current.length; i += 2) {
            matches.push({
                team1: current[i],
                team2: current[i + 1],
                competition,
                group_name: name,
                series: 'Eliminatorias',
                tournament: competition,
                importId: nextImportId(name)
            });
            next.push(`Ganador ${name.replace(/\s+/g, '')}-${Math.floor(i / 2) + 1}`);
        }
        if (roundTotal === 4) {
            matches.push({
                team1: 'Perdedor SF1',
                team2: 'Perdedor SF2',
                competition,
                group_name: 'Tercer puesto',
                series: 'Eliminatorias',
                tournament: competition,
                importId: nextImportId('Tercer puesto')
            });
        }
        current = next;
    }

    if (matches.length) await Match.insertMany(matches);
    return matches;
}

async function updateEliminationMatches(competition) {
    await invalidateGroupStandings(competition);
    const standings = await calculateGroupStandings(competition);

    function team(group, pos) {
        return standings[`Grupo ${group}`] && standings[`Grupo ${group}`][pos] && standings[`Grupo ${group}`][pos].team;
    }

    const groupLetters = Object.keys(standings).map(g => g.replace('Grupo ', '')).sort();

    if (groupLetters.length > 4) {
        // Mundial 2026 style with Round of 32
        const r32Pairs = [
            ['A1', team('A', 0)], ['B2', team('B', 1)],
            ['C1', team('C', 0)], ['D2', team('D', 1)],
            ['E1', team('E', 0)], ['F2', team('F', 1)],
            ['G1', team('G', 0)], ['H2', team('H', 1)],
            ['I1', team('I', 0)], ['J2', team('J', 1)],
            ['K1', team('K', 0)], ['L2', team('L', 1)],
            ['B1', team('B', 0)], ['A2', team('A', 1)],
            ['D1', team('D', 0)], ['C2', team('C', 1)],
            ['F1', team('F', 0)], ['E2', team('E', 1)],
            ['H1', team('H', 0)], ['G2', team('G', 1)],
            ['J1', team('J', 0)], ['I2', team('I', 1)],
            ['L1', team('L', 0)], ['K2', team('K', 1)]
        ];

        for (const [placeholder, realTeam] of r32Pairs) {
            if (realTeam) {
                await Match.updateOne(
                    { competition, group_name: 'Ronda de 32', $or: [{ team1: placeholder }, { team2: placeholder }] },
                    [{
                        $set: {
                            team1: { $cond: [{ $eq: ['$team1', placeholder] }, realTeam, '$team1'] },
                            team2: { $cond: [{ $eq: ['$team2', placeholder] }, realTeam, '$team2'] }
                        }
                    }]
                );
            }
        }

        const thirdRank = rankThirdPlacedTeams(standings).slice(0, 8);
        for (const t of thirdRank) {
            await Match.updateOne(
                { competition, group_name: 'Ronda de 32', $or: [{ team1: `${t.group}3` }, { team2: `${t.group}3` }] },
                [{
                    $set: {
                        team1: { $cond: [{ $eq: ['$team1', `${t.group}3`] }, t.team, '$team1'] },
                        team2: { $cond: [{ $eq: ['$team2', `${t.group}3`] }, t.team, '$team2'] }
                    }
                }]
            );
        }
    } else {
        // Copa America style with 4 groups
        const pairs = [
            ['Ganador A', team('A', 0)],
            ['Segundo A', team('A', 1)],
            ['Ganador B', team('B', 0)],
            ['Segundo B', team('B', 1)],
            ['Ganador C', team('C', 0)],
            ['Segundo C', team('C', 1)],
            ['Ganador D', team('D', 0)],
            ['Segundo D', team('D', 1)]
        ];

        for (const [placeholder, realTeam] of pairs) {
            if (realTeam) {
                await Match.updateOne(
                    { competition, group_name: 'Cuartos de final', $or: [{ team1: placeholder }, { team2: placeholder }] },
                    [{
                        $set: {
                            team1: { $cond: [{ $eq: ['$team1', placeholder] }, realTeam, '$team1'] },
                            team2: { $cond: [{ $eq: ['$team2', placeholder] }, realTeam, '$team2'] }
                        }
                    }]
                );
            }
        }
    }

    const quarterMatches = await Match.find({ competition, group_name: 'Cuartos de final' });
    const qfWinners = {};
    quarterMatches.forEach((m, idx) => {
        if (m.result1 === undefined || m.result2 === undefined) return;
        qfWinners[`QF${idx + 1}`] = m.result1 > m.result2 ? m.team1 : m.team2;
    });

    const semiPairs = [
        ['Ganador QF-1', qfWinners.QF1],
        ['Ganador QF-2', qfWinners.QF2],
        ['Ganador QF-3', qfWinners.QF3],
        ['Ganador QF-4', qfWinners.QF4]
    ];

    for (const [placeholder, realTeam] of semiPairs) {
        if (realTeam) {
            await Match.updateOne(
                { competition, group_name: 'Semifinales', $or: [{ team1: placeholder }, { team2: placeholder }] },
                [{
                    $set: {
                        team1: { $cond: [{ $eq: ['$team1', placeholder] }, realTeam, '$team1'] },
                        team2: { $cond: [{ $eq: ['$team2', placeholder] }, realTeam, '$team2'] }
                    }
                }]
            );
        }
    }

    const semiMatches = await Match.find({ competition, group_name: 'Semifinales' });
    const sfResults = {};
    semiMatches.forEach((m, idx) => {
        if (m.result1 === undefined || m.result2 === undefined) return;
        const winner = m.result1 > m.result2 ? m.team1 : m.team2;
        const loser = m.result1 > m.result2 ? m.team2 : m.team1;
        sfResults[`SF${idx + 1}`] = { winner, loser };
    });

    if (sfResults.SF1) {
        await Match.updateOne(
            { competition, group_name: 'Final', team1: 'Ganador Semifinales-1' },
            { $set: { team1: sfResults.SF1.winner } }
        );
        await Match.updateOne(
            { competition, group_name: 'Tercer puesto', team1: 'Perdedor SF1' },
            { $set: { team1: sfResults.SF1.loser } }
        );
    }
    if (sfResults.SF2) {
        await Match.updateOne(
            { competition, group_name: 'Final', team2: 'Ganador Semifinales-2' },
            { $set: { team2: sfResults.SF2.winner } }
        );
        await Match.updateOne(
            { competition, group_name: 'Tercer puesto', team2: 'Perdedor SF2' },
            { $set: { team2: sfResults.SF2.loser } }
        );
    }
}

function rankThirdPlacedTeams(standings) {
    const thirds = [];
    for (const [group, teams] of Object.entries(standings)) {
        if (teams[2]) {
            thirds.push({
                group: group.replace('Grupo ', ''),
                team: teams[2].team,
                points: teams[2].points,
                gd: teams[2].gd,
                gf: teams[2].gf
            });
        }
    }
    thirds.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.gd !== a.gd) return b.gd - a.gd;
        return b.gf - a.gf;
    });
    return thirds;
}

module.exports = {
    calculateGroupStandings,
    updateEliminationMatches,
    rankThirdPlacedTeams,
    generateEliminationBracket,
    invalidateGroupStandings
};
