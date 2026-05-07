import { Dock, Home, Server, Settings, SquareChartGantt } from 'lucide-react';
import { usePage, PageSectionList } from '../contexts/page';
import type { ReactElement } from 'react';
import { DeviceType, useDevice } from '../hooks/useDevice';

export default function Nav() {
  const { currentSection, setCurrentSection } = usePage();
  const deviceType = useDevice();

  const sectionDisplayIcon: Record<string, ReactElement> = {
    home: <Home></Home>,
    servers: <Server></Server>,
    serverData: <SquareChartGantt></SquareChartGantt>,
    serverManagement: <SquareChartGantt></SquareChartGantt>,
    settings: <Settings></Settings>,
  };

  return (
    <div className='flex flex-row w-full h-16 bg-white dark:bg-gray-800 shadow-md top-0 left-0 gap-2 md:gap-4 lg:gap-8 max-xl:justify-center'>
      <div className='flex items-center justify-center px-4 text-base md:text-lg lg:text-xl font-bold gap-1 whitespace-nowrap max-xl:hidden'>
        <Dock></Dock>
        <span className='hidden sm:inline'>Minecraft Server Manager</span>
      </div>

      {PageSectionList.map((section) => (
        <div
          key={section}
          className={`flex items-center justify-center px-2 md:px-3 lg:px-4 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 ${
            currentSection === section
              ? 'bg-gray-300 dark:bg-gray-600 font-semibold'
              : ''
          }`}
          onClick={() => setCurrentSection(section)}
        >
          {sectionDisplayIcon[section]}
          {deviceType !== DeviceType.Mobile && (
            <>
              &nbsp;
              <span className='hidden sm:inline'>
                {section.charAt(0).toUpperCase() + section.slice(1)}
              </span>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
