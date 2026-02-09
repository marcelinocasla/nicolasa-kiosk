'use client'

import { useState, useEffect } from 'react'
import { Save, ArrowLeft, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'

export default function DevPanel() {
    const router = useRouter()
    const [settings, setSettings] = useState(null)
    const [loading, setLoading] = useState(true)

    const [orders, setOrders] = useState([])
    const [metrics, setMetrics] = useState({ orders: 0, revenue: 0 })

    const fetchData = () => {
        setLoading(true)
        Promise.all([
            fetch('/api/settings').then(res => res.json()),
            fetch('/api/orders').then(res => res.json())
        ]).then(([settingsData, ordersData]) => {
            setSettings(settingsData)
            if (Array.isArray(ordersData)) {
                setOrders(ordersData) // Store all orders

                const completedOrders = ordersData.filter(o => o.status === 'completed')
                const totalOrdersCount = ordersData.length
                const totalRevenueCalc = completedOrders.reduce((sum, o) => sum + (o.total || 0), 0)

                setMetrics({
                    orders: totalOrdersCount,
                    revenue: totalRevenueCalc
                })
            }
            setLoading(false)
        })
            .catch(err => {
                console.error("Error loading data:", err)
                setLoading(false)
                alert("Error cargando datos. Revisa la consola.")
            })
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleSave = async () => {
        try {
            const res = await fetch('/api/settings/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            })
            if (res.ok) alert('Configuración guardada')
        } catch (e) {
            alert('Error al guardar')
        }
    }

    if (loading) return <div className="p-8 text-center" style={{ color: 'white' }}>Cargando datos...</div>
    if (!settings) return <div className="p-8 text-center" style={{ color: 'white' }}>Error al cargar configuración.</div>

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <div className={styles.header}>
                    <button onClick={() => router.push('/')} className={styles.backBtn} title="Ir al Inicio" style={{ marginRight: '1rem' }}>
                        <Home />
                    </button>
                    <button onClick={() => router.push('/admin')} className={styles.backBtn}>
                        <ArrowLeft />
                    </button>
                    <h1 className={styles.title}>Panel del Desarrollador</h1>
                </div>

                <div className={styles.body}>
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>Configuración General</h2>
                        <div className={styles.grid}>
                            <div>
                                <label className={styles.label}>Nombre de la App</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={settings.appName || ''}
                                    onChange={e => setSettings({ ...settings, appName: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className={styles.label}>Número WhatsApp (Internacional, sin +)</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={settings.whatsappNumber || ''}
                                    onChange={e => setSettings({ ...settings, whatsappNumber: e.target.value })}
                                    placeholder="5491126830760"
                                />
                            </div>
                        </div>
                    </section>

                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>Seguridad (Contraseñas)</h2>
                        <div className={styles.grid}>
                            <p className={styles.helperText}>
                                Dejar en blanco para mantener la contraseña actual.
                            </p>
                            <div>
                                <label className={styles.label}>Contraseña Admin (Dueño)</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    placeholder="Nueva contraseña"
                                    onChange={e => {
                                        if (e.target.value) setSettings({ ...settings, adminPassword: e.target.value })
                                    }}
                                />
                            </div>
                            <div>
                                <label className={styles.label}>Contraseña Desarrollador</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    placeholder="Nueva contraseña"
                                    onChange={e => {
                                        if (e.target.value) setSettings({ ...settings, devPassword: e.target.value })
                                    }}
                                />
                            </div>
                        </div>
                    </section>

                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>Métricas en Tiempo Real</h2>
                        <div className={styles.metricsGrid}>
                            <div className={`${styles.metricCard} ${styles.metricCardBlue}`}>
                                <div className={styles.metricLabel}>Total Pedidos (Histórico)</div>
                                <div className={styles.metricValue}>{metrics.orders}</div>
                            </div>
                            <div className={`${styles.metricCard} ${styles.metricCardGreen}`}>
                                <div className={styles.metricLabel}>Ingresos Totales (Completados)</div>
                                <div className={styles.metricValue}>${(metrics.revenue).toLocaleString()}</div>
                            </div>
                        </div>
                    </section>



                    {/* ORDER HISTORY DASHBOARD for DEV */}
                    <section className={styles.section}>
                        <div className={styles.header} style={{ padding: 0, marginBottom: '1.5rem' }}>
                            <h2 className={styles.sectionTitle}>Historial de Pedidos (Debug)</h2>
                            <button onClick={fetchData} className={styles.toggleBtn}>
                                <RefreshCw size={20} />
                            </button>
                        </div>

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

                                            <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                                                {order.status === 'cancelled' && (
                                                    <span style={{ background: '#ef4444', color: 'white', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>CANCELADO</span>
                                                )}
                                                {order.was_edited && (
                                                    <span style={{ background: '#eab308', color: 'black', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>EDITADO</span>
                                                )}
                                                {order.status === 'completed' && (
                                                    <span style={{ background: 'var(--color-primary)', color: 'white', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>COMPLETADO</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className={styles.orderMeta}>
                                            <p className={styles.orderTotal}>${order.total?.toLocaleString()}</p>
                                            <span className={styles.orderTypeBadge}>{order.order_type === 'eat-in' ? 'Mesa' : 'Delivery'}</span>
                                        </div>
                                    </div>

                                    <div className={styles.itemsList}>
                                        {order.items && order.items.map((item, idx) => (
                                            <div key={idx} className={styles.orderItem}>
                                                <div className={styles.itemInfo}>
                                                    <span className={styles.itemQty}>{item.quantity}</span>
                                                    <span className={styles.itemName}>{item.name}</span>
                                                </div>
                                                <div className={styles.itemActions}>
                                                    <span className={styles.itemPrice}>${(item.price * item.quantity).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <button
                        onClick={handleSave}
                        className={styles.saveBtn}
                    >
                        <Save size={20} /> Guardar Cambios
                    </button>
                </div >
            </div >
        </div >
    )
}
