import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const { data: settings, error } = await supabase
            .from('settings')
            .select('*')
            .eq('id', 1)
            .single();

        if (error) throw error;

        // Transform casing if needed to match frontend expectations (snake_case -> camelCase)
        // Or adjust frontend. Let's adjust response to camelCase here for compatibility.
        // DB: delivery_enabled, eat_in_enabled
        // App: deliveryEnabled, eatInEnabled

        const safeSettings = {
            id: settings.id,
            appName: settings.app_name,
            whatsappNumber: settings.whatsapp_number,
            deliveryEnabled: settings.delivery_enabled,
            eatInEnabled: settings.eat_in_enabled,
            totalOrders: settings.total_orders,
            totalRevenue: settings.total_revenue
        };

        return NextResponse.json(safeSettings);
    } catch (error) {
        // If row doesn't exist, return defaults or error
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
