'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

interface FarcasterUser {
  fid: number
  username: string
  displayName: string
  pfp: string
  followerCount: number
  followingCount: number
}

interface AuthContextType {
  user: FarcasterUser | null
  isAuthenticated: boolean
  isLoading: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useFarcasterAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useFarcasterAuth must be used within a FarcasterAuthProvider')
  }
  return context
}

interface FarcasterAuthProviderProps {
  children: React.ReactNode
}

export const FarcasterAuthProvider: React.FC<FarcasterAuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<FarcasterUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for existing auth state in localStorage
    const savedUser = localStorage.getItem('farcaster-user')
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch (error) {
        console.error('Error parsing saved user:', error)
        localStorage.removeItem('farcaster-user')
      }
    }
    setIsLoading(false)
  }, [])

  const signIn = async () => {
    try {
      setIsLoading(true)
      
      // For now, we'll use a mock sign-in process
      // In the future, this will integrate with the actual Farcaster AuthKit
      const mockUser: FarcasterUser = {
        fid: 12345,
        username: 'testuser',
        displayName: 'Test User',
        pfp: 'https://picsum.photos/200',
        followerCount: 100,
        followingCount: 50
      }
      
      setUser(mockUser)
      localStorage.setItem('farcaster-user', JSON.stringify(mockUser))
      
      console.log('Mock sign-in successful')
    } catch (error) {
      console.error('Sign in error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setIsLoading(true)
      setUser(null)
      localStorage.removeItem('farcaster-user')
      console.log('Sign out successful')
    } catch (error) {
      console.error('Sign out error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    signIn,
    signOut
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
} 