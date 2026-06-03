// App.jsx - UPDATED VERSION
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Navbar from "./All_Components/Navbar";
import Dashboard from "./All_Components/Dashboard";
import Account from "./All_Components/Account";
import Appointments from "./All_Components/Appointments";
import My_Consultations from "./All_Components/My_Consultations";
import Reviews from "./All_Components/Reviews";
import Transactions from "./All_Components/Transactions";
import Vouchers from "./All_Components/Vouchers";
import Favourites from "./All_Components/Favourites";
import Home from "./All_Components/Home";
import UpdateProfile from "./All_Components/UpdateProfile";
import { Toaster } from "./components/ui/sonner";
import NotificationsPage from "./All_Components/Short_COmponents/All_Notifications";

import AOS from 'aos';
import 'aos/dist/aos.css';

import Admin_Dashboard from "./Admin_Dashboard/Admin_Dashboard";
import Transactionss from "./Admin_Dashboard/Transactions"
import Reviewss from "./Admin_Dashboard/Reviews"
import Add_Advisor from "./Admin_Dashboard/Add_Advisor"
import Send_Mail from "./Admin_Dashboard/SendMail";
import ModernFooter from "./All_Components/Footer"

import TermsAndConditions from "./All_Components/Terms_and_Conditions"
import AboutPage from "./All_Components/About"
import ContactPage from "./All_Components/Contact"
import AllUsers from "./Admin_Dashboard/AllUsers"
import AllAdvisors from "./Admin_Dashboard/AllAdvisors"
import AI_Inputs_Data from "./Admin_Dashboard/AI_Inputs_data"
import AllNotifications from "./Admin_Dashboard/AllNotification"
import Update_Terms_Confitions from "./Admin_Dashboard/Update_TermConditions"
import Update_About from "./Admin_Dashboard/Update_About"
import UserChats from "./Admin_Dashboard/UserChats"
import UserChatDetail from "./Admin_Dashboard/UserChatDetail"
import AdminUpdateProfile from "./Admin_Dashboard/AdminUpdateProfile"
import AdminProfile from "./Admin_Dashboard/Admin_Profile"
import Admin_login from "./Admin_Dashboard/Admin_login"
import User_Details from "./Admin_Dashboard/User_Details"
import VisitorStats from "./Admin_Dashboard/VisitorStats"

import Scroll from "./All_Components/Scroll";
import AI_Talk_Form from "./All_Components/AI_Talk_Form";
import { InputOTPDemo } from "./All_Components/Otp_Verification";
import Signup from "./All_Components/screen/Signup";
import Signin from "./All_Components/screen/Signin";
import Forgot_Password from "./All_Components/screen/Forgot_Password";
import Reset_Password from "./All_Components/screen/Reset_Password";
import { useEffect, useState } from "react";
import ProtectedRoute from "./All_Components/screen/ProtectedRoute";
import PageNotFound from "./All_Components/screen/PageNotFound";
import PaymentResult from "./All_Components/screen/PaymentResult";
import PaymentRedirectHandler from "./All_Components/screen/PaymentRedirectHandler";
import VideoThumbnailUpdater from "./Admin_Dashboard/VideoThumbnailUpdater";
import PsychicDashboard from "./Psychic_Dashboard/PsychicDashboard";
import PsychicLogin from "./Psychic_Dashboard/PsychicLogin";
import PsychicRegister from "./Psychic_Dashboard/PsychicRegister";
import PsychicProtectedRoute from "./context/PsychicProtectedRoute";
import ChatInterface from "./Chatbot/ChatInterface";
import PsychicChats from "./Psychic_Dashboard/PsychicChats";
import PsychicEarnings from "./Psychic_Dashboard/PsychicEarnings";
import PsychicReviews from "./Psychic_Dashboard/PsychicReviews";
import PsychicSettings from "./Psychic_Dashboard/PsychicSettings";
import PsychicNavbar from "./Psychic_Dashboard/PsychicNavbar";
import PsychicSidebar from "./Psychic_Dashboard/PsychicSidebar";
import HumanPsychicProfile from './Psychic_Dashboard/HumanPsychicProfile'
import AdminProtectedRoute from "./context/AdminProtectedRoute";
import AdminReviews from "./Admin_Dashboard/HumanChat/AdminReviews";

