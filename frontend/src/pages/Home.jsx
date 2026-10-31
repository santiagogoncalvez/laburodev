import { useRouter } from "../hooks/useRouter"
import { Search } from "lucide-react"
import styles from "./Home.module.css"

export default function HomePage () {
  const { navigateTo } = useRouter()

  const handleSearch = (event) => {
    event.preventDefault()
    const formData = new FormData(event.target)
    const searchTerm = formData.get('search')

    const url = searchTerm
      ? `/search?text=${encodeURIComponent(searchTerm)}`
      : '/search'

    navigateTo(url)
  }

  return (
    <main>
      <section className="jobs-search">
        <h1>Encontrá el trabajo que buscás</h1>
        <p>La comunidad de desarrolladores donde están las mejores oportunidades.</p>

        <form role="search" onSubmit={handleSearch}>
          <div className="search-bar">
            <Search size={20} aria-hidden="true" />

            <input
              name="search"
              required
              type="search"
              placeholder="Buscar empleos por título, habilidad o empresa"
            />

            <button className="btn btn-primary" type="submit">Buscar</button>
          </div>
        </form>
      </section>

      <section className={styles.section}>
        <header>
          <h2>¿Por qué laburoDev?</h2>
          <p>Conectamos a los mejores talentos con las empresas más innovadoras.</p>
        </header>

        <div className={styles.rows}>
          <article className={styles.row}>
            <h3>Encontrá el trabajo de tus sueños</h3>
            <p>Busca miles de empleos de las mejores empresas de todo el mundo.</p>
          </article>

          <article className={styles.row}>
            <h3>Conecta con las mejores empresas</h3>
            <p>Conecta con empresas que están contratando por tus habilidades.</p>
          </article>

          <article className={styles.row}>
            <h3>Obtén el salario que mereces</h3>
            <p>Obtén el salario que mereces con nuestra calculadora de salarios.</p>
          </article>
        </div>

      </section>
    </main>
  )
}
