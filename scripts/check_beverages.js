require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkBeverages() {
    const { data, error } = await supabase
        .from('products')
        .select('name, price')
        .eq('category', 'Bebidas');

    if (error) {
        console.error(error);
    } else {
        console.log('Beverages found:', data.length);
        data.forEach(b => console.log(`${b.name}: $${b.price}`));
    }
}

checkBeverages();
