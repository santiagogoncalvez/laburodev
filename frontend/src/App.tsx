import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router'

import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { RouteFallback } from '@/components/RouteFallback'
import { ScrollToTop } from '@/components/ScrollToTop'

const HomePage = lazy(() => import('@/pages/Home'))
const SearchPage = lazy(() => import('@/pages/Search'))
const NotFoundPage = lazy(() => import('@/pages/404'))
const JobDetail = lazy(() => import('@/pages/Detail'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
const Login = lazy(() => import('@/pages/Login'))
const Register = lazy(() => import('@/pages/Register'))

function App() {
  return (
    <>
      <ScrollToTop />
      <Header />

      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/jobs/:jobId" element={<JobDetail />} />
          <Route path="/profile" element={
            <ProtectedRoute redirectTo="/login">
              <ProfilePage />
            </ProtectedRoute>
          } />
          <Route path="*" element={<NotFoundPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </Suspense>
      <Footer />
    </>
  )
}

export default App
