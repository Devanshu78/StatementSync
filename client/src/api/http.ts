import axios from "axios";

const baseURL = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL) ||
  process.env.VITE_API_URL ||  (import.meta.env.MODE === 'production' 
    ? 'https://your-app-name.vercel.app/api' 
    : process.env.VITE_API_URL);

export const http = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});


export function getBaseUrl() {
  return baseURL;
}


