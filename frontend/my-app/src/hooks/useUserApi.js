import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiMethods, handleApiError, extractApiData } from '@/lib/api';
import { queryKeys, mutationKeys } from '@/lib/queryClient';

// Custom hook for user login/registration
export const useUserLogin = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationKey: [mutationKeys.users.login],
    mutationFn: (userData) => apiMethods.user.login(userData),
    onSuccess: (response) => {
      const data = extractApiData(response);
      
      // Store user data in localStorage
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('userId', data.user.id);
      }
      
      // Invalidate and refetch user-related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      
      console.log('✅ User login successful:', data.user?.username);
    },
    onError: (error) => {
      console.error('❌ Login failed:', handleApiError(error));
    },
  });
};

// Custom hook for getting user by ID
export const useUser = (userId, options = {}) => {
  return useQuery({
    queryKey: queryKeys.users.detail(userId),
    queryFn: () => apiMethods.user.getById(userId),
    select: (response) => extractApiData(response).user,
    enabled: !!userId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    ...options,
  });
};

// Custom hook for getting user by username
export const useUserByUsername = (username, options = {}) => {
  return useQuery({
    queryKey: queryKeys.users.byUsername(username),
    queryFn: () => apiMethods.user.getByUsername(username),
    select: (response) => extractApiData(response).user,
    enabled: !!username,
    staleTime: 1000 * 60 * 2, // 2 minutes
    ...options,
  });
};

// Custom hook for getting online users
export const useOnlineUsers = (options = {}) => {
  return useQuery({
    queryKey: queryKeys.users.online(),
    queryFn: () => apiMethods.user.getOnlineUsers(),
    select: (response) => extractApiData(response).users,
    refetchInterval: 5000, // Refetch every 5 seconds
    staleTime: 1000 * 30, // 30 seconds
    ...options,
  });
};

// Custom hook for updating user profile
export const useUpdateUserProfile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationKey: [mutationKeys.users.updateProfile],
    mutationFn: ({ userId, data }) => apiMethods.user.updateProfile(userId, data),
    onSuccess: (response, variables) => {
      const data = extractApiData(response);
      
      // Update user data in localStorage
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      
      // Update specific user query
      queryClient.setQueryData(
        queryKeys.users.detail(variables.userId),
        (oldData) => ({
          ...oldData,
          data: { ...oldData?.data, user: data.user }
        })
      );
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.users.online() });
      
      console.log('✅ Profile updated successfully');
    },
    onError: (error) => {
      console.error('❌ Profile update failed:', handleApiError(error));
    },
  });
};

// Custom hook for setting user online
export const useSetUserOnline = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationKey: [mutationKeys.users.setOnline],
    mutationFn: ({ userId, sessionId }) => apiMethods.user.setOnline(userId, sessionId),
    onSuccess: (response, variables) => {
      const data = extractApiData(response);
      
      // Update user data
      queryClient.setQueryData(
        queryKeys.users.detail(variables.userId),
        (oldData) => ({
          ...oldData,
          data: { ...oldData?.data, user: data.user }
        })
      );
      
      // Invalidate online users query
      queryClient.invalidateQueries({ queryKey: queryKeys.users.online() });
      
      console.log('✅ User set online successfully');
    },
    onError: (error) => {
      console.error('❌ Set online failed:', handleApiError(error));
    },
  });
};

// Custom hook for setting user offline
export const useSetUserOffline = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationKey: [mutationKeys.users.setOffline],
    mutationFn: (userId) => apiMethods.user.setOffline(userId),
    onSuccess: (response, userId) => {
      const data = extractApiData(response);
      
      // Update user data
      queryClient.setQueryData(
        queryKeys.users.detail(userId),
        (oldData) => ({
          ...oldData,
          data: { ...oldData?.data, user: data.user }
        })
      );
      
      // Invalidate online users query
      queryClient.invalidateQueries({ queryKey: queryKeys.users.online() });
      
      console.log('✅ User set offline successfully');
    },
    onError: (error) => {
      console.error('❌ Set offline failed:', handleApiError(error));
    },
  });
};

// Custom hook for updating cursor state
export const useUpdateCursor = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationKey: [mutationKeys.users.updateCursor],
    mutationFn: ({ userId, cursorState }) => apiMethods.user.updateCursor(userId, cursorState),
    onSuccess: (response, variables) => {
      const data = extractApiData(response);
      
      // Update user data
      queryClient.setQueryData(
        queryKeys.users.detail(variables.userId),
        (oldData) => ({
          ...oldData,
          data: { ...oldData?.data, user: data.user }
        })
      );
      
      // Invalidate online users query to update cursor positions
      queryClient.invalidateQueries({ queryKey: queryKeys.users.online() });
    },
    onError: (error) => {
      console.error('❌ Cursor update failed:', handleApiError(error));
    },
  });
};

// Custom hook for getting user statistics
export const useUserStats = (options = {}) => {
  return useQuery({
    queryKey: queryKeys.users.stats(),
    queryFn: () => apiMethods.user.getStats(),
    select: (response) => extractApiData(response).stats,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
};

// Custom hook for user service health check
export const useUserHealthCheck = (options = {}) => {
  return useQuery({
    queryKey: queryKeys.users.health(),
    queryFn: () => apiMethods.user.healthCheck(),
    select: (response) => extractApiData(response),
    staleTime: 1000 * 60, // 1 minute
    ...options,
  });
};

// Utility hook to get current user from localStorage
export const useCurrentUser = () => {
  const getCurrentUser = () => {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error parsing user from localStorage:', error);
      return null;
    }
  };

  const setCurrentUser = (user) => {
    try {
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('userId', user.id);
      } else {
        localStorage.removeItem('user');
        localStorage.removeItem('userId');
      }
    } catch (error) {
      console.error('Error setting user in localStorage:', error);
    }
  };

  const clearCurrentUser = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('userId');
  };

  return {
    getCurrentUser,
    setCurrentUser,
    clearCurrentUser,
  };
};
