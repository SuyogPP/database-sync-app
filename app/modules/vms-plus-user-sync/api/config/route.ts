import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const MODULE_ID = 'vms-plus-user-sync';

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('module_configs')
            .select('config')
            .eq('module_id', MODULE_ID)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows found"
            throw error;
        }

        return NextResponse.json({ config: data?.config || {} }, { status: 200 });
    } catch (error) {
        console.error('[v0] Config GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch configuration' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { config } = body;

        const supabase = await createClient();
        const { error } = await supabase
            .from('module_configs')
            .upsert({
                module_id: MODULE_ID,
                config,
                updated_at: new Date().toISOString(),
            });

        if (error) {
            throw error;
        }

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error('[v0] Config POST error:', error);
        return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 });
    }
}
