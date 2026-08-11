import React, { createContext, useContext, useState } from 'react';

const StoreContext = createContext();

export function StoreProvider({ children, storeData, setStoreData }) {
  return (
    <StoreContext.Provider value={{ storeId: storeData?.id, storeData, setStoreData }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  return useContext(StoreContext);
}
