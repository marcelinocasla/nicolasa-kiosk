'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, PlusCircle, Trash2 } from 'lucide-react'
import styles from './page.module.css'

export default function OrderSummary() {
    const router = useRouter()
    const [products, setProducts] = useState([])
    const [confirmedOrder, setConfirmedOrder] = useState([])
    const [settings, setSettings] = useState({ whatsappNumber: '5491126830760' }) // Default fallback
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        phone: '',
        email: '',
        payment: 'Efectivo'
    })

    useEffect(() => {
        // Load data
        Promise.all([
            fetch('/api/products').then(res => res.json()),
            fetch('/api/settings').then(res => res.json())
        ]).then(([productsData, settingsData]) => {
            setProducts(productsData)
            if (settingsData.whatsappNumber) {
                setSettings(prev => ({ ...prev, whatsappNumber: settingsData.whatsappNumber.replace('+', '') }))
            }
        })

        const savedOrder = localStorage.getItem('confirmed_order')
        if (savedOrder) {
            try { setConfirmedOrder(JSON.parse(savedOrder)) } catch (e) { }
        }
    }, [])

    const removeDish = (index) => {
        if (confirm('¿Eliminar este plato?')) {
            const newOrder = [...confirmedOrder]
            newOrder.splice(index, 1)
            setConfirmedOrder(newOrder)
            localStorage.setItem('confirmed_order', JSON.stringify(newOrder))
        }
    }

    const getTotal = () => {
        return confirmedOrder.reduce((sum, dish) => sum + dish.total, 0)
    }

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleConfirm = async () => {
        if (!formData.name || !formData.address || !formData.phone) {
            alert('Por favor completa los campos obligatorios (Nombre, Dirección, Teléfono)')
            return
        }

        const total = getTotal()

        // 1. Save to Database first
        try {
            const orderData = {
                customer_name: formData.name,
                customer_phone: formData.phone, // Adding phone to DB
                customer_address: formData.address,
                order_type: localStorage.getItem('order_type') || 'delivery',
                items: confirmedOrder.map((dish, dishIdx) => ({
                    dish_name: `Plato #${dishIdx + 1}`,
                    dish_total: dish.total,
                    ingredients: Object.entries(dish.ingredients).map(([id, qty]) => {
                        const product = products.find(p => String(p.id) === String(id));
                        return {
                            name: product?.name || 'Ingrediente Desconocido',
                            price: product?.price || 0,
                            quantity: qty
                        };
                    })
                })),
                total: total
            };

            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });

            if (!response.ok) {
                console.error('Failed to save order to DB');
                // We proceed anyway to WhatsApp, but log the error
            }
        } catch (err) {
            console.error('Error saving order:', err);
        }

        // 2. Prepare WhatsApp message
        let message = `*Nuevo Pedido - Restaurante Nicolasa*\n`
        message += `--------------------------------\n`
        message += `*Cliente:* ${formData.name}\n`
        message += `*Dirección:* ${formData.address}\n`
        message += `*Teléfono:* ${formData.phone}\n`
        message += `*Email:* ${formData.email || 'No informado'}\n`
        message += `*Pago:* ${formData.payment}\n`
        message += `--------------------------------\n`
        message += `*DETALLE DEL PEDIDO*\n\n`

        confirmedOrder.forEach((dish, idx) => {
            message += `*Plato ${idx + 1}:* ($${dish.total.toLocaleString('es-AR')})\n`
            Object.entries(dish.ingredients).forEach(([id, qty]) => {
                const product = products.find(p => String(p.id) === String(id))
                if (product) {
                    message += `- ${product.name} (x${qty})\n`
                }
            })
            message += `\n`
        })

        message += `--------------------------------\n`
        message += `*TOTAL FINAL:* $${total.toLocaleString('es-AR')}`

        const encodedMessage = encodeURIComponent(message)
        const url = `https://wa.me/${settings.whatsappNumber}?text=${encodedMessage}`

        // Clear order and redirect
        localStorage.removeItem('confirmed_order')
        window.location.href = url
    }

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Tu pedido es:</h1>

            <div className={styles.layout}>
                {/* Order Details Column */}
                <div className={styles.card}>
                    <h2 className={styles.sectionTitle}>Platos Seleccionados</h2>

                    {confirmedOrder.length === 0 && (
                        <p className="text-center text-slate-500 py-4">No has seleccionado ningún plato aún.</p>
                    )}

                    <div style={{ flex: 1, overflowY: 'auto', maxHeight: '500px' }}>
                        {confirmedOrder.map((dish, idx) => (
                            <div key={idx} className={styles.dishCard}>
                                <div className={styles.dishHeader}>
                                    <span className={styles.dishTitle}>Plato #{idx + 1}</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontWeight: 'bold', color: 'var(--color-accent)' }}>${dish.total.toLocaleString('es-AR')}</span>
                                        <Trash2 size={18} className={styles.trashBtn} onClick={() => removeDish(idx)} />
                                    </div>
                                </div>
                                <ul className={styles.ingredientList}>
                                    {Object.entries(dish.ingredients).map(([id, qty]) => {
                                        const product = products.find(p => String(p.id) === String(id))
                                        if (!product) return null
                                        return (
                                            <li key={id} className={styles.ingredientItem}>
                                                <span>{product.name}</span>
                                                <span>x{qty}</span>
                                            </li>
                                        )
                                    })}
                                </ul>
                            </div>
                        ))}
                    </div>

                    <button className={styles.btnAddMore} onClick={() => router.push('/menu')}>
                        <PlusCircle size={24} /> Agregar otro plato
                    </button>

                    <div className={styles.totalRow}>
                        <span>Total Final</span>
                        <span>${getTotal().toLocaleString('es-AR')}</span>
                    </div>
                </div>

                {/* Checkout Form Column */}
                <div className={styles.card}>
                    <h2 className={styles.sectionTitle}>Tus Datos</h2>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Nombre completo *</label>
                        <input className={styles.input} name="name" value={formData.name} onChange={handleInputChange} placeholder="Juan Pérez" />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Dirección de envío *</label>
                        <input className={styles.input} name="address" value={formData.address} onChange={handleInputChange} placeholder="Av. Principal 123" />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Teléfono / WhatsApp *</label>
                        <input className={styles.input} name="phone" value={formData.phone} onChange={handleInputChange} placeholder="11 1234 5678" />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Email</label>
                        <input className={styles.input} name="email" value={formData.email} onChange={handleInputChange} placeholder="juan@email.com" />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Método de Pago</label>
                        <select className={styles.select} name="payment" value={formData.payment} onChange={handleInputChange}>
                            <option value="Efectivo">Efectivo</option>
                            <option value="Transferencia">Transferencia</option>
                            <option value="Mercado Pago">Mercado Pago</option>
                        </select>
                    </div>

                    <button className={styles.btnConfirm} onClick={handleConfirm} disabled={confirmedOrder.length === 0}>
                        Confirmar Pedido hacia WhatsApp <CheckCircle size={24} />
                    </button>
                </div>
            </div>
        </div>
    )
}
