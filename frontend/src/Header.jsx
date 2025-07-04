import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <header>
      <div className="container">
        <Link to="/" className="logo">
          <img src="/images/Logo.png" alt="Logo" className="logo-img" />
        </Link>
      </div>
    </header>
  );
}
