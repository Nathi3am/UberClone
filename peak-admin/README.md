VexoMove Admin

This is a minimal Vite + React admin frontend to manage VexoMove.

Install:

npm install

Run dev server (port 5174):

npm run dev

Notes:
- The admin frontend expects the backend at http://localhost:4000
- Login posts to /users/login and the token + user.role must be saved to localStorage
- Protected routes require `localStorage.role === 'admin'` and a valid `token`
