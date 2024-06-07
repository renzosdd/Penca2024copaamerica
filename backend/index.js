const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const db = require('./db/database');

dotenv.config();

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.resolve(__dirname, 'uploads'));
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}_${file.originalname}`);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb('Error: Solo se permiten archivos de imagen (JPG, JPEG, PNG)');
        }
    }
});

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

const checkAdmin = (req, res, next) => {
    if (req.user.isAdmin) {
        next();
    } else {
        res.status(403).json({ message: 'Forbidden' });
    }
};

app.post('/register', (req, res) => {
    const { username, password, email, firstName, lastName, phone } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);
    const sql = 'INSERT INTO users (username, password, email, firstName, lastName, phone) VALUES (?, ?, ?, ?, ?, ?)';
    db.run(sql, [username, hashedPassword, email, firstName, lastName, phone], function(err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        const userId = this.lastID;
        res.json({ message: 'Usuario registrado correctamente', id: userId });
    });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const sql = 'SELECT * FROM users WHERE username = ?';
    db.get(sql, [username], (err, user) => {
        if (err || !user) {
            return res.status(400).json({ error: 'Usuario o contraseña incorrectos' });
        }
        if (bcrypt.compareSync(password, user.password)) {
            const accessToken = jwt.sign({ id: user.id, isAdmin: user.isAdmin }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.json({ accessToken, user });
        } else {
            res.status(400).json({ error: 'Usuario o contraseña incorrectos' });
        }
    });
});

app.put('/profile/:userId', upload.single('avatar'), authenticateToken, (req, res) => {
    const { userId } = req.params;
    const { firstName, lastName, phone, email } = req.body;
    let avatarPath = req.file ? req.file.path : null;

    const sql = 'UPDATE users SET firstName = ?, lastName = ?, phone = ?, email = ?, avatar = ? WHERE id = ?';
    db.run(sql, [firstName, lastName, phone, email, avatarPath, userId], function(err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json({ message: 'Perfil actualizado correctamente' });
    });
});

app.post('/prediction', authenticateToken, (req, res) => {
    const { userId, matchId, goals_team1, goals_team2 } = req.body;

    const now = new Date();
    const sqlMatch = 'SELECT date FROM matches WHERE id = ?';
    db.get(sqlMatch, [matchId], (err, row) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        if (row) {
            const matchDate = new Date(row.date);
            if ((matchDate - now) <= 30 * 60 * 1000) {
                return res.status(400).json({ error: 'No se pueden modificar predicciones 30 minutos antes del comienzo del partido.' });
            } else {
                const sql = 'INSERT INTO predictions (user_id, match_id, goals_team1, goals_team2) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, match_id) DO UPDATE SET goals_team1 = excluded.goals_team1, goals_team2 = excluded.goals_team2';
                db.run(sql, [userId, matchId, goals_team1, goals_team2], function(err) {
                    if (err) {
                        return res.status(400).json({ error: err.message });
                    }
                    res.json({ message: 'Predicción guardada correctamente', id: this.lastID });

                    // Update predicted next rounds
                    updatePredictedNextRounds(userId);
                });
            }
        }
    });
});

app.get('/predictions/:userId', authenticateToken, (req, res) => {
    const { userId } = req.params;
    const sql = `
        SELECT p.*, m.date as match_date, m.team1, m.team2, m.competition, m.group_name
        FROM predictions p
        JOIN matches m ON p.match_id = m.id
        WHERE p.user_id = ?
    `;
    db.all(sql, [userId], (err, rows) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json({ predictions: rows });
    });
});

app.get('/matches', authenticateToken, (req, res) => {
    const sql = 'SELECT * FROM matches';
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json({ matches: rows });
    });
});

app.put('/matches/:matchId', authenticateToken, checkAdmin, (req, res) => {
    const { matchId } = req.params;
    const { result_team1, result_team2 } = req.body;
    const sql = 'UPDATE matches SET result_team1 = ?, result_team2 = ? WHERE id = ?';
    db.run(sql, [result_team1, result_team2, matchId], function(err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }

        // Actualizar rondas siguientes
        updateStandings();
        updateNextRounds();

        res.json({ message: 'Resultado actualizado correctamente' });
    });
});

const updateStandings = () => {
    const sql = `
        SELECT team, group_name, SUM(points) as points, SUM(goals_for) as goals_for, SUM(goals_against) as goals_against
        FROM (
            SELECT team1 as team, group_name, 
                CASE 
                    WHEN result_team1 > result_team2 THEN 3 
                    WHEN result_team1 = result_team2 THEN 1 
                    ELSE 0 
                END as points,
                result_team1 as goals_for,
                result_team2 as goals_against
            FROM matches
            UNION ALL
            SELECT team2 as team, group_name, 
                CASE 
                    WHEN result_team2 > result_team1 THEN 3 
                    WHEN result_team2 = result_team1 THEN 1 
                    ELSE 0 
                END as points,
                result_team2 as goals_for,
                result_team1 as goals_against
            FROM matches
        )
        GROUP BY team, group_name
        ORDER BY group_name, points DESC, goals_for - goals_against DESC
    `;
    db.all(sql, [], (err, standings) => {
        if (err) {
            console.error('Error fetching standings:', err.message);
            return;
        }

        const updateSQL = `
            INSERT INTO standings (team, group_name, points, goals_for, goals_against)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(team) DO UPDATE SET
                points = excluded.points,
                goals_for = excluded.goals_for,
                goals_against = excluded.goals_against
        `;
        const stmt = db.prepare(updateSQL);

        standings.forEach(row => {
            stmt.run([row.team, row.group_name, row.points, row.goals_for, row.goals_against]);
        });

        stmt.finalize();
    });
};

const updateNextRounds = () => {
    const sql = `
        SELECT team, group_name, SUM(points) as points, SUM(goals_for) as goals_for, SUM(goals_against) as goals_against
        FROM (
            SELECT team1 as team, group_name, 
                CASE 
                    WHEN result_team1 > result_team2 THEN 3 
                    WHEN result_team1 = result_team2 THEN 1 
                    ELSE 0 
                END as points,
                result_team1 as goals_for,
                result_team2 as goals_against
            FROM matches
            UNION ALL
            SELECT team2 as team, group_name, 
                CASE 
                    WHEN result_team2 > result_team1 THEN 3 
                    WHEN result_team2 = result_team1 THEN 1 
                    ELSE 0 
                END as points,
                result_team2 as goals_for,
                result_team1 as goals_against
            FROM matches
        )
        GROUP BY team, group_name
        ORDER BY group_name, points DESC, goals_for - goals_against DESC
    `;
    db.all(sql, [], (err, standings) => {
        if (err) {
            console.error('Error fetching standings:', err.message);
            return;
        }

        const getTeam = (group, rank) => {
            const teamsInGroup = standings.filter(s => s.group_name === group);
            return teamsInGroup[rank - 1] ? teamsInGroup[rank - 1].team : 'Desconocido';
        };

        const quarterFinals = {
            25: { team1: getTeam('A', 1), team2: getTeam('B', 2) },
            26: { team1: getTeam('B', 1), team2: getTeam('A', 2) },
            27: { team1: getTeam('C', 1), team2: getTeam('D', 2) },
            28: { team1: getTeam('D', 1), team2: getTeam('C', 2) },
        };

        for (const [matchId, teams] of Object.entries(quarterFinals)) {
            const updateQuarterFinalSQL = 'UPDATE matches SET team1 = ?, team2 = ? WHERE id = ?';
            db.run(updateQuarterFinalSQL, [teams.team1, teams.team2, matchId], (err) => {
                if (err) {
                    console.error('Error updating quarter final match:', err.message);
                }
            });
        }

        const semiFinals = {
            29: { team1: null, team2: null },
            30: { team1: null, team2: null },
        };

        db.get('SELECT * FROM matches WHERE id = 25', (err, match25) => {
            if (err) return console.error(err.message);
            semiFinals[29].team1 = match25.result_team1 > match25.result_team2 ? match25.team1 : match25.team2;
            updateSemiFinals();
        });

        db.get('SELECT * FROM matches WHERE id = 26', (err, match26) => {
            if (err) return console.error(err.message);
            semiFinals[29].team2 = match26.result_team1 > match26.result_team2 ? match26.team1 : match26.team2;
            updateSemiFinals();
        });

        db.get('SELECT * FROM matches WHERE id = 27', (err, match27) => {
            if (err) return console.error(err.message);
            semiFinals[30].team1 = match27.result_team1 > match27.result_team2 ? match27.team1 : match27.team2;
            updateSemiFinals();
        });

        db.get('SELECT * FROM matches WHERE id = 28', (err, match28) => {
            if (err) return console.error(err.message);
            semiFinals[30].team2 = match28.result_team1 > match28.result_team2 ? match28.team1 : match28.team2;
            updateSemiFinals();
        });

        const updateSemiFinals = () => {
            for (const [matchId, teams] of Object.entries(semiFinals)) {
                if (teams.team1 && teams.team2) {
                    const updateSemiFinalSQL = 'UPDATE matches SET team1 = ?, team2 = ? WHERE id = ?';
                    db.run(updateSemiFinalSQL, [teams.team1, teams.team2, matchId], (err) => {
                        if (err) {
                            console.error('Error updating semi final match:', err.message);
                        } else {
                            finalAndThirdPlace();
                        }
                    });
                }
            }
        };

        const finalAndThirdPlace = () => {
            db.get('SELECT team1, team2, result_team1, result_team2 FROM matches WHERE id = 29', (err, semi1) => {
                if (err) {
                    console.error('Error fetching semi final 1 match:', err.message);
                } else {
                    const winnerSemi1 = semi1.result_team1 > semi1.result_team2 ? semi1.team1 : semi1.team2;
                    const loserSemi1 = semi1.result_team1 < semi1.result_team2 ? semi1.team1 : semi1.team2;

                    db.run('UPDATE matches SET team1 = ? WHERE id = 32', [loserSemi1], (err) => {
                        if (err) {
                            console.error('Error updating third place match:', err.message);
                        }
                    });
                    db.run('UPDATE matches SET team1 = ? WHERE id = 31', [winnerSemi1], (err) => {
                        if (err) {
                            console.error('Error updating final match:', err.message);
                        }
                    });
                }
            });

            db.get('SELECT team1, team2, result_team1, result_team2 FROM matches WHERE id = 30', (err, semi2) => {
                if (err) {
                    console.error('Error fetching semi final 2 match:', err.message);
                } else {
                    const winnerSemi2 = semi2.result_team1 > semi2.result_team2 ? semi2.team1 : semi2.team2;
                    const loserSemi2 = semi2.result_team1 < semi2.result_team2 ? semi2.team1 : semi2.team2;

                    db.run('UPDATE matches SET team2 = ? WHERE id = 32', [loserSemi2], (err) => {
                        if (err) {
                            console.error('Error updating third place match:', err.message);
                        }
                    });
                    db.run('UPDATE matches SET team2 = ? WHERE id = 31', [winnerSemi2], (err) => {
                        if (err) {
                            console.error('Error updating final match:', err.message);
                        }
                    });
                }
            });
        };
    });
};

const updatePredictedNextRounds = (userId) => {
    const sql = `
        SELECT team, group_name, SUM(points) as points, SUM(goals_for) as goals_for, SUM(goals_against) as goals_against
        FROM (
            SELECT team1 as team, group_name, 
                CASE 
                    WHEN goals_team1 > goals_team2 THEN 3 
                    WHEN goals_team1 = goals_team2 THEN 1 
                    ELSE 0 
                END as points,
                goals_team1 as goals_for,
                goals_team2 as goals_against
            FROM predictions
            JOIN matches ON predictions.match_id = matches.id
            WHERE predictions.user_id = ?
            UNION ALL
            SELECT team2 as team, group_name, 
                CASE 
                    WHEN goals_team2 > goals_team1 THEN 3 
                    WHEN goals_team2 = goals_team1 THEN 1 
                    ELSE 0 
                END as points,
                goals_team2 as goals_for,
                goals_team1 as goals_against
            FROM predictions
            JOIN matches ON predictions.match_id = matches.id
            WHERE predictions.user_id = ?
        )
        GROUP BY team, group_name
        ORDER BY group_name, points DESC, goals_for - goals_against DESC
    `;
    db.all(sql, [userId, userId], (err, standings) => {
        if (err) {
            console.error('Error fetching standings:', err.message);
            return;
        }

        const getTeam = (group, rank) => {
            const teamsInGroup = standings.filter(s => s.group_name === group);
            return teamsInGroup[rank - 1] ? teamsInGroup[rank - 1].team : 'Desconocido';
        };

        const quarterFinals = {
            25: { team1: getTeam('A', 1), team2: getTeam('B', 2) },
            26: { team1: getTeam('B', 1), team2: getTeam('A', 2) },
            27: { team1: getTeam('C', 1), team2: getTeam('D', 2) },
            28: { team1: getTeam('D', 1), team2: getTeam('C', 2) },
        };

        for (const [matchId, teams] of Object.entries(quarterFinals)) {
            const updateQuarterFinalSQL = 'UPDATE predictions SET goals_team1 = ?, goals_team2 = ? WHERE match_id = ? AND user_id = ?';
            db.run(updateQuarterFinalSQL, [teams.team1, teams.team2, matchId, userId], (err) => {
                if (err) {
                    console.error('Error updating predicted quarter final match:', err.message);
                }
            });
        }

        const semiFinals = {
            29: { team1: null, team2: null },
            30: { team1: null, team2: null },
        };

        db.get('SELECT * FROM predictions WHERE match_id = 25 AND user_id = ?', [userId], (err, match25) => {
            if (err) return console.error(err.message);
            semiFinals[29].team1 = match25.goals_team1 > match25.goals_team2 ? match25.team1 : match25.team2;
            updateSemiFinals();
        });

        db.get('SELECT * FROM predictions WHERE match_id = 26 AND user_id = ?', [userId], (err, match26) => {
            if (err) return console.error(err.message);
            semiFinals[29].team2 = match26.goals_team1 > match26.goals_team2 ? match26.team1 : match26.team2;
            updateSemiFinals();
        });

        db.get('SELECT * FROM predictions WHERE match_id = 27 AND user_id = ?', [userId], (err, match27) => {
            if (err) return console.error(err.message);
            semiFinals[30].team1 = match27.goals_team1 > match27.goals_team2 ? match27.team1 : match27.team2;
            updateSemiFinals();
        });

        db.get('SELECT * FROM predictions WHERE match_id = 28 AND user_id = ?', [userId], (err, match28) => {
            if (err) return console.error(err.message);
            semiFinals[30].team2 = match28.goals_team1 > match28.goals_team2 ? match28.team1 : match28.team2;
            updateSemiFinals();
        });

        const updateSemiFinals = () => {
            for (const [matchId, teams] of Object.entries(semiFinals)) {
                if (teams.team1 && teams.team2) {
                    const updateSemiFinalSQL = 'UPDATE predictions SET goals_team1 = ?, goals_team2 = ? WHERE match_id = ? AND user_id = ?';
                    db.run(updateSemiFinalSQL, [teams.team1, teams.team2, matchId, userId], (err) => {
                        if (err) {
                            console.error('Error updating predicted semi final match:', err.message);
                        } else {
                            finalAndThirdPlace();
                        }
                    });
                }
            }
        };

        const finalAndThirdPlace = () => {
            db.get('SELECT team1, team2, goals_team1, goals_team2 FROM predictions WHERE match_id = 29 AND user_id = ?', [userId], (err, semi1) => {
                if (err) {
                    console.error('Error fetching predicted semi final 1 match:', err.message);
                } else {
                    const winnerSemi1 = semi1.goals_team1 > semi1.goals_team2 ? semi1.team1 : semi1.team2;
                    const loserSemi1 = semi1.goals_team1 < semi1.goals_team2 ? semi1.team1 : semi1.team2;

                    db.run('UPDATE predictions SET team1 = ? WHERE match_id = 32 AND user_id = ?', [winnerSemi1, userId], (err) => {
                        if (err) {
                            console.error('Error updating predicted third place match:', err.message);
                        }
                    });
                    db.run('UPDATE predictions SET team1 = ? WHERE match_id = 31 AND user_id = ?', [loserSemi1, userId], (err) => {
                        if (err) {
                            console.error('Error updating predicted final match:', err.message);
                        }
                    });
                }
            });

            db.get('SELECT team1, team2, goals_team1, goals_team2 FROM predictions WHERE match_id = 30 AND user_id = ?', [userId], (err, semi2) => {
                if (err) {
                    console.error('Error fetching predicted semi final 2 match:', err.message);
                } else {
                    const winnerSemi2 = semi2.goals_team1 > semi2.goals_team2 ? semi2.team1 : semi2.team2;
                    const loserSemi2 = semi2.goals_team1 < semi2.goals_team2 ? semi2.team1 : semi2.team2;

                    db.run('UPDATE predictions SET team2 = ? WHERE match_id = 32 AND user_id = ?', [winnerSemi2, userId], (err) => {
                        if (err) {
                            console.error('Error updating predicted third place match:', err.message);
                        }
                    });
                    db.run('UPDATE predictions SET team2 = ? WHERE match_id = 31 AND user_id = ?', [loserSemi2, userId], (err) => {
                        if (err) {
                            console.error('Error updating predicted final match:', err.message);
                        }
                    });
                }
            });
        };
    });
};

app.use(express.static(path.join(__dirname, '../public')));

app.get('/login', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../public', 'login.html'));
});

app.get('/profile', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const sql = 'SELECT id, username, email, firstName, lastName, phone, avatar, isAdmin FROM users WHERE id = ?';
    db.get(sql, [userId], (err, user) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json({ user });
    });
});

app.get('*', authenticateToken, (req, res) => {
    res.sendFile(path.resolve(__dirname, '../public', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});