const express = require('express');
const router = express.Router();
const multer = require('multer');
const bcrypt = require('bcrypt');
const path = require('path');
const User = require('../models/User');
const Match = require('../models/Match');
const Penca = require('../models/Penca');
const Competition = require('../models/Competition');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const { DEFAULT_COMPETITION } = require('../config');
const { updateEliminationMatches, generateEliminationBracket } = require('../utils/bracket');
const updateResults = require('../scripts/updateResults');
const { fetchFixturesWithThrottle, fetchCompetitionData } = require('../scripts/apiFootball');

const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage, 
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de archivo no soportado. Solo se permiten imágenes.'));
        }
    }
});
 

// Página de administración
router.get('/edit', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 0;
        const limit = parseInt(req.query.limit) || 10;

        const users = await User.find()
            .select('username')
            .skip(page * limit)
            .limit(limit);

        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.json(users);
        }

        res.sendFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
    } catch (error) {
        console.error('Admin edit load error:', error.message, error.stack);
        res.status(500).send('Error al cargar la página de administración');
    }
});

// Obtener datos de un usuario
router.get('/user/:username', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username }).select('-password');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (error) {
        console.error('Error al obtener los datos del usuario:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Actualizar perfil de usuario
router.post('/update', isAuthenticated, isAdmin, upload.single('avatar'), async (req, res) => {
    try {
        const { username, name, surname, email, dob, role, valid } = req.body;
        const avatar = req.file;

        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (name) user.name = name;
        if (surname) user.surname = surname;
        if (email) user.email = email;
        if (dob) user.dob = new Date(dob);
        if (role) user.role = role;
        if (valid !== undefined) user.valid = valid === 'true';
        if (avatar) {
            user.avatar = avatar.buffer;
            user.avatarContentType = avatar.mimetype;
        }

        await user.save();
        res.status(200).json({ message: 'User profile updated successfully' });
    } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Crear owner
router.post('/owners', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { username, password, email, name, surname, dob } = req.body;

        if (!username || !password || !email) {
            return res.status(400).json({ error: 'Username, password and email are required' });
        }

        const existing = await User.findOne({ $or: [{ username }, { email }] });
        if (existing) return res.status(409).json({ error: 'Username or email already exists' });

        const hashed = await bcrypt.hash(password, 10);
        const owner = new User({
            username,
            password: hashed,
            email,
            name,
            surname,
            dob,
            role: 'owner',
            valid: true
        });

        await owner.save();
        res.status(201).json({ ownerId: owner._id });
    } catch (error) {
        console.error('Error creating owner:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Listar owners
router.get('/owners', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const owners = await User.find({ role: 'owner' }).select('username email name surname _id');
        res.json(owners);
    } catch (error) {
        console.error('Error listing owners:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Actualizar owner
router.put('/owners/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const owner = await User.findById(req.params.id);
        if (!owner || owner.role !== 'owner') return res.status(404).json({ error: 'Owner not found' });

        const { username, email, name, surname } = req.body;
        if (username) owner.username = username;
        if (email) owner.email = email;
        if (name !== undefined) owner.name = name;
        if (surname !== undefined) owner.surname = surname;

        await owner.save();
        res.status(200).json({ message: 'Owner updated' });
    } catch (error) {
        console.error('Error updating owner:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Eliminar owner
router.delete('/owners/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const owner = await User.findById(req.params.id);
        if (!owner) return res.status(404).json({ error: 'Owner not found' });

        await Penca.deleteMany({ owner: owner._id });
        await User.deleteOne({ _id: owner._id });
        await User.updateMany({}, { $pull: { pencas: { $in: owner.ownedPencas } } });

        res.json({ message: 'Owner deleted' });
    } catch (error) {
        console.error('Error deleting owner:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Crear penca
router.post('/pencas', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { name, owner, participantLimit, competition, isPublic } = req.body;
        if (!name) return res.status(400).json({ error: 'Name required' });

        const ownerUser = owner ? await User.findById(owner) : req.session.user;
        if (!ownerUser) return res.status(404).json({ error: 'Owner not found' });

        let fixtureIds = [];

        const penca = new Penca({
            name,
            code: Math.random().toString(36).substring(2, 8).toUpperCase(),
            owner: ownerUser._id,
            competition: competition || DEFAULT_COMPETITION,
            participantLimit: participantLimit ? Number(participantLimit) : undefined,
            isPublic: isPublic === true || isPublic === 'true',
            fixture: fixtureIds,
            participants: []
        });

        await penca.save();

        ownerUser.ownedPencas = ownerUser.ownedPencas || [];
        ownerUser.ownedPencas.push(penca._id);
        await ownerUser.save();

        res.status(201).json({ pencaId: penca._id, code: penca.code });
    } catch (error) {
        console.error('Error creating penca:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Listar pencas
router.get('/pencas', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const pencas = await Penca.find().select('name code competition owner');
        res.json(pencas);
    } catch (error) {
        console.error('Error listing pencas:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Actualizar penca
router.put('/pencas/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { name, participantLimit, owner, competition, isPublic } = req.body;
        const penca = await Penca.findById(req.params.id);
        if (!penca) return res.status(404).json({ error: 'Penca not found' });

        if (owner && owner !== penca.owner.toString()) {
            const newOwner = await User.findById(owner);
            if (!newOwner) return res.status(404).json({ error: 'Owner not found' });

            await User.updateOne({ _id: penca.owner }, { $pull: { ownedPencas: penca._id } });
            await User.updateOne({ _id: newOwner._id }, { $addToSet: { ownedPencas: penca._id }, $set: { role: 'owner' } });
            penca.owner = newOwner._id;
        }

        if (name) penca.name = name;
        if (participantLimit !== undefined) penca.participantLimit = Number(participantLimit);
        if (competition) penca.competition = competition;
        if (isPublic !== undefined) penca.isPublic = isPublic === true || isPublic === 'true';

        await penca.save();
        res.json({ message: 'Penca updated' });
    } catch (error) {
        console.error('Error updating penca:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Eliminar penca
router.delete('/pencas/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const penca = await Penca.findByIdAndDelete(req.params.id);
        if (!penca) return res.status(404).json({ error: 'Penca not found' });

        await User.updateOne({ _id: penca.owner }, { $pull: { ownedPencas: penca._id } });
        res.json({ message: 'Penca deleted' });
    } catch (error) {
        console.error('Error deleting penca:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Vista previa de competencia desde API
router.post('/competitions/preview', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { apiLeagueId, apiSeason } = req.body;
        const leagueId = Number(apiLeagueId);
        const season = Number(apiSeason);
        if (!Number.isInteger(leagueId) || leagueId <= 0 ||
            !Number.isInteger(season) || season <= 0) {
            return res.status(400).json({ error: 'Invalid apiLeagueId or apiSeason' });
        }

        const { league, fixtures } = await fetchCompetitionData(leagueId, season);
        const groupsMap = {};
        const matches = fixtures.map(f => {
            const group = f.league?.group || f.league?.round || '';
            if (group) {
                if (!groupsMap[group]) groupsMap[group] = new Set();
                groupsMap[group].add(f.teams?.home?.name || '');
                groupsMap[group].add(f.teams?.away?.name || '');
            }
            return {
                date: f.fixture?.date?.slice(0, 10) || '',
                time: f.fixture?.date?.slice(11, 16) || '',
                team1: f.teams?.home?.name || '',
                team2: f.teams?.away?.name || '',
                group_name: group,
                series: String(f.fixture?.id || ''),
                tournament: league?.league?.name || league?.name || ''
            };
        });

        const groups = Object.entries(groupsMap).map(([name, set]) => ({ name, teams: Array.from(set) }));
        res.json({ groups, matches });
    } catch (error) {
        console.error('Error previewing competition:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Crear competencia
router.post('/competitions', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const {
            name,
            useApi,
            groupsCount,
            integrantsPerGroup,
            qualifiersPerGroup,
            fixture,
            autoGenerate,
            apiLeagueId,
            apiSeason,
            imported,
            tournament,
            country,
            seasonStart,
            seasonEnd
        } = req.body;
        if (!name) return res.status(400).json({ error: 'Name required' });

        const competition = new Competition({
            name,
            tournament,
            country,
            seasonStart: seasonStart ? new Date(seasonStart) : undefined,
            seasonEnd: seasonEnd ? new Date(seasonEnd) : undefined,
            groupsCount: groupsCount ? Number(groupsCount) : undefined,
            integrantsPerGroup: integrantsPerGroup ? Number(integrantsPerGroup) : undefined,
            qualifiersPerGroup: qualifiersPerGroup ? Number(qualifiersPerGroup) : undefined,
            apiLeagueId: apiLeagueId ? Number(apiLeagueId) : undefined,
            apiSeason: apiSeason ? Number(apiSeason) : undefined
        });
        await competition.save();

        if (imported && Array.isArray(imported.matches) && imported.matches.length) {
            const data = imported.matches.map(m => ({
                ...m,
                competition: m.competition || name
            }));
            await Match.insertMany(data);
        } else if (Array.isArray(fixture) && fixture.length) {
            const data = fixture.map(m => ({
                ...m,
                competition: m.competition || name
            }));
            await Match.insertMany(data);
        } else if (String(useApi) === 'true') {
            const { fixtures, skipped } = await fetchFixturesWithThrottle(
                'createCompetition',
                name,
                competition.apiLeagueId,
                competition.apiSeason
            );
            try {
                const { league } = await fetchCompetitionData(
                    competition.apiLeagueId,
                    competition.apiSeason
                );
                if (league) {
                    competition.tournament = league.league?.name || competition.tournament;
                    competition.country = league.country?.name || competition.country;
                    const seasonInfo = Array.isArray(league.seasons)
                        ? league.seasons.find(s => s.year === competition.apiSeason)
                        : null;
                    if (seasonInfo) {
                        competition.seasonStart = seasonInfo.start ? new Date(seasonInfo.start) : competition.seasonStart;
                        competition.seasonEnd = seasonInfo.end ? new Date(seasonInfo.end) : competition.seasonEnd;
                    }
                    await competition.save();
                }
            } catch (err) {
                console.error('Error fetching competition metadata:', err);
            }

            if (!skipped) {
                const matchesData = fixtures.map(f => ({
                    date: f.fixture?.date?.slice(0, 10) || '',
                    time: f.fixture?.date?.slice(11, 16) || '',
                    team1: f.teams?.home?.name || '',
                    team2: f.teams?.away?.name || '',
                    competition: name,
                    group_name: f.league?.round || '',
                    series: String(f.fixture?.id || ''),
                    tournament: f.league?.name || '',
                    result1: f.goals?.home ?? null,
                    result2: f.goals?.away ?? null
                }));

                if (matchesData.length) {
                    await Match.insertMany(matchesData);
                }
            }
        } else if (String(autoGenerate) === 'true' && competition.groupsCount && competition.integrantsPerGroup) {
            const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            const matches = [];
            for (let g = 0; g < competition.groupsCount; g++) {
                const group = `Grupo ${letters[g]}`;
                for (let i = 1; i <= competition.integrantsPerGroup; i++) {
                    for (let j = i + 1; j <= competition.integrantsPerGroup; j++) {
                        matches.push({
                            team1: `${letters[g]}${i}`,
                            team2: `${letters[g]}${j}`,
                            competition: name,
                            group_name: group,
                            series: 'Fase de grupos',
                            tournament: name
                        });
                    }
                }
            }
            if (matches.length) {
                await Match.insertMany(matches);

                if (competition.groupsCount === 4) {
                    const elim = [
                        { team1: 'Ganador A', team2: 'Segundo B', competition: name, group_name: 'Cuartos de final', series: 'Eliminatorias', tournament: name },
                        { team1: 'Ganador B', team2: 'Segundo A', competition: name, group_name: 'Cuartos de final', series: 'Eliminatorias', tournament: name },
                        { team1: 'Ganador C', team2: 'Segundo D', competition: name, group_name: 'Cuartos de final', series: 'Eliminatorias', tournament: name },
                        { team1: 'Ganador D', team2: 'Segundo C', competition: name, group_name: 'Cuartos de final', series: 'Eliminatorias', tournament: name },
                        { team1: 'Semifinal 1', team2: 'Semifinal 2', competition: name, group_name: 'Semifinales', series: 'Eliminatorias', tournament: name },
                        { team1: 'Semifinal 3', team2: 'Semifinal 4', competition: name, group_name: 'Semifinales', series: 'Eliminatorias', tournament: name },
                        { team1: 'Perdedor Semifinal 1', team2: 'Perdedor Semifinal 2', competition: name, group_name: 'Tercer puesto', series: 'Eliminatorias', tournament: name },
                        { team1: 'Ganador Semifinal 1', team2: 'Ganador Semifinal 2', competition: name, group_name: 'Final', series: 'Eliminatorias', tournament: name }
                    ];
                    await Match.insertMany(elim);
                } else if (competition.groupsCount > 4) {
                    const r32Pairs = [
                        ['A1','B2'], ['C1','D2'], ['E1','F2'], ['G1','H2'],
                        ['I1','J2'], ['K1','L2'], ['B1','A2'], ['D1','C2'],
                        ['F1','E2'], ['H1','G2'], ['J1','I2'], ['L1','K2'],
                        ['A3','C3'], ['E3','G3'], ['I3','K3'], ['B3','D3']
                    ];
                    const elim = r32Pairs.map(([t1,t2]) => ({
                        team1: t1,
                        team2: t2,
                        competition: name,
                        group_name: 'Ronda de 32',
                        series: 'Eliminatorias',
                        tournament: name
                    }));
                    elim.push(
                        { team1: 'Ganador R32-1', team2: 'Ganador R32-2', competition: name, group_name: 'Cuartos de final', series: 'Eliminatorias', tournament: name },
                        { team1: 'Ganador R32-3', team2: 'Ganador R32-4', competition: name, group_name: 'Cuartos de final', series: 'Eliminatorias', tournament: name },
                        { team1: 'Ganador R32-5', team2: 'Ganador R32-6', competition: name, group_name: 'Cuartos de final', series: 'Eliminatorias', tournament: name },
                        { team1: 'Ganador R32-7', team2: 'Ganador R32-8', competition: name, group_name: 'Cuartos de final', series: 'Eliminatorias', tournament: name },
                        { team1: 'Ganador QF1', team2: 'Ganador QF2', competition: name, group_name: 'Semifinal', series: 'Eliminatorias', tournament: name },
                        { team1: 'Ganador QF3', team2: 'Ganador QF4', competition: name, group_name: 'Semifinal', series: 'Eliminatorias', tournament: name },
                        { team1: 'Perdedor SF1', team2: 'Perdedor SF2', competition: name, group_name: 'Tercer puesto', series: 'Eliminatorias', tournament: name },
                        { team1: 'Ganador SF1', team2: 'Ganador SF2', competition: name, group_name: 'Final', series: 'Eliminatorias', tournament: name }
                    );
                    await Match.insertMany(elim);
                }
            }
        }

        res.status(201).json({ competitionId: competition._id });
    } catch (error) {
        console.error('Error creating competition:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Listar competiciones
router.get('/competitions', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const competitions = await Competition.find().sort('name');
        res.status(200).json(competitions);
    } catch (error) {
        console.error('Error listing competitions:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Actualizar competencia
router.put('/competitions/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const competition = await Competition.findById(req.params.id);
        if (!competition) return res.status(404).json({ error: 'Competition not found' });

        if (req.body.name) competition.name = req.body.name;
        if (req.body.groupsCount !== undefined) {
            competition.groupsCount = Number(req.body.groupsCount);
        }
        if (req.body.integrantsPerGroup !== undefined) {
            competition.integrantsPerGroup = Number(req.body.integrantsPerGroup);
        }
        if (req.body.qualifiersPerGroup !== undefined) {
            competition.qualifiersPerGroup = Number(req.body.qualifiersPerGroup);
        }
        if (req.body.apiLeagueId !== undefined) {
            competition.apiLeagueId = Number(req.body.apiLeagueId);
        }
        if (req.body.apiSeason !== undefined) {
            competition.apiSeason = Number(req.body.apiSeason);
        }
        if (req.body.tournament !== undefined) {
            competition.tournament = req.body.tournament;
        }
        if (req.body.country !== undefined) {
            competition.country = req.body.country;
        }
        if (req.body.seasonStart !== undefined) {
            competition.seasonStart = new Date(req.body.seasonStart);
        }
        if (req.body.seasonEnd !== undefined) {
            competition.seasonEnd = new Date(req.body.seasonEnd);
        }
        await competition.save();

        res.json({ message: 'Competition updated' });
    } catch (error) {
        console.error('Error updating competition:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
 
// Eliminar competencia
router.delete('/competitions/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const competition = await Competition.findByIdAndDelete(req.params.id);
        if (!competition) return res.status(404).json({ error: 'Competition not found' });

        res.json({ message: 'Competition deleted' });
    } catch (error) {
        console.error('Error deleting competition:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Obtener partidos de una competencia
router.get('/competitions/:id/matches', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const matches = await Match.find({ competition: req.params.id });
        res.json(matches);
    } catch (error) {
        console.error('Error listing matches:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Actualizar orden de partidos knockout
router.put('/competitions/:id/knockout-order', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { order } = req.body;
        if (!Array.isArray(order)) {
            return res.status(400).json({ error: 'order array required' });
        }
        await Promise.all(order.map((id, idx) =>
            Match.updateOne({ _id: id, competition: req.params.id }, { order: idx })
        ));
        res.json({ message: 'Order updated' });
    } catch (error) {
        console.error('Error updating match order:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Actualizar datos de un partido
router.put('/competitions/:id/matches/:matchId', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const match = await Match.findById(req.params.matchId);
        if (!match || match.competition !== req.params.id) {
            return res.status(404).json({ error: 'Match not found' });
        }

        const { team1, team2, date, time } = req.body;
        if (team1 !== undefined) match.team1 = team1;
        if (team2 !== undefined) match.team2 = team2;
        if (date !== undefined) match.date = date;
        if (time !== undefined) match.time = time;

        await match.save();
        res.json({ message: 'Match updated' });
    } catch (error) {
        console.error('Error updating match:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Actualizar resultado de un partido y recalcular eliminatorias
router.post('/competitions/:id/matches/:matchId', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const match = await Match.findById(req.params.matchId);
        if (!match || match.competition !== req.params.id) {
            return res.status(404).json({ error: 'Match not found' });
        }

        const { result1, result2 } = req.body;
        match.result1 = result1;
        match.result2 = result2;
        await match.save();
        await updateEliminationMatches(match.competition);
        res.json({ message: 'Match result updated' });
    } catch (error) {
        console.error('Error updating match result:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Generar o actualizar eliminatorias
router.post('/generate-bracket/:competition', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const q = Number(req.body.qualifiersPerGroup || 2);
        await Match.deleteMany({ competition: req.params.competition, series: 'Eliminatorias' });
        await generateEliminationBracket(req.params.competition, q);
        res.json({ message: 'Bracket generated' });
    } catch (error) {
        console.error('Error generating bracket:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Recalcular llaves de eliminatoria manualmente
router.post('/recalculate-bracket/:competition', isAuthenticated, isAdmin, async (req, res) => {
    try {
        await updateEliminationMatches(req.params.competition);
        res.json({ message: 'Bracket recalculated' });
    } catch (error) {
        console.error('Error recalculating bracket:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Actualizar resultados desde API-Football
router.post('/update-results/:competition', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const result = await updateResults(req.params.competition);
        if (result && result.skipped) {
            return res.json({ skipped: true });
        }
        res.json({ message: 'Results updated' });
    } catch (error) {
        console.error('Error updating results:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
