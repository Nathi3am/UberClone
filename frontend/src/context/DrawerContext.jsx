import React, { createContext, useState, useCallback } from 'react';

export const DrawerContext = createContext({
  open: false,
  openDrawer: () => {},
  closeDrawer: () => {},
  toggleDrawer: () => {},
});

export const DrawerProvider = ({ children }) => {
  const [open, setOpen] = useState(false);

  const openDrawer = useCallback(() => setOpen(true), []);
  const closeDrawer = useCallback(() => setOpen(false), []);
  const toggleDrawer = useCallback(() => setOpen((v) => !v), []);

  return (
    <DrawerContext.Provider value={{ open, openDrawer, closeDrawer, toggleDrawer }}>
      {children}
    </DrawerContext.Provider>
  );
};

export default DrawerProvider;
