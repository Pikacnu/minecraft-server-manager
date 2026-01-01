import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type SetStateAction,
  type Dispatch,
} from 'react';
import { useWebSocket } from './websocket';
import { MessageType, type ReceiveMessage } from '../websocket/type';

export type ServerInfo = {
  id: string;
  name: string;
  status: string;
  domain?: string;
  address: string;
  playersOnline: number;
};
const ServerContext = createContext<{
  serverInfo: ServerInfo[];
  setServerInfo: Dispatch<SetStateAction<ServerInfo[]>>;
  currentSelectedServerId: string | undefined;
  setCurrentSelectedServerId: (id: string) => void;
}>({
  serverInfo: [],
  setServerInfo: () => {},
  currentSelectedServerId: undefined,
  setCurrentSelectedServerId: () => {},
});

export const ServerProvider = ({ children }: { children: React.ReactNode }) => {
  const [serverInfo, setServerInfo] = useState<ServerInfo[]>([]);
  const [currentSelectedServerId, setCurrentSelectedServerId] =
    useState<string>('');
  const { message, sendMessage } = useWebSocket();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // useEffect(() => {
  //   const fetchServerInfo = async () => {
  //     // try {
  //     //   const response = await fetch('/api/server-info');
  //     //   const data = await response.json();
  //     //   setServerInfo(data.data);
  //     // } catch (error) {
  //     //   console.error('Failed to fetch server info:', error);
  //     // }
  //   };
  //   const timeout = setInterval(fetchServerInfo, 10 * 1_000);
  //   fetchServerInfo();
  //   return () => clearInterval(timeout);
  // }, []);

  useEffect(() => {
    if (message && message.type === MessageType.SERVERINFO) {
      const updatedServers = (message as ReceiveMessage<MessageType.SERVERINFO>)
        .payload.servers;
      setServerInfo(updatedServers);
    }
    timeoutRef.current = setTimeout(() => {
      sendMessage({ type: MessageType.SERVERINFO, payload: {} });
    }, 5 * 1_000);
  }, [message]);

  useEffect(() => {
    sendMessage({ type: MessageType.SERVERINFO, payload: {} });
    console.log('Requested server info via WebSocket');
  }, []);

  return (
    <ServerContext.Provider
      value={{
        serverInfo,
        setServerInfo,
        currentSelectedServerId,
        setCurrentSelectedServerId,
      }}
    >
      {children}
    </ServerContext.Provider>
  );
};

export const useServers = () => useContext(ServerContext);
export const getServersInfo = () => {
  const serverContext = useServers();
  return serverContext.serverInfo;
};
export const setServersInfo = (info: ServerInfo[]) => {
  const serverContext = useServers();
  serverContext.setServerInfo(info);
};
