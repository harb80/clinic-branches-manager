import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import ModulePage from "./pages/ModulePage";
import PatientsPage from "./pages/PatientsPage";
import UsersPage from "./pages/UsersPage";
import AppointmentsPage from "./pages/AppointmentsPage";
import NewAppointmentPage from "./pages/NewAppointmentPage";
import BranchesPage from "./pages/BranchesPage";
import MedicalRecordsPage from "./pages/MedicalRecordsPage";
import PaymentsPage from "./pages/PaymentsPage";
import ServicesPage from "./pages/ServicesPage";
import ReportsPage from "./pages/ReportsPage";
import DoctorsPage from "./pages/DoctorsPage";
import { useAuth } from "./_core/hooks/useAuth";
import { useLanguage } from "./contexts/LanguageContext";
import { Button } from "./components/ui/button";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/appointments"}><GuardedRoute component={AppointmentsPage} roles={["admin", "super_admin", "branch_manager", "doctor", "receptionist"]} /></Route>
      <Route path={"/appointments/new"}><GuardedRoute component={NewAppointmentPage} roles={["admin", "super_admin", "branch_manager", "doctor", "receptionist"]} /></Route>
      <Route path={"/patients"}><GuardedRoute component={PatientsPage} roles={["admin", "super_admin", "branch_manager", "doctor", "receptionist", "accountant"]} /></Route>
      <Route path={"/users"}><GuardedRoute component={UsersPage} roles={["admin", "super_admin"]} /></Route>
      <Route path={"/medical-records"}><GuardedRoute component={MedicalRecordsPage} roles={["admin", "super_admin", "branch_manager", "doctor", "receptionist"]} /></Route>
      <Route path={"/doctors"}><GuardedRoute component={DoctorsPage} roles={["admin", "super_admin", "branch_manager", "doctor", "receptionist"]} /></Route>
      <Route path={"/branches"}><GuardedRoute component={BranchesPage} roles={["admin", "super_admin", "branch_manager"]} /></Route>
      <Route path={"/payments"}><GuardedRoute component={PaymentsPage} roles={["admin", "super_admin", "branch_manager", "receptionist", "accountant"]} /></Route>
      <Route path={"/services"}><GuardedRoute component={ServicesPage} roles={["admin", "super_admin", "branch_manager", "receptionist", "accountant"]} /></Route>
      <Route path={"/reports"}><GuardedRoute component={ReportsPage} roles={["admin", "super_admin", "branch_manager", "accountant", "receptionist", "doctor"]} /></Route>
      <Route path={"/settings"}><GuardedRoute component={() => <ModulePage module="settings" />} roles={["admin", "super_admin"]} /></Route>
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function GuardedRoute({ component: Component, roles }: { component: React.ComponentType; roles: string[] }) {
  const { user, loading } = useAuth();
  const { isArabic, direction } = useLanguage();
  if (loading) return <div className="min-h-screen bg-slate-50" />;
  if (!user) return <Component />;
  if (!roles.includes(user.role)) return <div dir={direction} className="flex min-h-screen items-center justify-center bg-slate-50 p-6"><div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm"><h1 className="text-xl font-semibold">{isArabic ? "لا تملك صلاحية الوصول" : "Access denied"}</h1><p className="mt-2 text-sm text-slate-500">{isArabic ? "هذا القسم غير متاح لدور حسابك." : "This section is not available for your account role."}</p><Button className="mt-5" onClick={() => { window.location.assign("/"); }}>{isArabic ? "العودة للوحة التحكم" : "Back to dashboard"}</Button></div></div>;
  return <Component />;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
