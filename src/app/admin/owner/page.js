'use client'

import { useState, useEffect } from 'react'
import { Save, ArrowLeft, Plus, Trash2, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'

export default function OwnerPanel() {
    const router = useRouter()
    const [products, setProducts] = useState([])
    const [settings, setSettings] = useState(null)
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('products') // 'products' or 'orders'

    useEffect(() => {
        Promise.all([
            fetch('/api/products').then(res => res.json()),
            fetch('/api/settings').then(res => res.json()),
            fetch('/api/orders?status=pending').then(res => res.json())
        ]).then(([productsData, settingsData, ordersData]) => {
            setProducts(productsData)
            setSettings(settingsData)
            setOrders(ordersData || []) // Handle potential null if error
            setLoading(false)
        })
    }, [])

    const refreshOrders = async () => {
        const res = await fetch('/api/orders?status=pending')
        const data = await res.json()
        setOrders(data)
    }

    const saveProducts = async (newProducts) => {
        await fetch('/api/products/update', {
            method: 'POST',
            body: JSON.stringify(newProducts)
        })
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
        setProducts(updated) // Optimistic update
    }

    const updateOrderStatus = async (orderId, newStatus) => {
        await fetch('/api/orders', {
            method: 'PUT',
            body: JSON.stringify({ id: orderId, status: newStatus })
        })
        refreshOrders()
    }

    // Function to modify an item inside an order (e.g. remove it)
    const removeOrderItem = async (order, itemIndex) => {
        const newItems = [...order.items];
        newItems.splice(itemIndex, 1);

        // Recalculate total
        const newTotal = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        await fetch('/api/orders', {
            method: 'PUT',
            body: JSON.stringify({ id: order.id, items: newItems, total: newTotal })
        })
        refreshOrders()
        alert('Item eliminado del pedido');
    }

    const handleSaveAll = () => {
        saveProducts(products)
        alert('Cambios guardados')
    }

    if (loading) return <div className="p-8 text-center">Cargando...</div>

    return (
        <div className={styles.container}>
            <div className={styles.content}>

                {/* Header & Delivery Toggle */}
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <button onClick={() => router.push('/admin')} className={styles.backBtn}>
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
                                Pedidos ({orders.length})
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
                        <h2 className={styles.sectionTitle}>Gestionar Productos</h2>

                        <div className={styles.productGrid}>
                            {products.map(product => (
                                <div key={product.id} className={styles.productRow}>
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
                                            onChange={e => updateProduct(product.id, 'price', parseInt(e.target.value))}
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
                            ))}
                        </div>

                        <datalist id="categories">
                            {Array.from(new Set(products.map(p => p.category))).map(c => <option key={c} value={c} />)}
                        </datalist>
                    </div>
                ) : (
                    /* ORDER MANAGEMENT */
                    <div className={styles.mainCard}>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className={styles.sectionTitle}>Pedidos Pendientes</h2>
                            <button onClick={refreshOrders} className="p-2 bg-gray-700 rounded hover:bg-gray-600 text-white"><RefreshCw size={20} /></button>
                        </div>

                        {orders.length === 0 ? (
                            <p className="text-gray-400 text-center py-10">No hay pedidos pendientes.</p>
                        ) : (
                            <div className="grid gap-4">
                                {orders.map(order => (
                                    <div key={order.id} className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="text-xl font-bold text-green-400">#{order.id} - {order.customer_name || 'Cliente'}</h3>
                                                <p className="text-sm text-gray-400">
                                                    {new Date(order.created_at).toLocaleString()} |
                                                    <span className="ml-2 uppercase font-bold text-yellow-500">{order.order_type}</span>
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-bold text-white">${order.total}</p>
                                                <button
                                                    onClick={() => updateOrderStatus(order.id, 'completed')}
                                                    className="mt-2 text-sm bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded"
                                                >
                                                    Completar
                                                </button>
                                            </div>
                                        </div>

                                        <div className="bg-gray-900 rounded p-3">
                                            {order.items && order.items.map((item, idx) => (
                                                <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-800 last:border-0">
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-bold text-white w-6 text-center bg-gray-700 rounded">{item.quantity}</span>
                                                        <span className="text-gray-300">{item.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-gray-400">${item.price * item.quantity}</span>
                                                        <button
                                                            onClick={() => removeOrderItem(order, idx)}
                                                            className="text-red-500 hover:text-red-400"
                                                            title="Eliminar item"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
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
