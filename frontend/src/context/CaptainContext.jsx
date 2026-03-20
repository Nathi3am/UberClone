import { createContext, useState, useContext, useEffect } from "react";

export const CaptainDataContext = createContext();

const CaptainContext = ({ children }) => {
  const [captain, setCaptain] = useState(() => {
    try {
      const cached = localStorage.getItem("captainProfile");
      return cached ? JSON.parse(cached) : {};
    } catch (e) {
      return {};
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      if (captain && Object.keys(captain).length > 0) {
        localStorage.setItem("captainProfile", JSON.stringify(captain));
      }
    } catch (e) {}
  }, [captain]);

  const updateCaptain = (captainData) => {
    setCaptain(captainData);
  };
  return (
    <CaptainDataContext.Provider
      value={{
        captain,
        setCaptain,
        isLoading,
        setIsLoading,
        error,
        setError,
        updateCaptain,
      }}
    >
      {children}
    </CaptainDataContext.Provider>
  );
};

export default CaptainContext;
