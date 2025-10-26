const express = require('express');
const router = express.Router();
const multer = require('multer');
const bcrypt = require('bcrypt');
const path = require('path');
const mongoose = require('mongoose');
const User = require('../models/User');
const Match = require('../models/Match');
const Penca = require('../models/Penca');
const Competition = require('../models/Competition');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const { DEFAULT_COMPETITION } = require('../config');
const { updateEliminationMatches, generateEliminationBracket } = require('../utils/bracket');
const updateResults = require('../scripts/updateResults');
const uploadJson = require('../middleware/jsonUpload');
const { sanitizeScoring } = require('../utils/scoring');
const { recordAudit, getAuditConfig, updateAuditConfig, AUDIT_TYPES } = require('../utils/audit');

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

const SAMPLE_FIXTURE_PATH = path.join(__dirname, '..', 'public', 'samples', 'competition-fixture-example.json');
const WORLDCUP_FIXTURE_PATH = path.join(__dirname, '..', 'public', 'samples', 'worldcup2026-fixture.json');
const JSON_GUIDE_PATH = path.join(__dirname, '..', 'public', 'docs', 'competition-json-guide-es.md');

async function findCompetitionByIdOrName(identifier) {
    if (!identifier) {
        return null;
    }

    if (mongoose.Types.ObjectId.isValid(identifier)) {
        const byId = await Competition.findById(identifier);
        if (byId) {
            return byId;
        }
    }

    return Competition.findOne({ name: identifier });
}

function parseJsonValue(value) {
    if (value == null) {
        return null;
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) {
            return null;
        }
        try {
            return JSON.parse(trimmed);
        } catch (error) {
            return null;
        }
    }
    if (typeof value === 'object') {
        return value;
    }
    return null;
}

function extractImportPayload(req) {
    if (req.file) {
        try {
            return JSON.parse(req.file.buffer.toString('utf8'));
        } catch (error) {
            const err = new Error('Invalid fixture file');
            err.status = 400;
            throw err;
        }
    }

    const candidates = [req.body?.import, req.body?.payload, req.body?.data, req.body];
    for (const candidate of candidates) {
        const parsed = parseJsonValue(candidate);
        if (parsed) {
            return parsed;
        }
    }
    return null;
}

