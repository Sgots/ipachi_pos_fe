// src/components/RequirePerm.tsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

type Props = {
  module: string;
  action?: "VIEW" | "CREATE" | "EDIT" | "DELETE";
  redirectTo?: string;
  children: React.ReactNode;
};

const RequirePerm: React.FC<Props> = ({ module, action = "VIEW", redirectTo = "/forbidden", children }) => {
  const { can } = useAuth();
  if (!can(module, action)) {
    return <Navigate to={redirectTo} replace />;
  }
  return <>{children}</>;
};

export default RequirePerm;
