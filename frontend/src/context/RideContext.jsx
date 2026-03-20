import { createContext, useState } from "react";

export const RideContext = createContext();

export const RideProvider = ({ children }) => {
  const [activeRide, setActiveRide] = useState(null);

  return (
    <RideContext.Provider value={{ activeRide, setActiveRide }}>
      {children}
    </RideContext.Provider>
  );
};

export default RideProvider;
