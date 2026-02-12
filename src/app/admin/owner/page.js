'use client'

import { useState, useEffect, useRef } from 'react'
import { Save, ArrowLeft, Plus, Trash2, RefreshCw, Home, ChevronUp, ChevronDown, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import styles from './page.module.css'

export default function OwnerPanel() {
    const router = useRouter()
    const [products, setProducts] = useState([])
    const [settings, setSettings] = useState(null)
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('products') // 'products' or 'orders'
    const [searchTerm, setSearchTerm] = useState('')
    const [categoryOrder, setCategoryOrder] = useState([])

    useEffect(() => {
        Promise.all([
            fetch('/api/products').then(res => res.json()),
            fetch('/api/settings').then(res => res.json()),
            fetch('/api/orders?status=pending').then(res => res.json())
        ]).then(([productsData, settingsData, ordersData]) => {
            setProducts(productsData)
            setSettings(settingsData)
            setCategoryOrder(settingsData.categoryOrder || [])
            if (Array.isArray(ordersData)) {
                setOrders(ordersData)
            } else {
                setOrders([])
            }
            setLoading(false)
            setLoading(false)
        })
            .catch(err => {
                console.error("Error loading owner data:", err)
                setLoading(false)
                alert("Error cargando datos del panel. Revisa la consola.")
            })
    }, [])

    // ... (keep auto-refresh effect) ... 

    const refreshOrders = async () => {
        try {
            setLoading(true) // Show loading state when refreshing
            // If activeTab is 'history', fetch all. Else fetch pending.
            const statusParam = activeTab === 'history' ? 'all' : 'pending'

            // Add timestamp to prevent caching
            const res = await fetch(`/api/orders?status=${statusParam}&t=${Date.now()}`)

            if (!res.ok) throw new Error('Failed to fetch orders')
            const data = await res.json()

            if (Array.isArray(data)) {
                // If history tab, filter out pending orders (show only completed/cancelled)
                // If filtering logic should be strictly "Finalizados", we might only want 'completed'
                // But usually history implies everything past.
                if (activeTab === 'history') {
                    setOrders(data.filter(o => o.status !== 'pending'))
                } else {
                    setOrders(data)
                }
            } else {
                console.error("Orders data is not an array:", data)
                setOrders([])
            }
        } catch (error) {
            console.error("Error refreshing orders:", error)
        } finally {
            setLoading(false)
        }
    }

    // Refresh when tab changes
    useEffect(() => {
        if (activeTab === 'orders' || activeTab === 'history') {
            refreshOrders()
        }
    }, [activeTab])


    const saveProducts = async (newProducts) => {
        await fetch('/api/products/update', {
            method: 'POST',
            body: JSON.stringify(newProducts)
        })

        // Also save settings to persist category order
        if (settings) {
            await saveSettings({ ...settings, categoryOrder })
        }

        setProducts(newProducts)
    }

    const saveSettings = async (newSettings) => {
        await fetch('/api/settings/update', {
            method: 'POST',
            body: JSON.stringify(newSettings)
        })
        setSettings(newSettings)
    }

    const toggleDelivery = () => {
        saveSettings({ ...settings, deliveryEnabled: !settings.deliveryEnabled })
    }

    const updateProduct = (id, field, value) => {
        const updated = products.map(p => p.id === id ? { ...p, [field]: value } : p)
        setProducts(updated)
    }

    const updateOrderStatus = async (orderId, newStatus) => {
        if (newStatus === 'cancelled' && !confirm('¿Estás seguro de cancelar este pedido?')) return;

        await fetch('/api/orders', {
            method: 'PUT',
            body: JSON.stringify({ id: orderId, status: newStatus })
        })
        refreshOrders()
    }

    const removeOrderItem = async (order, itemIndex) => {
        const newItems = [...order.items];
        newItems.splice(itemIndex, 1);

        const newTotal = newItems.reduce((sum, item) => sum + (item.price * item.quantity || 0), 0);

        await fetch('/api/orders', {
            method: 'PUT',
            body: JSON.stringify({
                id: order.id,
                items: newItems,
                total: newTotal,
                was_edited: true // Flag as edited
            })
        })
        refreshOrders()
        alert('Item eliminado del pedido');
    }

    const handleSaveAll = () => {
        saveProducts(products)
        alert('Cambios guardados')
    }

    const moveCategory = (category, direction) => {
        // Get unique categories from products to ensure we have all of them
        const uniqueCategories = Array.from(new Set(products.map(p => p.category))).filter(Boolean)

        // Merge with existing order, appending any new ones at the end
        let currentOrder = [...categoryOrder]
        uniqueCategories.forEach(c => {
            if (!currentOrder.includes(c)) currentOrder.push(c)
        })

        // Remove any that no longer exist
        currentOrder = currentOrder.filter(c => uniqueCategories.includes(c))

        const index = currentOrder.indexOf(category)
        if (index === -1) return

        const newOrder = [...currentOrder]
        if (direction === 'up' && index > 0) {
            [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]]
        } else if (direction === 'down' && index < newOrder.length - 1) {
            [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]]
        }

        setCategoryOrder(newOrder)
    }

    const addNewProduct = () => {
        const newProduct = {
            id: Date.now(), // Temporary ID until DB assigns one (or handle differently)
            name: '',
            category: 'Nuevos',
            description: '',
            price: 0,
            available: true
        }
        setProducts([newProduct, ...products])
    }

    // Derived state for rendering
    const getSortedCategories = () => {
        const uniqueCategories = Array.from(new Set(products.map(p => p.category))).filter(Boolean)

        // Combine known order with any un-ordered categories appended
        const sorted = [...categoryOrder]
        uniqueCategories.forEach(c => {
            if (!sorted.includes(c)) sorted.push(c)
        })

        return sorted.filter(c => uniqueCategories.includes(c))
    }

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (loading) return <div className="p-8 text-center">Cargando...</div>

    return (
        <div className={styles.container}>
            <div className={styles.content}>

                {/* Header & Delivery Toggle */}
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <button onClick={() => router.push('/')} className={styles.backBtn} title="Ir al Inicio">
                            <Home />
                        </button>
                        <button onClick={() => router.push('/admin')} className={styles.backBtn} title="Volver al Admin">
                            <ArrowLeft />
                        </button>
                        <h1 className={styles.title}>Panel del Dueño</h1>
                    </div>

                    <div className={styles.headerActions}>
                        <div className={styles.tabSwitcher}>
                            <button
                                className={`${styles.tabBtn} ${activeTab === 'products' ? styles.activeTab : ''}`}
                                onClick={() => setActiveTab('products')}
                            >
                                Productos
                            </button>
                            <button
                                className={`${styles.tabBtn} ${activeTab === 'orders' ? styles.activeTab : ''}`}
                                onClick={() => setActiveTab('orders')}
                            >
                                Pendientes
                            </button>
                            <button
                                className={`${styles.tabBtn} ${activeTab === 'history' ? styles.activeTab : ''}`}
                                onClick={() => setActiveTab('history')}
                            >
                                Historial (Finalizados)
                            </button>
                        </div>

                        <div className={styles.deliveryStatus}>
                            <span className={styles.statusLabel}>Mesa:</span>
                            <button
                                onClick={() => saveSettings({ ...settings, eatInEnabled: !settings.eatInEnabled })}
                                className={`${styles.toggleBtn} ${settings.eatInEnabled ? styles.toggleOn : styles.toggleOff}`}
                            >
                                {settings.eatInEnabled ? 'ON' : 'OFF'}
                            </button>
                        </div>

                        <div className={styles.deliveryStatus}>
                            <span className={styles.statusLabel}>Delivery:</span>
                            <button
                                onClick={toggleDelivery}
                                className={`${styles.toggleBtn} ${settings.deliveryEnabled ? styles.toggleOn : styles.toggleOff}`}
                            >
                                {settings.deliveryEnabled ? 'ON' : 'OFF'}
                            </button>
                        </div>

                        {activeTab === 'products' && (
                            <button
                                onClick={handleSaveAll}
                                className={styles.saveBtn}
                            >
                                <Save size={20} /> Guardar Todo
                            </button>
                        )}
                    </div>
                </div>

                {/* CONTENT AREA */}
                {activeTab === 'products' ? (
                    /* Product Management */
                    <div className={styles.mainCard}>
                        <div className={styles.productsHeader}>
                            <h2 className={styles.sectionTitle} style={{ marginBottom: 0 }}>Gestionar Productos</h2>

                            <div className={styles.productsActions}>
                                <div className={styles.searchWrapper}>
                                    <Search size={18} className={styles.searchIcon} />
                                    <input
                                        type="text"
                                        placeholder="Buscar productos..."
                                        className={styles.searchInput}
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <button onClick={addNewProduct} className={styles.addBtn}>
                                    <Plus size={18} /> Nuevo Producto
                                </button>
                            </div>
                        </div>

                        <div className={styles.productGrid}>
                            {/* Group by Category if no search term, otherwise show flat list */}
                            {searchTerm ? (
                                filteredProducts.map(product => (
                                    <ProductRow key={product.id} product={product} updateProduct={updateProduct} />
                                ))
                            ) : (
                                getSortedCategories().map((category, catIdx) => (
                                    <div key={category} className={styles.categorySection}>
                                        <div className={styles.categoryHeader}>
                                            <div className={styles.categoryTitleWrapper}>
                                                <h3 className={styles.categoryTitle}>{category}</h3>
                                                <div className={styles.categoryControls}>
                                                    <button
                                                        onClick={() => moveCategory(category, 'up')}
                                                        className={styles.orderBtn}
                                                        disabled={catIdx === 0}
                                                    >
                                                        <ChevronUp size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => moveCategory(category, 'down')}
                                                        className={styles.orderBtn}
                                                        disabled={catIdx === getSortedCategories().length - 1}
                                                    >
                                                        <ChevronDown size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {products.filter(p => p.category === category).map(product => (
                                            <ProductRow key={product.id} product={product} updateProduct={updateProduct} />
                                        ))}
                                    </div>
                                ))
                            )}
                        </div>

                        <datalist id="categories">
                            {Array.from(new Set(products.map(p => p.category))).map(c => <option key={c} value={c} />)}
                        </datalist>
                    </div>
                ) : (
                    /* ORDER MANAGEMENT */
                    <div className={styles.mainCard}>
                        <div className={styles.header}>
                            <h2 className={styles.sectionTitle}>Pedidos Pendientes</h2>
                            <button onClick={refreshOrders} className={styles.toggleBtn}>
                                <RefreshCw size={20} />
                            </button>
                        </div>

                        {orders.length === 0 ? (
                            <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                                {activeTab === 'orders' ? 'No hay pedidos pendientes.' : 'No hay pedidos en el historial.'}
                            </p>
                        ) : (
                            <div className={styles.orderGrid}>
                                {orders.map(order => (
                                    <div key={order.id} className={styles.orderCard}>
                                        <div className={styles.cardHeader}>
                                            <div>
                                                <h3 className={styles.orderId}>#{order.id}</h3>
                                                <p className={styles.customerInfo}>{order.customer_name || 'Cliente'}</p>
                                                <div className={styles.customerInfo} style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                                                    {order.created_at ? new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                                </div>
                                                {order.customer_phone && (
                                                    <p className={styles.customerInfo} style={{ color: 'var(--color-accent)' }}>
                                                        {order.customer_phone}
                                                    </p>
                                                )}

                                                {/* Status Indicators */}
                                                <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                                                    {order.status === 'cancelled' && (
                                                        <span style={{ background: '#ef4444', color: 'white', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>CANCELADO</span>
                                                    )}
                                                    {order.was_edited && (
                                                        <span style={{ background: '#eab308', color: 'black', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>EDITADO</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className={styles.orderMeta}>
                                                <p className={styles.orderTotal}>${(order.total || 0).toLocaleString()}</p>
                                                <span className={styles.orderTypeBadge}>{order.order_type === 'eat-in' ? 'Mesa' : 'Delivery'}</span>
                                            </div>
                                        </div>

                                        <div className={styles.itemsList}>
                                            {(order.items || []).map((item, idx) => (
                                                <div key={idx} className={styles.dishGroup}>
                                                    {/* NEW STRUCTURE: Dish with ingredients */}
                                                    {item.ingredients ? (
                                                        <>
                                                            <div className={styles.dishHeaderRow}>
                                                                <span className={styles.dishName}>{item.dish_name || `Plato #${idx + 1}`}</span>
                                                                <span className={styles.dishTotalDev}>${(item.dish_total || 0).toLocaleString()}</span>
                                                                <button
                                                                    onClick={() => removeOrderItem(order, idx)}
                                                                    className={styles.deleteItemBtn}
                                                                    title="Eliminar plato"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                            <div className={styles.ingredientsSubList}>
                                                                {item.ingredients.map((ing, ingIdx) => (
                                                                    <div key={ingIdx} className={styles.orderItem}>
                                                                        <div className={styles.itemInfo}>
                                                                            <span className={styles.itemQty}>{ing.quantity}</span>
                                                                            <span className={styles.itemName}>{ing.name}</span>
                                                                        </div>
                                                                        <span className={styles.itemPrice}>${((ing.price || 0) * (ing.quantity || 1)).toLocaleString()}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </>
                                                    ) : (
                                                        /* LEGACY STRUCTURE: Flat list or Dish with ingredients object (handled gracefully) */
                                                        <div className={styles.orderItem}>
                                                            <div className={styles.itemInfo}>
                                                                <span className={styles.itemQty}>{item.quantity || 1}</span>
                                                                <span className={styles.itemName}>{item.name || `Plato #${idx + 1}`}</span>
                                                            </div>
                                                            <div className={styles.itemActions}>
                                                                <span className={styles.itemPrice}>${((item.price || item.total || 0) * (item.quantity || 1)).toLocaleString()}</span>
                                                                <button
                                                                    onClick={() => removeOrderItem(order, idx)}
                                                                    className={styles.deleteItemBtn}
                                                                    title="Eliminar item"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        <div className={styles.cardActions}>
                                            <button
                                                onClick={() => updateOrderStatus(order.id, 'cancelled')}
                                                className={styles.btnCancel}
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                onClick={() => updateOrderStatus(order.id, 'completed')}
                                                className={styles.btnComplete}
                                            >
                                                Completar Pedido
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
    )
}

function ProductRow({ product, updateProduct }) {
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef(null)

    const handleImageUpload = async (e) => {
        try {
            setUploading(true)
            const file = e.target.files[0]
            if (!file) return

            const fileExt = file.name.split('.').pop()
            const fileName = `${product.id}-${Date.now()}.${fileExt}`
            const filePath = `${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('Ingredientes')
                .upload(filePath, file)

            if (uploadError) {
                throw uploadError
            }

            const { data } = supabase.storage
                .from('Ingredientes')
                .getPublicUrl(filePath)

            updateProduct(product.id, 'image', data.publicUrl)
            alert('Imagen subida correctamente!')
        } catch (error) {
            console.error('Error uploading image:', error)
            alert('Error al subir imagen!')
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className={styles.productRow}>
            <div className={styles.fieldGroup}>
                <label className={styles.label}>Imagen</label>
                <div className={styles.imageUploadWrapper}>
                    {product.image ? (
                        <div className={styles.imagePreviewContainer}>
                            <img
                                src={product.image}
                                alt={product.name}
                                className={styles.productImagePreview}
                            />
                            <button
                                className={styles.removeImageBtn}
                                onClick={() => updateProduct(product.id, 'image', '')}
                                title="Eliminar imagen"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ) : (
                        <div className={styles.noImagePlaceholder}>Sin imagen</div>
                    )}

                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploading}
                        className={styles.hiddenInput}
                        ref={fileInputRef}
                    />
                    <button
                        className={styles.uploadBtn}
                        onClick={() => fileInputRef.current.click()}
                        disabled={uploading}
                    >
                        {uploading ? 'Subiendo...' : (product.image ? 'Cambiar Imagen' : 'Subir Imagen')}
                    </button>
                </div>
            </div>

            <div className={styles.fieldGroup}>
                <label className={styles.label}>Nombre</label>
                <input
                    className={`${styles.input} ${styles.inputMain}`}
                    value={product.name}
                    onChange={e => updateProduct(product.id, 'name', e.target.value)}
                />
                <input
                    className={styles.input}
                    style={{ marginTop: '0.5rem' }}
                    value={product.category}
                    onChange={e => updateProduct(product.id, 'category', e.target.value)}
                    list="categories"
                    placeholder="Categoría"
                />
            </div>

            <div className={styles.fieldGroup}>
                <label className={styles.label}>Descripción</label>
                <textarea
                    className={styles.textArea}
                    value={product.description}
                    onChange={e => updateProduct(product.id, 'description', e.target.value)}
                />
            </div>

            <div className={styles.fieldGroup}>
                <label className={styles.label}>Precio ($)</label>
                <input
                    type="number"
                    className={`${styles.input} ${styles.priceInput}`}
                    value={product.price}
                    onChange={e => updateProduct(product.id, 'price', parseInt(e.target.value) || 0)}
                />
            </div>

            <div className={styles.checkboxWrapper} onClick={() => updateProduct(product.id, 'available', !product.available)}>
                <input
                    type="checkbox"
                    checked={product.available}
                    onChange={() => { }} // handled by wrapper
                    style={{ accentColor: 'var(--color-primary)' }}
                />
                <span className={styles.checkboxLabel}>Disponible</span>
            </div>
        </div>
    )
}
