import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth';
import Shell from './components/Shell';
import AuthForm from './pages/AuthForm';
import Jobs from './pages/Jobs';
import Job from './pages/Job';
import Candidate from './pages/Candidate';

function Private({ children }) {
  const { user } = useAuth();
  if (user === undefined) return null;
  return user ? children : <Navigate to="/login" replace />;
}

function Guest({ children }) {
  const { user } = useAuth();
  if (user === undefined) return null;
  return user ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Guest><AuthForm mode="login" /></Guest>} />
      <Route path="/register" element={<Guest><AuthForm mode="register" /></Guest>} />
      <Route element={<Private><Shell /></Private>}>
        <Route index element={<Jobs />} />
        <Route path="jobs/:id" element={<Job />} />
        <Route path="candidates/:id" element={<Candidate />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
