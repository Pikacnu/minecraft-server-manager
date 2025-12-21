import { PageSectionEnum, usePage } from '../contexts/page';
import Nav from '../component/nav';
import Home from '../page/home';
import Server from '../page/server';
import { Suspense } from 'react';
import { Loader } from 'lucide-react';
import ServerManagement from '../page/serverManagement';

const sectionToComponent: Record<PageSectionEnum, React.ReactElement> = {
  [PageSectionEnum.Home]: <Home />,
  [PageSectionEnum.Servers]: <Server />,
  [PageSectionEnum.Settings]: <div className='pt-16'>Settings Page</div>,
  [PageSectionEnum.ServerManagement]: <ServerManagement />,
};

export function App() {
  const { currentSection } = usePage();

  return (
    <div className='flex h-screen flex-col items-center bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-gray-100 overflow-hidden w-full relative transform-gpu'>
      <Nav></Nav>
      <Suspense
        fallback={
          <div className='pt-16'>
            <Loader className=' animate-spin' />
          </div>
        }
      >
        <div
          className='flex flex-col relative w-full h-full grow overflow-hidden'
          key={currentSection}
        >
          {sectionToComponent[currentSection]}
        </div>
      </Suspense>
    </div>
  );
}

export default App;
