import React, { createContext, useContext, useEffect, useState } from "react";
import { useGetAuthMe, useLogin, useLogout, User, LoginInput, getGetAuthMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (data: LoginInput) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch current user details
  const { data: currentUser, isSuccess, isError, isLoading: queryLoading } = useGetAuthMe({
    query: {
      queryKey: getGetAuthMeQueryKey(),
      retry: false,
      refetchOnWindowFocus: false,
    },
  });

  useEffect(() => {
    if (!queryLoading) {
      if (isSuccess && currentUser) {
        setUser(currentUser);
      } else if (isError) {
        setUser(null);
      }
      setIsLoading(false);
    }
  }, [currentUser, isSuccess, isError, queryLoading]);

  // Mutations
  const loginMutation = useLogin();
  const logoutMutation = useLogout();

  const login = async (data: LoginInput) => {
    try {
      const loggedInUser = await loginMutation.mutateAsync({ data });
      setUser(loggedInUser);
      // Seed React Query cache
      queryClient.setQueryData([`/api/auth/me`], loggedInUser);
      queryClient.invalidateQueries();
      return loggedInUser;
    } catch (err) {
      throw err;
    }
  };

  const logout = async () => {
    try {
      await logoutMutation.mutateAsync();
      setUser(null);
      queryClient.setQueryData([`/api/auth/me`], null);
      queryClient.clear();
    } catch (err) {
      console.error("Logout failed:", err);
      setUser(null);
      queryClient.clear();
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
