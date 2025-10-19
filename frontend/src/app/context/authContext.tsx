"use client";
import { createContext, useContext, useState, useEffect } from "react";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean; 
  login: (access: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const accessToken = localStorage.getItem("access");
      setIsAuthenticated(!!accessToken);
    } catch (error) {
      console.error("Error reading auth token:", error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false); 
    }
  }, []);

  const login = (access: string) => {
    localStorage.setItem("access", access);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem("access");
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, login, logout, isLoading }} 
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};