import AdminHumanChatDashboard from "./Admin_Dashboard/HumanChat/AdminHumanChatDashboard";
import ChatDetails from "./Admin_Dashboard/HumanChat/ChatDetails";
import UserChatSessions from "./Admin_Dashboard/HumanChat/UserChatSessions";
import AdminPsychicData from "./Admin_Dashboard/HumanChat/AdminPsychicData";
import AdminPsychicsDataById from "./Admin_Dashboard/HumanChat/AdminPsychicsDataById";
import HumanCoachList from "./Admin_Dashboard/HumanChat/HumanCoachList";
import AddPsychic from "./Admin_Dashboard/HumanChat/AddPsychic";
import Golive from "./Psychic_Dashboard/Golive";
import PsychicProfile from "./All_Components/PsychicProfile";
import Psychics from "./All_Components/Psychics";
import AudioCallPage from "./Audio/AudioCallPage";
import { useAuth } from "./All_Components/screen/AuthContext";
import { usePsychicAuth } from "./context/PsychicAuthContext";
import { SocketProvider } from "./context/SocketContext";
import PsychicCallHistoryPage from "./Psychic_Dashboard/PsychicCallHistoryPage";

// Import PsychicAuthProvider
import { PsychicAuthProvider } from "./context/PsychicAuthContext";
import PsychicActiveCallPage from "./Psychic_Dashboard/PsychicActiveCallPage";
import ChatSessions from "./All_Components/ChatSessions";
import MyWallet from "./All_Components/Mywallet";
import PsychicForgotPassword from "./Psychic_Dashboard/PsychicForgotPassword";
import PsychicResetPassword from "./Psychic_Dashboard/PsychicResetPassword";
import PsychicEarningsPayment from "./Admin_Dashboard/HumanChat/PsychicEarningsPayment";
import BlogsList from "./Admin_Dashboard/HumanChat/BlogsList";
import AddBlog from "./Admin_Dashboard/HumanChat/AddBlog";
import EditBlog from "./Admin_Dashboard/HumanChat/EditBlog";
import BlogsPage from "./All_Components/BlogsPage";
import BlogDetail from "./All_Components/BlogDetail";
import AdminComments from "./Admin_Dashboard/AdminComments";
import AdminHome from "./Admin_Dashboard/Pages/AdminHome";
import AdminAbout from "./Admin_Dashboard/Pages/AdminAbout";
import AdminContact from "./Admin_Dashboard/Pages/AdminContact";
import AdminTerms from "./Admin_Dashboard/Pages/AdminTerms";
import AdminFooter from "./Admin_Dashboard/Pages/AdminFooter";
import AdminPayments from "./Admin_Dashboard/Pages/AdminPayments";
import './App.css';
import AdminPsychicsPage from "./Admin_Dashboard/Pages/AdminPsychicsPage";


