const fallbackApiUrl = 'http://127.0.0.1:8000';

export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || fallbackApiUrl;

export const apiUrl = (path: string) =>
  `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
