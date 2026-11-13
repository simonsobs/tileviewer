import { LOGIN_URL, LOGOUT_URL } from '../configs/mapConfigs';
import './styles/login.css';

export function Login({ isAuthenticated }: { isAuthenticated: boolean }) {
  const linkText = isAuthenticated ? 'Log Out' : 'Log In';
  const href = isAuthenticated ? LOGOUT_URL : LOGIN_URL;

  return (
    <button className="map-btn login-btn">
      <a href={href}>{linkText}</a>
      <img className="login-icon" src="/so-tileviewer.png" />
    </button>
  );
}
