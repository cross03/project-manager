import React, { createContext, useContext, useState } from 'react';

interface NavigationContextType {
  navigateToTask: (taskId: number) => void;
  navigateToTaskAndComment: (taskId: number, commentId: number) => void;
  clearNavigation: () => void;
  pendingTaskId: number | null;
  pendingCommentId: number | null;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [pendingTaskId, setPendingTaskId] = useState<number | null>(null);
  const [pendingCommentId, setPendingCommentId] = useState<number | null>(null);

  const navigateToTask = (taskId: number) => {
    setPendingTaskId(taskId);
    setPendingCommentId(null);
  };

  const navigateToTaskAndComment = (taskId: number, commentId: number) => {
    setPendingTaskId(taskId);
    setPendingCommentId(commentId);
  };

  const clearNavigation = () => {
    setPendingTaskId(null);
    setPendingCommentId(null);
  };

  return (
    <NavigationContext.Provider value={{ navigateToTask, navigateToTaskAndComment, clearNavigation, pendingTaskId, pendingCommentId }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
}
