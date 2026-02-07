import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req) {
    try {
        const body = await req.json();

        // Map camelCase to snake_case for DB
        const dbSettings = {
            app_name: body.appName,
            whatsapp_number: body.whatsappNumber,
            delivery_enabled: body.deliveryEnabled,
            eat_in_enabled: body.eatInEnabled,
            category_order: body.categoryOrder,
            // Don't overwrite totals if not provided, or handle logic elsewhere.
            // Assuming this endpoint sends full object, but be careful.
            // Better to only update what's passed if we used PATCH, but POST is fine for now.
        };

        const { error } = await supabase
            .from('settings')
            .update(dbSettings)
            .eq('id', 1);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
