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
  defaultSetting: Record<string, any>;
  setDefaultSetting: Dispatch<SetStateAction<Record<string, any>>>;
}>({
  isOpen: false,
  setIsOpen: () => {},
  defaultSetting: {},
  setDefaultSetting: () => {},
});

export const OpenServerPanelProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [defaultSetting, setDefaultSetting] = useState<Record<string, any>>({});
  return (
    <openServerPanelContext.Provider
      value={{ isOpen, setIsOpen, defaultSetting, setDefaultSetting }}
    >
      {children}
    </openServerPanelContext.Provider>
  );
};

export const useOpenServerPanel = () => useContext(openServerPanelContext);

export const getOpenServerPanel = () => {
  const context = useOpenServerPanel();
  return context.isOpen;
};
