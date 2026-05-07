const stripTrailingSlash = (value) => value.replace(/\/+$/, "");

const getBrowserOrigin = () => {
  if (typeof window === "undefined") {
    return "http://localhost:5173";
  }

  return window.location.origin;
};

const getDefaultApiBaseUrl = () => {
  return "/api/v1";
};

export const PUBLIC_APP_URL = stripTrailingSlash(
  import.meta.env.VITE_PUBLIC_APP_URL || getBrowserOrigin(),
);

export const NGROK_APP_URL = stripTrailingSlash(
  import.meta.env.VITE_NGROK_APP_URL || "https://uninclusive-unpatronizable-ossie.ngrok-free.dev",
);

export const API_BASE_URL = stripTrailingSlash(
  import.meta.env.VITE_API_BASE_URL || getDefaultApiBaseUrl(),
);

export const isLocalOnlyHost = (value) =>
  /\/\/(localhost|127(?:\.\d{1,3}){3})(?::|\/|$)/i.test(value);
