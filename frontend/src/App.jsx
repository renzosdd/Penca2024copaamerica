import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './Login';
import Dashboard from './Dashboard';
import Admin from './Admin';
import OwnerPanel from './OwnerPanel';
import Header from './Header';
import Footer from './Footer';

export default function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/owner" element={<OwnerPanel />} />
        <Route path="/admin/edit" element={<Admin />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  );
}