function parseDateInput(value) {
    if (!value) {
        return undefined;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseKickoff(value) {
    if (!value) {
        return null;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

router.get('/audit-config', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const config = await getAuditConfig();
        res.json({ ...config, availableTypes: AUDIT_TYPES });
    } catch (error) {
        console.error('Error fetching audit config:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/audit-config', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const updated = await updateAuditConfig({
            enabled: req.body?.enabled,
            types: req.body?.types
        });
        res.json({ ...updated, availableTypes: AUDIT_TYPES });
    } catch (error) {
        console.error('Error updating audit config:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

function normalizeImportPayload(data, fallbackName) {
    if (!data) {
        return { competition: {}, matches: [], metadata: {} };
    }
    if (Array.isArray(data)) {
        return { competition: {}, matches: data, metadata: {} };
    }

    if (data.import) {
        return normalizeImportPayload(data.import, fallbackName);
    }

    const competitionSource = (data.competition && typeof data.competition === 'object') ? data.competition : data;
    const competition = {
        name: competitionSource.name ?? fallbackName,
        tournament: competitionSource.tournament,
        country: competitionSource.country || competitionSource.hosts,
        groupsCount: competitionSource.groupsCount != null ? Number(competitionSource.groupsCount) : undefined,
        integrantsPerGroup: competitionSource.integrantsPerGroup != null ? Number(competitionSource.integrantsPerGroup) : undefined,
        qualifiersPerGroup: competitionSource.qualifiersPerGroup != null ? Number(competitionSource.qualifiersPerGroup) : undefined,
        apiLeagueId: competitionSource.apiLeagueId != null ? Number(competitionSource.apiLeagueId) : undefined,
        apiSeason: competitionSource.apiSeason != null ? Number(competitionSource.apiSeason) : undefined,
        seasonStart: competitionSource.seasonStart,
        seasonEnd: competitionSource.seasonEnd
    };

    const matches = Array.isArray(data.matches)
        ? data.matches
        : Array.isArray(data.fixture)
            ? data.fixture
            : Array.isArray(data.imported?.matches)
                ? data.imported.matches
                : [];

    const metadata = (data.metadata && typeof data.metadata === 'object') ? { ...data.metadata } : {};
    if (data.expectedMatches != null && metadata.expectedMatches == null) {
        metadata.expectedMatches = Number(data.expectedMatches);
    }

    return { competition, matches, metadata };
}

function validateImportedMatches(matches, expectedMatches) {
    if (!Array.isArray(matches) || matches.length === 0) {
        return 'Matches array is required in the JSON payload';
    }
    if (expectedMatches != null && matches.length !== Number(expectedMatches)) {
        return `Expected ${expectedMatches} matches but received ${matches.length}`;
    }

    const seen = new Set();
    for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        const team1 = (match.team1 || '').trim();
        const team2 = (match.team2 || '').trim();
        if (!team1 || !team2) {
            return `Match ${i + 1} must include team1 and team2`;
        }
        if (team1 === team2) {
            return `Match ${i + 1} has duplicated teams (${team1})`;
        }
        const kickoffKey = match.kickoff || match.kickoffUtc || match.kickoffISO || '';
        const dateKey = match.originalKickoff?.date || match.date || '';
        const timeKey = match.originalKickoff?.time || match.time || '';
        const groupKey = match.group || match.group_name || '';
        const key = `${kickoffKey}|${dateKey}|${timeKey}|${groupKey}|${team1}|${team2}`;
        if (seen.has(key)) {
            return `Duplicate match detected for ${team1} vs ${team2}`;
        }
        seen.add(key);
    }
    return null;
}

function deriveGroupStats(matches) {
    const groupMap = new Map();
    matches.forEach(match => {
        const group = match.group || match.group_name;
        if (!group) {
            return;
        }
        const entry = groupMap.get(group) || new Set();
        if (match.team1) entry.add(match.team1);
        if (match.team2) entry.add(match.team2);
        groupMap.set(group, entry);
    });

    if (!groupMap.size) {
        return {};
    }

    const integrants = Array.from(groupMap.values()).map(set => set.size);
    const uniform = integrants.every(count => count === integrants[0]);
    return {
        groupsCount: groupMap.size,
        integrantsPerGroup: uniform ? integrants[0] : undefined
    };
}

function extractSeasonBounds(matches) {
    const values = matches
        .map(match => {
            if (match.kickoff instanceof Date) {
                return match.kickoff;
            }
            if (match.date) {
                const parsed = new Date(match.date);
                return Number.isNaN(parsed.getTime()) ? null : parsed;
            }
            return null;
        })
        .filter(date => date && !Number.isNaN(date.getTime()));

    if (!values.length) {
        return { seasonStart: undefined, seasonEnd: undefined };
    }

    const timestamps = values.map(date => date.getTime());
    return {
        seasonStart: new Date(Math.min(...timestamps)),
        seasonEnd: new Date(Math.max(...timestamps))
    };
}

function normalizeVenue(match) {
    const venue = match.venue || {};
    const normalized = {
        country: venue.country || match.venueCountry || null,
        city: venue.city || match.venueCity || null,
        stadium: venue.stadium || match.venueStadium || null
    };
    return Object.values(normalized).some(Boolean) ? normalized : undefined;
}

function normalizeMatchForInsert(match, index, competitionName, tournamentName) {
    const original = match.originalKickoff || {};
    const originalDate = match.originalDate || original.date || match.date || null;
    const originalTime = match.originalTime || original.time || match.time || null;
    const originalTimezone = match.originalTimezone || original.timezone || original.tz || null;
    const kickoffCandidate = match.kickoff || match.kickoffUtc || match.kickoffISO || null;
    const kickoff = parseKickoff(kickoffCandidate) || (originalDate && originalTime ? parseKickoff(`${originalDate}T${originalTime}Z`) : null);

    return {
        date: match.date || originalDate || null,
        time: match.time || originalTime || null,
        kickoff: kickoff || undefined,
        originalDate: originalDate || null,
        originalTime: originalTime || null,
        originalTimezone: originalTimezone || null,
        team1: (match.team1 || '').trim(),
        team2: (match.team2 || '').trim(),
        competition: competitionName,
        group_name: match.group || match.group_name || 'Otros',
        series: match.stage || match.series || 'Fase de grupos',
        tournament: match.tournament || tournamentName,
        venue: normalizeVenue(match),
        order: typeof match.order === 'number' ? match.order : index,
        result1: match.result1 ?? null,
        result2: match.result2 ?? null
    };
}


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
        await recordAudit({
            action: 'owner:create',
            entityType: 'user',
            entityId: owner._id,
            actor: req.session.user._id,
            metadata: { username: owner.username }
        });
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
        await recordAudit({
            action: 'owner:update',
            entityType: 'user',
            entityId: owner._id,
            actor: req.session.user._id,
            metadata: { username: owner.username }
        });
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

        await recordAudit({
            action: 'owner:delete',
            entityType: 'user',
            entityId: owner._id,
            actor: req.session.user._id,
            metadata: { username: owner.username }
        });

        res.json({ message: 'Owner deleted' });
    } catch (error) {
        console.error('Error deleting owner:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Crear penca
router.post('/pencas', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { name, owner, participantLimit, competition, isPublic, scoring, rules, tournamentMode, modeSettings } = req.body;
        if (!name) return res.status(400).json({ error: 'Name required' });

        const ownerUser = owner ? await User.findById(owner) : req.session.user;
        if (!ownerUser) return res.status(404).json({ error: 'Owner not found' });

        let fixtureIds = [];

        const sanitizedScoring = sanitizeScoring(scoring);
        const allowedModes = Penca.schema.path('tournamentMode').enumValues;

        const penca = new Penca({
            name,
            code: Math.random().toString(36).substring(2, 8).toUpperCase(),
            owner: ownerUser._id,
            competition: competition || DEFAULT_COMPETITION,
            participantLimit: participantLimit ? Number(participantLimit) : undefined,
            isPublic: isPublic === true || isPublic === 'true',
            fixture: fixtureIds,
            participants: [],
            scoring: sanitizedScoring,
            rules: rules || Penca.rulesText(sanitizedScoring),
            tournamentMode: tournamentMode && allowedModes.includes(tournamentMode)
                ? tournamentMode
                : 'group_stage_knockout',
            modeSettings: modeSettings || {}
        });

        await penca.save();

        ownerUser.ownedPencas = ownerUser.ownedPencas || [];
        ownerUser.ownedPencas.push(penca._id);
        await ownerUser.save();

        await recordAudit({
            action: 'penca:create-admin',
            entityType: 'penca',
            entityId: penca._id,
            actor: req.session.user._id,
            metadata: { scoring: penca.scoring, tournamentMode: penca.tournamentMode }
        });

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
        const { name, participantLimit, owner, competition, isPublic, scoring, rules, tournamentMode, modeSettings } = req.body;
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
        if (scoring) {
            penca.scoring = sanitizeScoring({ ...penca.scoring, ...scoring });
        }
        if (rules !== undefined) {
            penca.rules = rules || Penca.rulesText(penca.scoring);
        }
        if (tournamentMode && Penca.schema.path('tournamentMode').enumValues.includes(tournamentMode)) {
            penca.tournamentMode = tournamentMode;
        }
        if (modeSettings) {
            penca.modeSettings = modeSettings;
        }

        await penca.save();
        await recordAudit({
            action: 'penca:update-admin',
            entityType: 'penca',
            entityId: penca._id,
            actor: req.session.user._id,
            metadata: { isPublic: penca.isPublic, scoring: penca.scoring, tournamentMode: penca.tournamentMode }
        });
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
        await recordAudit({
            action: 'penca:delete-admin',
            entityType: 'penca',
            entityId: req.params.id,
            actor: req.session.user._id,
            metadata: { name: penca.name }
        });
        res.json({ message: 'Penca deleted' });
    } catch (error) {
        console.error('Error deleting penca:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Crear competencia
router.post('/competitions', isAuthenticated, isAdmin, uploadJson.single('fixtureFile'), async (req, res) => {
    try {
        const payload = extractImportPayload(req);
        if (!payload) {
            return res.status(400).json({ error: 'JSON payload with competition and matches is required' });
        }

        const fallbackName = typeof req.body?.name === 'string' ? req.body.name : undefined;
        const { competition: competitionSpec, matches, metadata } = normalizeImportPayload(payload, fallbackName);

        if (!competitionSpec.name) {
            return res.status(400).json({ error: 'Competition name is required inside the JSON' });
        }

        const expectedMatches = metadata.expectedMatches != null ? Number(metadata.expectedMatches) : undefined;
        const validationError = validateImportedMatches(matches, expectedMatches);
        if (validationError) {
            return res.status(400).json({ error: validationError });
        }

        const existing = await Competition.findOne({ name: competitionSpec.name });
        if (existing) {
            return res.status(409).json({ error: 'Competition already exists' });
        }

        const tournamentName = competitionSpec.tournament || competitionSpec.name;
        const sanitizedMatches = matches.map((match, index) =>
            normalizeMatchForInsert(match, index, competitionSpec.name, tournamentName)
        );

        const { seasonStart, seasonEnd } = extractSeasonBounds(sanitizedMatches);
        const groups = deriveGroupStats(matches);

        const competition = new Competition({
            name: competitionSpec.name,
            tournament: tournamentName,
            country: competitionSpec.country || undefined,
            groupsCount: competitionSpec.groupsCount ?? groups.groupsCount ?? undefined,
            integrantsPerGroup: competitionSpec.integrantsPerGroup ?? groups.integrantsPerGroup ?? undefined,
            qualifiersPerGroup: competitionSpec.qualifiersPerGroup ?? undefined,
            apiLeagueId: competitionSpec.apiLeagueId ?? undefined,
            apiSeason: competitionSpec.apiSeason ?? undefined,
            seasonStart: parseDateInput(competitionSpec.seasonStart) || seasonStart,
            seasonEnd: parseDateInput(competitionSpec.seasonEnd) || seasonEnd
        });

        await competition.save();

        const insertPayload = sanitizedMatches.map(match => ({
            ...match,
            kickoff: match.kickoff || undefined,
            venue: match.venue || undefined
        }));

        if (insertPayload.length) {
            await Match.insertMany(insertPayload);
        }

        res.status(201).json({ competitionId: competition._id, matches: insertPayload.length });
    } catch (error) {
        console.error('Error creating competition:', error);
        if (error.status) {
            return res.status(error.status).json({ error: error.message });
        }
        if (error?.code === 11000) {
            return res.status(409).json({ error: 'Competition already exists' });
        }
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

router.get('/competitions/template/example', isAuthenticated, isAdmin, (req, res) => {
    res.download(SAMPLE_FIXTURE_PATH, 'competition-fixture-example.json');
});

router.get('/competitions/template/worldcup', isAuthenticated, isAdmin, (req, res) => {
    res.download(WORLDCUP_FIXTURE_PATH, 'worldcup2026-fixture.json');
});

router.get('/competitions/template/guide', isAuthenticated, isAdmin, (req, res) => {
    res.download(JSON_GUIDE_PATH, 'guia-json-competencias.md');
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
        const comp = await findCompetitionByIdOrName(req.params.id);
        if (!comp) {
            return res.status(404).json({ error: 'Competition not found' });
        }
        const matches = await Match.find({ competition: comp.name }).sort({ order: 1, kickoff: 1, date: 1, time: 1 });
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
        const comp = await findCompetitionByIdOrName(req.params.id);
        if (!comp) {
            return res.status(404).json({ error: 'Competition not found' });
        }
        await Promise.all(order.map((id, idx) =>
            Match.updateOne({ _id: id, competition: comp.name }, { order: idx })
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
        const comp = await findCompetitionByIdOrName(req.params.id);
        if (!comp) {
            return res.status(404).json({ error: 'Competition not found' });
        }

        const match = await Match.findById(req.params.matchId);
        if (!match || match.competition !== comp.name) {
            return res.status(404).json({ error: 'Match not found' });
        }

        const { team1, team2, date, time, group_name, series } = req.body;
        if (team1 !== undefined) match.team1 = team1;
        if (team2 !== undefined) match.team2 = team2;
        if (date !== undefined) match.date = date || null;
        if (time !== undefined) match.time = time || null;
        if (group_name !== undefined) match.group_name = group_name || 'Otros';
        if (series !== undefined) match.series = series || match.series;
        if (req.body.kickoff !== undefined) {
            const kickoffValue = parseKickoff(req.body.kickoff);
            match.kickoff = kickoffValue || null;
        }
        if (req.body.originalDate !== undefined) {
            match.originalDate = req.body.originalDate || null;
        }
        if (req.body.originalTime !== undefined) {
            match.originalTime = req.body.originalTime || null;
        }
        if (req.body.originalTimezone !== undefined) {
            match.originalTimezone = req.body.originalTimezone || null;
        }
        if (req.body.venue !== undefined) {
            const venuePayload = req.body.venue || {};
            const normalized = {
                country: venuePayload.country || null,
                city: venuePayload.city || null,
                stadium: venuePayload.stadium || null
            };
            if (Object.values(normalized).some(Boolean)) {
                match.venue = normalized;
            } else {
                match.venue = undefined;
            }
        }

        await match.save();
        res.json({ message: 'Match updated' });
    } catch (error) {
        console.error('Error updating match:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/competitions/:id/matches', isAuthenticated, isAdmin, (req, res) => {
    res.status(405).json({ error: 'Matches must be imported from a JSON file' });
});

// Actualizar resultado de un partido y recalcular eliminatorias
router.post('/competitions/:id/matches/:matchId', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const comp = await findCompetitionByIdOrName(req.params.id);
        if (!comp) {
            return res.status(404).json({ error: 'Competition not found' });
        }

        const match = await Match.findById(req.params.matchId);
        if (!match || match.competition !== comp.name) {
            return res.status(404).json({ error: 'Match not found' });
        }

        const { result1, result2 } = req.body;
        match.result1 = result1 === null || result1 === '' || result1 === undefined ? null : Number(result1);
        match.result2 = result2 === null || result2 === '' || result2 === undefined ? null : Number(result2);
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
