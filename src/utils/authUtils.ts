function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

/** Checks the auth cookies to determine if the user is logged in */
export function getIsAuthenticated(): boolean {
  const hasAccessToken = getCookie('valid_access_token');
  const hasRefreshToken = getCookie('valid_refresh_token');
  return !!hasAccessToken && !!hasRefreshToken;
}
