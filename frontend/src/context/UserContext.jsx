import React, { createContext, useEffect, useState } from "react";

export const UserDataContext = createContext();

const UserContext = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem("userProfile");
      return cached ? JSON.parse(cached) : {};
    } catch (e) {
      return {};
    }
  });

  useEffect(() => {
    try {
      if (user && Object.keys(user).length > 0) {
        localStorage.setItem("userProfile", JSON.stringify(user));
      }
    } catch (e) {}
  }, [user]);

  return (
    <div>
      <UserDataContext.Provider value={{ user, setUser }}>
        {children}
      </UserDataContext.Provider>
    </div>
  );
};

export default UserContext;
