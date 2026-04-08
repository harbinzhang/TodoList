import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AppProviders } from './providers/AppProviders.tsx'
import StartupErrorScreen from './components/common/StartupErrorScreen.tsx'
import { getStartupError } from './config/hostedSafety.ts'

const startupError = getStartupError();
const isHostedBuild = import.meta.env.PROD;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {startupError ? (
      <StartupErrorScreen error={startupError} isHostedBuild={isHostedBuild} />
    ) : (
      <AppProviders>
        <App />
      </AppProviders>
    )}
  </StrictMode>,
)
