import { useState, useEffect, useRef } from 'react';
import { SendHorizonal, ChevronDown, ChevronUp } from 'lucide-react';
import { MessageType, type Message } from '../websocket/type';
import { useWebSocket } from '../contexts/websocket';

export default function Rcon({ serverName }: { serverName: string }) {
  const [lines, setLines] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [inputCommand, setInputCommand] = useState<string>('');
  const { sendMessage, message } = useWebSocket();
  const messageIdRef = useRef<string>('');

  const handleSendCommand = () => {
    if (inputCommand.trim() === '') return;
    sendMessage({
      type: MessageType.RCON,
      payload: {
        command: inputCommand,
        serverName,
      },
    });
    setLines((prevLines) => [...prevLines, `> ${inputCommand}`]);
    setInputCommand('');
  };

  useEffect(() => {
    if (
      message &&
      messageIdRef.current !== message?.id &&
      message?.type === MessageType.RCON
    ) {
      const rconPayload = message.payload as {
        status: string;
        response: string;
        serverName: string;
      };
      if (
        rconPayload.status === 'ok' &&
        rconPayload.response !== undefined &&
        rconPayload.serverName === serverName
      ) {
        setLines((prevLines) => [...prevLines, `< ${rconPayload.response}`]);
      }
      messageIdRef.current = message?.id || '';
    }

    const container = document.getElementById('terminal');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [lines, message]);

  return (
    <div className='flex flex-col justify-start w-full  rounded-lg mt-4 p-2 bg-gray-500/40'>
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className=' self-start p-4 w-full flex gap-2'
        >
          <ChevronDown /> RCON Terminal
        </button>
      ) : (
        <>
          <button
            onClick={() => setIsOpen(false)}
            className='p-4 w-full flex gap-2'
          >
            <ChevronUp /> RCON Terminal
          </button>
          <div className='flex flex-col grow relative'>
            <div
              className='bg-black text-white w-full h-48 overflow-y-scroll select-text p-2'
              id='terminal'
            >
              {lines.map((line, index) => (
                <div
                  key={index}
                  className='font-mono text-sm'
                >
                  {line}
                </div>
              ))}
            </div>
            <div className='flex flex-row'>
              <input
                type='text'
                value={inputCommand}
                onChange={(e) => setInputCommand(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSendCommand();
                  }
                }}
                className='grow border border-gray-300 m-1 p-1 font-mono text-sm rounded-lg'
              />
              <button
                className=' hover:bg-gray-800/40 p-2 rounded-xl'
                onClick={handleSendCommand}
              >
                <SendHorizonal />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
