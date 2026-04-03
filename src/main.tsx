import '@fontsource-variable/manrope'
import '@fontsource-variable/space-grotesk'
import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AppRouter } from './router'
import './i18n'
import './index.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found')
}

createRoot(rootElement).render(
  <ErrorBoundary>
    <AppRouter />
  </ErrorBoundary>,
)
