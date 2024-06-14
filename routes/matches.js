const express = require('express');
const router = express.Router();
const connectToDatabase = require('../database');

router.get('/', async (req, res) => {
    const db = await connectToDatabase();
    const matchesCollection = db.collection('matches');

    try {
        const matches = await matchesCollection.find().toArray();
        res.json({ matches });
    } catch (err) {
        console.error('Error fetching matches:', err.message);
        res.status(500).json({ error: 'Error fetching matches' });
    }
});

router.put('/:matchId', async (req, res) => {
    const db = await connectToDatabase();
    const matchesCollection = db.collection('matches');
    const { matchId } = req.params;
    const { result_team1, result_team2 } = req.body;

    try {
        await matchesCollection.updateOne({ _id: matchId }, { $set: { result_team1, result_team2 } });
        res.json({ message: 'Match result updated successfully' });

        // Recalculate the stages and user points
        await calculateKnockoutStages(db);
        await calculateUserPoints(db);
    } catch (err) {
        console.error('Error updating match result:', err.message);
        res.status(500).json({ error: 'Error updating match result' });
    }
});

async function calculateKnockoutStages(db) {
    const matchesCollection = db.collection('matches');

    // Retrieve and sort group stage matches by group and points
    const groupStages = await matchesCollection.find({ series: 'group' }).toArray();
    const groupedMatches = groupStages.reduce((acc, match) => {
        if (!acc[match.group_name]) {
            acc[match.group_name] = [];
        }
        acc[match.group_name].push(match);
        return acc;
    }, {});

    // Calculate points for each team
    const teamPoints = {};
    for (const group in groupedMatches) {
        groupedMatches[group].forEach(match => {
            if (!teamPoints[match.team1]) {
                teamPoints[match.team1] = { points: 0, goalsFor: 0, goalsAgainst: 0 };
            }
            if (!teamPoints[match.team2]) {
                teamPoints[match.team2] = { points: 0, goalsFor: 0, goalsAgainst: 0 };
            }

            const resultTeam1 = match.result_team1 || 0;
            const resultTeam2 = match.result_team2 || 0;

            teamPoints[match.team1].goalsFor += resultTeam1;
            teamPoints[match.team1].goalsAgainst += resultTeam2;
            teamPoints[match.team2].goalsFor += resultTeam2;
            teamPoints[match.team2].goalsAgainst += resultTeam1;

            if (resultTeam1 > resultTeam2) {
                teamPoints[match.team1].points += 3;
            } else if (resultTeam1 < resultTeam2) {
                teamPoints[match.team2].points += 3;
            } else {
                teamPoints[match.team1].points += 1;
                teamPoints[match.team2].points += 1;
            }
        });
    }

    // Determine top teams in each group
    const topTeams = [];
    for (const group in groupedMatches) {
        const teams = groupedMatches[group].map(match => match.team1).concat(groupedMatches[group].map(match => match.team2));
        const uniqueTeams = [...new Set(teams)];
        const sortedTeams = uniqueTeams.sort((a, b) => {
            if (teamPoints[a].points === teamPoints[b].points) {
                const goalDifferenceA = teamPoints[a].goalsFor - teamPoints[a].goalsAgainst;
                const goalDifferenceB = teamPoints[b].goalsFor - teamPoints[b].goalsAgainst;
                if (goalDifferenceA === goalDifferenceB) {
                    return teamPoints[b].goalsFor - teamPoints[a].goalsFor;
                }
                return goalDifferenceB - goalDifferenceA;
            }
            return teamPoints[b].points - teamPoints[a].points;
        });
        topTeams.push(...sortedTeams.slice(0, 2)); // Top 2 teams from each group
    }

    // Create knockout matches
    const knockoutStages = [
        { date: '2024-07-04', time: '20:00', team1: topTeams[0], team2: topTeams[3], competition: 'Copa América', group_name: 'Cuartos de final', series: 'quarterfinal', tournament: 'Copa América' },
        { date: '2024-07-05', time: '20:00', team1: topTeams[1], team2: topTeams[2], competition: 'Copa América', group_name: 'Cuartos de final', series: 'quarterfinal', tournament: 'Copa América' },
        { date: '2024-07-06', time: '18:00', team1: topTeams[4], team2: topTeams[7], competition: 'Copa América', group_name: 'Cuartos de final', series: 'quarterfinal', tournament: 'Copa América' },
        { date: '2024-07-06', time: '15:00', team1: topTeams[5], team2: topTeams[6], competition: 'Copa América', group_name: 'Cuartos de final', series: 'quarterfinal', tournament: 'Copa América' }
    ];

    // Insert knockout matches into the database
    await matchesCollection.deleteMany({ series: { $in: ['quarterfinal', 'semifinal', 'third_place', 'final'] } });
    await matchesCollection.insertMany(knockoutStages);

    // Check if all quarterfinal matches are done to create semifinal matches
    const quarterfinals = await matchesCollection.find({ series: 'quarterfinal' }).toArray();
    if (quarterfinals.every(match => match.result_team1 !== undefined && match.result_team2 !== undefined)) {
        const semifinalists = quarterfinals.map(match => (match.result_team1 > match.result_team2 ? match.team1 : match.team2));

        const semifinals = [
            { date: '2024-07-09', time: '20:00', team1: semifinalists[0], team2: semifinalists[1], competition: 'Copa América', group_name: 'Semifinal', series: 'semifinal', tournament: 'Copa América' },
            { date: '2024-07-10', time: '20:00', team1: semifinalists[2], team2: semifinalists[3], competition: 'Copa América', group_name: 'Semifinal', series: 'semifinal', tournament: 'Copa América' }
        ];

        await matchesCollection.insertMany(semifinals);
    }

    // Check if all semifinal matches are done to create third place and final matches
    const semifinals = await matchesCollection.find({ series: 'semifinal' }).toArray();
    if (semifinals.every(match => match.result_team1 !== undefined && match.result_team2 !== undefined)) {
        const finalists = semifinals.map(match => (match.result_team1 > match.result_team2 ? match.team1 : match.team2));
        const thirdPlaceContenders = semifinals.map(match => (match.result_team1 < match.result_team2 ? match.team1 : match.team2));

        const finalMatches = [
            { date: '2024-07-13', time: '18:00', team1: thirdPlaceContenders[0], team2: thirdPlaceContenders[1], competition: 'Copa América', group_name: 'Tercer Puesto', series: 'third_place', tournament: 'Copa América' },
            { date: '2024-07-14', time: '20:00', team1: finalists[0], team2: finalists[1], competition: 'Copa América', group_name: 'Final', series: 'final', tournament: 'Copa América' }
        ];

        await matchesCollection.insertMany(finalMatches);
    }
}

