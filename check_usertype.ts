
import { executeQuery } from './lib/db';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
    try {
        const result = await executeQuery(
            "SELECT DISTINCT UserType FROM UserMaster",
            {}
        );
        console.table(result);
    } catch (err) {
        console.error(err);
    }
}

main();
