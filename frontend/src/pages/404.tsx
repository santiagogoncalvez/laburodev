import { Link } from "../components/Link"

export default function NotFoundPage () {
  return (
    <main style={{ maxWidth: '70rem', margin: '0 auto', padding: 'var(--space-7) var(--gutter)', textAlign: 'left' }}>
      <h1>404 · Página no encontrada</h1>
      <p style={{ color: 'var(--text-2)', margin: 'var(--space-2) 0 var(--space-5)' }}>La página que buscas no existe.</p>
      <Link href="/" className="btn btn-primary">Volver al inicio</Link>
    </main>
  )
}
