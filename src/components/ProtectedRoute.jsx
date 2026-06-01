import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

const DefaultFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-slate-50">
    <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

export default function ProtectedRoute({ children, fallback = <DefaultFallback />, unauthenticatedElement }) {
  const { user, loading, isAuthenticated, authError } = useAuth();

  if (loading) return fallback;
  if (authError && authError.type === 'user_not_registered') return <UserNotRegisteredError />;
  if (!isAuthenticated && !user) return unauthenticatedElement || <Navigate to="/login" replace />;
  if (user && user.role !== 'admin') return <UserNotRegisteredError />;

  return children;
}