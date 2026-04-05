import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface TicketContextValue {
  balance: number;
  addTickets: (amount: number) => void;
  spendTickets: (amount: number) => boolean;
}

const TicketContext = createContext<TicketContextValue | null>(null);

export function TicketProvider({ children }: { children: ReactNode }) {
  const [balance, setBalance] = useState(0);

  const addTickets = useCallback((amount: number) => {
    setBalance((prev) => prev + amount);
  }, []);

  const spendTickets = useCallback((amount: number): boolean => {
    if (balance < amount) return false;
    setBalance((prev) => prev - amount);
    return true;
  }, [balance]);

  return (
    <TicketContext.Provider value={{ balance, addTickets, spendTickets }}>
      {children}
    </TicketContext.Provider>
  );
}

export function useTicket(): TicketContextValue {
  const ctx = useContext(TicketContext);
  if (!ctx) throw new Error('useTicket must be used within TicketProvider');
  return ctx;
}
