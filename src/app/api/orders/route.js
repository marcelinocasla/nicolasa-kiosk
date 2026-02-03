import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic'

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status');

        let query = supabase.from('orders').select('*').order('created_at', { ascending: false });

        if (status) {
            query = query.eq('status', status);
        }

        const { data: orders, error } = await query;
        if (error) throw error;

        return NextResponse.json(orders);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const order = await req.json();

        // order should contain: { items: [...], total, customerName, orderType }
        // Ensure status is pending
        const newOrder = {
            ...order,
            status: 'pending',
            created_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('orders')
            .insert(newOrder)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(req) {
    try {
        const body = await req.json();
        const { id, ...updates } = body;

        if (!id) throw new Error('Order ID required');

        const { data, error } = await supabase
            .from('orders')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
