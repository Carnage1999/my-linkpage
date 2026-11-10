import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import App from './App'

const ManagePage = lazy(() =>
  import('./pages/manage/ManagePage').then((module) => ({ default: module.ManagePage })),
)

function Spinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="size-8 animate-spin rounded-full border-4 border-slate-300 border-t-slate-600 dark:border-slate-700 dark:border-t-slate-300" />
    </div>
  )
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route
          path="/manage"
          element={
            <Suspense fallback={<Spinner />}>
              <ManagePage />
            </Suspense>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
