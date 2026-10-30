import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Layout } from './ui/Layout';
import { useStore } from './store/store';
import { useBadgeWatcher } from './ui/Celebrate';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const PathMap = lazy(() => import('./pages/PathMap'));
const LessonPage = lazy(() => import('./pages/LessonPage'));
const Practice = lazy(() => import('./pages/Practice'));
const ExamLobby = lazy(() => import('./pages/ExamLobby'));
const ExamRunner = lazy(() => import('./pages/ExamRunner'));
const ExamReview = lazy(() => import('./pages/ExamReview'));
const Flashcards = lazy(() => import('./pages/Flashcards'));
const Builder = lazy(() => import('./pages/Builder'));
const Patterns = lazy(() => import('./pages/Patterns'));
const Services = lazy(() => import('./pages/Services'));
const Labs = lazy(() => import('./pages/Labs'));
const Plan = lazy(() => import('./pages/Plan'));
const Profile = lazy(() => import('./pages/Profile'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const ConsoleApp = lazy(() => import('./console/ConsoleApp'));

export function App() {
  const theme = useStore((s) => s.profile.theme);
  const onboarded = useStore((s) => s.profile.onboarded);
  const loc = useLocation();
  useBadgeWatcher();
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);

  const fallback = <div className="p-10 text-muted">Loading…</div>;
  if (!onboarded) return <Suspense fallback={fallback}><Onboarding /></Suspense>;
  if (loc.pathname.startsWith('/console')) return <Suspense fallback={fallback}><ConsoleApp /></Suspense>;
  return (
    <Layout>
      <Suspense fallback={fallback}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/path" element={<PathMap />} />
          <Route path="/lesson/:id" element={<LessonPage />} />
          <Route path="/practice" element={<Practice />} />
          <Route path="/exam" element={<ExamLobby />} />
          <Route path="/exam/:attemptId" element={<ExamRunner />} />
          <Route path="/review/:attemptId" element={<ExamReview />} />
          <Route path="/flashcards" element={<Flashcards />} />
          <Route path="/builder" element={<Builder />} />
          <Route path="/builder/:id" element={<Builder />} />
          <Route path="/patterns" element={<Patterns />} />
          <Route path="/patterns/:id" element={<Patterns />} />
          <Route path="/services" element={<Services />} />
          <Route path="/services/:id" element={<Services />} />
          <Route path="/labs" element={<Labs />} />
          <Route path="/plan" element={<Plan />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}
