// Central API base URL for frontend requests.
// Resolution order: VITE_BASE_URL -> VITE_API_URL -> default localhost.
export const API_BASE_URL = import.meta.env.VITE_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default API_BASE_URL;
