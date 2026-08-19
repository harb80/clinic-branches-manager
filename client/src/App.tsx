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
import BranchesPage from "./pages/BranchesPage";
import MedicalRecordsPage from "./pages/MedicalRecordsPage";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/appointments"} component={AppointmentsPage} />
      <Route path={"/patients"} component={PatientsPage} />
      <Route path={"/users"} component={UsersPage} />
      <Route path={"/medical-records"} component={MedicalRecordsPage} />
      <Route path={"/doctors"}><ModulePage module="doctors" /></Route>
      <Route path={"/branches"} component={BranchesPage} />
      <Route path={"/payments"}><ModulePage module="payments" /></Route>
      <Route path={"/reports"}><ModulePage module="reports" /></Route>
      <Route path={"/settings"}><ModulePage module="settings" /></Route>
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
