require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // Or SERVICE_ROLE_KEY if needed for RLS, but ANON might work if policies allow

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

    // 1. Delete existing beverages (optional, but cleaner to ensure no duplicates if names changed)
    // Or we can upsert. Let's try upserting based on name? No, names might have changed.
    // Safest for "resetting" the list is to delete all 'Bebidas' and re-insert.
    // BUT be careful if there are other beverages not in this list. 
    // User said "modify the list of beverages", implying this IS the list.

    const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .eq('category', 'Bebidas');

    if (deleteError) {
        console.error('Error clearing old beverages:', deleteError);
        return;
    }
    console.log('Cleared old beverages.');

    // 2. Insert new beverages
    const { data, error: insertError } = await supabase
        .from('products')
        .insert(beverages)
        .select();

    if (insertError) {
        console.error('Error inserting beverages:', insertError);
    } else {
        console.log(`Successfully added ${data.length} beverages.`);
    }
}

updateBeverages();
