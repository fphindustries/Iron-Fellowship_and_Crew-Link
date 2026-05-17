import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { SOCKET_NAMESPACES } from "../config/api.config";

type NamespaceKey = keyof typeof SOCKET_NAMESPACES;

const sockets: Partial<Record<NamespaceKey, Socket>> = {};

function getSocket(namespace: NamespaceKey): Socket {
  if (!sockets[namespace]) {
    sockets[namespace] = io(SOCKET_NAMESPACES[namespace], {
      withCredentials: true,
      autoConnect: true,
    });
  }
  return sockets[namespace]!;
}

export function useSocketRoom(
  namespace: NamespaceKey,
  room: string,
  handlers: Record<string, (payload?: any) => void>,
) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const socket = getSocket(namespace);

    socket.emit("join-room", room);

    const boundHandlers: Record<string, (p: any) => void> = {};
    for (const event of Object.keys(handlersRef.current)) {
      boundHandlers[event] = (payload: any) => handlersRef.current[event]?.(payload);
      socket.on(event, boundHandlers[event]);
    }

    return () => {
      socket.emit("leave-room", room);
      for (const event of Object.keys(boundHandlers)) {
        socket.off(event, boundHandlers[event]);
      }
    };
  }, [namespace, room]);
}
