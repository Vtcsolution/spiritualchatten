"use client";

import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  User,
  Users,
  MessageSquare,
  CreditCard,
  Home,
  History,
  Sparkles,
  X,
  Menu,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/All_Components/screen/AuthContext";
import { toast } from "sonner";

export default function Navigation() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Color scheme
  const colors = {
    deepPurple: "#2B1B3F",
    antiqueGold: "#C9A24D",
    softIvory: "#F5F3EB",
    lightGold: "#E8D9B0",
    darkPurple: "#1A1129",
  };

  const essentialNavItems = [
    {
      name: "Tableau de Bord",
      href: "/dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
      matchPrefix: "/dashboard"
    },
    {
      name: "Compte",
      href: "/account",
      icon: <User className="h-5 w-5" />,
      matchPrefix: "/account"
    },
    {
      name: "Modifier le Profil",
      href: "/update-profile",
      icon: <Users className="h-5 w-5" />,
      matchPrefix: "/update-profile"
    },
    {
      name: "Sessions",
      href: "/chat-sessions",
      icon: <MessageSquare className="h-5 w-5" />,
      matchPrefix: "/message"
    },
    {
      name: "Portefeuille",
      href: "/wallet",
      icon: <CreditCard className="h-5 w-5" />,
      matchPrefix: "/wallet"
    },
  ];

  const handleLogout = () => {
    logout();
    toast.success("Déconnexion réussie");
    navigate("/");
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Desktop Navigation - Fixed at top for laptop/desktop */}
      <nav className="hidden lg:block bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo/Brand */}
            <div className="flex items-center">
              <Sparkles className="h-6 w-6" style={{ color: colors.antiqueGold }} />
              <span className="ml-2 font-bold" style={{ color: colors.deepPurple }}>
                Dashboard
              </span>
            </div>

            {/* Desktop Navigation Links */}
            <div className="flex items-center space-x-1">
              {essentialNavItems.map((item) => {
                const isActive = item.matchPrefix
                  ? pathname.startsWith(item.matchPrefix)
                  : pathname === item.href;

                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2",
                      isActive
                        ? "shadow-sm"
                        : "hover:bg-gray-50"
                    )}
                    style={{
                      backgroundColor: isActive ? colors.antiqueGold : "transparent",
                      color: isActive ? colors.deepPurple : colors.deepPurple,
                    }}
                  >
                    {item.icon}
                    <span className="text-sm">{item.name}</span>
                  </Link>
                );
              })}
            </div>

            {/* User Menu Desktop */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                  style={{ background: colors.deepPurple }}
                >
                  {user?.firstName?.[0] || user?.username?.[0] || user?.email?.[0] || "U"}
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Déconnexion"
                >
                  <LogOut className="h-4 w-4" style={{ color: colors.deepPurple }} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation Bar - Always visible on mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white shadow-lg z-50 border-t"
        style={{ borderColor: colors.antiqueGold + "20" }}>
        <div className="flex justify-around items-center h-16 px-4">
          {/* Home Button */}
          <Link
            to="/"
            className="flex flex-col items-center justify-center flex-1 py-2"
          >
            <Home className="h-5 w-5" style={{ color: colors.deepPurple }} />
            <span className="text-xs mt-1" style={{ color: colors.deepPurple }}>Accueil</span>
          </Link>

          {/* Main Menu Button - Opens dropdown */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex flex-col items-center justify-center flex-1 py-2 relative"
          >
            <Menu className="h-5 w-5" style={{ color: colors.antiqueGold }} />
            <span className="text-xs mt-1" style={{ color: colors.deepPurple }}>Menu</span>
            {mobileMenuOpen && (
              <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full"
                style={{ backgroundColor: colors.antiqueGold }} />
            )}
          </button>

          {/* History Button */}
          <Link
            to="/history"
            className="flex flex-col items-center justify-center flex-1 py-2"
          >
            <History className="h-5 w-5" style={{ color: colors.deepPurple }} />
            <span className="text-xs mt-1" style={{ color: colors.deepPurple }}>Historique</span>
          </Link>
        </div>
      </nav>

      {/* Mobile Dropdown Menu - Slides down from top */}
      <div 
        className={cn(
          "lg:hidden fixed top-0 left-0 right-0 bg-white shadow-xl z-40 transition-all duration-300 ease-in-out",
          mobileMenuOpen ? "translate-y-0" : "-translate-y-full"
        )}
        style={{ maxHeight: "85vh", overflowY: "auto" }}
      >
        {/* Header with close button */}
        <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between"
          style={{ borderColor: colors.antiqueGold + "30" }}>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" style={{ color: colors.antiqueGold }} />
            <span className="font-bold" style={{ color: colors.deepPurple }}>Menu</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <X className="h-5 w-5" style={{ color: colors.deepPurple }} />
          </button>
        </div>

        {/* User Info */}
        <div className="p-4 border-b" style={{ borderColor: colors.antiqueGold + "30" }}>
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
              style={{ background: colors.deepPurple }}
            >
              {user?.firstName?.[0] || user?.username?.[0] || "U"}
            </div>
            <div className="flex-1">
              <p className="font-semibold" style={{ color: colors.deepPurple }}>
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-sm" style={{ color: colors.deepPurple + "80" }}>
                {user?.email}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="p-3">
          <p className="text-xs font-medium mb-2 px-1" style={{ color: colors.deepPurple + "60" }}>
            NAVIGATION PRINCIPALE
          </p>
          <div className="space-y-1">
            {essentialNavItems.map((item) => {
              const isActive = item.matchPrefix
                ? pathname.startsWith(item.matchPrefix)
                : pathname === item.href;

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                    isActive ? "shadow-sm" : ""
                  )}
                  style={{
                    backgroundColor: isActive ? colors.antiqueGold : 'white',
                    color: isActive ? colors.deepPurple : colors.deepPurple,
                    border: isActive ? 'none' : `1px solid ${colors.deepPurple}15`,
                  }}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-3 border-t" style={{ borderColor: colors.antiqueGold + "30" }}>
          <p className="text-xs font-medium mb-2 px-1" style={{ color: colors.deepPurple + "60" }}>
            ACCÈS RAPIDE
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
              style={{ 
                backgroundColor: colors.deepPurple + "10",
                color: colors.deepPurple
              }}
            >
              <Home className="h-4 w-4" />
              Accueil
            </Link>
            <Link
              to="/history"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
              style={{ 
                backgroundColor: colors.deepPurple + "10",
                color: colors.deepPurple
              }}
            >
              <History className="h-4 w-4" />
              Historique
            </Link>
          </div>
        </div>

        {/* Logout Button */}
        <div className="p-3 border-t mb-4" style={{ borderColor: colors.antiqueGold + "30" }}>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium"
            style={{ 
              backgroundColor: '#fef2f2',
              color: '#dc2626',
            }}
          >
            <LogOut className="h-5 w-5" />
            <span>Déconnexion</span>
          </button>
        </div>
      </div>

      {/* Add padding bottom on mobile to prevent content from being hidden behind bottom nav */}
      <div className="lg:hidden pb-16" />
    </>
  );
}