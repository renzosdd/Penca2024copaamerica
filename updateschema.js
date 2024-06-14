const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

const uri = "mongodb+srv://admindbpenca:AdminDbPenca2024Ren@pencacopaamerica2024.yispiqt.mongodb.net/?retryWrites=true&w=majority&appName=PencaCopaAmerica2024";

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function createSchema() {
    try {
        await client.connect();
        const db = client.db('penca_copa_america');
        
        const usersCollection = db.collection('users');
        await usersCollection.createIndex({ username: 1 }, { unique: true });

        const adminUser = await usersCollection.findOne({ username: 'admin' });
        if (!adminUser) {
            const hashedPassword = await bcrypt.hash('Penca2024Ren', 10);
            await usersCollection.insertOne({ username: 'admin', password: hashedPassword, role: 'admin' });
            console.log('Admin user created');
        }

        console.log("Schema created successfully");
    } catch (error) {
        console.error("Error creating schema:", error);
    } finally {
        await client.close();
    }
}

createSchema();
