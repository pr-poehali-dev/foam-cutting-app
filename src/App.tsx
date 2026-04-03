import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AdminDashboard from "./pages/AdminDashboard";
import OperatorDashboard from "./pages/OperatorDashboard";

export type UserRole = "admin" | "operator";

export interface User {
  id: string;
  name: string;
  phone: string;
  position: string;
  role: UserRole;
}

export type AppPage = "login" | "register" | "admin" | "operator";

export default function App() {
  const [page, setPage] = useState<AppPage>("login");
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setPage(user.role === "admin" ? "admin" : "operator");
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setPage("login");
  };

  return (
    <TooltipProvider>
      <Toaster />
      {page === "login" && (
        <LoginPage onLogin={handleLogin} onRegister={() => setPage("register")} />
      )}
      {page === "register" && (
        <RegisterPage onBack={() => setPage("login")} onSuccess={() => setPage("login")} />
      )}
      {page === "admin" && currentUser && (
        <AdminDashboard user={currentUser} onLogout={handleLogout} />
      )}
      {page === "operator" && currentUser && (
        <OperatorDashboard user={currentUser} onLogout={handleLogout} />
      )}
    </TooltipProvider>
  );
}
