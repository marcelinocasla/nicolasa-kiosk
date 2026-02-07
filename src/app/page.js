import Image from 'next/image'
import Link from 'next/link'
import styles from './page.module.css'

export default function Home() {
  return (
    <Link href="/order-type" className={styles.main}>
      <div className={styles.logoContainer}>
        <Image
          src="/logo.png"
          alt="Restaurante Nicolasa"
          fill
          sizes="(max-width: 600px) 180px, 250px"
          style={{ objectFit: 'contain', padding: '15px' }}
          priority
        />
      </div>

      <h1 className={styles.title}>Restaurante Nicolasa</h1>
      <p className={styles.subtitle}>"El sabor de la Abuela"</p>

      <div className={styles.tapHelper}>
        Toca para comenzar
      </div>
    </Link>
  )
}
