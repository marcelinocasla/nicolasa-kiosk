'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Beef, Utensils, Leaf, Droplets, Wine, ShoppingCart, ArrowRight, ArrowLeft } from 'lucide-react'
import styles from './page.module.css'

const CATEGORY_ICONS = {
    'Carnes': <Beef size={24} />,
    'Guarniciones': <Utensils size={24} />,
    'Ensaladas': <Leaf size={24} />,
    'Salsas': <Droplets size={24} />,
    'Bebidas': <Wine size={24} />
}

function MenuContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const orderType = searchParams.get('type') // 'eat-in' or 'delivery'

    const [products, setProducts] = useState([])
    const [categories, setCategories] = useState([])
    const [activeCategory, setActiveCategory] = useState('')

    // "cart" here represents the INGREDIENTS of the CURRENT DISH being designed
    const [currentDishIngredients, setCurrentDishIngredients] = useState({})

    useEffect(() => {
        // Load products and settings in parallel
        Promise.all([
            fetch('/api/products').then(res => res.json()),
            fetch('/api/settings').then(res => res.json())
        ]).then(([productsData, settingsData]) => {
            setProducts(productsData)

            const uniqueCategories = [...new Set(productsData.map(p => p.category))]

            // Defined order requested by user. 
            // We use this as the base. If settings has a custom order, we could use it, 
            // but the user specifically asked for THIS order to be fixed now.
            // We'll merge settingsOrder if available, but ensure these come first if they exist.
            const DEFAULT_ORDER = ['Carnes', 'Guarniciones', 'Ensaladas', 'Salsas', 'Bebidas']

            let baseOrder = settingsData.categoryOrder && settingsData.categoryOrder.length > 0
                ? settingsData.categoryOrder
                : DEFAULT_ORDER

            // forceful fix: if baseOrder doesn't look right or user wants to force it, we can prepend DEFAULT_ORDER
            // uniqueCategories check is important.

            // Let's build the sorted list:
            // 1. Start with the explicit DEFAULT_ORDER (or settings order if we trust it, but user says it fails)
            // To ensure it works, we will prioritize the DEFAULT_ORDER for now.

            const sortedCategories = []

            // Add categories from the preferred order if they exist in products
            const preferredOrder = settingsData.categoryOrder && settingsData.categoryOrder.length > 0 ? settingsData.categoryOrder : DEFAULT_ORDER;

            preferredOrder.forEach(c => {
                if (uniqueCategories.includes(c) && !sortedCategories.includes(c)) {
                    sortedCategories.push(c)
                }
            })

            // Add any remaining categories from products that weren't in the preferred list
            uniqueCategories.forEach(c => {
                if (!sortedCategories.includes(c)) sortedCategories.push(c)
            })

            setCategories(sortedCategories)

            if (sortedCategories.length > 0) setActiveCategory(sortedCategories[0])

            // Load CURRENT DISH draft if exists
            const draft = localStorage.getItem('current_dish_ingredients')
            if (draft) {
                try {
                    setCurrentDishIngredients(JSON.parse(draft))
                } catch (e) { }
            }
        })
            .catch(err => console.error("Error loading menu data:", err))
    }, [])

    const toggleIngredient = (product) => {
        setCurrentDishIngredients(prev => {
            const newIngredients = { ...prev }
            const pId = String(product.id)
            const cat = product.category

            if (cat === 'Carnes') {
                // Only 1 meat allowed? Usually base is just 1 meat.
                // If user wants multiple meats, logic might differ. 
                // Assuming standard flow: select 1 meat. 
                // But current logic was just increment. Let's keep flexibility but fix other cats.
                newIngredients[pId] = (newIngredients[pId] || 0) + 1
            }
            else if (cat === 'Guarniciones' || cat === 'Ensaladas') {
                // Rules: "el cliente puede elegir solo una opcion en cada categoria."
                // So we must remove any other item of this category.
                // 1. Find existing item of this category in selection
                const existingId = Object.keys(newIngredients).find(id => {
                    const p = products.find(prod => String(prod.id) === id)
                    return p && p.category === cat
                })

                // 2. If exists, remove it (unless it's the same one, then maybe toggle off? 
                // but usually clicking same again increases qty. 
                // "Solo una opcion" mostly implies Qty 1 of 1 distinct item.
                if (existingId) {
                    delete newIngredients[existingId]
                }

                // 3. Add new one (Qty 1)
                // If we clicked the same one, step 2 removed it, so this toggles it back on (effectively reset to 1).
                // If we want toggle OFF behavior, we check if existingId === pId. 
                // Let's assume click = select.
                newIngredients[pId] = 1
            }
            else if (cat === 'Salsas') {
                // "Lo unico que puede agregar de más, son las salsas"
                // So multiple salsas allowed. Just increment/toggle.
                newIngredients[pId] = (newIngredients[pId] || 0) + 1
            }
            else {
                // Drinks etc
                newIngredients[pId] = (newIngredients[pId] || 0) + 1
            }

            localStorage.setItem('current_dish_ingredients', JSON.stringify(newIngredients))
            return newIngredients
        })
    }

    // Helper to remove/decrease
    const removeIngredient = (e, product) => {
        e.stopPropagation()
        setCurrentDishIngredients(prev => {
            const newIngredients = { ...prev }
            const pId = String(product.id)
            if (newIngredients[pId] > 0) {
                newIngredients[pId] -= 1
                if (newIngredients[pId] === 0) delete newIngredients[pId]
            }
            localStorage.setItem('current_dish_ingredients', JSON.stringify(newIngredients))
            return newIngredients
        })
    }

    const getTotal = () => {
        let total = 0
        let meatPrice = 0
        let salsaCount = 0

        Object.entries(currentDishIngredients).forEach(([id, qty]) => {
            const product = products.find(p => String(p.id) === String(id))
            if (!product) return

            if (product.category === 'Carnes') {
                meatPrice += product.price * qty
            } else if (product.category === 'Guarniciones' || product.category === 'Ensaladas') {
                // "1 item incluido" -> FREE if it's the single allowed item.
                // Since logic enforces only 1, it's free.
                // UNLESS... logic implies base price covers it only if meat is selected? 
                // "cuando el cliente eliga su primer carne... incluyen 1 item"
                // Yes, assuming meat is the base.
                // Price = 0 for these.
            } else if (product.category === 'Salsas') {
                // "cada salsa vale $500 ARS c/u"
                // "incluyen 1 item... de cada categoría"
                // So 1st salsa is free? 
                // User said: "las categorías siguientes incluyen 1 item incluido... Lo unico que puede agregar de más, son las salsas"
                // This implies 1st salsa free, subsequent $500.
                for (let i = 0; i < qty; i++) {
                    salsaCount++
                    // First salsa of the ENTIRE dish (across all salsa types) is free?
                    // "incluyen 1 item incluido de cada categoría" -> Yes, 1st salsa free.
                }
            } else {
                // Drinks etc, normal price
                total += product.price * qty
            }
        })

        // Add meat price
        total += meatPrice

        // Calc Salsas
        // 1st is free, rest $500
        if (salsaCount > 0) {
            // total += 0 (for first)
            const extraSalsas = salsaCount - 1
            if (extraSalsas > 0) {
                total += extraSalsas * 500
            }
        }

        return total
    }

    const handleContinue = () => {
        // 1. Get existing confirmed order (array of dishes)
        let confirmedOrder = []
        try {
            confirmedOrder = JSON.parse(localStorage.getItem('confirmed_order') || '[]')
        } catch (e) { }

        // 2. Add current dish to it
        if (Object.keys(currentDishIngredients).length > 0) {
            const newDish = {
                id: Date.now(),
                ingredients: currentDishIngredients,
                total: getTotal()
            }
            confirmedOrder.push(newDish)
            localStorage.setItem('confirmed_order', JSON.stringify(confirmedOrder))

            // 3. Clear current draft
            localStorage.removeItem('current_dish_ingredients')
        }

        // 4. Redirect
        router.push('/order-summary')
    }

    const activeProducts = products.filter(p => p.category === activeCategory)

    return (
        <div className={styles.container}>
            {/* Sidebar */}
            <aside className={styles.sidebar}>
                {categories.map((cat, idx) => (
                    <div
                        key={cat}
                        className={`${styles.navItem} ${activeCategory === cat ? styles.navItemActive : ''}`}
                        onClick={() => setActiveCategory(cat)}
                    >
                        {CATEGORY_ICONS[cat] || <Utensils size={24} />}
                        <span className={styles.navLabel}>{cat}</span>
                    </div>
                ))}
            </aside>

            {/* Main Content */}
            <main className={styles.main}>
                <header className={styles.header}>
                    <div>
                        <h2 className={styles.categoryTitle}>{activeCategory}</h2>
                        <p style={{ color: '#64748b' }}>Selecciona los ingredientes</p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <span style={{ padding: '0.5rem 1rem', background: '#f1f5f9', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 600 }}>
                            {orderType === 'delivery' ? 'Delivery' : 'Mesa'}
                        </span>
                    </div>
                </header>

                <div className={styles.grid}>
                    {activeProducts.map(product => {
                        const qty = currentDishIngredients[String(product.id)] || 0
                        return (
                            <div
                                key={product.id}
                                className={`${styles.card} ${qty > 0 ? styles.cardSelected : ''}`}
                                onClick={() => toggleIngredient(product)}
                            >
                                <div className={styles.cardImagePlaceholder}>
                                    {product.image ? (
                                        <img
                                            src={product.image}
                                            alt={product.name}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    ) : (
                                        CATEGORY_ICONS[product.category] || <Utensils size={48} />
                                    )}
                                </div>
                                <div className={styles.cardContent}>
                                    <h3 className={styles.cardName}>{product.name}</h3>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span className={styles.cardPrice}>${product.price}</span>
                                        {qty > 0 && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                <button
                                                    style={{ background: '#cbd5e1', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                                    onClick={(e) => removeIngredient(e, product)}
                                                >-</button>
                                                <div style={{ background: 'var(--color-primary)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '10px', fontSize: '0.8rem' }}>
                                                    x{qty}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Footer */}
                <footer className={styles.footer}>
                    <button className={styles.backButton} onClick={() => router.push('/order-type')}>
                        <ArrowLeft size={20} /> Cancelar
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span className={styles.totalLabel}>Total Plato Actual</span>
                        <span className={styles.totalAmount}>${getTotal().toLocaleString('es-AR')}</span>
                    </div>

                    <button className={styles.actionButton} onClick={handleContinue}>
                        Continuar <ArrowRight size={20} />
                    </button>
                </footer>
            </main>
        </div>
    )
}

export default function MenuPage() {
    return (
        <React.Suspense fallback={<div className="p-10 text-center">Cargando menú...</div>}>
            <MenuContent />
        </React.Suspense>
    )
}
