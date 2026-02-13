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
        // Load products and settings
        Promise.all([
            fetch('/api/products').then(res => res.json()),
            fetch('/api/settings').then(res => res.json())
        ]).then(([productsData, settingsData]) => {
            // Inject "Sin bebida" mock product if not exists
            const noDrinkProduct = { id: 'no-drink', name: 'Sin bebida', price: 0, category: 'Bebidas', image: null }
            // Check if it exists? Usually DB doesn't have it. We prepend or append.
            // Let's append it to products list so it shows up in Bebidas category.
            // Actually, best to prepend so it's first? Or user wants it "default selected".

            const allProducts = [...productsData, noDrinkProduct]
            setProducts(allProducts)

            const uniqueCategories = [...new Set(productsData.map(p => p.category))]
            // Make sure Bebidas is in there if only 'Sin bebida' exists (edge case)
            if (!uniqueCategories.includes('Bebidas')) uniqueCategories.push('Bebidas')

            const DEFAULT_ORDER = ['Carnes', 'Guarniciones', 'Ensaladas', 'Salsas', 'Bebidas']

            // ... (sorting logic roughly same, simplified for brevity in thought, but must keep existing correctly)
            // Re-implementing simplified sort based on existing code structure
            const sortedCategories = []
            const preferredOrder = settingsData.categoryOrder && settingsData.categoryOrder.length > 0 ? settingsData.categoryOrder : DEFAULT_ORDER;

            preferredOrder.forEach(c => {
                if (uniqueCategories.includes(c) && !sortedCategories.includes(c)) sortedCategories.push(c)
            })
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
            } else {
                // Default "Sin bebida" selection if no draft
                // Actually, ensure "Sin bebida" is selected whenever we don't have a drink?
                // Or just initialize it.
                setCurrentDishIngredients(prev => ({ ...prev, 'no-drink': 1 }))
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
                // "en la categoria de carnes, solo pueda elegirse una sola"
                // Deselect other meats
                Object.keys(newIngredients).forEach(id => {
                    const p = products.find(prod => String(prod.id) === id)
                    if (p && p.category === 'Carnes') delete newIngredients[id]
                })
                newIngredients[pId] = 1
            }
            else if (cat === 'Guarniciones' || cat === 'Ensaladas') {
                const existingId = Object.keys(newIngredients).find(id => {
                    const p = products.find(prod => String(prod.id) === id)
                    return p && p.category === cat
                })
                if (existingId) delete newIngredients[existingId]
                newIngredients[pId] = 1
            }
            else if (cat === 'Salsas') {
                newIngredients[pId] = (newIngredients[pId] || 0) + 1
            }
            else if (cat === 'Bebidas') {
                if (pId === 'no-drink') {
                    // Selected "Sin bebida" -> Remove all other drinks
                    Object.keys(newIngredients).forEach(id => {
                        const p = products.find(prod => String(prod.id) === id)
                        if (p && p.category === 'Bebidas') delete newIngredients[id]
                    })
                    newIngredients['no-drink'] = 1
                } else {
                    // Selected a real drink -> Remove "Sin bebida"
                    if (newIngredients['no-drink']) delete newIngredients['no-drink']
                    newIngredients[pId] = (newIngredients[pId] || 0) + 1
                }
            }
            else {
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

                // If removing the last drink, maybe re-select "Sin bebida"? 
                // "Bebidas agrega la opción de Sin bebida (seleccionado por defecto)"
                // If user removes their Coke, shoudl we default back to "Sin bebida"?
                // Let's say yes for good UX.
                if (product.category === 'Bebidas' && pId !== 'no-drink') {
                    const hasOtherDrinks = Object.keys(newIngredients).some(id => {
                        const p = products.find(prod => String(prod.id) === id)
                        return p && p.category === 'Bebidas'
                    })
                    if (!hasOtherDrinks) {
                        newIngredients['no-drink'] = 1
                    }
                }
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
                // Free
            } else if (product.category === 'Salsas') {
                for (let i = 0; i < qty; i++) {
                    salsaCount++
                }
            } else if (product.category === 'Bebidas') {
                // "Sin bebida" is price 0, so safe.
                total += product.price * qty
            } else {
                total += product.price * qty
            }
        })

        total += meatPrice

        if (salsaCount > 0) {
            const extraSalsas = salsaCount - 1
            if (extraSalsas > 0) {
                total += extraSalsas * 500
            }
        }

        return total
    }

    const handleContinue = () => {
        // Find current category index
        const currentIndex = categories.indexOf(activeCategory)

        // If there is a next category, go there
        if (currentIndex < categories.length - 1) {
            setActiveCategory(categories[currentIndex + 1])
            window.scrollTo({ top: 0, behavior: 'smooth' })
        } else {
            // Last category (Bebidas? or whatever is last). Finish.

            // 1. Get existing confirmed order (array of dishes)
            let confirmedOrder = []
            try {
                confirmedOrder = JSON.parse(localStorage.getItem('confirmed_order') || '[]')
            } catch (e) { }

            // 2. Add current dish to it
            // Filter out "no-drink" from ingredients passed to summary? 
            // Or keep it so summary says "Sin bebida"?
            // User probably wants to see "Sin bebida" in summary if that's what they picked.

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
                                        {['Guarniciones', 'Ensaladas'].includes(product.category) ? (
                                            <span className={styles.cardPrice} style={{ fontSize: '0.9rem', color: '#10b981' }}>Incluido</span>
                                        ) : (
                                            product.category === 'Salsas' ? (
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    {(() => {
                                                        const totalSalsas = products
                                                            .filter(p => p.category === 'Salsas')
                                                            .reduce((acc, p) => acc + (currentDishIngredients[String(p.id)] || 0), 0);

                                                        const isSelected = (currentDishIngredients[String(product.id)] || 0) > 0;

                                                        if (totalSalsas === 0) {
                                                            return <span className={styles.cardPrice} style={{ color: '#10b981' }}>Sin Cargo</span>;
                                                        }

                                                        if (totalSalsas === 1 && isSelected) {
                                                            return <span className={styles.cardPrice} style={{ color: '#10b981' }}>Sin Cargo</span>;
                                                        }

                                                        return (
                                                            <>
                                                                <span className={styles.cardPrice}>${product.price}</span>
                                                                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>(Extra)</span>
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            ) : (
                                                <span className={styles.cardPrice}>${product.price}</span>
                                            )
                                        )}

                                        {qty > 0 && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                {/* Only show minus button if NOT single-select category, OR if we want to allow deselecting the single item */}
                                                {/* Actually allow deselecting always is good UX */}
                                                <button
                                                    style={{ background: '#cbd5e1', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                                    onClick={(e) => removeIngredient(e, product)}
                                                >-</button>
                                                <div style={{ background: 'var(--color-primary)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '10px', fontSize: '0.8rem' }}>
                                                    {['Guarniciones', 'Ensaladas'].includes(product.category) ? <span style={{ fontSize: '10px' }}>✓</span> : `x${qty}`}
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
