import { Navigate, Route, Routes } from 'react-router-dom';
import { Presenter } from './presenter/Presenter';
import { Admin } from './admin/Admin';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Presenter />} />
      <Route path="/admin" element={<Admin />} />
      {/* Anything else is a mistyped URL or a stale link; the show is the default. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
