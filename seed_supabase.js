require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Error: Credenciales de Supabase no encontradas en .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function seed() {
    console.log('--- Iniciando Sincronización con Supabase ---');

    // 1. Cargar y subir Productos
    try {
        const productsPath = path.join(__dirname, 'src', 'data', 'products.json');
        const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));

        // Formatear IDs para que sean números (Supabase bigint)
        const formattedProducts = products.map(p => ({
            ...p,
            id: parseInt(p.id)
        }));

        console.log(`Subiendo ${formattedProducts.length} productos...`);
        const { error: pError } = await supabase.from('products').upsert(formattedProducts);
        if (pError) throw pError;
        console.log('✅ Productos subidos correctamente.');
    } catch (err) {
        console.error('❌ Error subiendo productos:', err.message);
    }

    // 2. Cargar y subir Configuración
    try {
        const settingsPath = path.join(__dirname, 'src', 'data', 'settings.json');
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

        const dbSettings = {
            id: 1,
            app_name: settings.appName,
            whatsapp_number: settings.whatsappNumber,
            delivery_enabled: settings.deliveryEnabled,
            eat_in_enabled: settings.eatInEnabled,
            total_orders: settings.totalOrders,
            total_revenue: settings.totalRevenue
        };

        console.log('Subiendo configuración...');
        const { error: sError } = await supabase.from('settings').upsert(dbSettings);
        if (sError) throw sError;
        console.log('✅ Configuración subida correctamente.');
    } catch (err) {
        console.error('❌ Error subiendo configuración:', err.message);
    }

    console.log('--- Sincronización Finalizada ---');
}

seed();
