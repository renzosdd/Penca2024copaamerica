const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://admindbpenca:AdminDbPenca2024Ren@pencacopaamerica2024.yispiqt.mongodb.net/?retryWrites=true&w=majority&appName=PencaCopaAmerica2024';
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function initializeDatabase() {
    try {
        await client.connect();
        const db = client.db('penca_copa_america');
        const matchesCollection = db.collection('matches');

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
            { date: '2024-07-02', time: '20:00', team1: 'Brasil', team2: 'Colombia', competition: 'Copa América', group_name: 'D', series: 'group', tournament: 'Copa América' }
        ];

        await matchesCollection.insertMany(matches);
        console.log('Matches inserted');
    } catch (err) {
        console.error('Error initializing database:', err.message);
    } finally {
        await client.close();
    }
}

initializeDatabase();
