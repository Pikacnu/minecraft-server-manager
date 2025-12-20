import { createContext, useContext, useState, useEffect } from 'react';

export type ServerInfo = {
  id: string;
  name: string;
  status: string;
  domain?: string;
  address: string;
  playersOnline: number;
};
const Page = createContext<{
  serverInfo: ServerInfo[];
  setServerInfo: (info: ServerInfo[]) => void;
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

  useEffect(() => {
    const fetchServerInfo = async () => {
      try {
        const response = await fetch('/api/server-info');
        const data = await response.json();
        setServerInfo(data.data);
      } catch (error) {
        console.error('Failed to fetch server info:', error);
      }
    };
    const timeout = setInterval(fetchServerInfo, 10 * 1_000);
    fetchServerInfo();
    return () => clearInterval(timeout);
  }, []);

  return (
    <Page.Provider
      value={{
        serverInfo,
        setServerInfo,
        currentSelectedServerId,
        setCurrentSelectedServerId,
      }}
    >
      {children}
    </Page.Provider>
  );
};

export const useServers = () => useContext(Page);
export const getServersInfo = () => {
  const serverContext = useServers();
  return serverContext.serverInfo;
};
export const setServersInfo = (info: ServerInfo[]) => {
  const serverContext = useServers();
  serverContext.setServerInfo(info);
};
