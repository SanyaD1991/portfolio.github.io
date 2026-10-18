import { Link, Outlet, useLocation } from 'react-router-dom'

export function Layout() {
  const { pathname } = useLocation()
  const isAdmin = pathname.startsWith('/admin') || pathname.startsWith('/login')
  const isPublic = !isAdmin

  return (
    <div className={`app-shell is-public ${isAdmin ? 'is-admin' : ''}`}>
      <header className="topbar">
        <Link to="/" className="brand">{isPublic ? 'Демедюк А. С.' : 'Демедюк А. С. · Конструктор'}</Link>
        <nav>
          <Link to="/">Портфолио</Link>
          {isAdmin && <Link to="/admin">Редактор</Link>}
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
