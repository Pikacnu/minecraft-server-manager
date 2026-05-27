import { useEffect, useRef, useState } from 'react';
import { SendHorizonal, ChevronDown, ChevronUp } from 'lucide-react';
import { MessageType, type ReceiveMessage } from '@/web/websocket/type';
import { useWebSocket } from '@/web/contexts/websocket';

type ExecReceivePayload = ReceiveMessage<MessageType.EXEC>['payload'];

export default function ManagementTerminal({
  serverName,
  alwaysOpen = false,
}: {
  serverName: string;
  alwaysOpen?: boolean;
}) {
  const [output, setOutput] = useState<string>('');
  const [isOpen, setIsOpen] = useState<boolean>(alwaysOpen);
  const [inputCommand, setInputCommand] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const { sendMessage, message } = useWebSocket();
  const messageIdRef = useRef<string>('');
  const sessionIdRef = useRef<string>('');
  const pendingBootstrapInputRef = useRef<string>('');
  const terminalRef = useRef<HTMLPreElement>(null);

  const appendOutput = (value: string) => {
    setOutput((prev) => {
      const merged = prev ? `${prev}\n${value}` : value;
      return merged.split('\n').slice(-500).join('\n');
    });
  };

  const closeSession = () => {
    if (!sessionIdRef.current) return;

    sendMessage({
      type: MessageType.EXEC,
      payload: {
        action: 'close',
        serverName,
        sessionId: sessionIdRef.current,
      },
    });

    sessionIdRef.current = '';
    setSessionId('');
  };

  const startSession = (initialInput?: string) => {
    if (initialInput) pendingBootstrapInputRef.current = initialInput;
    sendMessage({
      type: MessageType.EXEC,
      payload: {
        action: 'start',
        serverName,
        command: ['/bin/sh'],
        tty: true,
      },
    });
  };

  const handleSendCommand = () => {
    if (inputCommand.trim() === '') return;
    appendOutput(`> ${inputCommand}`);
    if (!sessionIdRef.current) {
      startSession(inputCommand);
      setInputCommand('');
      return;
    }

    sendMessage({
      type: MessageType.EXEC,
      payload: {
        action: 'input',
        serverName,
        sessionId: sessionIdRef.current,
        input: `${inputCommand}\n`,
      },
    });
    setInputCommand('');
  };

  useEffect(() => {
    if (
      message &&
      messageIdRef.current !== message?.id &&
      message?.type === MessageType.EXEC
    ) {
      const execPayload = message.payload as ExecReceivePayload;
      if (
        execPayload.serverName === serverName &&
        execPayload.sessionId !== undefined
      ) {
        if (!sessionIdRef.current && execPayload.sessionId) {
          sessionIdRef.current = execPayload.sessionId;
          setSessionId(execPayload.sessionId);

          if (pendingBootstrapInputRef.current) {
            sendMessage({
              type: MessageType.EXEC,
              payload: {
                action: 'input',
                serverName,
                sessionId: execPayload.sessionId,
                input: `${pendingBootstrapInputRef.current}\n`,
              },
            });
            pendingBootstrapInputRef.current = '';
          }
        }

        if (execPayload.status === 'ok' && execPayload.output !== undefined) {
          appendOutput(execPayload.output);
        }

        if (execPayload.status === 'error') {
          appendOutput(`[exec] ${execPayload.message || 'Exec session failed.'}`);
          sessionIdRef.current = '';
          setSessionId('');
        }

        if (execPayload.status === 'closed') {
          appendOutput(
            `[exec] Session closed${execPayload.exitCode !== undefined ? ` (${execPayload.exitCode})` : ''}.`,
          );
          sessionIdRef.current = '';
          setSessionId('');
        }
      }
      messageIdRef.current = message?.id || '';
    }
  }, [message, serverName, sendMessage]);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    return () => {
      closeSession();
    };
  }, [serverName]);

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
          <ChevronDown /> Terminal
        </button>
      ) : (
        <>
          {alwaysOpen || (
            <button
              onClick={() => setIsOpen(false)}
              className='p-4 w-full flex gap-2'
            >
              <ChevronUp /> Terminal
            </button>
          )}
          <div className='grid min-h-0 grow grid-rows-[minmax(0,1fr)_auto] gap-2'>
            <pre
              ref={terminalRef}
              className='min-h-0 w-full overflow-y-auto rounded-lg bg-black p-2 font-mono text-sm text-white whitespace-pre-wrap wrap-break-word'
            >
              {output || 'No exec output yet.'}
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
