import { Link, Outlet, useLocation } from 'react-router-dom'

export function Layout() {
  const { pathname } = useLocation()
  const isPublic = !pathname.startsWith('/admin') && !pathname.startsWith('/login')

  return (
    <div className={`app-shell ${isPublic ? 'is-public' : ''}`}>
      <header className="topbar">
        <Link to="/" className="brand">{isPublic ? 'Демедюк А. С.' : 'PORTFOLIO / BUILDER'}</Link>
        <nav>
          <Link to="/">Портфолио</Link>
          {!isPublic && <Link to="/admin">Редактор</Link>}
        </nav>
      </header>
      <Outlet />
      {isPublic && (
        <footer className="site-footer">
          <span>© {new Date().getFullYear()} Демедюк Александр Сергеевич</span>
          <Link to="/admin">Вход для редактора</Link>
        </footer>
      )}
    </div>
  )
}
