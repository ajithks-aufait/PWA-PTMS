import { useMsal } from "@azure/msal-react";
import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { accounts } = useMsal();

  const isAuthenticated = accounts && accounts.length > 0;

  return isAuthenticated ? <>{children}</> : <Navigate to="/" />;
};

export default ProtectedRoute;
