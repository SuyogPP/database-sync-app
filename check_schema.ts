
import { executeQuery } from './lib/db';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
    try {
        // Use env vars defined in .env.local by passing undefined config
        const result = await executeQuery(
            "SELECT COLUMN_NAME, DATA_TYPE, ORDINAL_POSITION FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'UserMaster' ORDER BY ORDINAL_POSITION",
            {}
        );
        console.table(result);
    } catch (err) {
        console.error(err);
    }
}

main();
