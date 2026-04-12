import React, { createContext, useContext, useRef } from "react";

const RoomContext = createContext(null);

export function RoomProvider({ children }) {
  const broadcastRef = useRef(null);

  return (
    <RoomContext.Provider value={{ broadcastRef }}>
      {children}
    </RoomContext.Provider>
  );
}

export function useRoomContext() {
  return useContext(RoomContext);
}