import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { BarChart3, Building2, CalendarDays, CreditCard, FileHeart, Globe2, LayoutDashboard, LogOut, PanelLeft, Settings2, Stethoscope, Users } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

const menuItems = [
  { icon: LayoutDashboard, ar: "لوحة التحكم", en: "Dashboard", path: "/" },
  { icon: CalendarDays, ar: "المواعيد والحجوزات", en: "Appointments", path: "/appointments" },
  { icon: Users, ar: "المرضى", en: "Patients", path: "/patients" },
  { icon: FileHeart, ar: "الملفات الطبية", en: "Medical records", path: "/medical-records" },
  { icon: Stethoscope, ar: "الأطباء والتخصصات", en: "Doctors & specialties", path: "/doctors" },
  { icon: Building2, ar: "الفروع", en: "Branches", path: "/branches" },
  { icon: Users, ar: "المستخدمون والصلاحيات", en: "Users & roles", path: "/users" },
  { icon: CreditCard, ar: "المدفوعات والفواتير", en: "Payments & invoices", path: "/payments" },
  { icon: BarChart3, ar: "التقارير", en: "Reports", path: "/reports" },
  { icon: Settings2, ar: "الإعدادات", en: "Settings", path: "/settings" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();
  const { isArabic, direction, toggleLanguage } = useLanguage();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showSetup, setShowSetup] = useState(false);
  const [setupForm, setSetupForm] = useState({ name: "", email: "", username: "", password: "" });
  const loginMutation = trpc.auth.login.useMutation({ onSuccess: () => window.location.reload() });
  const bootstrapStatus = trpc.auth.bootstrapStatus.useQuery();
  const setupMutation = trpc.auth.setup.useMutation({ onSuccess: () => window.location.reload() });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    const submitLogin = (event: React.FormEvent) => {
      event.preventDefault();
      loginMutation.mutate({ login, password });
    };
    return (
      <div dir={direction} className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700"><Users className="h-6 w-6" /></div>
            <h1 className="text-2xl font-semibold tracking-tight">{isArabic ? "تسجيل الدخول للنظام" : "Sign in to the clinic system"}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">{isArabic ? "استخدم البريد الإلكتروني أو اسم المستخدم وكلمة المرور." : "Use your email or username and password."}</p>
          </div>
          {showSetup ? <form onSubmit={event => { event.preventDefault(); setupMutation.mutate(setupForm); }} className="space-y-4">
            <div className="space-y-2"><label className="text-sm font-medium">{isArabic ? "اسم المدير" : "Admin name"}</label><Input required value={setupForm.name} onChange={event => setSetupForm(current => ({ ...current, name: event.target.value }))} /></div>
            <div className="space-y-2"><label className="text-sm font-medium">{isArabic ? "البريد الإلكتروني" : "Email"}</label><Input required type="email" value={setupForm.email} onChange={event => setSetupForm(current => ({ ...current, email: event.target.value }))} /></div>
            <div className="space-y-2"><label className="text-sm font-medium">{isArabic ? "اسم المستخدم" : "Username"}</label><Input required value={setupForm.username} onChange={event => setSetupForm(current => ({ ...current, username: event.target.value }))} /></div>
            <div className="space-y-2"><label className="text-sm font-medium">{isArabic ? "كلمة المرور" : "Password"}</label><Input required type="password" minLength={8} value={setupForm.password} onChange={event => setSetupForm(current => ({ ...current, password: event.target.value }))} /></div>
            {setupMutation.error && <p className="text-sm text-red-600">{isArabic ? "تعذر إنشاء الحساب الرئيسي." : "Could not create the super admin account."}</p>}
            <Button type="submit" disabled={setupMutation.isPending} className="h-11 w-full bg-teal-700 text-white hover:bg-teal-800">{setupMutation.isPending ? (isArabic ? "جارٍ الإنشاء..." : "Creating...") : (isArabic ? "إنشاء الحساب الرئيسي" : "Create super admin")}</Button>
            <Button type="button" variant="ghost" onClick={() => setShowSetup(false)} className="w-full">{isArabic ? "العودة لتسجيل الدخول" : "Back to sign in"}</Button>
          </form> : <form onSubmit={submitLogin} className="space-y-4">
            <div className="space-y-2"><label className="text-sm font-medium">{isArabic ? "البريد أو اسم المستخدم" : "Email or username"}</label><Input required value={login} onChange={event => setLogin(event.target.value)} autoComplete="username" /></div>
            <div className="space-y-2"><label className="text-sm font-medium">{isArabic ? "كلمة المرور" : "Password"}</label><Input required type="password" minLength={6} value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" /></div>
            {loginMutation.error && <p className="text-sm text-red-600">{isArabic ? "بيانات الدخول غير صحيحة أو الحساب غير نشط." : "Invalid credentials or inactive account."}</p>}
            <Button type="submit" disabled={loginMutation.isPending} className="h-11 w-full bg-slate-950 text-white hover:bg-slate-800">{loginMutation.isPending ? (isArabic ? "جارٍ التحقق..." : "Checking...") : (isArabic ? "تسجيل الدخول" : "Sign in")}</Button>
          </form>}
          {bootstrapStatus.data?.needsSetup && !showSetup && <Button variant="outline" onClick={() => setShowSetup(true)} className="mt-4 w-full border-teal-200 text-teal-700">{isArabic ? "تهيئة الحساب الرئيسي لأول مرة" : "Set up the first super admin"}</Button>}
          <Button variant="ghost" onClick={toggleLanguage} className="mt-4 w-full text-slate-500">{isArabic ? "English" : "العربية"}</Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const { isArabic, direction, toggleLanguage } = useLanguage();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item => item.path === location);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div dir={direction} className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold tracking-tight truncate">
                    {isArabic ? "عياداتنا الطبية" : "Our clinics"}
                  </span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              {menuItems.map(item => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={isArabic ? item.ar : item.en}
                      className={`h-10 transition-all font-normal`}
                    >
                      <item.icon
                        className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                      />
                      <span>{isArabic ? item.ar : item.en}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={toggleLanguage} className="cursor-pointer">
                  <Globe2 className="mr-2 h-4 w-4" />
                  <span>{isArabic ? "English" : "العربية"}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{isArabic ? "تسجيل الخروج" : "Sign out"}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <span className="tracking-tight text-foreground">
                    {activeMenuItem ? (isArabic ? activeMenuItem.ar : activeMenuItem.en) : (isArabic ? "القائمة" : "Menu")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        <main className="flex-1 p-4">{children}</main>
      </SidebarInset>
    </>
  );
}
