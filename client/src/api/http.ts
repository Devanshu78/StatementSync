import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL ||  (import.meta.env.MODE === 'production' 
    ? 'https://statement-sync.vercel.app/api' 
    : 'http://localhost:4000/api');

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


