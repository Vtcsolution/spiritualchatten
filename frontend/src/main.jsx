// main.jsx - UPDATED
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import axios from 'axios';
import './index.css';
import App from './App.jsx';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './All_Components/screen/AuthContext';
import { AdminAuthProvider } from './context/AdminAuthContext';
import PaymentModal from './All_Components/screen/PaymentModal';
import { PaymentModalProvider } from './context/PaymentModalContext';
import { PsychicAuthProvider } from './context/PsychicAuthContext';

// The backend's session/visitor-tracking cookie is only ever set/read if
// requests actually carry credentials cross-origin (frontend and API live
// on different subdomains). Without this, the backend can never recognize
// a returning visitor, and creates a brand new "visitor" on every request —
// which is why the admin visitor stats have been wildly inflated/inaccurate.
axios.defaults.withCredentials = true;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AdminAuthProvider>
          <PsychicAuthProvider>
            <PaymentModalProvider>
              <App />
              <PaymentModal />
            </PaymentModalProvider>
          </PsychicAuthProvider>
        </AdminAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);