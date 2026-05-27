import {
  createContext,
  useContext,
  useState,
  useEffect,
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
  currentSelectedServerId: string;
  setCurrentSelectedServerId: (id: string) => void;
}>({
  serverInfo: [],
  setServerInfo: () => {},
  currentSelectedServerId: '',
  setCurrentSelectedServerId: () => {},
});

const SELECTED_SERVER_STORAGE_KEY = 'minecraft:selectedServerId';

export const ServerProvider = ({ children }: { children: React.ReactNode }) => {
  const [serverInfo, setServerInfo] = useState<ServerInfo[]>([]);
  const [currentSelectedServerId, setCurrentSelectedServerId] =
    useState<string>('');
  const { message, sendMessage } = useWebSocket();

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SELECTED_SERVER_STORAGE_KEY);
      if (saved) {
        setCurrentSelectedServerId(saved);
      }
    } catch (error) {
      console.error('Failed to read selected server from storage:', error);
    }
  }, []);

  useEffect(() => {
    try {
      if (currentSelectedServerId) {
        window.localStorage.setItem(
          SELECTED_SERVER_STORAGE_KEY,
          currentSelectedServerId,
        );
      } else {
        window.localStorage.removeItem(SELECTED_SERVER_STORAGE_KEY);
      }
    } catch (error) {
      console.error('Failed to persist selected server:', error);
    }
  }, [currentSelectedServerId]);

  useEffect(() => {
    if (message && message.type === MessageType.SERVERINFO) {
      const updatedServers = (message as ReceiveMessage<MessageType.SERVERINFO>)
        .payload.servers;
      setServerInfo(updatedServers);

      if (
        currentSelectedServerId &&
        !updatedServers.some((server) => server.id === currentSelectedServerId)
      ) {
        setCurrentSelectedServerId('');
      }
    }
  }, [message, currentSelectedServerId]);

  useEffect(() => {
    const requestServerInfo = () => {
      sendMessage({ type: MessageType.SERVERINFO, payload: {} });
    };

    const startupTimeout = setTimeout(requestServerInfo, 500);
    const interval = setInterval(requestServerInfo, 5 * 1_000);

    return () => {
      clearTimeout(startupTimeout);
      clearInterval(interval);
    };
  }, [sendMessage]);

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
