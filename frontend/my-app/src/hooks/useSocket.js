import { useEffect, useRef, useState, useCallback } from 'react';
import { getWebSocketUrl } from '@/lib/api';

// Socket connection states
export const SOCKET_STATES = {
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  DISCONNECTED: 'DISCONNECTED',
  ERROR: 'ERROR',
  RECONNECTING: 'RECONNECTING',
};

// Custom hook for WebSocket connection
export const useSocket = (username, options = {}) => {
  const {
    autoConnect = true,
    reconnectAttempts = 5,
    reconnectInterval = 3000,
    onConnect,
    onDisconnect,
    onError,
    onMessage,
  } = options;

  const [connectionState, setConnectionState] = useState(SOCKET_STATES.DISCONNECTED);
  const [lastMessage, setLastMessage] = useState(null);
  const [connectionError, setConnectionError] = useState(null);
  
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const isManuallyClosedRef = useRef(false);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!username) {
      console.warn('⚠️ Cannot connect: Username is required');
      return;
    }

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      console.log('🔌 Already connected to WebSocket');
      return;
    }

    try {
      setConnectionState(SOCKET_STATES.CONNECTING);
      setConnectionError(null);
      isManuallyClosedRef.current = false;

      const wsUrl = getWebSocketUrl(username);
      console.log(`🔌 Connecting to WebSocket: ${wsUrl}`);
      
      socketRef.current = new WebSocket(wsUrl);

      socketRef.current.onopen = (event) => {
        console.log('✅ WebSocket connected successfully');
        setConnectionState(SOCKET_STATES.CONNECTED);
        reconnectAttemptsRef.current = 0;
        onConnect?.(event);
      };

      socketRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          onMessage?.(data, event);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
          setLastMessage({ type: 'raw', data: event.data });
          onMessage?.(event.data, event);
        }
      };

      socketRef.current.onclose = (event) => {
        console.log('🔌 WebSocket connection closed:', event.code, event.reason);
        setConnectionState(SOCKET_STATES.DISCONNECTED);
        
        onDisconnect?.(event);

        // Attempt to reconnect if not manually closed
        if (!isManuallyClosedRef.current && reconnectAttemptsRef.current < reconnectAttempts) {
          setConnectionState(SOCKET_STATES.RECONNECTING);
          reconnectAttemptsRef.current += 1;
          
          console.log(`🔄 Attempting to reconnect (${reconnectAttemptsRef.current}/${reconnectAttempts})...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      socketRef.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setConnectionState(SOCKET_STATES.ERROR);
        setConnectionError(error);
        onError?.(error);
      };

    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
      setConnectionState(SOCKET_STATES.ERROR);
      setConnectionError(error);
      onError?.(error);
    }
  }, [username, reconnectAttempts, reconnectInterval, onConnect, onDisconnect, onError, onMessage]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    isManuallyClosedRef.current = true;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (socketRef.current) {
      console.log('🔌 Manually disconnecting WebSocket');
      socketRef.current.close(1000, 'Manual disconnect');
      socketRef.current = null;
    }

    setConnectionState(SOCKET_STATES.DISCONNECTED);
    setConnectionError(null);
  }, []);

  // Send message through WebSocket
  const sendMessage = useCallback((message) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      try {
        const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
        socketRef.current.send(messageStr);
        console.log('📤 Message sent:', message);
        return true;
      } catch (error) {
        console.error('❌ Error sending message:', error);
        return false;
      }
    } else {
      console.warn('⚠️ Cannot send message: WebSocket not connected');
      return false;
    }
  }, []);

  // Send ping to keep connection alive
  const sendPing = useCallback(() => {
    return sendMessage({ type: 'ping', timestamp: Date.now() });
  }, [sendMessage]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && username) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [username, autoConnect, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return {
    connectionState,
    lastMessage,
    connectionError,
    isConnected: connectionState === SOCKET_STATES.CONNECTED,
    isConnecting: connectionState === SOCKET_STATES.CONNECTING,
    isReconnecting: connectionState === SOCKET_STATES.RECONNECTING,
    connect,
    disconnect,
    sendMessage,
    sendPing,
    reconnectAttempts: reconnectAttemptsRef.current,
  };
};

// Custom hook for cursor events
export const useCursorEvents = (socket, userId) => {
  const sendCursorMove = useCallback((cursorData) => {
    if (socket?.sendMessage) {
      return socket.sendMessage({
        type: 'cursor:move',
        data: cursorData,
      });
    }
    return false;
  }, [socket]);

  const sendCursorUpdate = useCallback((cursorData) => {
    if (socket?.sendMessage) {
      return socket.sendMessage({
        type: 'cursor:update',
        data: cursorData,
      });
    }
    return false;
  }, [socket]);

  return {
    sendCursorMove,
    sendCursorUpdate,
  };
};

// Custom hook for socket event listeners
export const useSocketEvents = (socket, eventHandlers = {}) => {
  const {
    onUserConnected,
    onUserDisconnected,
    onCursorMove,
    onCursorUpdate,
    onUsersUpdate,
    onConnectionSuccess,
    onPong,
    onError,
  } = eventHandlers;

  useEffect(() => {
    if (!socket?.lastMessage) return;

    const message = socket.lastMessage;

    switch (message.type) {
      case 'connection:success':
        console.log('🎉 Connection established successfully');
        onConnectionSuccess?.(message.data);
        break;

      case 'users:update':
        console.log('👥 Users list updated');
        onUsersUpdate?.(message.data);
        break;

      case 'cursor:move':
        onCursorMove?.(message.data);
        break;

      case 'cursor:update':
        onCursorUpdate?.(message.data);
        break;

      case 'user:connected':
        console.log(`👋 User connected: ${message.data?.username}`);
        onUserConnected?.(message.data);
        break;

      case 'user:disconnected':
        console.log(`👋 User disconnected: ${message.data?.username}`);
        onUserDisconnected?.(message.data);
        break;

      case 'pong':
        onPong?.(message);
        break;

      case 'error':
        console.error('❌ Socket error:', message.data);
        onError?.(message.data);
        break;

      default:
        console.log('📨 Unknown message type:', message.type, message);
        break;
    }
  }, [socket?.lastMessage, onUserConnected, onUserDisconnected, onCursorMove, onCursorUpdate, onUsersUpdate, onConnectionSuccess, onPong, onError]);

  return {
    lastMessage: socket?.lastMessage,
    isConnected: socket?.isConnected,
  };
};
