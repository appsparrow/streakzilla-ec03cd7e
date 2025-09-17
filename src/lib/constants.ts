// App constants and configuration
export const SITE_URL = import.meta.env.PROD 
  ? 'https://streakzilla.com' 
  : 'http://localhost:8080';

export const getRedirectUrl = (path: string = '/') => {
  return `${SITE_URL}${path}`;
};
