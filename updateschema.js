const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');

dotenv.config();

const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error('MONGODB_URI environment variable not provided. Exiting...');
    process.exit(1);
}

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function createSchema() {
    try {
        await client.connect();
        const db = client.db('penca_copa_america');
        
        const usersCollection = db.collection('users');
        await usersCollection.createIndex({ username: 1 }, { unique: true });

        const adminUsername = process.env.DEFAULT_ADMIN_USERNAME;
        const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD;
        if (!adminUsername || !adminPassword) {
            console.error('DEFAULT_ADMIN_USERNAME and DEFAULT_ADMIN_PASSWORD environment variables are required');
            process.exit(1);
        }

        const adminUser = await usersCollection.findOne({ username: adminUsername });
        if (!adminUser) {
            const hashedPassword = await bcrypt.hash(adminPassword, 10);
            await usersCollection.insertOne({ username: adminUsername, password: hashedPassword, role: 'admin' });
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
