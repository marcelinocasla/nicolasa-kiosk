import Link from 'next/link'
import Image from 'next/image'
import { Utensils, ShoppingBag } from 'lucide-react'
import styles from './page.module.css'
import fs from 'fs/promises'
import path from 'path'

export const dynamic = 'force-dynamic'


async function getSettings() {
    // In a real app, use an API. For local demo, reading file is fine (Server Component)
    try {
        const filePath = path.join(process.cwd(), 'src', 'data', 'settings.json')
        const fileContents = await fs.readFile(filePath, 'utf8')
        return JSON.parse(fileContents)
    } catch (e) {
        return { deliveryEnabled: true }
    }
}

export default async function OrderType() {
    const settings = await getSettings()

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <Image src="/logo.png" alt="Logo" width={80} height={80} className={styles.logoSmall} />
            </header>

            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <h1 className={styles.title}>¿Cómo quieres pedir?</h1>

                <div className={styles.grid}>
                    {settings.eatInEnabled ? (
                        <Link href="/menu?type=eat-in" className={styles.card}>
                            <div className={styles.iconWrapper}>
                                <Utensils size={64} />
                            </div>
                            <span className={styles.cardLabel}>Para comer aquí</span>
                            <span className={styles.cardSub}>Service at table</span>
                        </Link>
                    ) : (
                        <div className={`${styles.card} ${styles.disabled}`} style={{ opacity: 0.5, cursor: 'not-allowed', borderColor: '#eee' }}>
                            <div className={styles.iconWrapper} style={{ backgroundColor: '#eee', color: '#ccc' }}>
                                <Utensils size={64} />
                            </div>
                            <span className={styles.cardLabel} style={{ color: '#ccc' }}>Para comer aquí</span>
                            <span className={styles.cardSub}>No disponible</span>
                        </div>
                    )}

                    {settings.deliveryEnabled ? (
                        <Link href="/menu?type=delivery" className={styles.card}>
                            <div className={styles.iconWrapper}>
                                <ShoppingBag size={64} />
                            </div>
                            <span className={styles.cardLabel}>Delivery</span>
                            <span className={styles.cardSub}>Take away</span>
                        </Link>
                    ) : (
                        <div className={`${styles.card} ${styles.disabled}`} style={{ opacity: 0.5, cursor: 'not-allowed', borderColor: '#eee' }}>
                            <div className={styles.iconWrapper} style={{ backgroundColor: '#eee', color: '#ccc' }}>
                                <ShoppingBag size={64} />
                            </div>
                            <span className={styles.cardLabel} style={{ color: '#ccc' }}>Delivery</span>
                            <span className={styles.cardSub}>No disponible</span>
                        </div>
                    )}
                </div>
            </main>

            <footer className={styles.footer}>
                <Link href="/admin">Admin Access</Link>
            </footer>
        </div>
    )
}
