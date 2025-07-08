import { useEffect } from 'react';
import { LOGIN_URL, LOGOUT_URL } from '../configs/mapSettings';
import { getCookie } from '../utils/fetchUtils';
import './styles/login.css';

export function Login({
  isAuthenticated,
  setIsAuthenticated,
}: {
  isAuthenticated: boolean | null;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
}) {
  useEffect(() => {
    const hasAccessToken = getCookie('validate_access_token');
    const hasRefreshToken = getCookie('valid_refresh_token');

    setIsAuthenticated(!!hasAccessToken && !!hasRefreshToken);
  }, []);

  if (isAuthenticated === null) return null;

  const linkText = isAuthenticated ? 'Log out' : 'Log in';
  const href = isAuthenticated ? LOGOUT_URL : LOGIN_URL;

  return (
    <div className="login-container">
      <a href={href}>{linkText}</a>
    </div>
  );
}
