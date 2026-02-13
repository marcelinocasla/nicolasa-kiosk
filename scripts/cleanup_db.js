const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function cleanup() {
    console.log('Starting cleanup...');

    // 1. Clear Order History
    const { error: deleteOrdersError } = await supabase
        .from('orders')
        .delete()
        .neq('id', 0); // Delete all where ID is not 0 (effectively all)

    if (deleteOrdersError) console.error('Error deleting orders:', deleteOrdersError);
    else console.log('✅ Order history cleared.');

    // 2. Remove Blank Products
    // Fetch all products first to filter manually if needed, or use careful filters
    const { data: products, error: fetchError } = await supabase
        .from('products')
        .select('*');

    if (fetchError) {
        console.error('Error fetching products:', fetchError);
        return;
    }

    const blankProducts = products.filter(p => !p.name || p.name.trim() === '' || !p.category || p.category.trim() === '');

    if (blankProducts.length > 0) {
        console.log(`Found ${blankProducts.length} blank products. Deleting...`);
        const idsToDelete = blankProducts.map(p => p.id);

        const { error: deleteProdError } = await supabase
            .from('products')
            .delete()
            .in('id', idsToDelete);

        if (deleteProdError) console.error('Error deleting blank products:', deleteProdError);
        else console.log('✅ Blank products deleted.');
    } else {
        console.log('No blank products found.');
    }
}

cleanup();
