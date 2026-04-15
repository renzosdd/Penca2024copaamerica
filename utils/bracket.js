const Match = require('../models/Match');
const cacheStore = require('./cacheStore');

const GROUP_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const standingsCache = new Map();

function hasCompletedScore(match) {
    return Number.isFinite(match?.result1) && Number.isFinite(match?.result2);
}

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

        if (!hasCompletedScore(match)) continue;

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
    const stageMatchesCache = new Map();

    function winnerFromMatch(match) {
        if (!hasCompletedScore(match)) return null;
        if (match.result1 === match.result2) return null;
        return match.result1 > match.result2 ? match.team1 : match.team2;
    }

    function loserFromMatch(match) {
        if (!hasCompletedScore(match)) return null;
        if (match.result1 === match.result2) return null;
        return match.result1 > match.result2 ? match.team2 : match.team1;
    }

    function winnerPlaceholder(stageName, index) {
        const aliases = {
            'Ronda de 32': 'R32',
            'Octavos de final': 'Octavos',
            'Cuartos de final': 'QF',
            Semifinales: 'Semifinales'
        };
        return `Ganador ${aliases[stageName] || stageName}-${index + 1}`;
    }

    function loserPlaceholder(stageName, index) {
        const aliases = {
            Semifinales: 'SF'
        };
        return `Perdedor ${aliases[stageName] || stageName}${index + 1}`;
    }

    function buildPlaceholderVariants(label, index, prefix = 'Ganador') {
        const variants = new Set();
        const normalized = String(label || '').trim();
        if (!normalized) return [];
        const compact = normalized.replace(/\s+/g, '');
        for (const name of new Set([normalized, compact])) {
            variants.add(`${prefix} ${name}-${index}`);
            variants.add(`${prefix} ${name}${index}`);
        }
        return Array.from(variants);
    }

    async function orderedStageMatches(stage) {
        if (!stageMatchesCache.has(stage)) {
            stageMatchesCache.set(
                stage,
                await Match.find({ competition, group_name: stage })
                    .sort({ order: 1, kickoff: 1, date: 1, time: 1, _id: 1 })
            );
        }
        return stageMatchesCache.get(stage);
    }

    async function setStageSlot(stage, matchIndex, side, team) {
        const matches = await orderedStageMatches(stage);
        const match = matches[matchIndex];
        if (!match || !team || match[side] === team) {
            return;
        }
        await Match.updateOne({ _id: match._id }, { $set: { [side]: team } });
        match[side] = team;
    }

    async function replacePlaceholderTeam(stage, placeholder, team) {
        if (!team) {
            return;
        }
        await Match.updateMany(
            { competition, group_name: stage, $or: [{ team1: placeholder }, { team2: placeholder }] },
            [{
                $set: {
                    team1: { $cond: [{ $eq: ['$team1', placeholder] }, team, '$team1'] },
                    team2: { $cond: [{ $eq: ['$team2', placeholder] }, team, '$team2'] }
                }
            }]
        );
    }

    async function propagateWinners(stageName, nextStageName, labels) {
        const matches = await orderedStageMatches(stageName);
        for (const [index, match] of matches.entries()) {
            const winner = winnerFromMatch(match) || winnerPlaceholder(stageName, index);
            await setStageSlot(
                nextStageName,
                Math.floor(index / 2),
                index % 2 === 0 ? 'team1' : 'team2',
                winner
            );
            if (!winnerFromMatch(match)) continue;
            const slot = index + 1;
            const placeholders = labels.flatMap(label => buildPlaceholderVariants(label, slot));
            for (const placeholder of placeholders) {
                await replacePlaceholderTeam(nextStageName, placeholder, winner);
            }
        }
    }

    async function groupCompletion() {
        const matches = await Match.find({ competition })
            .select('group_name result1 result2')
            .lean();
        const groups = new Map();
        for (const match of matches) {
            const group = match.group_name;
            if (!group || !group.startsWith('Grupo')) continue;
            const current = groups.get(group) || { total: 0, completed: 0 };
            current.total += 1;
            if (hasCompletedScore(match)) {
                current.completed += 1;
            }
            groups.set(group, current);
        }
        return {
            isComplete(group) {
                const current = groups.get(`Grupo ${group}`);
                return Boolean(current && current.total > 0 && current.total === current.completed);
            },
            allComplete() {
                if (!groups.size) return false;
                return Array.from(groups.values()).every(group => group.total > 0 && group.total === group.completed);
            }
        };
    }

    const completion = await groupCompletion();

    function team(group, pos) {
        if (!completion.isComplete(group)) return null;
        return standings[`Grupo ${group}`] && standings[`Grupo ${group}`][pos] && standings[`Grupo ${group}`][pos].team;
    }

    const groupLetters = Object.keys(standings).map(g => g.replace('Grupo ', '')).sort();

    if (groupLetters.length > 4) {
        // Mundial 2026 style with Round of 32
        const r32Pairs = [
            [{ group: 'A', pos: 0 }, { group: 'B', pos: 1 }],
            [{ group: 'C', pos: 0 }, { group: 'D', pos: 1 }],
            [{ group: 'E', pos: 0 }, { group: 'F', pos: 1 }],
            [{ group: 'G', pos: 0 }, { group: 'H', pos: 1 }],
            [{ group: 'I', pos: 0 }, { group: 'J', pos: 1 }],
            [{ group: 'K', pos: 0 }, { group: 'L', pos: 1 }],
            [{ group: 'B', pos: 0 }, { group: 'A', pos: 1 }],
            [{ group: 'D', pos: 0 }, { group: 'C', pos: 1 }],
            [{ group: 'F', pos: 0 }, { group: 'E', pos: 1 }],
            [{ group: 'H', pos: 0 }, { group: 'G', pos: 1 }],
            [{ group: 'J', pos: 0 }, { group: 'I', pos: 1 }],
            [{ group: 'L', pos: 0 }, { group: 'K', pos: 1 }]
        ];

        for (const [matchIndex, pair] of r32Pairs.entries()) {
            for (const [sideIndex, slot] of pair.entries()) {
                const placeholder = `${slot.group}${slot.pos + 1}`;
                const realTeam = team(slot.group, slot.pos);
                const nextTeam = realTeam || placeholder;
                await setStageSlot('Ronda de 32', matchIndex, sideIndex === 0 ? 'team1' : 'team2', nextTeam);
                await replacePlaceholderTeam('Ronda de 32', placeholder, realTeam);
            }
        }

        const thirdRank = completion.allComplete() ? rankThirdPlacedTeams(standings).slice(0, 8) : [];
        for (let i = 0; i < 8; i += 1) {
            const third = thirdRank[i];
            const matchIndex = 12 + Math.floor(i / 2);
            const side = i % 2 === 0 ? 'team1' : 'team2';
            await setStageSlot('Ronda de 32', matchIndex, side, third?.team || `Mejor tercero ${i + 1}`);
            if (third) {
                await replacePlaceholderTeam('Ronda de 32', `${third.group}3`, third.team);
            }
        }

        await propagateWinners('Ronda de 32', 'Octavos de final', ['R32', 'Ronda de 32']);
        await propagateWinners('Octavos de final', 'Cuartos de final', ['Octavos', 'Octavos de final', 'R16']);
    } else {
        // Copa America style with 4 groups
        const quarterPairs = [
            [{ group: 'A', pos: 0 }, { group: 'B', pos: 1 }],
            [{ group: 'B', pos: 0 }, { group: 'A', pos: 1 }],
            [{ group: 'C', pos: 0 }, { group: 'D', pos: 1 }],
            [{ group: 'D', pos: 0 }, { group: 'C', pos: 1 }]
        ];

        for (const [matchIndex, pair] of quarterPairs.entries()) {
            for (const [sideIndex, slot] of pair.entries()) {
                const placeholder = `${slot.group}${slot.pos + 1}`;
                const realTeam = team(slot.group, slot.pos);
                await setStageSlot('Cuartos de final', matchIndex, sideIndex === 0 ? 'team1' : 'team2', realTeam || placeholder);
                await replacePlaceholderTeam('Cuartos de final', placeholder, realTeam);
            }
        }
    }

    await propagateWinners('Cuartos de final', 'Semifinales', ['QF', 'Cuartos', 'Cuartos de final']);

    const semiMatches = await orderedStageMatches('Semifinales');
    for (const [index, match] of semiMatches.entries()) {
        const slot = index + 1;
        const winner = winnerFromMatch(match) || winnerPlaceholder('Semifinales', index);
        const loser = loserFromMatch(match) || loserPlaceholder('Semifinales', index);
        await setStageSlot('Final', 0, index === 0 ? 'team1' : 'team2', winner);
        await setStageSlot('Tercer puesto', 0, index === 0 ? 'team1' : 'team2', loser);
        if (winner) {
            const placeholders = buildPlaceholderVariants('Semifinales', slot)
                .concat(buildPlaceholderVariants('SF', slot));
            for (const placeholder of placeholders) {
                await replacePlaceholderTeam('Final', placeholder, winner);
            }
        }
        if (loserFromMatch(match)) {
            const placeholders = buildPlaceholderVariants('SF', slot, 'Perdedor')
                .concat(buildPlaceholderVariants('Semifinales', slot, 'Perdedor'));
            for (const placeholder of placeholders) {
                await replacePlaceholderTeam('Tercer puesto', placeholder, loser);
            }
        }
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
