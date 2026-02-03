import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req) {
    try {
        const products = await req.json();

        // Upsert all products (if ID exists update, else insert)
        const { error } = await supabase
            .from('products')
            .upsert(products);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
