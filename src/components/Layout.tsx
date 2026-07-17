import { Link, Outlet } from 'react-router-dom'

export function Layout() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand">PORTFOLIO / BUILDER</Link>
        <nav>
          <Link to="/">Портфолио</Link>
          <Link to="/admin">Редактор</Link>
        </nav>
      </header>
      <Outlet />
    </div>
  )
}
