import { z } from 'zod';

export enum MessageType {
  RCON = 'rcon',
  EXEC = 'exec',
  SYSTEM = 'system',
  SERVERINFO = 'serverinfo',
  SERVERLOG = 'serverlog',
  HEARTBEAT = 'heartbeat',
}

export const serverInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string(),
  domain: z.string().optional(),
  address: z.string(),
  playersOnline: z.number(),
});

const sendMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal(MessageType.RCON),
    payload: z.object({
      command: z.string(),
      serverName: z.string(),
    }),
  }),
  z.object({
    type: z.literal(MessageType.EXEC),
    payload: z.object({
      action: z.enum(['start', 'input', 'close']),
      serverName: z.string(),
      sessionId: z.string().optional(),
      command: z.union([z.string(), z.array(z.string())]).optional(),
      input: z.string().optional(),
      containerName: z.string().optional(),
      tty: z.boolean().optional(),
    }),
  }),
  z.object({
    type: z.literal(MessageType.SYSTEM),
    payload: z.object({ command: z.string() }),
  }),
  z.object({
    type: z.literal(MessageType.SERVERINFO),
    payload: z.object({}),
  }),
  z.object({
    type: z.literal(MessageType.SERVERLOG),
    payload: z.object({
      serverName: z.string(),
      action: z.enum(['subscribe', 'unsubscribe']),
    }),
  }),
  z.object({
    type: z.literal(MessageType.HEARTBEAT),
    payload: z.object({ timestamp: z.number() }),
  }),
]);

const receiveMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal(MessageType.RCON),
    payload: z.object({
      status: z.string(),
      response: z.string(),
      serverName: z.string(),
      message: z.string().optional(),
    }),
  }),
  z.object({
    type: z.literal(MessageType.EXEC),
    payload: z.object({
      status: z.enum(['ok', 'error', 'closed']),
      serverName: z.string(),
      sessionId: z.string(),
      output: z.string().optional(),
      stream: z.enum(['stdout', 'stderr', 'status']).optional(),
      exitCode: z.number().optional(),
      message: z.string().optional(),
    }),
  }),
  z.object({
    type: z.literal(MessageType.SYSTEM),
    payload: z.object({
      status: z.string(),
      info: z.string(),
      message: z.string().optional(),
    }),
  }),
  z.object({
    type: z.literal(MessageType.SERVERINFO),
    payload: z.object({
      servers: z.array(serverInfoSchema),
      message: z.string().optional(),
    }),
  }),
  z.object({
    type: z.literal(MessageType.SERVERLOG),
    payload: z.object({
      status: z.enum(['ok', 'error']),
      serverName: z.string(),
      chunk: z.string().optional(),
      message: z.string().optional(),
    }),
  }),
  z.object({
    type: z.literal(MessageType.HEARTBEAT),
    payload: z.object({
      timestamp: z.number(),
      message: z.string().optional(),
    }),
  }),
]);

export { sendMessageSchema, receiveMessageSchema };

export type SendMessage<T extends MessageType = MessageType> = Extract<
  z.infer<typeof sendMessageSchema>,
  { type: T }
>;

export type ReceiveMessage<T extends MessageType = MessageType> = Extract<
  z.infer<typeof receiveMessageSchema>,
  { type: T }
>;

export type ServerInfo = z.infer<typeof serverInfoSchema>;
