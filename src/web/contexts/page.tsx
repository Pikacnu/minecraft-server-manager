import { createContext, useContext, useState } from 'react';

export enum PageSectionEnum {
  Home = 'home',
  Servers = 'servers',
  Settings = 'settings',
  ServerManagement = 'serverManagement',
}

export const PageSectionList = [
  PageSectionEnum.Home,
  PageSectionEnum.Servers,
  PageSectionEnum.ServerManagement,
  PageSectionEnum.Settings,
];

const Page = createContext<{
  currentSection: PageSectionEnum;
  setCurrentSection: (section: PageSectionEnum) => void;
}>({
  currentSection: PageSectionEnum.Home,
  setCurrentSection: () => {},
});

export const PageProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentSection, setCurrentSection] = useState<PageSectionEnum>(
    PageSectionEnum.Home,
  );
  return (
    <Page.Provider value={{ currentSection, setCurrentSection }}>
      {children}
    </Page.Provider>
  );
};

export const usePage = () => useContext(Page);
export const getPageSection = () => {
  const pageContext = usePage();
  return pageContext.currentSection;
};
export const changePageSection = (section: PageSectionEnum) => {
  const pageContext = usePage();
  pageContext.setCurrentSection(section);
};
