import { useState, useEffect, useCallback } from "react";

export const useTetrisAuth = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem("tetris_token");
    const storedUsername = localStorage.getItem("tetris_username");
    const storedFullName = localStorage.getItem("tetris_fullName");

    if (storedToken && storedUsername) {
      setToken(storedToken);
      setUser({
        username: storedUsername,
        fullName: storedFullName || storedUsername,
      });
    }
    setIsLoading(false);
  }, []);

  const setSession = useCallback((sessionData) => {
    const { token: authToken, username, fullName } = sessionData;
    if (!authToken || !username) return;

    localStorage.setItem("tetris_token", authToken);
    localStorage.setItem("tetris_username", username);
    localStorage.setItem("tetris_fullName", fullName || username);

    setToken(authToken);
    setUser({
      username,
      fullName: fullName || username,
    });
  }, []);

  const login = setSession;

  const logout = useCallback(() => {
    localStorage.removeItem("tetris_token");
    localStorage.removeItem("tetris_username");
    localStorage.removeItem("tetris_fullName");

    setToken(null);
    setUser(null);
  }, []);

  const isAuthenticated = !!token && !!user;

  return {
    user,
    token,
    isLoading,
    isAuthenticated,
    setSession,
    login,
    logout,
  };
};

