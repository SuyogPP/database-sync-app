
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

async function main() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data, error } = await supabase.from('module_configs').select('*');
    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Module Configs:');
    console.table(data);
}

main();
