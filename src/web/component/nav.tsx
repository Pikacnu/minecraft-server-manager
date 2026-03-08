import { Dock, Home, Server, Settings, SquareChartGantt } from 'lucide-react';
import { usePage, PageSectionList } from '../contexts/page';
import type { ReactElement } from 'react';

export default function Nav() {
  const { currentSection, setCurrentSection } = usePage();

  const sectionDisplayIcon: Record<string, ReactElement> = {
    home: <Home></Home>,
    servers: <Server></Server>,
    serverManagement: <SquareChartGantt></SquareChartGantt>,
    settings: <Settings></Settings>,
  };

  return (
    <div className='flex flex-row w-full h-16 bg-white dark:bg-gray-800 shadow-md top-0 left-0 gap-8'>
      <div className='flex items-center justify-center px-4 text-xl font-bold gap-1'>
        <Dock></Dock>
        Minecraft Server Manager
      </div>
      {PageSectionList.map((section) => (
        <div
          key={section}
          className={`flex items-center justify-center px-4 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 ${
            currentSection === section
              ? 'bg-gray-300 dark:bg-gray-600 font-semibold'
              : ''
          }`}
          onClick={() => setCurrentSection(section)}
        >
          {sectionDisplayIcon[section]} &nbsp;
          {section.charAt(0).toUpperCase() + section.slice(1)}
        </div>
      ))}
    </div>
  );
}
