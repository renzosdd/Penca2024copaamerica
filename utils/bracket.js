const Match = require('../models/Match');

async function calculateGroupStandings(competition) {
    const matches = await Match.find({ competition });
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

async function updateEliminationMatches(competition) {
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
        ['Semifinal 1', qfWinners.QF1],
        ['Semifinal 2', qfWinners.QF2],
        ['Semifinal 3', qfWinners.QF3],
        ['Semifinal 4', qfWinners.QF4]
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
            { competition, group_name: 'Final', team1: 'Ganador Semifinal 1' },
            { $set: { team1: sfResults.SF1.winner } }
        );
        await Match.updateOne(
            { competition, group_name: 'Tercer puesto', team1: 'Perdedor Semifinal 1' },
            { $set: { team1: sfResults.SF1.loser } }
        );
    }
    if (sfResults.SF2) {
        await Match.updateOne(
            { competition, group_name: 'Final', team2: 'Ganador Semifinal 2' },
            { $set: { team2: sfResults.SF2.winner } }
        );
        await Match.updateOne(
            { competition, group_name: 'Tercer puesto', team2: 'Perdedor Semifinal 2' },
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

module.exports = { calculateGroupStandings, updateEliminationMatches, rankThirdPlacedTeams };
