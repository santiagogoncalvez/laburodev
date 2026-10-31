export function Footer () {
  const year = new Date().getFullYear();
  return (
    <footer>
      <div className="footer-inner">
        <small>&copy; {year} laburoDev. Todos los derechos reservados.</small>
      </div>
    </footer>
  )
}