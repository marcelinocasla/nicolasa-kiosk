const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) { throw new Error('Missing Supabase env vars'); }
const supabase = createClient(supabaseUrl, supabaseKey);

const downloadsDir = 'C:\\Users\\BRUNO-PC\\Downloads\\Ingredientes';
const publicDir = path.join(__dirname, '../public/Ingredientes');

if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
}

// Map from "archivo-sin-extensión" (lowercase) to "Nombre en Base de Datos"
const nameMap = {
    'arroz clasico': 'Arroz Clásico',
    'ensalada de papas': 'Ensalada de papa',
    'espaguetti': 'Espaguetti Clásico',
    'milanesa de carne a caballa': 'Milanesa a caballo de carne',
    'milanesa de pollo a caballa': 'Milanesa a caballo de pollo',
    'papas españolas': 'Papas Española',
    'salsa mexicana': 'Salsa Méxicana'
};

async function run() {
    const { data: products, error } = await supabase.from('products').select('*');
    if (error) {
        console.error('Error fetching products:', error);
        return;
    }

    const files = fs.readdirSync(downloadsDir);
    let matchedCount = 0;
    let failedCount = 0;

    for (const file of files) {
        if (!file.toLowerCase().endsWith('.jpg') && !file.toLowerCase().endsWith('.png') && !file.toLowerCase().endsWith('.jpeg')) continue;

        const fileNameWithoutExt = path.parse(file).name;

        // Product matching: Case insensitive or mapped alias
        const targetName = nameMap[fileNameWithoutExt.toLowerCase()] || fileNameWithoutExt;

        const matchedProduct = products.find(p => p.name.toLowerCase() === targetName.toLowerCase() || p.name === targetName);

        if (matchedProduct) {
            // Copy file to public/Ingredientes
            const srcPath = path.join(downloadsDir, file);
            const destPath = path.join(publicDir, file);
            fs.copyFileSync(srcPath, destPath);

            const imageUrl = `/Ingredientes/${encodeURIComponent(file)}`;
            const { error: updateError } = await supabase
                .from('products')
                .update({ image: imageUrl })
                .eq('id', matchedProduct.id);

            if (updateError) {
                console.error(`Error updating "${matchedProduct.name}":`, updateError.message);
                failedCount++;
            } else {
                console.log(`✅ Updated "${matchedProduct.name}" with image ${imageUrl}`);
                matchedCount++;
            }
        } else {
            console.log(`⚠️ No product found matching filename: "${fileNameWithoutExt}" (Searched for: "${targetName}")`);
            failedCount++;
        }
    }

    console.log(`Finished mapping ${matchedCount} images. Failed: ${failedCount}`);
}

run();
