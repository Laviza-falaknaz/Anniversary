import { SessionProvider, useSession } from './lib/session'
import { DataProvider, useData } from './lib/store'
import { useRoute } from './lib/router'
import { Gate } from './pages/Gate'
import { Shell } from './components/Shell'
import { Home } from './pages/Home'
import { Letters } from './pages/Letters'
import { Keepsakes } from './pages/Keepsakes'
import { Play } from './pages/Play'
import { Tonight } from './pages/Tonight'
import { Activity } from './pages/Activity'
import { ErrorBox, Spinner } from './components/ui'
import { useEffect } from 'react'
import { applyCalm } from './lib/prefs'

function Routes() {
  const route = useRoute()
  const { status, data, refresh } = useData()
  useEffect(() => { window.scrollTo({ top: 0 }) }, [route])
  if (!data) {
    return status === 'error'
      ? <div className="mx-auto max-w-md pt-24 px-4"><ErrorBox message="We couldn't reach the server. Check your connection." onRetry={() => void refresh()} /></div>
      : <Spinner label="Opening our little world" />
  }
  const seg = route.split('/').filter(Boolean)
  let page
  switch (seg[0]) {
    case 'letters': page = <Letters />; break
    case 'keepsakes': page = <Keepsakes tab={seg[1]} />; break
    case 'play': page = <Play sub={seg[1]} />; break
    case 'tonight': page = <Tonight />; break
    case 'activity': page = <Activity />; break
    case undefined: page = <Home />; break
    default: page = (
      <div className="card mx-auto max-w-md p-8 text-center"><p className="serif text-3xl">Nothing here</p><p className="mt-2 text-chocolate/75">That page wandered off.</p><a href="#/" className="btn btn-primary mt-4">Back home</a></div>
    )
  }
  return <>{page}</>
}

function Inner() {
  const { authed, who } = useSession()
  useEffect(() => { applyCalm() }, [])
  if (!authed || !who) return <Gate />
  return (
    <DataProvider>
      <Shell><Routes /></Shell>
    </DataProvider>
  )
}

export default function App() {
  return <SessionProvider><Inner /></SessionProvider>
}
