import { useState, useEffect, useRef } from 'react';
import { SendHorizonal, ChevronDown, ChevronUp } from 'lucide-react';
import { MessageType } from '../websocket/type';
import { useWebSocket } from '../contexts/websocket';

export default function Rcon({
  serverName,
  alwaysOpen = false,
}: {
  serverName: string;
  alwaysOpen?: boolean;
}) {
  const [output, setOutput] = useState<string>('');
  const [isOpen, setIsOpen] = useState<boolean>(alwaysOpen);
  const [inputCommand, setInputCommand] = useState<string>('');
  const { sendMessage, message } = useWebSocket();
  const messageIdRef = useRef<string>('');
  const terminalRef = useRef<HTMLPreElement>(null);

  const appendOutput = (value: string) => {
    setOutput((prev) => {
      const merged = prev ? `${prev}\n${value}` : value;
      return merged.split('\n').slice(-500).join('\n');
    });
  };

  const handleSendCommand = () => {
    if (inputCommand.trim() === '') return;
    const cmd = inputCommand.trim();
    appendOutput(`> ${cmd}`);
    sendMessage({
      type: MessageType.RCON,
      payload: {
        command: cmd,
        serverName,
      },
    });
    setInputCommand('');
  };

  useEffect(() => {
    if (
      message &&
      messageIdRef.current !== message.id &&
      message.type === MessageType.RCON
    ) {
      const payload = message.payload as {
        status: string;
        response?: string;
        message?: string;
        serverName: string;
      };
      if (payload.serverName === serverName) {
        if (payload.status === 'ok') {
          appendOutput(payload.response ?? '');
        } else {
          appendOutput(`[rcon] ${payload.message ?? 'RCON error.'}`);
        }
      }
      messageIdRef.current = message.id || '';
    }
  }, [message, serverName]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output]);

  return (
    <div className='relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-lg'>
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className=' self-start p-4 w-full flex gap-2'
        >
          <ChevronDown /> RCON
        </button>
      ) : (
        <>
          {alwaysOpen || (
            <button
              onClick={() => setIsOpen(false)}
              className='p-4 w-full flex gap-2'
            >
              <ChevronUp /> RCON
            </button>
          )}
          <div className='grid min-h-0 grow grid-rows-[minmax(0,1fr)_auto] gap-2'>
            <pre
              ref={terminalRef}
              className='min-h-0 w-full overflow-y-auto rounded-lg bg-black p-2 font-mono text-sm text-white whitespace-pre-wrap wrap-break-word'
            >
              {output || 'No rcon output yet.'}
            </pre>
            <div className='mt-2 flex min-w-0 items-center gap-2'>
              <input
                type='text'
                value={inputCommand}
                onChange={(e) => setInputCommand(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSendCommand();
                  }
                }}
                className='min-w-0 flex-1 rounded-lg border border-gray-300 p-2 font-mono text-sm'
              />
              <button
                className='shrink-0 rounded-xl p-2 hover:bg-gray-800/40'
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
