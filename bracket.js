const Match = require('./models/Match');

function calculateGroupStandings(matches) {
  const standings = {};
  for (const m of matches) {
    const { team1, team2, result1 = 0, result2 = 0 } = m;
    if (!standings[team1]) standings[team1] = { team: team1, points: 0, goalsFor: 0, goalsAgainst: 0 };
    if (!standings[team2]) standings[team2] = { team: team2, points: 0, goalsFor: 0, goalsAgainst: 0 };
    standings[team1].goalsFor += result1;
    standings[team1].goalsAgainst += result2;
    standings[team2].goalsFor += result2;
    standings[team2].goalsAgainst += result1;
    if (result1 > result2) {
      standings[team1].points += 3;
    } else if (result1 < result2) {
      standings[team2].points += 3;
    } else {
      standings[team1].points += 1;
      standings[team2].points += 1;
    }
  }
  const arr = Object.values(standings);
  for (const s of arr) {
    s.goalDifference = s.goalsFor - s.goalsAgainst;
  }
  arr.sort((a,b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);
  return arr;
}

async function updateEliminationMatches(groupStandings) {
  const quarterMatches = await Match.find({ group_name: 'Cuartos de final' });
  const map = {};
  for (const [group, table] of Object.entries(groupStandings)) {
    if (table[0]) map[`Ganador ${group}`] = table[0].team;
    if (table[1]) map[`Segundo ${group}`] = table[1].team;
  }
  const updated = [];
  for (const match of quarterMatches) {
    const newTeam1 = map[match.team1] || match.team1;
    const newTeam2 = map[match.team2] || match.team2;
    if (newTeam1 !== match.team1 || newTeam2 !== match.team2) {
      await Match.updateOne({ _id: match._id }, { team1: newTeam1, team2: newTeam2 });
      updated.push({ ...match, team1: newTeam1, team2: newTeam2 });
    } else {
      updated.push(match);
    }
  }
  return updated;
}

module.exports = { calculateGroupStandings, updateEliminationMatches };
