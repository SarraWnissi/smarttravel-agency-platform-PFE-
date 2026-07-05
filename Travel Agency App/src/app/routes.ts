import { createBrowserRouter, Navigate } from "react-router";
import { Home } from "./pages/public/Home";
import { Destinations } from "./pages/public/Destinations";
import { Hotels } from "./pages/public/Hotels";
import { HotelDetail } from "./pages/public/HotelDetail";
import { BookingPage } from "./pages/public/BookingPage";
import { PaymentPage } from "./pages/public/PaymentPage";
import { PaymentSuccess } from "./pages/public/PaymentSuccess";
import { About } from "./pages/public/About";
import { Contact } from "./pages/public/Contact";
import { Login } from "./pages/public/Login";
import { Register } from "./pages/public/Register";
import { VerifyEmail } from "./pages/public/VerifyEmail";
import { Offers } from "./pages/public/Offers";
import { SmartSearch } from "./pages/public/SmartSearch";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { ClientDashboard } from "./pages/client/ClientDashboard";
import { Layout } from "./components/layout/Layout";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { createElement, useEffect } from "react";
import { useAuth } from "./contexts/AuthContext";
import { useNavigate } from "react-router";

function HomeRedirect() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (isAuthenticated) {
      navigate(user?.role === "admin" ? "/admin" : "/client", { replace: true });
    }
  }, [isAuthenticated]);
  return createElement(Hotels);
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: HomeRedirect },
      { path: "destinations", Component: Destinations },
      { path: "hotels", Component: Hotels },
      { path: "hotels/:id", Component: HotelDetail },
      { path: "booking", Component: BookingPage },
      { path: "payment", Component: PaymentPage },
      { path: "payment/success", Component: PaymentSuccess },
      { path: "about", Component: About },
      { path: "contact", Component: Contact },
      { path: "offers", Component: Offers },
      { path: "smart-search", Component: SmartSearch },
    ],
  },
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/register",
    Component: Register,
  },
  {
    path: "/verify-email",
    Component: VerifyEmail,
  },
  {
    path: "/admin",
    element: createElement(ProtectedRoute, { role: "admin" },
      createElement(AdminDashboard)
    ),
  },
  {
    path: "/client",
    element: createElement(ProtectedRoute, { role: "client" },
      createElement(ClientDashboard)
    ),
  },
]);
