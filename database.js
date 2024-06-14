const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://admindbpenca:AdminDbPenca2024Ren@pencacopaamerica2024.yispiqt.mongodb.net/?retryWrites=true&w=majority&appName=PencaCopaAmerica2024';
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function connectToDatabase() {
    if (!client.isConnected()) await client.connect();
    const db = client.db('penca_copa_america');

    await db.collection('matches').createIndex({ series: 1, date: 1 });
    await db.collection('users').createIndex({ username: 1 }, { unique: true });

    return db;
}

module.exports = connectToDatabase;
