const Match = require('../models/Match');

async function calculateGroupStandings(competition) {
    const matches = await Match.find({ competition });
    const standings = {};

    for (const match of matches) {
        const group = match.group_name;
        if (!group || !group.startsWith('Grupo')) continue;

        if (!standings[group]) standings[group] = {};
        if (!standings[group][match.team1]) {
            standings[group][match.team1] = { team: match.team1, points: 0, gf: 0, ga: 0, gd: 0 };
        }
        if (!standings[group][match.team2]) {
            standings[group][match.team2] = { team: match.team2, points: 0, gf: 0, ga: 0, gd: 0 };
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
        } else if (match.result1 < match.result2) {
            t2.points += 3;
        } else {
            t1.points += 1;
            t2.points += 1;
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

module.exports = { calculateGroupStandings, updateEliminationMatches };
