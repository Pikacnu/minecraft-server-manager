import { useEffect, useRef, useState, useContext, createContext } from 'react';
import { MessageType, type Message } from '../websocket/type';

type WebSocketContextType = {
  websocket: WebSocket | null;
  sendMessage: (message: Message) => void;
  message: (Message & { id: string }) | null;
};

const WebSocketContext = createContext<WebSocketContextType | undefined>(
  undefined,
);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  const [message, setMessage] = useState<(Message & { id: string }) | null>(
    null,
  );
  const wsRef = useRef<WebSocket | null>(null);

  const setupWebSocket = () => {
    const ws = new WebSocket(`ws://${window.location.host}/api/websocket`);
    ws.onopen = () => {
      console.log('WebSocket connection opened');
    };
    ws.onclose = () => {
      console.log('WebSocket connection closed, attempting to reconnect...');
      setWebsocket(null);
      setTimeout(setupWebSocket, 5000); // Reconnect after 5 seconds
    };
    ws.onmessage = (event) => {
      try {
        const parsedMessage = JSON.parse(event.data) as Message;
        if (
          !Object.keys(parsedMessage).length ||
          ['type', 'payload'].some((key) => !(key in parsedMessage))
        ) {
          console.error('Invalid WebSocket message format:', event.data);
          return;
        }
        if (parsedMessage.type === MessageType.HEARTBEAT) {
          setTimeout(() => {
            ws.send(
              JSON.stringify({
                type: MessageType.HEARTBEAT,
                payload: { timestamp: Date.now() },
              }),
            );
          }, 10 * 1000);
          return;
        }
        setMessage({
          ...parsedMessage,
          id: Math.random().toString(36).substring(2, 15),
        });
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    setWebsocket(ws);
    return ws;
  };

  useEffect(() => {
    wsRef.current = setupWebSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);
  const sendMessage = (message: Message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not open. Unable to send message.');
    }
  };

  return (
    <WebSocketContext.Provider value={{ websocket, sendMessage, message }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};
