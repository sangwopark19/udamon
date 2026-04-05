import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

export interface ArchiveFolder {
  id: string;
  name: string;
  postIds: string[];
  createdAt: string;
}

interface ArchiveContextValue {
  savedPostIds: string[];
  folders: ArchiveFolder[];
  isPostSaved: (postId: string) => boolean;
  toggleSavePost: (postId: string) => void;
  createFolder: (name: string) => string;
  deleteFolder: (folderId: string) => void;
  renameFolder: (folderId: string, name: string) => void;
  addPostToFolder: (folderId: string, postId: string) => void;
  removePostFromFolder: (folderId: string, postId: string) => void;
  purgePost: (postId: string) => void;
}

const ArchiveContext = createContext<ArchiveContextValue | null>(null);

const initialSavedIds = ['p1', 'p2', 'p3', 'p11', 'p12', 'p21', 'p22'];
const initialFolders: ArchiveFolder[] = [
  { id: 'f1', name: 'Best Shots', postIds: ['p1', 'p3'], createdAt: '2026-03-01' },
  { id: 'f2', name: '직관 사진', postIds: ['p2', 'p21'], createdAt: '2026-03-05' },
];

let folderCounter = 3;

export function ArchiveProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [savedPostIds, setSavedPostIds] = useState<string[]>(initialSavedIds);
  const [folders, setFolders] = useState<ArchiveFolder[]>(initialFolders);

  useEffect(() => {
    if (!user) {
      setSavedPostIds([]);
      setFolders([]);
    }
  }, [user]);

  const isPostSaved = useCallback(
    (postId: string) => savedPostIds.includes(postId),
    [savedPostIds],
  );

  const toggleSavePost = useCallback((postId: string) => {
    if (!user) return;
    setSavedPostIds((prev) =>
      prev.includes(postId) ? prev.filter((id) => id !== postId) : [...prev, postId],
    );
  }, [user]);

  const createFolder = useCallback((name: string): string => {
    if (!user) return '';
    const id = `f${folderCounter++}`;
    setFolders((prev) => [...prev, { id, name, postIds: [], createdAt: new Date().toISOString() }]);
    return id;
  }, [user]);

  const deleteFolder = useCallback((folderId: string) => {
    if (!user) return;
    setFolders((prev) => prev.filter((f) => f.id !== folderId));
  }, [user]);

  const renameFolder = useCallback((folderId: string, name: string) => {
    if (!user) return;
    setFolders((prev) => prev.map((f) => (f.id === folderId ? { ...f, name } : f)));
  }, [user]);

  const addPostToFolder = useCallback((folderId: string, postId: string) => {
    if (!user) return;
    setFolders((prev) =>
      prev.map((f) =>
        f.id === folderId && !f.postIds.includes(postId)
          ? { ...f, postIds: [...f.postIds, postId] }
          : f,
      ),
    );
  }, [user]);

  const removePostFromFolder = useCallback((folderId: string, postId: string) => {
    if (!user) return;
    setFolders((prev) =>
      prev.map((f) =>
        f.id === folderId ? { ...f, postIds: f.postIds.filter((id) => id !== postId) } : f,
      ),
    );
  }, [user]);

  const purgePost = useCallback((postId: string) => {
    setSavedPostIds((prev) => prev.filter((id) => id !== postId));
    setFolders((prev) =>
      prev.map((f) => ({
        ...f,
        postIds: f.postIds.filter((id) => id !== postId),
      })),
    );
  }, []);

  const value = useMemo<ArchiveContextValue>(() => ({
    savedPostIds,
    folders,
    isPostSaved,
    toggleSavePost,
    createFolder,
    deleteFolder,
    renameFolder,
    addPostToFolder,
    removePostFromFolder,
    purgePost,
  }), [savedPostIds, folders, isPostSaved, toggleSavePost, createFolder, deleteFolder, renameFolder, addPostToFolder, removePostFromFolder, purgePost]);

  return <ArchiveContext.Provider value={value}>{children}</ArchiveContext.Provider>;
}

export function useArchive() {
  const ctx = useContext(ArchiveContext);
  if (!ctx) throw new Error('useArchive must be used inside ArchiveProvider');
  return ctx;
}
