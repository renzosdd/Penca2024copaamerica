const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const dbDir = path.resolve(__dirname, 'db');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir);
}

const dbPath = path.join(dbDir, 'penca.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the penca database.');
    }
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        firstName TEXT,
        lastName TEXT,
        phone TEXT,
        avatar TEXT,
        isAdmin INTEGER DEFAULT 0
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        team1 TEXT NOT NULL,
        team2 TEXT NOT NULL,
        competition TEXT NOT NULL,
        group_name TEXT NOT NULL,
        result_team1 INTEGER,
        result_team2 INTEGER,
        series TEXT,
        tournament TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS predictions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        match_id INTEGER NOT NULL,
        goals_team1 INTEGER,
        goals_team2 INTEGER,
        team1 TEXT,  -- Add these columns to store predicted teams
        team2 TEXT,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (match_id) REFERENCES matches (id),
        UNIQUE (user_id, match_id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS standings (
        team TEXT PRIMARY KEY,
        group_name TEXT,
        points INTEGER,
        goals_for INTEGER,
        goals_against INTEGER
    )`);

    db.run(`CREATE INDEX IF NOT EXISTS idx_matches_series ON matches (series)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_matches_tournament ON matches (tournament)`);

    db.get(`SELECT COUNT(*) as count FROM matches`, (err, row) => {
        if (err) {
            console.error('Error checking matches table:', err.message);
            return;
        }

        if (row.count === 0) {
            // Insert initial data if table is empty
            const matches = [
                { date: '2024-06-20', time: '20:00', team1: 'Argentina', team2: 'Canadá', competition: 'Copa América', group_name: 'A', series: 'group', tournament: 'Copa América' },
                { date: '2024-06-21', time: '19:00', team1: 'Perú', team2: 'Chile', competition: 'Copa América', group_name: 'A', series: 'group', tournament: 'Copa América' },
                { date: '2024-06-22', time: '20:00', team1: 'México', team2: 'Jamaica', competition: 'Copa América', group_name: 'B', series: 'group', tournament: 'Copa América' },
                { date: '2024-06-22', time: '15:00', team1: 'Ecuador', team2: 'Venezuela', competition: 'Copa América', group_name: 'B', series: 'group', tournament: 'Copa América' },
                { date: '2024-06-23', time: '21:00', team1: 'Uruguay', team2: 'Panamá', competition: 'Copa América', group_name: 'C', series: 'group', tournament: 'Copa América' },
                { date: '2024-06-23', time: '18:00', team1: 'Estados Unidos', team2: 'Bolivia', competition: 'Copa América', group_name: 'C', series: 'group', tournament: 'Copa América' },
                { date: '2024-06-24', time: '17:00', team1: 'Colombia', team2: 'Paraguay', competition: 'Copa América', group_name: 'D', series: 'group', tournament: 'Copa América' },
                { date: '2024-06-24', time: '20:00', team1: 'Brasil', team2: 'Costa Rica', competition: 'Copa América', group_name: 'D', series: 'group', tournament: 'Copa América' },
                { date: '2024-06-25', time: '21:00', team1: 'Chile', team2: 'Argentina', competition: 'Copa América', group_name: 'A', series: 'group', tournament: 'Copa América' },
                { date: '2024-06-25', time: '17:00', team1: 'Perú', team2: 'Canadá', competition: 'Copa América', group_name: 'A', series: 'group', tournament: 'Copa América' },
                { date: '2024-06-26', time: '15:00', team1: 'Ecuador', team2: 'Jamaica', competition: 'Copa América', group_name: 'B', series: 'group', tournament: 'Copa América' },
                { date: '2024-06-26', time: '18:00', team1: 'Venezuela', team2: 'México', competition: 'Copa América', group_name: 'B', series: 'group', tournament: 'Copa América' },
                { date: '2024-06-27', time: '21:00', team1: 'Uruguay', team2: 'Bolivia', competition: 'Copa América', group_name: 'C', series: 'group', tournament: 'Copa América' },
                { date: '2024-06-27', time: '18:00', team1: 'Panamá', team2: 'Estados Unidos', competition: 'Copa América', group_name: 'C', series: 'group', tournament: 'Copa América' },
                { date: '2024-06-28', time: '17:00', team1: 'Colombia', team2: 'Costa Rica', competition: 'Copa América', group_name: 'D', series: 'group', tournament: 'Copa América' },
                { date: '2024-06-28', time: '20:00', team1: 'Paraguay', team2: 'Brasil', competition: 'Copa América', group_name: 'D', series: 'group', tournament: 'Copa América' },
                { date: '2024-06-29', time: '20:00', team1: 'Argentina', team2: 'Perú', competition: 'Copa América', group_name: 'A', series: 'group', tournament: 'Copa América' },
                { date: '2024-06-29', time: '18:00', team1: 'Canadá', team2: 'Chile', competition: 'Copa América', group_name: 'A', series: 'group', tournament: 'Copa América' },
                { date: '2024-06-30', time: '17:00', team1: 'Jamaica', team2: 'Venezuela', competition: 'Copa América', group_name: 'B', series: 'group', tournament: 'Copa América' },
                { date: '2024-06-30', time: '20:00', team1: 'México', team2: 'Ecuador', competition: 'Copa América', group_name: 'B', series: 'group', tournament: 'Copa América' },
                { date: '2024-07-01', time: '21:00', team1: 'Bolivia', team2: 'Panamá', competition: 'Copa América', group_name: 'C', series: 'group', tournament: 'Copa América' },
                { date: '2024-07-01', time: '18:00', team1: 'Estados Unidos', team2: 'Uruguay', competition: 'Copa América', group_name: 'C', series: 'group', tournament: 'Copa América' },
                { date: '2024-07-02', time: '17:00', team1: 'Costa Rica', team2: 'Paraguay', competition: 'Copa América', group_name: 'D', series: 'group', tournament: 'Copa América' },
                { date: '2024-07-02', time: '20:00', team1: 'Brasil', team2: 'Colombia', competition: 'Copa América', group_name: 'D', series: 'group', tournament: 'Copa América' },
                { date: '2024-07-04', time: '20:00', team1: '1A', team2: '2B', competition: 'Copa América', group_name: 'Cuartos de final', series: 'quarterfinal', tournament: 'Copa América' },
                { date: '2024-07-05', time: '20:00', team1: '1B', team2: '2A', competition: 'Copa América', group_name: 'Cuartos de final', series: 'quarterfinal', tournament: 'Copa América' },
                { date: '2024-07-06', time: '18:00', team1: '1C', team2: '2D', competition: 'Copa América', group_name: 'Cuartos de final', series: 'quarterfinal', tournament: 'Copa América' },
                { date: '2024-07-06', time: '15:00', team1: '1D', team2: '2C', competition: 'Copa América', group_name: 'Cuartos de final', series: 'quarterfinal', tournament: 'Copa América' },
                { date: '2024-07-09', time: '20:00', team1: 'G25', team2: 'G26', competition: 'Copa América', group_name: 'Semifinales', series: 'semifinal', tournament: 'Copa América' },
                { date: '2024-07-10', time: '20:00', team1: 'G27', team2: 'G28', competition: 'Copa América', group_name: 'Semifinales', series: 'semifinal', tournament: 'Copa América' },
                { date: '2024-07-13', time: '20:00', team1: 'P29', team2: 'P30', competition: 'Copa América', group_name: '3º Puesto', series: 'third place', tournament: 'Copa América' },
                { date: '2024-07-14', time: '20:00', team1: 'G29', team2: 'G30', competition: 'Copa América', group_name: 'Final', series: 'final', tournament: 'Copa América' }
            ];

            const stmt = db.prepare(`INSERT INTO matches (date, time, team1, team2, competition, group_name, series, tournament) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
            matches.forEach(match => {
                stmt.run([match.date, match.time, match.team1, match.team2, match.competition, match.group_name, match.series, match.tournament]);
            });
            stmt.finalize();
        }
    });

    // Crear usuario administrador por defecto
    const hashedPassword = bcrypt.hashSync('Penca2024Ren', 10);
    db.run(`INSERT INTO users (username, password, email, isAdmin) VALUES (?, ?, ?, ?)`, ['admin', hashedPassword, 'admin@penca.com', 1], (err) => {
        if (err && err.code !== 'SQLITE_CONSTRAINT') {
            console.error('Error creating admin user:', err.message);
        }
    });
});

module.exports = db;
