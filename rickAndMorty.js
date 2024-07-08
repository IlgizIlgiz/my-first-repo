const https = require('https');
const { Client } = require('pg');

const client = new Client({
    user: 'user_name',
    host: 'localhost',
    database: 'test',
    password: 'password',
    port: 5432,
});

async function setupTable() {
    const dropQuery = `DROP TABLE IF EXISTS ilgizilgiz;`;
    const createQuery = `
        CREATE TABLE ilgizilgiz (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            data JSONB NOT NULL
        );
    `;
    const grantQuery = `GRANT ALL PRIVILEGES ON TABLE ilgizilgiz TO user_name;`;

    try {
        await client.connect();
        await client.query(dropQuery);
        await client.query(createQuery);
        await client.query(grantQuery);
        console.log('Table setup successfully with all privileges granted.');
    } catch (err) {
        console.error('Error setting up table:', err.stack);
    }
}

async function fetchAndInsertCharacters(url) {
    https.get(url, (res) => {
        let data = '';

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', async () => {
            const response = JSON.parse(data);
            const characters = response.results;

            for (let char of characters) {
                try {
                    const insertText = 'INSERT INTO ilgizilgiz(name, data) VALUES($1, $2)';
                    await client.query(insertText, [char.name, char]);
                    console.log(`Inserted: ${char.name}`);
                } catch (err) {
                    console.error('Error inserting data:', err.stack);
                }
            }

            // Проверяем наличие следующей страницы и рекурсивно вызываем эту же функцию
            if (response.info.next) {
                await fetchAndInsertCharacters(response.info.next);
            } else {
                await client.end();
                console.log('Finished inserting all data');
            }
        });
    }).on('error', (err) => {
        console.error('Error fetching characters:', err.message);
    });
}

async function main() {
    await setupTable();
    await fetchAndInsertCharacters('https://rickandmortyapi.com/api/character');
}

main();
