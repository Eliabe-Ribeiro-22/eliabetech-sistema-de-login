import { Suspense } from 'react';
import Home from './home';
export default function Page(){return <Suspense fallback={<main className="shell">Carregando…</main>}><Home/></Suspense>}
