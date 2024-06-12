const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const app = express();
const db = require('./database'); // Import the database configuration
const multer = require('multer');
const fs = require('fs');
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Secret key for JWT
const JWT_SECRET = 'a123b456c789d012e345f678g901h234i567j890k123l456m789n012o345p678q901r234s567t890u123v456w789x012y345z678a901b234c567d890e123f456g789h012';

// Middleware to check authentication
const checkAuth = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
        return res.redirect('/login.html');
    }
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.redirect('/login.html');
        }
        req.user = decoded;
        next();
    });
};

// Configuración de multer para la subida de archivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

const insertKnockoutMatches = (matches) => {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare(`INSERT INTO matches (date, time, team1, team2, competition, group_name, series, tournament) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                                 ON CONFLICT(id) DO UPDATE SET team1 = excluded.team1, team2 = excluded.team2`);
        matches.forEach(match => {
            stmt.run([match.date, match.time, match.team1, match.team2, match.competition, match.group_name, match.series, match.tournament]);
        });
        stmt.finalize((err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
};

const calculateNextStages = async () => {
    try {
        const rows = await new Promise((resolve, reject) => {
            db.all(`SELECT * FROM matches WHERE series = 'quarterfinal' AND result_team1 IS NOT NULL AND result_team2 IS NOT NULL`, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });

        if (rows.length < 4) {
            return { error: 'Not enough winners to generate semifinals.' };
        }

        const quarterFinalWinners = rows.map(match => (match.result_team1 > match.result_team2 ? match.team1 : match.team2));

        const existingSemifinals = await new Promise((resolve, reject) => {
            db.all(`SELECT * FROM matches WHERE series = 'semifinal'`, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });

        if (existingSemifinals.length === 0) {
            const semifinals = [
                { date: '2024-07-09', time: '20:00', team1: quarterFinalWinners[0], team2: quarterFinalWinners[1], competition: 'Copa América', group_name: 'Semifinales', series: 'semifinal', tournament: 'Copa América' },
                { date: '2024-07-10', time: '20:00', team1: quarterFinalWinners[2], team2: quarterFinalWinners[3], competition: 'Copa América', group_name: 'Semifinales', series: 'semifinal', tournament: 'Copa América' },
            ];

            await insertKnockoutMatches(semifinals);
        }

        const semifinalRows = await new Promise((resolve, reject) => {
            db.all(`SELECT * FROM matches WHERE series = 'semifinal' AND result_team1 IS NOT NULL AND result_team2 IS NOT NULL`, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });

        if (semifinalRows.length < 2) {
            return { error: 'Not enough winners to generate final and third place matches.' };
        }

        const semifinalWinners = semifinalRows.map(match => (match.result_team1 > match.result_team2 ? match.team1 : match.team2));
        const semifinalLosers = semifinalRows.map(match => (match.result_team1 < match.result_team2 ? match.team1 : match.team2));

        const existingThirdPlaceAndFinal = await new Promise((resolve, reject) => {
            db.all(`SELECT * FROM matches WHERE series IN ('third_place', 'final')`, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });

        if (existingThirdPlaceAndFinal.length === 0) {
            const thirdPlace = [
                { date: '2024-07-13', time: '20:00', team1: semifinalLosers[0], team2: semifinalLosers[1], competition: 'Copa América', group_name: '3º Puesto', series: 'third_place', tournament: 'Copa América' },
            ];

            const final = [
                { date: '2024-07-14', time: '20:00', team1: semifinalWinners[0], team2: semifinalWinners[1], competition: 'Copa América', group_name: 'Final', series: 'final', tournament: 'Copa América' },
            ];

            await insertKnockoutMatches(thirdPlace);
            await insertKnockoutMatches(final);
        }
    } catch (err) {
        throw new Error(err.message);
    }
};

const calculateKnockoutStages = async () => {
    try {
        const rows = await new Promise((resolve, reject) => {
            db.all(`SELECT * FROM matches WHERE series = 'group'`, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });

        const teams = {};

        rows.forEach(match => {
            if (!teams[match.team1]) {
                teams[match.team1] = { points: 0, goalsFor: 0, goalsAgainst: 0, group: match.group_name };
            }
            if (!teams[match.team2]) {
                teams[match.team2] = { points: 0, goalsFor: 0, goalsAgainst: 0, group: match.group_name };
            }

            const result_team1 = match.result_team1 !== null ? match.result_team1 : 0;
            const result_team2 = match.result_team2 !== null ? match.result_team2 : 0;

            teams[match.team1].goalsFor += result_team1;
            teams[match.team1].goalsAgainst += result_team2;
            teams[match.team2].goalsFor += result_team2;
            teams[match.team2].goalsAgainst += result_team1;

            if (result_team1 > result_team2) {
                teams[match.team1].points += 3;
            } else if (result_team2 > result_team1) {
                teams[match.team2].points += 3;
            } else {
                teams[match.team1].points += 1;
                teams[match.team2].points += 1;
            }
        });

        const groups = { A: [], B: [], C: [], D: [] };
        for (const [team, stats] of Object.entries(teams)) {
            groups[stats.group].push({ team, ...stats });
        }

        for (const group in groups) {
            groups[group].sort((a, b) => {
                if (b.points === a.points) {
                    const diffA = a.goalsFor - a.goalsAgainst;
                    const diffB = b.goalsFor - b.goalsAgainst;
                    return diffB - diffA || b.goalsFor - a.goalsFor;
                }
                return b.points - a.points;
            });
        }

        const existingQuarterfinals = await new Promise((resolve, reject) => {
            db.all(`SELECT * FROM matches WHERE series = 'quarterfinal'`, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });

        if (existingQuarterfinals.length === 0) {
            const quarterFinals = [
                { date: '2024-07-04', time: '20:00', team1: groups.A[0].team, team2: groups.B[1].team, competition: 'Copa América', group_name: 'Cuartos de final', series: 'quarterfinal', tournament: 'Copa América' },
                { date: '2024-07-05', time: '20:00', team1: groups.B[0].team, team2: groups.A[1].team, competition: 'Copa América', group_name: 'Cuartos de final', series: 'quarterfinal', tournament: 'Copa América' },
                { date: '2024-07-06', time: '18:00', team1: groups.C[0].team, team2: groups.D[1].team, competition: 'Copa América', group_name: 'Cuartos de final', series: 'quarterfinal', tournament: 'Copa América' },
                { date: '2024-07-06', time: '15:00', team1: groups.D[0].team, team2: groups.C[1].team, competition: 'Copa América', group_name: 'Cuartos de final', series: 'quarterfinal', tournament: 'Copa América' },
            ];

            await insertKnockoutMatches(quarterFinals);
        }

        const nextStagesResult = await calculateNextStages();
        if (nextStagesResult && nextStagesResult.error) {
            throw new Error(nextStagesResult.error);
        }

    } catch (err) {
        throw new Error(err.message);
    }
};

// User registration endpoint
app.post('/register', upload.single('avatar'), (req, res) => {
    const { username, password, email, firstName, lastName, phone } = req.body;
    const avatar = req.file ? `/uploads/${req.file.filename}` : '/images/avatar.webp';
    const hashedPassword = bcrypt.hashSync(password, 10);

    db.run(`INSERT INTO users (username, password, email, firstName, lastName, phone, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)`, [username, hashedPassword, email, firstName, lastName, phone, avatar], function(err) {
        if (err) {
            console.error('Error creating user:', err.message);
            res.status(500).json({ error: 'Error creating user' });
        } else {
            res.status(201).json({ message: 'User registered successfully' });
        }
    });
});

// User login endpoint
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
        if (err) {
            console.error('Error fetching user:', err.message);
            res.status(500).json({ error: 'Error fetching user' });
        } else if (!user) {
            res.status(400).json({ error: 'Invalid username or password' });
        } else {
            const passwordMatch = bcrypt.compareSync(password, user.password);
            if (!passwordMatch) {
                res.status(400).json({ error: 'Invalid username or password' });
            } else {
                const token = jwt.sign({ id: user.id, username: user.username, isAdmin: user.isAdmin }, JWT_SECRET, { expiresIn: '1h' });
                res.json({ accessToken: token, user });
            }
        }
    });
});

// Endpoint to get user profile
app.get('/profile', checkAuth, (req, res) => {
    db.get(`SELECT * FROM users WHERE id = ?`, [req.user.id], (err, user) => {
        if (err) {
            console.error('Error fetching user:', err.message);
            res.status(500).json({ error: 'Error fetching user' });
        } else if (!user) {
            res.status(404).json({ error: 'User not found' });
        } else {
            res.json({ user });
        }
    });
});

// Endpoint to update user profile
app.put('/profile/:id', checkAuth, (req, res) => {
    const { firstName, lastName, phone, email } = req.body;
    const userId = req.params.id;

    db.run(`UPDATE users SET firstName = ?, lastName = ?, phone = ?, email = ? WHERE id = ?`, [firstName, lastName, phone, email, userId], function(err) {
        if (err) {
            console.error('Error updating user:', err.message);
            res.status(500).json({ error: 'Error updating user' });
        } else {
            res.json({ message: 'Profile updated successfully' });
        }
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Endpoint to calculate knockout stages
app.get('/calculate-knockout-stages', checkAuth, async (req, res) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    try {
        await calculateKnockoutStages();
        res.json({ message: 'Knockout stages calculated and updated.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Endpoint to get all matches
app.get('/matches', checkAuth, (req, res) => {
    db.all(`SELECT * FROM matches`, (err, rows) => {
        if (err) {
            console.error('Error fetching matches:', err.message);
            res.status(500).json({ error: 'Error fetching matches' });
        } else {
            res.json({ matches: rows });
        }
    });
});

// Endpoint to get predictions for a user
app.get('/predictions/:userId', checkAuth, (req, res) => {
    const userId = req.params.userId;

    db.all(`SELECT * FROM predictions WHERE user_id = ?`, [userId], (err, rows) => {
        if (err) {
            console.error('Error fetching predictions:', err.message);
            res.status(500).json({ error: 'Error fetching predictions' });
        } else {
            res.json({ predictions: rows });
        }
    });
});

// Endpoint to submit a prediction
app.post('/prediction', checkAuth, (req, res) => {
    const { userId, matchId, goals_team1, goals_team2 } = req.body;

    const stmt = db.prepare(`INSERT INTO predictions (user_id, match_id, goals_team1, goals_team2) VALUES (?, ?, ?, ?)
                             ON CONFLICT(user_id, match_id) DO UPDATE SET goals_team1 = excluded.goals_team1, goals_team2 = excluded.goals_team2`);
    stmt.run([userId, matchId, goals_team1, goals_team2, goals_team1, goals_team2], function(err) {
        if (err) {
            console.error('Error saving prediction:', err.message);
            res.status(500).json({ error: 'Error saving prediction' });
        } else {
            res.json({ message: 'Prediction saved successfully' });
        }
    });
    stmt.finalize();
});

// Endpoint to update match results
app.put('/matches/:matchId', checkAuth, (req, res) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const { matchId } = req.params;
    const { result_team1, result_team2 } = req.body;

    db.run(`UPDATE matches SET result_team1 = ?, result_team2 = ? WHERE id = ?`, [result_team1, result_team2, matchId], async function(err) {
        if (err) {
            console.error('Error updating match result:', err.message);
            res.status(500).json({ error: 'Error updating match result' });
        } else {
            try {
                const groupMatchesPending = await new Promise((resolve, reject) => {
                    db.all(`SELECT * FROM matches WHERE series = 'group' AND (result_team1 IS NULL OR result_team2 IS NULL)`, (err, rows) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(rows.length);
                        }
                    });
                });

                if (groupMatchesPending === 0) {
                    await calculateKnockoutStages();
                } else {
                    const quarterfinalMatchesPending = await new Promise((resolve, reject) => {
                        db.all(`SELECT * FROM matches WHERE series = 'quarterfinal' AND (result_team1 IS NULL OR result_team2 IS NULL)`, (err, rows) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(rows.length);
                            }
                        });
                    });

                    if (quarterfinalMatchesPending === 0) {
                        await calculateNextStages();
                    } else {
                        const semifinalMatchesPending = await new Promise((resolve, reject) => {
                            db.all(`SELECT * FROM matches WHERE series = 'semifinal' AND (result_team1 IS NULL OR result_team2 IS NULL)`, (err, rows) => {
                                if (err) {
                                    reject(err);
                                } else {
                                    resolve(rows.length);
                                }
                            });
                        });

                        if (semifinalMatchesPending === 0) {
                            await calculateNextStages();
                        }
                    }
                }

                res.json({ message: 'Match result updated successfully' });
            } catch (err) {
                console.error('Error calculating knockout stages:', err.message);
                res.status(500).json({ error: 'Error calculating knockout stages' });
            }
        }
    });
});

// Endpoint to get leaderboard
app.get('/leaderboard', checkAuth, (req, res) => {
    db.all(`SELECT username, firstName, lastName, points FROM users JOIN user_points ON users.id = user_points.user_id WHERE isAdmin = 0 ORDER BY points DESC`, (err, rows) => {
        if (err) {
            console.error('Error fetching leaderboard:', err.message);
            res.status(500).json({ error: 'Error fetching leaderboard' });
        } else {
            res.json(rows);
        }
    });
});

// Serve login.html as default if not authenticated
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/index.html', checkAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
