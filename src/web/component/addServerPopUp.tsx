import type {
  Variables,
  MinecraftServerDeploymentsGeneratorArguments,
} from '@/utils/type';
import ServerSetting from './serverSetting';
import { useState } from 'react';
import { useOpenServerPanel } from '../contexts/addServerPanel';

export default function AddServerPopUp() {
  const [serverSettingSaver, setServerSettingSaver] = useState<
    Omit<MinecraftServerDeploymentsGeneratorArguments, 'Variables'> & Variables
  >({});
  const { isOpen, setIsOpen } = useOpenServerPanel();
  const handleAddServer = () => {
    fetch('/api/server-instance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(serverSettingSaver),
    });
    setIsOpen(false);
  };
  return (
    <div
      className='fixed w-full h-full top-0 left-0 bg-black/70 flex justify-center items-center z-10'
      onClick={() => {
        if (!isOpen) return;
        setIsOpen(false);
      }}
    >
      <div
        className='w-2/3 flex flex-col gap-4 bg-white/80 p-4 rounded-3xl '
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <div className='border border-gray-300 rounded-lg p-4 bg-gray-900 text-white flex flex-col items-start'>
          <ul className=' grid grid-cols-2 w-full'>
            {[
              ['ServerName', serverSettingSaver.SERVER_NAME],
              ['Version', serverSettingSaver.version],
              ['Memory Limit', serverSettingSaver.MEMORY],
              ['Type', serverSettingSaver.type],
            ].map(([name, value], index) => (
              <li
                key={index}
                className='mb-2 gap-2 flex flex-row items-center'
              >
                <span className=' border border-amber-300 p-1 rounded-lg  '>
                  {name}
                </span>
                :<span>{value}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className=' bg-black rounded-xl flex'>
          <ServerSetting
            isToggleAble={false}
            open={true}
            setSetting={setServerSettingSaver}
          />
        </div>
        <div>
          <button
            className='mt-4 p-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600'
            onClick={() => handleAddServer()}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
