import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useSelector } from "react-redux";

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const token = useSelector((state: any) => state.user.user?.Token);
  const expiry = useSelector((state: any) => state.user.user?.DVAccessTokenExpiry);
  const currentTime = Math.floor(Date.now() / 1000);
  const isAuthenticated = !!token && (!expiry || expiry > currentTime);

  return isAuthenticated ? <>{children}</> : <Navigate to="/" />;
};

export default ProtectedRoute;
