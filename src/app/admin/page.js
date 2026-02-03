'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock } from 'lucide-react'
import styles from './page.module.css'

export default function AdminLogin() {
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const router = useRouter()

    const handleLogin = async (e) => {
        e.preventDefault()
        setError('')

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                body: JSON.stringify({ password }),
                headers: { 'Content-Type': 'application/json' }
            })
            const data = await res.json()

            if (data.success) {
                if (data.role === 'dev') router.push('/admin/dev')
                if (data.role === 'owner') router.push('/admin/owner')
            } else {
                setError('Contraseña incorrecta')
            }
        } catch (err) {
            setError('Error de conexión')
        }
    }

    return (
        <div className={styles.container}>
            <form onSubmit={handleLogin} className={styles.card}>
                <div className={styles.iconWrapper}>
                    <Lock size={40} />
                </div>

                <h1 className={styles.title}>Panel Admin</h1>

                <input
                    type="password"
                    placeholder="Contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={styles.input}
                />

                {error && <p className={styles.error}>{error}</p>}

                <button type="submit" className={styles.button}>
                    Ingresar
                </button>
            </form>
        </div>
    )
}
