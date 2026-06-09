import { useEffect } from 'react';
import { LOGIN_URL, LOGOUT_URL } from '../configs/mapConfigs';
import './styles/login.css';

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

export function Login({
  isAuthenticated,
  setIsAuthenticated,
}: {
  isAuthenticated: boolean | null;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
}) {
  useEffect(() => {
    const hasAccessToken = getCookie('valid_access_token');
    const hasRefreshToken = getCookie('valid_refresh_token');

    setIsAuthenticated(!!hasAccessToken && !!hasRefreshToken);
  }, [setIsAuthenticated]);

  if (isAuthenticated === null) return null;

  const linkText = isAuthenticated ? 'Log Out' : 'Log In';
  const href = isAuthenticated ? LOGOUT_URL : LOGIN_URL;

  return (
    <button className="map-btn login-btn">
      <a href={href}>{linkText}</a>
      <img className="login-icon" src="/so-tileviewer.png" />
    </button>
  );
}
