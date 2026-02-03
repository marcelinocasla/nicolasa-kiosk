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
        // Load products
        fetch('/api/products')
            .then(res => res.json())
            .then(data => {
                setProducts(data)
                const cats = [...new Set(data.map(p => p.category))]
                setCategories(cats)
                if (cats.length > 0) setActiveCategory(cats[0])

                // Load CURRENT DISH draft if exists
                const draft = localStorage.getItem('current_dish_ingredients')
                if (draft) {
                    try {
                        setCurrentDishIngredients(JSON.parse(draft))
                    } catch (e) { }
                }
            })
    }, [])

    const toggleIngredient = (product) => {
        setCurrentDishIngredients(prev => {
            const newIngredients = { ...prev }
            // Logic: For this app, ingredients are usually x1, but let's allow multiple if needed.
            // Requirement says "Items shown separately like ingredients".
            // Let's increment quantity like before.
            newIngredients[product.id] = (newIngredients[product.id] || 0) + 1
            localStorage.setItem('current_dish_ingredients', JSON.stringify(newIngredients))
            return newIngredients
        })
    }

    // Helper to remove/decrease
    const removeIngredient = (e, product) => {
        e.stopPropagation() // Prevent triggering card click
        setCurrentDishIngredients(prev => {
            const newIngredients = { ...prev }
            if (newIngredients[product.id] > 0) {
                newIngredients[product.id] -= 1
                if (newIngredients[product.id] === 0) delete newIngredients[product.id]
            }
            localStorage.setItem('current_dish_ingredients', JSON.stringify(newIngredients))
            return newIngredients
        })
    }

    return Object.entries(currentDishIngredients).reduce((total, [id, qty]) => {
        const product = products.find(p => String(p.id) === String(id))
        return total + (product ? product.price * qty : 0)
    }, 0)

    const handleContinue = () => {
        // 1. Get existing confirmed order (array of dishes)
        let confirmedOrder = []
        try {
            confirmedOrder = JSON.parse(localStorage.getItem('confirmed_order') || '[]')
        } catch (e) { }

        // 2. Add current dish to it
        // A dish is an object: { id: timestamp, ingredients: { id: qty }, total: number }
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
                                    {CATEGORY_ICONS[product.category] || <Utensils size={48} />}
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
                    {/* El botón volver aquí quizás debería limpiar solo si no hay nada seleccionado, pero por simplicidad volvemos al inicio o tipo de pedido */}
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
