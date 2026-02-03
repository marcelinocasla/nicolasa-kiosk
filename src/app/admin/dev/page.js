'use client'

import { useState, useEffect } from 'react'
import { Save, ArrowLeft, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'

export default function DevPanel() {
    const router = useRouter()
    const [settings, setSettings] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // In a real app we'd check auth token here
        fetch('/api/settings') // This one is "safe", but we need the "unsafe" one for editing passwords?
            // Actually the update endpoint allows updating everything.
            // For this demo, we assume we are authorized.
            .then(res => res.json())
            .then(data => {
                setSettings(data)
                setLoading(false)
            })
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

    if (loading) return <div className="p-8 text-center">Cargando...</div>

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <div className={styles.header}>
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
                        {/* Note: The GET /api/settings filters out passwords, so they might be empty initially.
                    We would need a separate secure endpoint to get them if we want to show them.
                    For now, let's allow setting NEW passwords only if needed, or leave blank to keep.
                */}
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
                        <h2 className={styles.sectionTitle}>Métricas</h2>
                        <div className={styles.metricsGrid}>
                            <div className={`${styles.metricCard} ${styles.metricCardBlue}`}>
                                <div className={styles.metricLabel}>Total Pedidos</div>
                                <div className={styles.metricValue}>{settings.totalOrders || 0}</div>
                            </div>
                            <div className={`${styles.metricCard} ${styles.metricCardGreen}`}>
                                <div className={styles.metricLabel}>Ingresos Totales</div>
                                <div className={styles.metricValue}>${(settings.totalRevenue || 0).toLocaleString()}</div>
                            </div>
                        </div>
                    </section>

                    <button
                        onClick={handleSave}
                        className={styles.saveBtn}
                    >
                        <Save size={20} /> Guardar Cambios
                    </button>
                </div>
            </div>
        </div>
    )
}
