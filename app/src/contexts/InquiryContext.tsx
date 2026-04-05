import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';

export type InquiryCategory = 'account' | 'payment' | 'bug' | 'feature' | 'other';

export interface Inquiry {
  id: string;
  userId: string;
  category: InquiryCategory;
  title: string;
  content: string;
  status: 'open' | 'replied' | 'closed';
  reply?: string;
  createdAt: string;
  repliedAt?: string;
}

interface InquiryContextValue {
  inquiries: Inquiry[];
  submitInquiry: (inquiry: Omit<Inquiry, 'id' | 'status' | 'createdAt'>) => void;
  getUserInquiries: (userId: string) => Inquiry[];
  getInquiry: (id: string) => Inquiry | undefined;
}

const InquiryContext = createContext<InquiryContextValue | null>(null);

export function InquiryProvider({ children }: { children: ReactNode }) {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);

  const submitInquiry = useCallback((inquiry: Omit<Inquiry, 'id' | 'status' | 'createdAt'>) => {
    const newInquiry: Inquiry = {
      ...inquiry,
      id: `inq_${Date.now()}`,
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    setInquiries((prev) => [newInquiry, ...prev]);
  }, []);

  const getUserInquiries = useCallback(
    (userId: string) => inquiries.filter((i) => i.userId === userId),
    [inquiries],
  );

  const getInquiry = useCallback(
    (id: string) => inquiries.find((i) => i.id === id),
    [inquiries],
  );

  const value = useMemo<InquiryContextValue>(() => ({
    inquiries,
    submitInquiry,
    getUserInquiries,
    getInquiry,
  }), [inquiries, submitInquiry, getUserInquiries, getInquiry]);

  return <InquiryContext.Provider value={value}>{children}</InquiryContext.Provider>;
}

export function useInquiry() {
  const ctx = useContext(InquiryContext);
  if (!ctx) throw new Error('useInquiry must be used inside InquiryProvider');
  return ctx;
}
