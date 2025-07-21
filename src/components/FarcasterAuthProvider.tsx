
import React from 'react';

interface FarcasterAuthProviderProps {
  children: React.ReactNode;
}

export const FarcasterAuthProvider: React.FC<FarcasterAuthProviderProps> = ({ children }) => {
  return <>{children}</>;
}; 