const App = () => {
  const [side, setSide] = useState(false);
  const location = useLocation();
  const [openPaymentModal, setOpenPaymentModal] = useState(null);
  const { user } = useAuth();
  
  // ✅ UPDATED: Added all routes that should hide navbar and footer
  const hideNavbarAndFooterRoutes = [
    // Admin routes
    "/admin/login",
    "/admin/dashboard",
    "/admin/dashboard/transactions",
    "/admin/dashboard/reviews",
    "/admin/dashboard/human-chat",
    "/admin/dashboard/chat-details/:id",
    "/admin/dashboard/add-advisor",
    "/admin/dashboard/humancoach",
    "/admin/dashboard/sendmail",
    "/admin/dashboard/allusers",
    "/admin/dashboard/visitors",
    "/admin/dashboard/alladvisors",
    "/admin/dashboard/inputs-data",
    "/admin/dashboard/all-notifications",
    "/admin/dashboard/update-conditions",
    "/admin/dashboard/update-about",
    "/admin/dashboard/user-details/:userId",
    "/admin/dashboard/users-chat",
    "/admin/dashboard/user-chat-detail",
    "/admin/dashboard/updateprofile",
    "/admin/dashboard/human-reviews",
    "/admin/dashboard/profile",
    "/admin/dashboard/chats/:psychicid",
    "/admin/dashboard/add-humancoach",
    "/admin/dashboard/newcoach",
    "/admin/dashboard/chat-details/:chatSessionId",
    
    // Psychic auth routes
    "/psychic/login",
    "/psychic/register",
     "/psychic/forgot-password",
  "/psychic/reset-password/:resetToken",
    // ✅ ADDED: Chat interface routes (should not show footer)
    "/message/:psychic_id",
    
    // ✅ ADDED: Audio call routes
    "/audio-call/:callSessionId",
    "/call-history",
    
    // ✅ ADDED: Psychic call routes
    "/psychic/call/:callRequestId",
    "/psychic/dashboard/call-history",
  ];

  const dynamicRoutePatterns = [
    /^\/admin-dashboard-doctor\/.+$/,
    /^\/reset-password\/.+$/,
    /^\/message\/.+$/, // ✅ Added message routes pattern
    /^\/chat\/.+$/, // ✅ Added chat routes pattern
    /^\/psychic\/dashboard\/.+$/, // ✅ Added psychic dashboard sub-routes pattern
    /^\/audio-call\/.+$/, // ✅ Added audio call routes pattern
    /^\/psychic\/call\/.+$/, // ✅ Added psychic call routes pattern
  ];

  // ✅ UPDATED: Check if route should show navbar
  const shouldShowNavbar = !(
    hideNavbarAndFooterRoutes.includes(location.pathname) ||
    dynamicRoutePatterns.some((pattern) => pattern.test(location.pathname)) ||
    location.pathname.startsWith('/psychic/dashboard') ||
    location.pathname === '/psychic/login' ||
    location.pathname === '/psychic/register' ||
    location.pathname.startsWith('/message/') ||
    location.pathname.startsWith('/chat/') ||
    location.pathname.startsWith('/audio-call/') ||
    location.pathname === '/call-history' ||
    location.pathname.startsWith('/psychic/call/')
  );

  // ✅ Check if we're on psychic dashboard routes
  const isPsychicRoute = location.pathname.startsWith('/psychic/dashboard') || 
                         location.pathname === '/psychic/login' || 
                         location.pathname === '/psychic/register' ||
                         location.pathname.startsWith('/psychic/call/') ||
                         location.pathname === '/psychic/dashboard/call-history';

  // ✅ Check if we're on chat interface routes (should not show footer)
  const isChatInterfaceRoute = location.pathname.startsWith('/message/') || 
                               location.pathname.startsWith('/chat/') ||
                               location.pathname.startsWith('/audio-call/') ||
                               location.pathname === '/call-history' ||
                               location.pathname.startsWith('/psychic/call/') ||
                               location.pathname === '/psychic/dashboard/call-history';

  useEffect(() => {
    AOS.init({ duration: 800 });
  }, []);

  const getSocketUserInfo = () => {
    if (location.pathname.startsWith('/psychic')) {
      // Check if psychic is authenticated via localStorage
      const psychicToken = localStorage.getItem('psychicToken');
      const psychicId = localStorage.getItem('psychicId');
      
      if (psychicToken && psychicId) {
        return {
          userType: 'psychic',
          userId: psychicId,
          token: psychicToken
        };
      }
    } else if (user) {
      // User is authenticated via AuthContext
      const userToken = localStorage.getItem('token');
      return {
        userType: 'user',
        userId: user._id,
        token: userToken
      };
    }
    return null;
  };

  const socketUserInfo = getSocketUserInfo();

  return (
    <div className="min-h-screen flex flex-col">
      <SocketProvider
        userType={socketUserInfo?.userType}
        userId={socketUserInfo?.userId}
        token={socketUserInfo?.token}
      >
        {/* Wrap psychic routes with PsychicAuthProvider */}
        <PsychicAuthProvider>
          <Scroll />
          
          {/* Conditionally render Navbar or PsychicNavbar */}
          {isPsychicRoute && location.pathname !== '/psychic/login' && location.pathname !== '/psychic/register' ? (
            <PsychicNavbar side={side} setSide={setSide} />
          ) : shouldShowNavbar && (
            <Navbar onOpenPaymentModal={(fn) => setOpenPaymentModal(() => fn)} />
          )}
          
          <div className="flex flex-1">
            {/* Show PsychicSidebar only on psychic dashboard routes */}
            {isPsychicRoute && location.pathname !== '/psychic/login' && location.pathname !== '/psychic/register' && !location.pathname.startsWith('/psychic/call/') && (
              <PsychicSidebar side={side} />
            )}
            
            <main className={`flex-1 ${isPsychicRoute && !location.pathname.startsWith('/psychic/call/') ? 'ml-0 lg:ml-64' : ''} ${isPsychicRoute && location.pathname !== '/psychic/login' && location.pathname !== '/psychic/register' ? 'mt-16' : ''}`}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                
                {/* User Routes */}
                <Route path="/account" element={
                  <ProtectedRoute>
                    <Account />
                  </ProtectedRoute>
                } />
                
                <Route path="/appointments" element={
                  <ProtectedRoute>
                    <Appointments />
                  </ProtectedRoute>
                } />
                
                <Route path="/consultations" element={
                  <ProtectedRoute>
                    <My_Consultations />
                  </ProtectedRoute>
                } />
                
                <Route path="/reviews" element={<Reviews />} />
                
                <Route path="/transactions" element={
                  <ProtectedRoute>
                    <Transactions />
                  </ProtectedRoute>
                } />
                
                <Route path="/vouchers" element={<Vouchers />} />
                <Route path="/audio-call/:callSessionId" element={
                  <ProtectedRoute>
                    <AudioCallPage />
                  </ProtectedRoute>
                } />
                
              

                <Route path="/favourites" element={
                  <ProtectedRoute>
                    <Favourites />
                  </ProtectedRoute>
                } />

                
                
                <Route path="/update-profile" element={
                  <ProtectedRoute>
                    <UpdateProfile />
                  </ProtectedRoute>
                } />
                
                {/* Other Routes */}
                <Route path="/all-notifications" element={<NotificationsPage />} />

          <Route path="/wallet" element={<MyWallet />} />

                <Route path="/form-fill" element={<AI_Talk_Form />} />
                <Route path="/terms-&-conditions" element={<TermsAndConditions />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/psychics" element={<Psychics />} />
                <Route path="/blogs" element={<BlogsPage />} />
                <Route path="/blog/:id" element={<BlogDetail />} /> 
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/otp-verification" element={<InputOTPDemo />} />
                <Route path="/register" element={<Signup />} />
                <Route path="/login" element={<Signin />} />
                <Route path="/forgot-password" element={<Forgot_Password />} />
                <Route path="/reset-password/:token" element={<Reset_Password />} />
                <Route path="/payment/result" element={<PaymentResult />} />
                <Route path="/payment/result/:id" element={<PaymentResult />} />
                
                <Route path="/psychic/:psychicId" element={<PsychicProfile />} />
                
                <Route path="/payment/result-temp" element={<PaymentRedirectHandler />} />
                
                {/* Chat Interface Route */}
                <Route path="/message/:psychic_id" element={
                  <ProtectedRoute>
                    <ChatInterface />
                  </ProtectedRoute>
                } />
                <Route path="/chat-sessions" element={
                   <ProtectedRoute>
                  <ChatSessions />
                  </ProtectedRoute>
                  } />

                {/* Admin Routes */}
                <Route path="/admin/login" element={<Admin_login />} />

                <Route path="/admin/dashboard" element={
                  <AdminProtectedRoute><Admin_Dashboard /></AdminProtectedRoute>
                } />
                <Route path="/admin/dashboard/transactions" element={
                  <AdminProtectedRoute><Transactionss /></AdminProtectedRoute>
                } />
                <Route path="/admin/dashboard/reviews" element={
                  <AdminProtectedRoute><Reviewss /></AdminProtectedRoute>
                } />
                <Route path="/admin/dashboard/add-advisor" element={
                  <AdminProtectedRoute><Add_Advisor /></AdminProtectedRoute>
                } />
                <Route path="/admin/dashboard/sendmail" element={
                  <AdminProtectedRoute><Send_Mail /></AdminProtectedRoute>
                } />

                <Route path="/admin/dashboard/human-reviews" element={
                  <AdminProtectedRoute><AdminReviews /></AdminProtectedRoute>
                } />

               
                <Route
                  path="/admin/dashboard/visitors"
                  element={<AdminProtectedRoute><VisitorStats side={side} setSide={setSide} /></AdminProtectedRoute>}
                />
                <Route path="/admin/dashboard/allusers" element={
                  <AdminProtectedRoute><AllUsers /></AdminProtectedRoute>
                } />

                <Route path="/admin/dashboard/psychic-earnings" element={
  <AdminProtectedRoute>
    <PsychicEarningsPayment />
  </AdminProtectedRoute>
} />

 <Route path="/admin/dashboard/blogs" element={
  <AdminProtectedRoute>
    <BlogsList />
  </AdminProtectedRoute>
} />
<Route path="/admin/dashboard/blogs/add" element={
  <AdminProtectedRoute>
    <AddBlog />
  </AdminProtectedRoute>
} />

<Route path="/admin/dashboard/blogs/edit/:id" element={
        <AdminProtectedRoute>
          <EditBlog />
        </AdminProtectedRoute>
      } />
<Route path="/admin/dashboard/comments" element={
        <AdminProtectedRoute>
          <AdminComments />
        </AdminProtectedRoute>
      } />
      <Route path="/admin/dashboard/pages/home" element={
        <AdminProtectedRoute>
          <AdminHome />
        </AdminProtectedRoute>
      } />
      <Route path="/admin/dashboard/pages/about" element={
        <AdminProtectedRoute>
          <AdminAbout />
        </AdminProtectedRoute>
      } />

<Route path="/admin/dashboard/pages/contact" element={
        <AdminProtectedRoute>
          <AdminContact />
        </AdminProtectedRoute>
      } />
      <Route path="/admin/dashboard/pages/terms" element={
        <AdminProtectedRoute>
          <AdminTerms />
        </AdminProtectedRoute>
      } />

 <Route path="/admin/dashboard/pages/footer" element={
        <AdminProtectedRoute>
          <AdminFooter />
        </AdminProtectedRoute>
      } />
      <Route path="/admin/dashboard/pages/psychics" element={
        <AdminProtectedRoute>
          <AdminPsychicsPage />
        </AdminProtectedRoute>
      } />

      <Route path="/admin/dashboard/pages/packages" element={
        <AdminProtectedRoute>
          <AdminPayments />
        </AdminProtectedRoute>
      } />

                <Route path="/admin/dashboard/alladvisors" element={
                  <AdminProtectedRoute><AllAdvisors /></AdminProtectedRoute>
                } />
                <Route path="/admin/dashboard/inputs-data" element={
                  <AdminProtectedRoute><AI_Inputs_Data /></AdminProtectedRoute>
                } />

                <Route path="/admin/dashboard/newcoach" element={
                  <AdminProtectedRoute><HumanCoachList /></AdminProtectedRoute>
                } />

                <Route path="/admin/dashboard/add-humancoach" element={
                  <AdminProtectedRoute><AddPsychic /></AdminProtectedRoute>
                } />
                <Route path="/admin/dashboard/all-notifications" element={
                  <AdminProtectedRoute><AllNotifications /></AdminProtectedRoute>
                } />
                <Route path="/admin/dashboard/update-conditions" element={
                  <AdminProtectedRoute><Update_Terms_Confitions /></AdminProtectedRoute>
                } />

                <Route path="/admin/dashboard/user-details/:userId" element={<AdminProtectedRoute><User_Details /></AdminProtectedRoute>} />

                <Route path="/admin/dashboard/update-about" element={
                  <AdminProtectedRoute><Update_About /></AdminProtectedRoute>
                } />
                <Route path="/admin/dashboard/users-chat" element={
                  <AdminProtectedRoute><UserChats /></AdminProtectedRoute>
                } />
                <Route path="/admin/dashboard/user-chat-detail/:chatId" element={
                  <AdminProtectedRoute><UserChatDetail /></AdminProtectedRoute>
                } />
                <Route path="/admin/dashboard/updateprofile" element={
                  <AdminProtectedRoute><AdminUpdateProfile /></AdminProtectedRoute>
                } />
                <Route path="/admin/dashboard/profile" element={
                  <AdminProtectedRoute><AdminProfile /></AdminProtectedRoute>
                } />
                <Route path="/admin/dashboard/human-chat" element={
                  <AdminProtectedRoute><AdminHumanChatDashboard /></AdminProtectedRoute>
                } />
                <Route path="/admin/dashboard/chat-details/:id" element={
                  <AdminProtectedRoute><ChatDetails /></AdminProtectedRoute>
                } />
                <Route path="/admin/dashboard/users/:userId/chats" element={
                  <AdminProtectedRoute><UserChatSessions /></AdminProtectedRoute>
                } />

                <Route path="/admin/dashboard/humancoach" element={
                  <AdminProtectedRoute><AdminPsychicData /></AdminProtectedRoute>
                } />
                <Route path="/admin/dashboard/psychics/:id" element={
                  <AdminProtectedRoute><AdminPsychicsDataById /></AdminProtectedRoute>
                } />
                
                {/* Psychic Routes */}
                <Route path="/psychic/login" element={<PsychicLogin />} />
                <Route path="/psychic/register" element={<PsychicRegister />} />
                <Route path="/psychic/forgot-password" element={<PsychicForgotPassword />} />
          <Route path="/psychic/reset-password/:resetToken" element={<PsychicResetPassword />} />

                {/* Psychic Dashboard Routes */}
                <Route path="/psychic/dashboard" element={
                  <PsychicProtectedRoute>
                    <PsychicDashboard />
                  </PsychicProtectedRoute>
                } />
                
                <Route path="/psychic/dashboard/chats" element={
                  <PsychicProtectedRoute>
                    <PsychicChats />
                  </PsychicProtectedRoute>
                } />
                
                <Route path="/psychic/dashboard/golive" element={
                  <PsychicProtectedRoute>
                    <Golive />
                  </PsychicProtectedRoute>
                } />
                
                <Route path="/psychic/dashboard/profile" element={
                  <PsychicProtectedRoute>
                    <HumanPsychicProfile />
                  </PsychicProtectedRoute>
                } />
             
                <Route path="/psychic/dashboard/earning" element={
                  <PsychicProtectedRoute>
                    <PsychicEarnings />
                  </PsychicProtectedRoute>
                } />

                 <Route path="/psychic/call/:callRequestId" element={
                  <PsychicProtectedRoute>
                    <PsychicActiveCallPage />
                  </PsychicProtectedRoute>
                } />
                
                <Route path="/psychic/dashboard/reviews" element={
                  <PsychicProtectedRoute>
                    <PsychicReviews />
                  </PsychicProtectedRoute>
                } />
                
                <Route path="/psychic/dashboard/settings" element={
                  <PsychicProtectedRoute>
                    <PsychicSettings />
                  </PsychicProtectedRoute>
                } />
                
                <Route path="/psychic/dashboard/call-history" element={
                  <PsychicProtectedRoute>
                    <PsychicCallHistoryPage />
                  </PsychicProtectedRoute>
                } />
                
                {/* Psychic Call Route - Standalone page */}
              
             
                
                <Route path="*" element={<PageNotFound />} />
              </Routes>
            </main>
          </div>
          
          {/* ✅ FIXED: Show footer only on routes that should have it */}
          {shouldShowNavbar && !isChatInterfaceRoute && <ModernFooter />}
          
          <Toaster />
        </PsychicAuthProvider>
      </SocketProvider>
    </div>
  );
};

export default App;