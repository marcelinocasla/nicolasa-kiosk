import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .order('name');

        if (error) throw error;

        return NextResponse.json(products);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
