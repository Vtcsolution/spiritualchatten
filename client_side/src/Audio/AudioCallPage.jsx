// src/pages/user/AudioCallPage.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Phone, PhoneOff, Clock, User, MessageCircle, Volume2, Mic, MicOff, Video, VideoOff, X, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import axios from 'axios';
import io from 'socket.io-client';
import twilioService from '@/services/twilioService';

const AudioCallPage = () => {
  const { callSessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // State from navigation or fetch
  const [callData, setCallData] = useState(location.state || {});
  const [status, setStatus] = useState(location.state?.status || 'loading');
  const [timer, setTimer] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [twilioToken, setTwilioToken] = useState('');
  const [roomName, setRoomName] = useState('');
  const [expiresAt, setExpiresAt] = useState(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [creditsUsed, setCreditsUsed] = useState(0);
  const [currentCredits, setCurrentCredits] = useState(0);
  const [isFreeSession, setIsFreeSession] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastServerSync, setLastServerSync] = useState(Date.now());
  const [syncStatus, setSyncStatus] = useState('synced');
  const [userId, setUserId] = useState(null);
  const [hasJoinedRoom, setHasJoinedRoom] = useState(false);

  // Refs
  const socketRef = useRef(null);
  const countdownRef = useRef(null);
  const audioPermissionRef = useRef(null);
  const callSessionIdRef = useRef(callSessionId || location.state?.callSessionId);
  const callRequestIdRef = useRef(location.state?.callRequestId);
  const syncIntervalRef = useRef(null);
  const verifyIntervalRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const initializedRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const twilioConnectedRef = useRef(false);

  // Color scheme
  const colors = {
    deepPurple: "#2B1B3F",
    antiqueGold: "#C9A24D",
    softIvory: "#F5F3EB",
    lightGold: "#E8D9B0",
    darkPurple: "#1A1129",
  };

  // Status colors
  const statusColors = {
    loading: 'bg-gray-500',
    initiated: 'bg-yellow-500',
    ringing: 'bg-blue-500',
    active: 'bg-green-500',
    accepted: 'bg-green-500',
    rejected: 'bg-red-500',
    cancelled: 'bg-gray-500',
    completed: 'bg-purple-500',
    failed: 'bg-red-500',
    expired: 'bg-red-500'
  };

  // API instance with auth
  const api = axios.create({
    baseURL: import.meta.env.VITE_BASE_URL || 'http://localhost:5001',
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json'
    },
    withCredentials: true
  });

  // Add token to requests
  api.interceptors.request.use(config => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // Get user ID from token
  const getUserIdFromToken = useCallback(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return null;
    
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      const decoded = JSON.parse(jsonPayload);
      return decoded.id || decoded.userId || decoded.sub;
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }, []);

  // Clean up all intervals
  const stopAllIntervals = useCallback(() => {
    console.log('🛑 Stopping all intervals');
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }
    if (verifyIntervalRef.current) {
      clearInterval(verifyIntervalRef.current);
      verifyIntervalRef.current = null;
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // Clean up Twilio resources
  const cleanupTwilio = useCallback(() => {
    console.log('🧹 Cleaning up Twilio');
    try {
      twilioService.endCall();
      twilioService.cleanup();
    } catch (error) {
      console.error('Error cleaning up Twilio:', error);
    }
    twilioConnectedRef.current = false;
    removeAudioPermissionHandler();
    setIsAudioPlaying(false);
  }, []);

  // Remove audio permission handler
  const removeAudioPermissionHandler = useCallback(() => {
    if (audioPermissionRef.current) {
      document.removeEventListener('click', audioPermissionRef.current);
      audioPermissionRef.current = null;
    }
  }, []);

  // Handle call end
  const handleCallEnd = useCallback((data) => {
    console.log('🛑 Handling call end with data:', data);
    
    stopAllIntervals();
    
    try {
      twilioService.endCall();
      twilioService.cleanup();
    } catch (error) {
      console.error('Error cleaning up Twilio:', error);
    }
    
    removeAudioPermissionHandler();
    
    let endMessage = 'Call ended';
    let endStatus = 'completed';
    let finalCredits = data.creditsUsed || 0;
    
    if (data.endReason === 'ended_by_psychic' || data.endedBy === 'psychic') {
      endMessage = 'Psychic ended the call';
    } else if (data.endReason === 'ended_by_user' || data.endedBy === 'user') {
      endMessage = 'You ended the call';
    } else if (data.endReason === 'insufficient_credits') {
      endMessage = 'Call ended due to insufficient credits';
      endStatus = 'failed';
    } else if (data.endReason === 'user_disconnected' || data.endReason === 'psychic_disconnected') {
      endMessage = 'Call ended - Connection lost';
      endStatus = 'failed';
    } else if (data.endReason === 'expired') {
      endMessage = 'Call request expired';
      endStatus = 'expired';
    } else if (data.endReason === 'cancelled') {
      endMessage = 'Call cancelled';
      endStatus = 'cancelled';
    } else if (data.endReason === 'rejected') {
      endMessage = 'Call rejected';
      endStatus = 'rejected';
    }
    
    setStatus(endStatus);
    setCreditsUsed(finalCredits);
    
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
    }
    
    toast.info(endMessage);
    
    setTimeout(() => {
      if (endStatus === 'failed' && data.endReason === 'insufficient_credits') {
        navigate('/wallet');
      } else {
        navigate('/');
      }
    }, 3000);
    
  }, [stopAllIntervals, removeAudioPermissionHandler, navigate]);

  // Poll timer from server
  // In AudioCallPage.jsx, update the startTimerPolling function:

// Poll timer from server
const startTimerPolling = useCallback(() => {
  if (pollIntervalRef.current) {
    clearInterval(pollIntervalRef.current);
  }
  
  console.log('⏱️ Starting timer polling from server');
  
  // Use a shorter interval for smoother updates
  pollIntervalRef.current = setInterval(async () => {
    if (!callSessionIdRef.current || status !== 'active') {
      return;
    }
    
    try {
      const response = await api.get(`/api/calls/sync-timer/${callSessionIdRef.current}`);
      
      if (response.data.success) {
        const data = response.data.data;
        
        if (data.elapsedSeconds !== undefined) {
          // Force a state update even if the value is the same
          // This ensures the component re-renders
          setTimer(prevTimer => {
            if (prevTimer !== data.elapsedSeconds) {
              console.log(`⏱️ Timer updated: ${prevTimer} -> ${data.elapsedSeconds}`);
              return data.elapsedSeconds;
            }
            return prevTimer;
          });
          
          setLastServerSync(Date.now());
          setSyncStatus('synced');
        }
        
        if (data.creditsUsed !== undefined) {
          setCreditsUsed(data.creditsUsed);
        }
        
        // Check if call has ended
        if (data.status === 'ended' || data.status === 'completed') {
          console.log('⚠️ Server reports call ended during polling');
          handleCallEnd({
            callSessionId: callSessionIdRef.current,
            endReason: data.endReason || 'call_ended',
            endedBy: data.endedBy || 'unknown',
            creditsUsed: data.creditsUsed || creditsUsed
          });
        }
      }
    } catch (error) {
      console.error('Error polling timer:', error);
      setSyncStatus('error');
      
      if (error.response?.status === 404) {
        handleCallEnd({
          callSessionId: callSessionIdRef.current,
          endReason: 'call_ended',
          creditsUsed
        });
      }
    }
  }, 1000); // Poll every second
  
}, [api, status, creditsUsed, handleCallEnd]);
  // Verify call status
  const verifyCallStatus = useCallback(async () => {
    if (!callSessionIdRef.current || status === 'completed' || status === 'ended' || status === 'failed') {
      return;
    }
    
    try {
      const response = await api.get(`/api/calls/status/${callSessionIdRef.current}`);
      
      if (response.data.success) {
        const data = response.data.data;
        
        if (data.status === 'ended' || data.status === 'completed') {
          console.log('⚠️ Backend reports call ended, syncing frontend');
          
          handleCallEnd({
            callSessionId: callSessionIdRef.current,
            endReason: data.endReason || 'call_ended',
            endedBy: data.endedBy || 'unknown',
            creditsUsed: data.creditsUsed || creditsUsed
          });
        }
      }
    } catch (error) {
      console.error('Error verifying call status:', error);
      
      if (error.response?.status === 404) {
        handleCallEnd({
          callSessionId: callSessionIdRef.current,
          endReason: 'call_ended',
          endedBy: 'unknown',
          creditsUsed
        });
      }
    }
  }, [api, creditsUsed, handleCallEnd, status]);

  // Fetch call details with token for reconnection
  const fetchCallDetails = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        navigate('/login');
        return;
      }

      let response;
      let sessionId = callSessionIdRef.current || callSessionId;
      
      if (sessionId) {
        // Try to get call status which includes tokens
        response = await api.get(`/api/calls/status/${sessionId}`);
        
        if (response.data.success) {
          const data = response.data.data;
          
          setStatus(data.status || 'active');
          setTimer(data.elapsedSeconds || 0);
          setCreditsUsed(data.creditsUsed || 0);
          
          if (data.roomName) {
            setRoomName(data.roomName);
          }
          
          // CRITICAL: Get token from response for reconnection
          if (data.participantTokens?.user) {
            setTwilioToken(data.participantTokens.user);
          }
          
          if (data.psychicId) {
            setCallData(prev => ({
              ...prev,
              psychic: data.psychicId,
              callSessionId: data._id
            }));
          }
          
          callSessionIdRef.current = data._id;
          
          // If call is in progress, start timer polling
          if (data.status === 'in-progress' || data.status === 'active') {
            setStatus('active');
            startTimerPolling();
            
            // Try to reconnect to Twilio if we have token and room name
            if (data.participantTokens?.user && data.roomName && !twilioConnectedRef.current) {
              setTimeout(() => {
                connectToTwilioCall(data.participantTokens.user, data.psychicId?._id);
              }, 1000);
            }
          }
        }
      } else {
        // Try to get active call
        response = await api.get('/api/calls/active');
        
        if (response.data.success && response.data.data) {
          const data = response.data.data;
          
          if (data.activeSession) {
            callSessionIdRef.current = data.activeSession._id;
            setStatus(data.activeSession.status || 'active');
            setTimer(data.elapsedSeconds || 0);
            setCreditsUsed(data.creditsUsed || 0);
            
            if (data.activeSession.roomName) {
              setRoomName(data.activeSession.roomName);
            }
            
            if (data.activeSession.participantTokens?.user) {
              setTwilioToken(data.activeSession.participantTokens.user);
            }
            
            setCallData(prev => ({
              ...prev,
              psychic: data.activeSession.psychicId,
              callSessionId: data.activeSession._id,
              roomName: data.activeSession.roomName
            }));
            
            if (data.activeSession.status === 'in-progress' || data.activeSession.status === 'active') {
              setStatus('active');
              startTimerPolling();
              
              if (data.activeSession.participantTokens?.user && data.activeSession.roomName && !twilioConnectedRef.current) {
                setTimeout(() => {
                  connectToTwilioCall(data.activeSession.participantTokens.user, data.activeSession.psychicId?._id);
                }, 1000);
              }
            }
          }
        }
      }
      
    } catch (error) {
      console.error('Error fetching call details:', error);
      setError(error.response?.data?.message || 'Failed to load call details');
      
      if (error.response?.status === 401) {
        localStorage.removeItem('accessToken');
        navigate('/login');
      }
    } finally {
      setIsLoading(false);
    }
  }, [api, navigate, callSessionId, startTimerPolling]);

  // Initialize socket connection with persistence
  const initializeSocket = useCallback(() => {
    const token = localStorage.getItem('accessToken');
    const uid = userId || getUserIdFromToken();

    if (!uid || !token) {
      console.log('❌ Missing user credentials');
      return null;
    }

    console.log('🔌 Initializing socket connection', { uid, callSessionId: callSessionIdRef.current });

    // Disconnect existing socket if any
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
    }

    const socket = io(`${import.meta.env.VITE_BASE_URL}/audio-calls`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 20, // Increased attempts
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      query: { token, userId: uid, callSessionId: callSessionIdRef.current }
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Connected to audio call socket');
      setSocketConnected(true);
      reconnectAttemptsRef.current = 0;
      
      // Register user
      socket.emit('user-register', uid);
      
      // Join room if we have it
      if (roomName) {
        socket.emit('join-room', roomName);
        setHasJoinedRoom(true);
      } else if (callData.roomName) {
        socket.emit('join-room', callData.roomName);
        setHasJoinedRoom(true);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from audio call socket:', reason);
      setSocketConnected(false);
      setHasJoinedRoom(false);
      
      // Don't show error for expected disconnections
      if (reason !== 'io client disconnect' && reason !== 'transport close') {
        console.log('🔄 Will attempt to reconnect automatically');
      }
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      reconnectAttemptsRef.current++;
      
      if (reconnectAttemptsRef.current > 5) {
        toast.error('Connection issues. Trying to reconnect...');
      }
      
      // Try to refresh token
      if (error.message.includes('auth') || error.message.includes('token')) {
        const newToken = localStorage.getItem('accessToken');
        if (newToken && newToken !== token) {
          socket.auth = { token: newToken };
        }
      }
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Socket reconnected after ${attemptNumber} attempts`);
      setSocketConnected(true);
      
      // Re-register and re-join room
      socket.emit('user-register', uid);
      if (roomName) {
        socket.emit('join-room', roomName);
      }
    });

    // Rest of your socket event handlers remain the same...
    socket.on('call-accepted', (data) => {
      console.log('✅ Call accepted by psychic:', data);

      if (!data.token || data.token.includes('dummy_token')) {
        console.error('❌ INVALID TOKEN RECEIVED:', data.token);
        toast.error('Invalid audio connection. Please try again.');
        return;
      }

      setStatus('accepted');
      setTwilioToken(data.token);
      setRoomName(data.roomName);
      setCallData(prev => ({
        ...prev,
        callSessionId: data.callSessionId,
        psychic: data.psychic
      }));
      callSessionIdRef.current = data.callSessionId;

      connectToTwilioCall(data.token, data.psychic?._id);
      toast.success(`Call accepted by ${data.psychic?.name}`);
    });

    socket.on('call-rejected', (data) => {
      console.log('❌ Call rejected:', data);
      handleCallEnd({
        callSessionId: callSessionIdRef.current,
        callRequestId: callRequestIdRef.current,
        endReason: 'rejected',
        endedBy: 'psychic',
        creditsUsed: 0
      });
    });

    socket.on('call-started', (data) => {
      console.log('🎉 Call started:', data);
      setStatus('active');
      syncTimerWithServer();
      startTimerPolling();
      setIsAudioPlaying(true);
    });

    socket.on('timer-started', (data) => {
      console.log('⏱️ Timer started:', data);
      setStatus('active');
      syncTimerWithServer();
      startTimerPolling();
    });

    socket.on('timer-sync', (data) => {
      console.log('⏱️ Timer sync event:', data);
      if (data.elapsedSeconds !== undefined) {
        setTimer(data.elapsedSeconds);
        setLastServerSync(Date.now());
      }
    });

    socket.on('timer-stopped', (data) => {
      console.log('⏱️ TIMER STOPPED EVENT:', data);
      
      if (data.callSessionId === callSessionIdRef.current) {
        console.log('⏱️ Stopping timer polling by direct command');
        stopAllIntervals();
        
        if (data.finalTime !== undefined) {
          setTimer(data.finalTime);
        }
        
        if (data.status) {
          setStatus(data.status);
        }
      }
    });

    socket.on('credits-updated', (data) => {
      console.log('💰 Credits updated:', data);
      setCreditsUsed(data.creditsUsed || 0);
      setCurrentCredits(data.currentCredits || 0);

      if (data.currentCredits < 1) {
        toast.warning('Low credits! Add more credits to continue call.');
      }
    });

    socket.on('call-completed', (data) => {
      console.log('📞 Call completed:', data);
      
      const sessionMatches = data.callSessionId === callSessionIdRef.current || 
                            data.callRequestId === callRequestIdRef.current;
      
      if (sessionMatches) {
        handleCallEnd(data);
      }
    });

    socket.on('call-ended', (data) => {
      console.log('📞 Call ended:', data);
      
      const sessionMatches = data.callSessionId === callSessionIdRef.current || 
                            data.callRequestId === callRequestIdRef.current;
      
      if (sessionMatches) {
        handleCallEnd(data);
      }
    });

    socket.on('room-closed', (data) => {
      console.log('🚪 Room closed:', data);
      
      if (data.roomName === roomName || data.roomName === callData.roomName) {
        handleCallEnd({
          callSessionId: callSessionIdRef.current,
          endReason: 'room_closed',
          creditsUsed
        });
      }
    });

    return socket;
  }, [userId, roomName, callData.roomName, handleCallEnd, creditsUsed, getUserIdFromToken, stopAllIntervals, startTimerPolling]);

  // Sync timer with server
  const syncTimerWithServer = useCallback(async () => {
    if (!callSessionIdRef.current || status !== 'active') return;
    
    try {
      setSyncStatus('syncing');
      
      const response = await api.get(`/api/calls/sync-timer/${callSessionIdRef.current}`);
      
      if (response.data.success) {
        const data = response.data.data;
        
        if (data.elapsedSeconds !== undefined) {
          setTimer(data.elapsedSeconds);
          setLastServerSync(Date.now());
          setSyncStatus('synced');
        }
        
        if (data.creditsUsed !== undefined) {
          setCreditsUsed(data.creditsUsed);
        }
      }
    } catch (error) {
      console.error('Error syncing timer:', error);
      setSyncStatus('error');
      
      if (error.response?.status === 404) {
        handleCallEnd({
          callSessionId: callSessionIdRef.current,
          endReason: 'call_ended',
          creditsUsed
        });
      }
    }
  }, [api, status, creditsUsed, handleCallEnd]);

  // Connect to Twilio call
  const connectToTwilioCall = async (token, psychicId) => {
    if (!token || !psychicId) {
      toast.error('Missing connection details');
      return;
    }
    
    if (twilioConnectedRef.current) {
      console.log('Already connected to Twilio');
      return;
    }
    
    setIsConnecting(true);

    try {
      console.log('🎯 User connecting to audio room...');
      
      const targetRoomName = roomName || callData.roomName;

      if (!targetRoomName) {
        throw new Error('Room name not found');
      }

      await twilioService.initialize();
      await twilioService.joinRoom(token, targetRoomName);
      
      twilioConnectedRef.current = true;

      setupAudioPermissionHandler();

      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('call-started', {
          callSessionId: callSessionIdRef.current,
          roomName: targetRoomName
        });
      }

      setIsConnecting(false);
      setStatus('active');
      
      await syncTimerWithServer();
      startTimerPolling();

    } catch (error) {
      console.error('❌ Error connecting to Twilio:', error);
      
      let errorMessage = 'Failed to connect to audio call';
      if (error.code === 20101) errorMessage = 'Invalid access token';
      else if (error.code === 53113) errorMessage = 'Room not found';
      else if (error.code === 53405) errorMessage = 'Room is full';
      
      toast.error(errorMessage);
      setIsConnecting(false);
      setStatus('failed');
      twilioConnectedRef.current = false;
    }
  };

  // Set up audio permission handler
  const setupAudioPermissionHandler = () => {
    removeAudioPermissionHandler();

    audioPermissionRef.current = async () => {
      console.log('🎧 Audio permission click handler triggered');
      
      try {
        const audioElements = document.querySelectorAll('audio');
        let playedAny = false;
        
        for (const audio of audioElements) {
          if (audio.paused) {
            try {
              await audio.play();
              playedAny = true;
              console.log('✅ Played audio element');
            } catch (playError) {
              console.log('⚠️ Could not play audio:', playError);
            }
          }
        }
        
        if (playedAny) {
          setIsAudioPlaying(true);
          removeAudioPermissionHandler();
          toast.success('Audio enabled!');
        }
      } catch (error) {
        console.error('Error in audio handler:', error);
      }
    };

    document.addEventListener('click', audioPermissionRef.current);

    setTimeout(() => {
      if (!isAudioPlaying && status === 'active') {
        toast.info('Click anywhere on the page to enable audio');
      }
    }, 2000);
  };

  // Cancel call
  const cancelCall = async () => {
    if (!callData.callRequestId) {
      toast.error('Call request ID not found');
      return;
    }
    
    try {
      await api.post(`/api/calls/cancel/${callData.callRequestId}`, {});

      if (socketRef.current) {
        socketRef.current.emit('cancel-call', {
          callRequestId: callData.callRequestId
        });
      }

      handleCallEnd({
        callSessionId: callSessionIdRef.current,
        callRequestId: callRequestIdRef.current,
        endReason: 'cancelled',
        endedBy: 'user',
        creditsUsed: 0
      });

    } catch (error) {
      console.error('Error cancelling call:', error);
      toast.error('Failed to cancel call');
    }
  };

  // End call
  const endCall = async () => {
    const sessionId = callSessionIdRef.current;
    if (!sessionId) {
      toast.error('Call session ID not found');
      return;
    }

    try {
      console.log('🛑 User ending call:', sessionId);
      
      stopAllIntervals();
      
      try {
        twilioService.endCall();
        twilioService.cleanup();
      } catch (twilioError) {
        console.error('Error cleaning up Twilio:', twilioError);
      }
      twilioConnectedRef.current = false;
      
      const finalTimer = timer;
      const ratePerMin = callData.psychic?.ratePerMin || 1;
      const creditsUsedValue = Math.ceil(finalTimer / 60) * ratePerMin;
      
      console.log(`📊 Call stats before ending: duration=${finalTimer}s, credits=${creditsUsedValue}`);
      
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('call-ended', {
          callSessionId: sessionId,
          endReason: 'ended_by_user',
          duration: finalTimer,
          creditsUsed: creditsUsedValue
        });
      }
      
      try {
        const apiResponse = await api.post(`/api/calls/end/${sessionId}`, { 
          endReason: 'ended_by_user' 
        });
        
        console.log('✅ Backend call end response:', apiResponse.data);
        
        if (apiResponse.data.success) {
          const backendData = apiResponse.data.data;
          
          handleCallEnd({
            callSessionId: sessionId,
            endReason: 'ended_by_user',
            endedBy: 'user',
            creditsUsed: backendData.creditsUsed || creditsUsedValue,
            duration: backendData.duration || finalTimer
          });
          
          toast.success('Call ended successfully');
        } else {
          throw new Error('Backend returned success: false');
        }
      } catch (apiError) {
        console.error('API end call error:', apiError);
        
        toast.error('Call ended, but there was an error syncing with server');
        
        handleCallEnd({
          callSessionId: sessionId,
          endReason: 'ended_by_user',
          endedBy: 'user',
          creditsUsed: creditsUsedValue,
          localOnly: true
        });
      }
      
    } catch (error) {
      console.error('❌ Error ending call:', error);
      toast.error('Failed to end call');
      
      handleCallEnd({
        callSessionId: sessionId,
        endReason: 'ended_by_user',
        endedBy: 'user',
        creditsUsed: timer / 60 * (callData.psychic?.ratePerMin || 1)
      });
    }
  };

  // Toggle mute
  const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    
    if (twilioService.toggleMute) {
      twilioService.toggleMute(newMutedState);
    }
    
    toast.info(newMutedState ? 'Muted' : 'Unmuted');
  };

  // Format time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Format credits
  const formatCredits = (credits) => {
    return credits.toFixed(2);
  };

  // Countdown timer for pending calls
  useEffect(() => {
    if (timeLeft > 0 && (status === 'initiated' || status === 'ringing' || status === 'accepted')) {
      if (countdownRef.current) clearInterval(countdownRef.current);
      
      countdownRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(countdownRef.current);
            handleCallEnd({
              callSessionId: callSessionIdRef.current,
              callRequestId: callRequestIdRef.current,
              endReason: 'expired',
              creditsUsed: 0
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [timeLeft, status, handleCallEnd]);

  // Status verification
  useEffect(() => {
    if (callSessionIdRef.current && status === 'active') {
      verifyIntervalRef.current = setInterval(verifyCallStatus, 5000);
      
      return () => {
        if (verifyIntervalRef.current) {
          clearInterval(verifyIntervalRef.current);
        }
      };
    }
  }, [status, verifyCallStatus]);

  // Initialize on mount and handle refresh
  useEffect(() => {
    const init = async () => {
      if (initializedRef.current) return;
      
      console.log('🎯 Component mounted/refreshed with params:', { callSessionId, callRequestId: callData.callRequestId });
      
      const uid = getUserIdFromToken();
      setUserId(uid);
      
      if (!uid) {
        toast.error('Please login to continue');
        navigate('/login');
        return;
      }
      
      // Fetch call details first (this will get tokens and room info)
      await fetchCallDetails();
      
      // Then initialize socket
      const socket = initializeSocket();
      
      initializedRef.current = true;
    };
    
    init();
    
    return () => {
      console.log('🧹 Cleaning up component');
      stopAllIntervals();
      cleanupTwilio();
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
      }
      initializedRef.current = false;
      twilioConnectedRef.current = false;
    };
  }, []); // Empty deps - run once on mount/refresh

  // Effect to handle room name changes and join socket room
  useEffect(() => {
    if (socketRef.current && socketConnected && roomName && !hasJoinedRoom) {
      console.log(`📡 Joining socket room: ${roomName}`);
      socketRef.current.emit('join-room', roomName);
      setHasJoinedRoom(true);
    }
  }, [roomName, socketConnected, hasJoinedRoom]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ backgroundColor: colors.deepPurple }}>
        <div className="text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" 
            style={{ backgroundColor: colors.antiqueGold + '20' }}>
            <RefreshCw className="h-10 w-10 animate-spin" style={{ color: colors.antiqueGold }} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Loading Call Details...</h2>
          <p className="text-white/70">Please wait while we connect you to the call</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ backgroundColor: colors.deepPurple }}>
        <Card className="p-8 max-w-md w-full bg-white/5 backdrop-blur-sm border-white/10">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Unable to Load Call</h2>
            <p className="text-white/70 mb-6">{error}</p>
            <Button
              onClick={() => navigate('/')}
              className="w-full"
              style={{ backgroundColor: colors.antiqueGold, color: colors.deepPurple }}
            >
              Return to Home
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.deepPurple }}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="text-white hover:text-gray-200"
            >
              <X className="h-6 w-6" />
            </Button>

            <div className="text-center">
              <h1 className="text-2xl font-bold text-white">Audio Call</h1>
              <div className="flex items-center justify-center gap-2 mt-2">
                <Badge className={statusColors[status] + ' text-white'}>
                  {status.toUpperCase()}
                </Badge>
                {status === 'active' && (
                  <Badge className="bg-green-500 text-white animate-pulse">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatTime(timer)}
                  </Badge>
                )}
                <div className="flex items-center gap-1 ml-2">
                  <div className={`h-2 w-2 rounded-full ${socketConnected ? 'bg-green-500' : 'bg-red-500'}`} title={socketConnected ? 'Socket Connected' : 'Socket Disconnected'} />
                  <div className={`h-2 w-2 rounded-full ${
                    syncStatus === 'synced' ? 'bg-green-500' : 
                    syncStatus === 'syncing' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
                  }`} title={syncStatus === 'synced' ? 'Timer Synced' : syncStatus === 'syncing' ? 'Syncing...' : 'Sync Error'} />
                </div>
              </div>
            </div>

            <div className="w-12"></div>
          </div>

          {/* Rest of your JSX remains the same... */}
          <div className="grid md:grid-cols-3 gap-8">
            {/* Left Column: Psychic Info */}
            <Card className="p-6" style={{
              backgroundColor: colors.darkPurple,
              borderColor: colors.antiqueGold + '40'
            }}>
              <div className="text-center">
                <div className="relative w-32 h-32 mx-auto mb-4">
                  <img
                    src={callData.psychic?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(callData.psychic?.name || 'Psychic')}&background=${colors.antiqueGold.replace('#', '')}&color=${colors.deepPurple.replace('#', '')}`}
                    alt={callData.psychic?.name}
                    className="w-full h-full rounded-full object-cover border-4"
                    style={{ borderColor: colors.antiqueGold }}
                  />
                  <div className="absolute -bottom-2 -right-2 w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: colors.antiqueGold }}>
                    <User className="h-6 w-6" style={{ color: colors.deepPurple }} />
                  </div>
                </div>

                <h2 className="text-xl font-bold text-white mb-2">
                  {callData.psychic?.name || 'Psychic'}
                </h2>
                <p className="text-gray-300 mb-1">{callData.psychic?.specialization || 'Psychic Reader'}</p>

                <div className="flex items-center justify-center gap-1 mb-4">
                  {Array(5).fill(0).map((_, i) => (
                    <div
                      key={i}
                      className="h-4 w-4"
                      style={{
                        color: i < (callData.psychic?.averageRating || 4.5) ? colors.antiqueGold : '#4B5563',
                      }}
                    >
                      ★
                    </div>
                  ))}
                  <span className="text-gray-300 ml-2">
                    {(callData.psychic?.averageRating || 4.5).toFixed(1)}
                  </span>
                </div>

                <div className="space-y-3 mt-6">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Rate per minute:</span>
                    <span className="text-white font-bold">
                      ${(callData.psychic?.ratePerMin || 1.00).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Credits used:</span>
                    <span className="text-white font-bold">
                      {formatCredits(creditsUsed)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Current credits:</span>
                    <span className="text-white font-bold">
                      {formatCredits(currentCredits)}
                    </span>
                  </div>

                  {isFreeSession && (
                    <div className="mt-4 p-3 rounded" style={{ backgroundColor: colors.antiqueGold + '20' }}>
                      <div className="flex items-center gap-2 text-sm">
                        <AlertCircle className="h-4 w-4" style={{ color: colors.antiqueGold }} />
                        <span className="text-gray-200">Your first minute is free!</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Center Column: Call Interface */}
            <div className="md:col-span-2 space-y-8">
              {/* Status Card */}
              <Card className="p-6" style={{
                backgroundColor: colors.darkPurple,
                borderColor: colors.antiqueGold + '40'
              }}>
                <div className="text-center space-y-4">
                  {/* Status Icon */}
                  <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
                    <div className={`absolute inset-0 rounded-full ${statusColors[status]} opacity-20 animate-pulse`}></div>
                    <div className="relative z-10">
                      {status === 'active' ? (
                        <div className="w-16 h-16 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: colors.antiqueGold }}>
                          <Volume2 className="h-8 w-8" style={{ color: colors.deepPurple }} />
                        </div>
                      ) : status === 'accepted' || status === 'ringing' ? (
                        <div className="w-16 h-16 rounded-full flex items-center justify-center animate-spin"
                          style={{
                            borderTop: `4px solid ${colors.antiqueGold}`,
                            borderRight: `4px solid transparent`
                          }}>
                          <Phone className="h-8 w-8" style={{ color: colors.antiqueGold }} />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-full flex items-center justify-center"
                          style={{
                            backgroundColor: colors.antiqueGold + '20',
                            border: `2px solid ${colors.antiqueGold}`
                          }}>
                          <Phone className="h-8 w-8" style={{ color: colors.antiqueGold }} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status Message */}
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">
                      {status === 'loading' ? 'Loading...' : 
                       status === 'initiated' ? 'Call initiated. Waiting for psychic...' :
                       status === 'ringing' ? 'Ringing psychic...' :
                       status === 'accepted' ? 'Psychic accepted! Connecting...' :
                       status === 'active' ? 'Call in progress' :
                       status === 'rejected' ? 'Call rejected by psychic' :
                       status === 'cancelled' ? 'Call cancelled' :
                       status === 'completed' ? 'Call completed' :
                       status === 'failed' ? 'Call failed' :
                       status === 'expired' ? 'Call request expired' :
                       'Connecting...'}
                    </h3>

                    {/* Timer Display */}
                    {status === 'active' && (
                      <div className="text-4xl font-bold text-white my-4 font-mono">
                        {formatTime(timer)}
                      </div>
                    )}

                    {/* Countdown Display */}
                    {(status === 'initiated' || status === 'ringing' || status === 'accepted') && timeLeft > 0 && (
                      <div className="my-4">
                        <div className="text-sm text-gray-300 mb-2">
                          Psychic has {timeLeft} seconds to respond
                        </div>
                        <Progress
                          value={(30 - timeLeft) * (100/30)}
                          className="h-2"
                          style={{ backgroundColor: colors.antiqueGold + '40' }}
                        />
                      </div>
                    )}

                    {/* Credits Display */}
                    {status === 'active' && (
                      <div className="text-sm text-gray-300">
                        Credits used: {formatCredits(creditsUsed)}
                        {isFreeSession && timer < 60 && (
                          <span className="ml-2 text-green-400">(First minute free)</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="pt-4">
                    {status === 'initiated' || status === 'ringing' ? (
                      <Button
                        onClick={cancelCall}
                        className="rounded-full px-8 py-6 text-lg font-semibold"
                        style={{ backgroundColor: '#ef4444', color: 'white' }}
                        disabled={isConnecting}
                      >
                        <PhoneOff className="mr-2 h-5 w-5" />
                        Cancel Call
                      </Button>
                    ) : status === 'accepted' || status === 'active' ? (
                      <Button
                        onClick={endCall}
                        className="rounded-full px-8 py-6 text-lg font-semibold"
                        style={{ backgroundColor: '#ef4444', color: 'white' }}
                        disabled={isConnecting}
                      >
                        <PhoneOff className="mr-2 h-5 w-5" />
                        End Call
                      </Button>
                    ) : (
                      <Button
                        onClick={() => navigate('/')}
                        className="rounded-full px-8 py-6 text-lg font-semibold"
                        style={{ backgroundColor: colors.deepPurple, color: colors.softIvory }}
                      >
                        <X className="mr-2 h-5 w-5" />
                        Back to Home
                      </Button>
                    )}
                  </div>
                </div>
              </Card>

              {/* Control Buttons */}
              {status === 'active' && (
                <Card className="p-6" style={{
                  backgroundColor: colors.darkPurple,
                  borderColor: colors.antiqueGold + '40'
                }}>
                  <div className="grid grid-cols-3 gap-4">
                    <Button
                      onClick={toggleMute}
                      className="rounded-full p-4"
                      variant={isMuted ? "destructive" : "outline"}
                      style={{
                        borderColor: isMuted ? '#ef4444' : colors.antiqueGold,
                        color: isMuted ? 'white' : colors.antiqueGold
                      }}
                    >
                      {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                    </Button>

                    <Button
                      onClick={() => setIsVideoOn(!isVideoOn)}
                      className="rounded-full p-4"
                      variant={isVideoOn ? "default" : "outline"}
                      disabled
                      style={{
                        borderColor: colors.antiqueGold,
                        color: colors.antiqueGold,
                        opacity: 0.5
                      }}
                    >
                      {isVideoOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
                    </Button>

                    <Button
                      onClick={() => navigate(`/message/${callData.psychic?._id}`)}
                      className="rounded-full p-4"
                      variant="outline"
                      style={{
                        borderColor: colors.antiqueGold,
                        color: colors.antiqueGold
                      }}
                    >
                      <MessageCircle className="h-6 w-6" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-2 text-center text-xs text-gray-400">
                    <div>{isMuted ? 'Unmute' : 'Mute'}</div>
                    <div>Video {isVideoOn ? 'Off' : 'On'}</div>
                    <div>Switch to Chat</div>
                  </div>

                  {/* Audio permission notice */}
                  {!isAudioPlaying && (
                    <div className="mt-4 p-3 rounded-lg animate-pulse"
                      style={{ backgroundColor: colors.antiqueGold + '20', border: `1px solid ${colors.antiqueGold}` }}>
                      <div className="flex items-center gap-2 text-sm">
                        <AlertCircle className="h-4 w-4" style={{ color: colors.antiqueGold }} />
                        <span className="text-gray-200">Click anywhere to enable audio</span>
                      </div>
                    </div>
                  )}
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioCallPage;