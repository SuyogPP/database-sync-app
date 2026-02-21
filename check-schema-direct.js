
const mssql = require('mssql');
require('dotenv').config({ path: '.env.local' });

async function checkSchema() {
    const config = {
        server: process.env.SQL_SERVER,
        database: process.env.SQL_DATABASE,
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        options: {
            encrypt: true,
            trustServerCertificate: true,
        },
    };

    const connectionString = process.env.SQL_SERVER_CONNECTION_STRING;

    try {
        console.log('Connecting to SQL Server...');
        const pool = await mssql.connect(connectionString || config);
        console.log('Connected.');

        const result = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'UserMaster'
        `);

        console.log('UserMaster Schema:');
        console.table(result.recordset);

        await pool.close();
    } catch (err) {
        console.error('Error checking schema:', err);
    }
}

checkSchema();
