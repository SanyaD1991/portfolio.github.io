import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Layout } from './components/Layout'
import { PublicHome } from './pages/PublicHome'
import { PortfolioPage } from './pages/PortfolioPage'
import { LoginPage } from './pages/LoginPage'
import { AdminPage } from './pages/AdminPage'
import { AuthProvider } from './pages/auth-context'

const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <Layout />,
      children: [
        {
          index: true,
          element: <PublicHome />,
        },
        {
          path: 'p/:slug',
          element: <PortfolioPage />,
        },
        {
          path: 'login',
          element: <LoginPage />,
        },
        {
          path: 'admin',
          element: <AdminPage />,
        },
      ],
    },
  ],
  {
    basename: '/portfolio.github.io',
  },
)

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}