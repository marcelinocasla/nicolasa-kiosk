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
          width={250}
          height={250}
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