async function calculateUserPoints(db) {
    const usersCollection = db.collection('users');
    const predictionsCollection = db.collection('predictions');
    const matchesCollection = db.collection('matches');

    const users = await usersCollection.find({ isAdmin: false }).toArray();
    for (let user of users) {
        const predictions = await predictionsCollection.find({ user_id: user._id }).toArray();
        let points = 0;
        for (let prediction of predictions) {
            const match = await matchesCollection.findOne({ _id: prediction.match_id });
            if (match && match.result_team1 !== null && match.result_team2 !== null) {
                if (prediction.goals_team1 === match.result_team1 && prediction.goals_team2 === match.result_team2) {
                    points += 3; // Ejemplo de puntuación: 3 puntos por predicción exacta
                } else if (
                    (prediction.goals_team1 > prediction.goals_team2 && match.result_team1 > match.result_team2) ||
                    (prediction.goals_team1 < prediction.goals_team2 && match.result_team1 < match.result_team2) ||
                    (prediction.goals_team1 === prediction.goals_team2 && match.result_team1 === match.result_team2)
                ) {
                    points += 1; // Ejemplo de puntuación: 1 punto por predecir el resultado correcto
                }
            }
        }
        user.points = points;
        await usersCollection.updateOne({ _id: user._id }, { $set: { points } });
    }
}

module.exports = router;
