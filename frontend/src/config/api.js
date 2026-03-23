// Central API base URL for frontend requests.
// Resolution order: VITE_BASE_URL -> VITE_API_URL -> default https://vexomove.onrender.com.
export const API_BASE_URL = import.meta.env.VITE_BASE_URL || import.meta.env.VITE_API_URL || 'https://vexomove.onrender.com';

export default API_BASE_URL;
