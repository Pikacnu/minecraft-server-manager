import {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';

const openServerPanelContext = createContext<{
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}>({
  isOpen: false,
  setIsOpen: () => {},
});

export const OpenServerPanelProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  return (
    <openServerPanelContext.Provider value={{ isOpen, setIsOpen }}>
      {children}
    </openServerPanelContext.Provider>
  );
};

export const useOpenServerPanel = () => useContext(openServerPanelContext);

export const getOpenServerPanel = () => {
  const context = useOpenServerPanel();
  return context.isOpen;
};
