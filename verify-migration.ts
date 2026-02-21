import { testSyncHistoryLogging, debugUserTypeSchema } from './app/modules/vms-plus-user-sync/db/tests';
import { getVMSConfig } from './app/modules/vms-plus-user-sync/db/utils';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function main() {
    console.log("Starting verification...");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error("Missing Supabase environment variables.");
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        console.log("Fetching VMS Config...");
        const config = await getVMSConfig(supabase);
        console.log("Config fetched successfully.");

        console.log("\n--- Debugging UserType Schema ---");
        const schemaResult = await debugUserTypeSchema(config);
        console.log(JSON.stringify(schemaResult, null, 2));

        console.log("\n--- Testing Sync History Logging ---");
        const syncResult = await testSyncHistoryLogging(config, supabase);
        console.log(JSON.stringify(syncResult, null, 2));

        if (schemaResult.passed && syncResult.passed) {
            console.log("\nVERIFICATION SUCCESS");
            process.exit(0);
        } else {
            console.error("\nVERIFICATION FAILED");
            process.exit(1);
        }
    } catch (error: any) {
        console.error("Script error:", error);
        process.exit(1);
    }
}

main();
