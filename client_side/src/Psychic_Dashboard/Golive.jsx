import React, { useState, useEffect } from 'react';
import { usePsychicAuth } from "../context/PsychicAuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Wifi, WifiOff, Loader2, Sparkles, Crown, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

// Define the same color scheme from PsychicNavbar
const colors = {
  primary: "#2B1B3F",      // Deep purple
  secondary: "#C9A24D",    // Antique gold
  accent: "#9B7EDE",       // Light purple
  bgLight: "#3A2B4F",      // Lighter purple
  textLight: "#E8D9B0",    // Light gold text
  success: "#10B981",      // Green
  warning: "#F59E0B",      // Yellow
  danger: "#EF4444",       // Red
  background: "#F5F3EB",   // Soft ivory
  onlineGreen: "#22C55E",  // Brighter green for online status
  offlineGray: "#6B7280",  // Gray for offline
};

const Golive = () => {
  const { psychic, loading: authLoading, isAuthenticated } = usePsychicAuth();
  const navigate = useNavigate();
  
  const [status, setStatus] = useState('offline');
  const [updating, setUpdating] = useState(false);
  const [fetchingStatus, setFetchingStatus] = useState(false);

  // Add a timeout to prevent infinite loading
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('Auth loading timeout check:', {
        authLoading,
        isAuthenticated,
        hasToken: !!localStorage.getItem('psychicToken')
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, [authLoading]);

  // Check authentication - FIXED
  useEffect(() => {
    console.log('Auth state:', { authLoading, isAuthenticated });
    
    if (authLoading) return; // Still loading, wait
    
    if (!isAuthenticated) {
      console.log('Not authenticated, redirecting');
      navigate("/psychic/login");
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Fetch current status from backend on component mount - SIMPLIFIED
  const fetchMyStatus = async () => {
    if (!isAuthenticated) return;
    
    setFetchingStatus(true);
    try {
      const token = localStorage.getItem("psychicToken");
      
      if (!token) {
        throw new Error('No token found');
      }

      // Try the endpoint
      const response = await axios.get(
        `${import.meta.env.VITE_BASE_URL}/api/human-psychics/my-status`,
        {
          headers: {
            "Authorization": `Bearer ${token}`
          },
          timeout: 5000 // Add timeout
        }
      );

      console.log('Status response:', response.data);
      
      if (response.data.success) {
        setStatus(response.data.status);
      }
    } catch (error) {
      console.error('Failed to fetch status:', error.response?.data || error.message);
      // Use default status if fetch fails
      setStatus('offline');
    } finally {
      setFetchingStatus(false);
    }
  };

  // Fetch status when authenticated - FIXED
  useEffect(() => {
    if (isAuthenticated && !fetchingStatus) {
      fetchMyStatus();
    }
  }, [isAuthenticated]); // Remove fetchingStatus from dependencies

  // Set status from psychic context
  useEffect(() => {
    if (psychic?.status) {
      setStatus(psychic.status);
    }
  }, [psychic?.status]);

  const updateStatus = async (newStatus) => {
    if (!psychic) return;
    
    setUpdating(true);
    try {
      const token = localStorage.getItem("psychicToken");
      
      const response = await axios.put(
        `${import.meta.env.VITE_BASE_URL}/api/human-psychics/status`,
        { status: newStatus },
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setStatus(newStatus);
        toast.success(`Vous êtes maintenant ${newStatus === 'online' ? 'en ligne' : 'hors ligne'}`);
      }
    } catch (error) {
      console.error('Status update error:', error);
      toast.error("Échec de la mise à jour du statut");
    } finally {
      setUpdating(false);
    }
  };

  const toggleStatus = () => {
    if (updating || fetchingStatus) return;
    const newStatus = status === 'online' ? 'offline' : 'online';
    updateStatus(newStatus);
  };

  // Show loading only when auth is loading OR fetching initial status
  if (authLoading || fetchingStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.background }}>
        <div className="text-center">
          <div className="relative">
            <div className="h-16 w-16 mx-auto rounded-full flex items-center justify-center mb-4"
              style={{ 
                backgroundColor: colors.primary,
                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.bgLight} 100%)`
              }}>
              <Sparkles className="h-8 w-8 animate-pulse" style={{ color: colors.secondary }} />
            </div>
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" style={{ color: colors.secondary }} />
          </div>
          <span className="text-lg font-medium" style={{ color: colors.primary }}>Chargement de votre statut...</span>
        </div>
      </div>
    );
  }

  // If not authenticated after loading, return null (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ backgroundColor: colors.background }}>
      <div className="max-w-md w-full space-y-8 text-center">
        {/* Header with psychic name */}
        <div>
          <div className="relative mb-4">
            <div className="h-16 w-16 mx-auto rounded-full flex items-center justify-center border-4"
              style={{ 
                backgroundColor: colors.primary,
                borderColor: colors.secondary,
                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.bgLight} 100%)`
              }}>
              <Sparkles className="h-8 w-8" style={{ color: colors.secondary }} />
            </div>
            <div className="absolute -top-2 -right-2">
              <Crown className="h-6 w-6" style={{ color: colors.secondary }} />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold" style={{ color: colors.primary }}>
            Être en Ligne
          </h1>
          <p className="mt-2" style={{ color: colors.bgLight }}>
            Contrôlez votre disponibilité pour les clients
          </p>
          
          {/* SHOW PSYCHIC NAME HERE */}
          {psychic?.name && (
            <div className="mt-6 p-4 rounded-xl shadow-sm border"
              style={{ 
                backgroundColor: colors.primary + '10',
                borderColor: colors.secondary + '30'
              }}>
              <p className="font-medium" style={{ color: colors.bgLight }}>
                Connecté en tant que :
              </p>
              <p className="text-xl font-bold mt-1" style={{ color: colors.secondary }}>
                {psychic.name}
              </p>
              {psychic?.specialty && (
                <p className="text-sm mt-1" style={{ color: colors.accent }}>
                  {psychic.specialty}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Status Card */}
        <div className="rounded-xl shadow-lg p-8 border"
          style={{ 
            backgroundColor: 'white',
            borderColor: colors.secondary + '30',
            background: `linear-gradient(135deg, white 0%, ${colors.background} 100%)`
          }}>
          <div className="mb-6">
            <div className={`h-24 w-24 mx-auto rounded-full flex items-center justify-center mb-4 border-4 ${
              status === 'online' ? 'animate-pulse' : ''
            }`}
              style={{ 
                backgroundColor: status === 'online' ? colors.onlineGreen + '15' : colors.offlineGray + '15',
                borderColor: status === 'online' ? colors.onlineGreen : colors.offlineGray
              }}>
              {status === 'online' ? (
                <Wifi className="h-12 w-12" style={{ color: colors.onlineGreen }} />
              ) : (
                <WifiOff className="h-12 w-12" style={{ color: colors.offlineGray }} />
              )}
            </div>
            
            <h2 className="text-xl font-semibold mb-2" style={{ color: colors.primary }}>
              {status === 'online' ? 'Vous êtes en ligne' : 'Vous êtes hors ligne'}
            </h2>
            
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className={`h-3 w-3 rounded-full ${status === 'online' ? 'animate-pulse' : ''}`}
                style={{ 
                  backgroundColor: status === 'online' ? colors.onlineGreen : colors.offlineGray 
                }}></div>
              <p style={{ color: colors.bgLight }}>
                {status === 'online' 
                  ? 'Les clients peuvent vous voir et commencer des chats'
                  : 'Vous n\'êtes pas visible pour les clients'
                }
              </p>
            </div>
          </div>

          {/* Toggle Button */}
          <Button
            onClick={toggleStatus}
            disabled={updating || fetchingStatus}
            size="lg"
            className={`w-full rounded-full text-lg font-medium transition-all duration-300 hover:scale-[1.02] ${
              status === 'online' ? '' : ''
            }`}
            style={{
              backgroundColor: status === 'online' ? colors.danger : colors.success,
              color: 'white'
            }}
          >
            {updating ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Mise à jour...
              </>
            ) : status === 'online' ? (
              <>
                <WifiOff className="h-5 w-5 mr-2" />
                Passer hors ligne
              </>
            ) : (
              <>
                <Wifi className="h-5 w-5 mr-2" />
                Passer en ligne
              </>
            )}
          </Button>
          
          {/* Refresh button */}
          <Button
            onClick={fetchMyStatus}
            disabled={fetchingStatus}
            variant="outline"
            className="w-full mt-4 transition-all duration-200 hover:scale-[1.02]"
            style={{ 
              borderColor: colors.secondary,
              color: colors.primary,
              backgroundColor: colors.secondary + '10'
            }}
          >
            {fetchingStatus ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Actualisation...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" style={{ color: colors.secondary }} />
                Actualiser le statut
              </>
            )}
          </Button>
        </div>

        {/* Quick Info */}
        <div className="text-sm p-4 rounded-lg border"
          style={{ 
            backgroundColor: colors.primary + '05',
            borderColor: colors.secondary + '20',
            color: colors.bgLight
          }}>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Home className="h-4 w-4" style={{ color: colors.secondary }} />
            <p className="font-medium">Informations de statut</p>
          </div>
          <p>
            Lorsque vous êtes en ligne, vous apparaissez dans les résultats de recherche 
            et pouvez recevoir des demandes de chat.
          </p>
          <div className="mt-3 p-2 rounded bg-white border"
            style={{ 
              borderColor: colors.accent + '30',
              color: colors.primary
            }}>
            <p className="font-medium">
              Dernière mise à jour : <span className="font-bold">{new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
            </p>
          </div>
        </div>

        {/* Earnings Preview */}
        {status === 'online' && (
          <div className="mt-4 p-4 rounded-xl border"
            style={{ 
              backgroundColor: colors.success + '10',
              borderColor: colors.success + '30',
              color: colors.success
            }}>
            <div className="flex items-center justify-center gap-2">
              <Crown className="h-5 w-5" />
              <p className="font-bold">Prêt à gagner !</p>
            </div>
            <p className="text-sm mt-1">Vous êtes visible pour les clients et pouvez commencer à gagner</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Golive;