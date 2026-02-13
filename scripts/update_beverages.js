require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const beverages = [
    { name: 'Coca Cola 2.5L', price: 8000, category: 'Bebidas', available: true },
    { name: 'Sprite 2.5L', price: 8000, category: 'Bebidas', available: true },
    { name: 'Fanta 2.5L', price: 8000, category: 'Bebidas', available: true },
    { name: 'Pepsi 2.5L', price: 6500, category: 'Bebidas', available: true },
    { name: '7Up 2.5L', price: 6500, category: 'Bebidas', available: true },
    { name: 'Mirinda 2.5L', price: 6500, category: 'Bebidas', available: true },
    { name: 'Salvieti 2.5L', price: 6500, category: 'Bebidas', available: true },
    { name: 'Oriental 2.5L', price: 6500, category: 'Bebidas', available: true },
    { name: 'Coca Cola 1.5L', price: 5000, category: 'Bebidas', available: true },
    { name: 'Sprite 1.5L', price: 5000, category: 'Bebidas', available: true },
    { name: 'Fanta 1.5L', price: 5000, category: 'Bebidas', available: true },
    { name: 'Placer 1.5L', price: 3000, category: 'Bebidas', available: true },
    { name: 'Agua 2.5L', price: 2500, category: 'Bebidas', available: true },
    { name: 'Gaseosa Chica (500ml)', price: 3000, category: 'Bebidas', available: true },
    { name: 'Gaseosa Lata', price: 2500, category: 'Bebidas', available: true },
    { name: 'Jarra Jugo Pepe', price: 5000, category: 'Bebidas', available: true },
    { name: 'Jarra Limonada', price: 5000, category: 'Bebidas', available: true },
    { name: 'Vaso Jugo', price: 2000, category: 'Bebidas', available: true },
    { name: 'Cerveza Brahma (Botella)', price: 6000, category: 'Bebidas', available: true },
    { name: 'Cerveza Quilmes Negra (Botella)', price: 7000, category: 'Bebidas', available: true },
    { name: 'Cerveza Stella (Botella)', price: 7000, category: 'Bebidas', available: true },
    { name: 'Cerveza Brahma (Lata)', price: 3500, category: 'Bebidas', available: true },
];

async function updateBeverages() {
    console.log('Starting beverage update...');

    // 1. Delete existing beverages
    const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .eq('category', 'Bebidas');

    if (deleteError) {
        console.error('Error clearing old beverages:', deleteError);
        return;
    }
    console.log('Cleared old beverages.');

    // 2. Insert new beverages WITH IDs
    const timestamp = Date.now();
    const beveragesWithIds = beverages.map((b, index) => ({
        ...b,
        id: timestamp + index // Generate unique ID
    }));

    const { data, error: insertError } = await supabase
        .from('products')
        .insert(beveragesWithIds)
        .select();

    if (insertError) {
        console.error('Error inserting beverages:', insertError);
    } else {
        console.log(`Successfully added ${data.length} beverages.`);
    }
}

updateBeverages();
