'use client'

import { useState, useEffect, useRef } from 'react'
import { Save, ArrowLeft, Plus, Trash2, RefreshCw, Home, ChevronUp, ChevronDown, Search, Menu, Clock, DollarSign, ShoppingBag, X, CheckCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import styles from './page.module.css'

export default function OwnerPanel() {
    const router = useRouter()
    const [products, setProducts] = useState([])
    const [settings, setSettings] = useState(null)
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [view, setView] = useState('dashboard') // 'dashboard', 'products', 'orders', 'history'
    const [searchTerm, setSearchTerm] = useState('')
    const [categoryOrder, setCategoryOrder] = useState([])

    useEffect(() => {
        Promise.all([
            fetch('/api/products').then(res => res.json()),
            fetch('/api/settings').then(res => res.json()),
            fetch('/api/orders?status=all').then(res => res.json())
        ]).then(([productsData, settingsData, ordersData]) => {
            setProducts(productsData)
            setSettings(settingsData)
            setCategoryOrder(settingsData.categoryOrder || [])
            setOrders(Array.isArray(ordersData) ? ordersData : [])
            setLoading(false)
        })
            .catch(err => {
                console.error("Error loading owner data:", err)
                setLoading(false)
                // alert("Error cargando datos del panel. Revisa la consola.") // Suppress for cleaner UX
            })
    }, [])

    // Polling for new orders every 15 seconds
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/orders?status=all&t=${Date.now()}`)
                if (res.ok) {
                    const data = await res.json()
                    setOrders(Array.isArray(data) ? data : [])
                }
            } catch (e) {
                console.error("Auto-refresh error", e)
            }
        }, 15000)
        return () => clearInterval(interval)
    }, [])

    const refreshOrders = async () => {
        try {
            setLoading(true)
            const res = await fetch(`/api/orders?status=all&t=${Date.now()}`)
            if (!res.ok) throw new Error('Failed to fetch orders')
            const data = await res.json()
            setOrders(Array.isArray(data) ? data : [])
        } catch (error) {
            console.error("Error refreshing orders:", error)
        } finally {
            setLoading(false)
        }
    }

    const saveProducts = async (newProducts) => {
        await fetch('/api/products/update', {
            method: 'POST',
            body: JSON.stringify(newProducts)
        })
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
            body: JSON.stringify({ id: order.id, items: newItems, total: newTotal, was_edited: true })
        })
        refreshOrders()
    }

    const handleSaveAll = () => {
        const validProducts = products.filter(p => p.name && p.name.trim() !== '' && p.category && p.category.trim() !== '');
        saveProducts(validProducts)
        alert('Cambios guardados')
    }

    const moveCategory = (category, direction) => {
        const uniqueCategories = Array.from(new Set(products.map(p => p.category))).filter(c => c && c.trim() !== '')
        let currentOrder = [...categoryOrder]
        uniqueCategories.forEach(c => { if (!currentOrder.includes(c)) currentOrder.push(c) })
        currentOrder = currentOrder.filter(c => uniqueCategories.includes(c))
        const index = currentOrder.indexOf(category)
        if (index === -1) return
        const newOrder = [...currentOrder]
        if (direction === 'up' && index > 0) [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]]
        else if (direction === 'down' && index < newOrder.length - 1) [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]]
        setCategoryOrder(newOrder)
    }

    const addNewProduct = () => {
        const newProduct = { id: Date.now(), name: '', category: 'Nuevos', description: '', price: 0, available: true }
        setProducts([newProduct, ...products])
    }

    const getSortedCategories = () => {
        const uniqueCategories = Array.from(new Set(products.map(p => p.category))).filter(c => c && c.trim() !== '')
        const sorted = [...categoryOrder]
        uniqueCategories.forEach(c => { if (!sorted.includes(c)) sorted.push(c) })
        return sorted.filter(c => uniqueCategories.includes(c))
    }

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // DASHBOARD METRICS
    const pendingOrders = orders.filter(o => o.status === 'pending')

    // Check local timezone for "Today" calculation
    const today = new Date();
    const isSameDay = (d1, d2) => {
        return d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate();
    }

    const salesToday = orders
        .filter(o => o.status === 'completed' && isSameDay(new Date(o.created_at), today))
        .reduce((sum, o) => sum + (o.total || 0), 0)

    // -- NEW METRICS: TOP PRODUCTS & CATEGORY REVENUE --
    const completedOrders = orders.filter(o => o.status === 'completed');
    const productSalesCount = {};
    const categoryRevenueMap = {};

    completedOrders.forEach(order => {
        (order.items || []).forEach(item => {
            if (!item.name) return; // ignore blanks
            const qty = item.quantity || 1;
            const price = item.price || 0;
            const revenue = qty * price;

            productSalesCount[item.name] = (productSalesCount[item.name] || 0) + qty;

            // Resolve category from products state
            const productDef = products.find(p => p.name === item.name);
            const category = productDef ? productDef.category : 'Otros';

            categoryRevenueMap[category] = (categoryRevenueMap[category] || 0) + revenue;
        });
    });

    const topProducts = Object.entries(productSalesCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, count]) => ({ name, count }));

    const categoryRevenue = Object.entries(categoryRevenueMap)
        .sort((a, b) => b[1] - a[1]);

    if (loading) return <div className={styles.loadingState}>Cargando Panel...</div>

    return (
        <div className={styles.container}>
            {/* SIDEBAR NAVIGATION */}
            <aside className={styles.sidebar}>
                <div className={styles.logoArea}>
                    <h1 className={styles.logoText}>Nicolasa<span className={styles.dot}>.</span></h1>
                </div>

                <nav className={styles.navMenu}>
                    <button
                        className={`${styles.navItem} ${view === 'dashboard' ? styles.navItemActive : ''}`}
                        onClick={() => setView('dashboard')}
                    >
                        <Home size={20} />
                        <span>Resumen</span>
                    </button>
                    <button
                        className={`${styles.navItem} ${view === 'orders' ? styles.navItemActive : ''}`}
                        onClick={() => setView('orders')}
                    >
                        <ShoppingBag size={20} />
                        <span>Pedidos</span>
                        {pendingOrders.length > 0 && <span className={styles.badgeCount}>{pendingOrders.length}</span>}
                    </button>
                    <button
                        className={`${styles.navItem} ${view === 'products' ? styles.navItemActive : ''}`}
                        onClick={() => setView('products')}
                    >
                        <Menu size={20} />
                        <span>Menú</span>
                    </button>
                    <button
                        className={`${styles.navItem} ${view === 'history' ? styles.navItemActive : ''}`}
                        onClick={() => setView('history')}
                    >
                        <Clock size={20} />
                        <span>Historial</span>
                    </button>
                </nav>

                <div className={styles.sidebarFooter}>
                    <button onClick={() => router.push('/')} className={styles.backBtn} title="Volver al Kiosco">
                        <ArrowLeft size={18} />
                        <span>Ir al Kiosco</span>
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className={styles.mainContent}>

                {/* TOP HEADER */}
                <header className={styles.topHeader}>
                    <h2 className={styles.pageTitle}>
                        {view === 'dashboard' && 'Panel de Control'}
                        {view === 'orders' && 'Pedidos en Curso'}
                        {view === 'products' && 'Gestión de Menú'}
                        {view === 'history' && 'Historial de Ventas'}
                    </h2>

                    <div className={styles.statusControls}>
                        <div className={styles.controlGroup}>
                            <span className={styles.statusLabel}>Mesa</span>
                            <button
                                onClick={() => saveSettings({ ...settings, eatInEnabled: !settings.eatInEnabled })}
                                className={`${styles.toggleBtn} ${settings?.eatInEnabled ? styles.toggleOn : styles.toggleOff}`}
                            >
                                <div className={styles.toggleHandle}></div>
                            </button>
                        </div>
                        <div className={styles.controlGroup}>
                            <span className={styles.statusLabel}>Delivery</span>
                            <button
                                onClick={toggleDelivery}
                                className={`${styles.toggleBtn} ${settings?.deliveryEnabled ? styles.toggleOn : styles.toggleOff}`}
                            >
                                <div className={styles.toggleHandle}></div>
                            </button>
                        </div>
                    </div>
                </header>

                <div className={styles.scrollableContent}>

                    {/* DASHBOARD VIEW */}
                    {view === 'dashboard' && (
                        <div className={styles.dashboardView}>
                            <div className={styles.statsGrid}>
                                <div className={`${styles.statCard} ${styles.statWarning}`}>
                                    <div className={`${styles.statIcon} ${styles.pulseAnim}`}><ShoppingBag size={24} /></div>
                                    <div className={styles.statInfo}>
                                        <span className={styles.statLabel}>Pedidos Activos</span>
                                        <span className={styles.statValue}>{pendingOrders.length}</span>
                                    </div>
                                    <button className={styles.statLink} onClick={() => setView('orders')}>Ver Todos</button>
                                </div>
                                <div className={`${styles.statCard} ${styles.statSuccess}`}>
                                    <div className={`${styles.statIcon} ${styles.bounceAnim}`}><DollarSign size={24} /></div>
                                    <div className={styles.statInfo}>
                                        <span className={styles.statLabel}>Ventas Hoy</span>
                                        <span className={styles.statValue}>${salesToday.toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className={`${styles.statCard} ${styles.statNeutral}`}>
                                    <div className={`${styles.statIcon} ${styles.spinAnim}`}><Menu size={24} /></div>
                                    <div className={styles.statInfo}>
                                        <span className={styles.statLabel}>Productos</span>
                                        <span className={styles.statValue}>{products.length}</span>
                                    </div>
                                    <button className={styles.statLink} onClick={() => setView('products')}>Gestionar</button>
                                </div>
                            </div>

                            <div className={styles.metricsRow}>
                                {/* Top Products Card */}
                                <div className={styles.metricWidget}>
                                    <h3 className={styles.widgetTitle}>🏆 Top 3 Productos</h3>
                                    <div className={styles.widgetContent}>
                                        {topProducts.length > 0 ? topProducts.map((p, idx) => (
                                            <div key={idx} className={styles.topProductRow}>
                                                <span className={styles.topProductRank}>#{idx + 1}</span>
                                                <span className={styles.topProductName}>{p.name}</span>
                                                <span className={styles.topProductCount}>{p.count} unid.</span>
                                            </div>
                                        )) : <p className={styles.noData}>No hay datos suficientes</p>}
                                    </div>
                                </div>

                                {/* Category Revenue Card */}
                                <div className={styles.metricWidget}>
                                    <h3 className={styles.widgetTitle}>📈 Ingresos por Categoría</h3>
                                    <div className={styles.widgetContent}>
                                        {categoryRevenue.length > 0 ? categoryRevenue.map(([cat, rev], idx) => (
                                            <div key={idx} className={styles.categoryRevenueRow}>
                                                <span className={styles.categoryName}>{cat}</span>
                                                <div className={styles.revenueBarContainer}>
                                                    <div
                                                        className={styles.revenueBar}
                                                        style={{ width: `${Math.max(10, (rev / categoryRevenue[0][1]) * 100)}%` }}
                                                    ></div>
                                                </div>
                                                <span className={styles.categoryAmount}>${rev.toLocaleString()}</span>
                                            </div>
                                        )) : <p className={styles.noData}>No hay datos suficientes</p>}
                                    </div>
                                </div>
                            </div>

                            <div className={styles.recentActivity}>
                                <h3 className={styles.sectionTitle}>Actividad Reciente</h3>
                                <div className={styles.recentList}>
                                    {orders.slice(0, 5).map(order => (
                                        <div key={order.id} className={styles.activityRow}>
                                            <div className={styles.activityInfo}>
                                                <span className={styles.activityId}>#{order.id}</span>
                                                <span className={styles.activityName}>{order.customer_name}</span>
                                            </div>
                                            <span className={`${styles.activityStatus} ${styles[order.status]}`}>
                                                {order.status === 'pending' ? 'Pendiente' : (order.status === 'completed' ? 'Completado' : 'Cancelado')}
                                            </span>
                                            <span className={styles.activityTime}>
                                                {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PRODUCTS VIEW */}
                    {view === 'products' && (
                        <div className={styles.productsView}>
                            <div className={styles.toolbar}>
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
                                <div className={styles.toolbarActions}>
                                    <button onClick={addNewProduct} className={styles.primaryBtn}>
                                        <Plus size={18} /> Nuevo
                                    </button>
                                    <button onClick={handleSaveAll} className={styles.secondaryBtn}>
                                        <Save size={18} /> Guardar
                                    </button>
                                </div>
                            </div>

                            <div className={styles.productsContainer}>
                                {searchTerm ? (
                                    filteredProducts.map(product => (
                                        <ProductRow key={product.id} product={product} updateProduct={updateProduct} />
                                    ))
                                ) : (
                                    getSortedCategories().map((category, catIdx) => (
                                        <div key={category} className={styles.categoryGroup}>
                                            <div className={styles.categoryHeader}>
                                                <h3 className={styles.categoryTitle}>{category}</h3>
                                                <div className={styles.categoryActions}>
                                                    <button onClick={() => moveCategory(category, 'up')} className={styles.moveBtn} disabled={catIdx === 0}><ChevronUp size={16} /></button>
                                                    <button onClick={() => moveCategory(category, 'down')} className={styles.moveBtn} disabled={catIdx === getSortedCategories().length - 1}><ChevronDown size={16} /></button>
                                                </div>
                                            </div>
                                            <div className={styles.productsGrid}>
                                                {products.filter(p => p.category === category).map(product => (
                                                    <ProductRow key={product.id} product={product} updateProduct={updateProduct} />
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <datalist id="categories">
                                {Array.from(new Set(products.map(p => p.category))).map(c => <option key={c} value={c} />)}
                            </datalist>
                        </div>
                    )}

                    {/* ORDERS & HISTORY VIEW */}
                    {(view === 'orders' || view === 'history') && (
                        <div className={styles.ordersView}>
                            {view === 'orders' && (
                                <div className={styles.toolbar}>
                                    <button onClick={refreshOrders} className={styles.secondaryBtn}>
                                        <RefreshCw size={18} /> Actualizar
                                    </button>
                                </div>
                            )}

                            <div className={styles.ordersGrid}>
                                {(view === 'orders' ? pendingOrders : orders).length === 0 ? (
                                    <div className={styles.emptyState}>
                                        <Clock size={48} />
                                        <p>No hay registro de pedidos {view === 'orders' ? 'pendientes' : ''}.</p>
                                    </div>
                                ) : (
                                    (view === 'orders' ? pendingOrders : orders).map(order => (
                                        <div key={order.id} className={`${styles.orderCard} ${order.was_edited ? styles.orderEdited : ''} ${styles['status-' + order.status]}`}>
                                            <div className={styles.orderHeader}>
                                                <div className={styles.orderIdGroup}>
                                                    <span className={styles.orderId}>#{order.id}</span>
                                                    <span className={styles.orderTime}>
                                                        {new Date(order.created_at).toLocaleString('es-AR', {
                                                            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                                                        })}
                                                    </span>
                                                </div>
                                                <span className={`${styles.orderType} ${order.order_type === 'eat-in' ? styles.typeMesa : styles.typeDelivery}`}>
                                                    {order.order_type === 'eat-in' ? 'Mesa' : 'Delivery'}
                                                </span>
                                            </div>

                                            <div className={styles.customerDetails}>
                                                <span className={styles.customerName}>{order.customer_name || 'Cliente'}</span>
                                                {order.customer_phone && <span className={styles.customerPhone}>{order.customer_phone}</span>}
                                            </div>

                                            <div className={styles.orderItems}>
                                                {(order.items || []).map((item, idx) => (
                                                    <div key={idx} className={styles.orderItemRow}>
                                                        <div className={styles.itemMain}>
                                                            <span className={styles.itemQty}>{item.quantity || 1}x</span>
                                                            <span className={styles.itemName}>{item.name}</span>
                                                        </div>
                                                        <div className={styles.itemRight}>
                                                            <span className={styles.itemPrice}>${((item.price || item.total || 0) * (item.quantity || 1)).toLocaleString()}</span>
                                                            {/* Allow deleting items only in 'orders' view (active orders) */}
                                                            {view === 'orders' && (
                                                                <button onClick={() => removeOrderItem(order, idx)} className={styles.deleteBtn}>
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className={styles.orderFooter}>
                                                <div className={styles.orderTotalRow}>
                                                    <span>Total</span>
                                                    <span className={styles.orderTotalValue}>${(order.total || 0).toLocaleString()}</span>
                                                </div>

                                                {view === 'orders' ? (
                                                    <div className={styles.orderActions}>
                                                        <button onClick={() => updateOrderStatus(order.id, 'cancelled')} className={styles.btnCancel}>
                                                            <X size={18} /> Cancelar
                                                        </button>
                                                        <button onClick={() => updateOrderStatus(order.id, 'completed')} className={styles.btnComplete}>
                                                            <CheckCircle size={18} /> Listo
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className={`${styles.orderStatusBadge} ${styles[order.status]}`}>
                                                        {order.status === 'pending' ? 'Pendiente' : (order.status === 'completed' ? 'Completado' : 'Cancelado')}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>
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

            if (uploadError) throw uploadError

            const { data } = supabase.storage
                .from('Ingredientes')
                .getPublicUrl(filePath)

            updateProduct(product.id, 'image', data.publicUrl)
        } catch (error) {
            console.error('Error uploading image:', error)
            alert('Error al subir imagen!')
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className={styles.productCard}>
            <div className={styles.imageArea} onClick={() => fileInputRef.current.click()}>
                {product.image ? (
                    <img src={product.image} alt={product.name} className={styles.productImg} />
                ) : (
                    <div className={styles.placeholderImg}>+ IMG</div>
                )}
                <div className={styles.imageOverlay}>{uploading ? '...' : <Plus size={20} />}</div>
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className={styles.hiddenInput}
                    ref={fileInputRef}
                />
            </div>

            <div className={styles.productDetails}>
                <div className={styles.productHeader}>
                    <input
                        className={styles.inputName}
                        value={product.name}
                        placeholder="Nombre Producto"
                        onChange={e => updateProduct(product.id, 'name', e.target.value)}
                    />
                    <div className={styles.switchWrapper}>
                        <input
                            type="checkbox"
                            checked={product.available}
                            onChange={() => updateProduct(product.id, 'available', !product.available)}
                            className={styles.toggleCheckbox}
                        />
                    </div>
                </div>

                <input
                    className={styles.inputCategory}
                    value={product.category}
                    list="categories"
                    placeholder="Categoría"
                    onChange={e => updateProduct(product.id, 'category', e.target.value)}
                />

                <textarea
                    className={styles.inputDesc}
                    value={product.description}
                    placeholder="Descripción"
                    rows={2}
                    onChange={e => updateProduct(product.id, 'description', e.target.value)}
                />

                <div className={styles.productFooter}>
                    <div className={styles.priceWrapper}>
                        <span className={styles.currency}>$</span>
                        <input
                            type="number"
                            className={styles.inputPrice}
                            value={product.price}
                            onChange={e => updateProduct(product.id, 'price', parseInt(e.target.value) || 0)}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
