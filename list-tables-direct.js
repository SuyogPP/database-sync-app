
const { executeQuery } = require('./lib/db');
require('dotenv').config({ path: '.env.local' });

async function main() {
    try {
        const result = await executeQuery("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'", {});
        console.log('Tables in database:');
        console.table(result);

        const columns = await executeQuery(`
            SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'UserMaster'
        `, {});
        console.log('UserMaster Columns:');
        console.table(columns);
    } catch (e) {
        console.error('Error:', e);
    }
}

main();
