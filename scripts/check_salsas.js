require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkSalsas() {
    const { data, error } = await supabase
        .from('products')
        .select('name, price')
        .eq('category', 'Salsas');

    if (error) {
        console.error(error);
    } else {
        console.log('Salsas found:', data.length);
        data.forEach(b => console.log(`${b.name}: $${b.price}`));
    }
}

checkSalsas();
