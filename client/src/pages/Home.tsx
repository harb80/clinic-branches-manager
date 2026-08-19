import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import {
  ArrowUpRight,
  BellRing,
  CalendarDays,
  ChevronLeft,
  ClipboardPlus,
  Clock3,
  CreditCard,
  FilePlus2,
  Globe2,
  HeartPulse,
  Plus,
  Search,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";
import { useLocation } from "wouter";

const roleLabels: Record<string, string> = {
  admin: "مدير النظام",
  super_admin: "مدير النظام الرئيسي",
  branch_manager: "مدير فرع",
  doctor: "طبيب",
  receptionist: "موظف استقبال",
  accountant: "موظف حسابات",
  user: "مستخدم",
};

const arabicStats = [
  { label: "مواعيد اليوم", value: "0", note: "لا توجد حجوزات مسجلة بعد", icon: CalendarDays, tone: "blue" },
  { label: "المرضى المنتظرون", value: "0", note: "سيظهرون عند تسجيل الوصول", icon: Clock3, tone: "amber" },
  { label: "مرضى جدد هذا الشهر", value: "0", note: "بيانات موحدة للفروع الثلاثة", icon: Users, tone: "teal" },
  { label: "تحصيلات اليوم", value: "0.00", note: "جنيه مصري", icon: CreditCard, tone: "violet" },
];

const englishStats = [
  { label: "Today's appointments", value: "0", note: "No bookings recorded yet", icon: CalendarDays, tone: "blue" },
  { label: "Waiting patients", value: "0", note: "Shown after check-in", icon: Clock3, tone: "amber" },
  { label: "New patients this month", value: "0", note: "Unified across three branches", icon: Users, tone: "teal" },
  { label: "Today's collections", value: "0.00", note: "EGP", icon: CreditCard, tone: "violet" },
];

const toneClasses: Record<string, string> = {
  blue: "bg-blue-50 text-blue-700",
  amber: "bg-amber-50 text-amber-700",
  teal: "bg-teal-50 text-teal-700",
  violet: "bg-violet-50 text-violet-700",
};

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { isArabic, toggleLanguage, direction } = useLanguage();
  const summary = trpc.dashboard.summary.useQuery(undefined, { enabled: Boolean(user) });
  const baseStats = isArabic ? arabicStats : englishStats;
  const roleLabel = roleLabels[user?.role ?? "user"] ?? (isArabic ? "مستخدم" : "User");
  const roleDescription = isArabic ? {
    super_admin: "تحكم كامل في الفروع والحسابات والتقارير.", admin: "إدارة كاملة للنظام والبيانات الحساسة.", branch_manager: "متابعة تشغيل الفرع والمواعيد والطاقم.", doctor: "تابع زياراتك وملفات مرضاك ومواعيدك.", receptionist: "إدارة الحجوزات والمرضى وتسجيل الوصول.", accountant: "تابع الفواتير والتحصيل والأرصدة.", user: "صلاحيات النظام الداخلية.",
  } : {
    super_admin: "Full control of branches, accounts, and reports.", admin: "Full management of system and sensitive data.", branch_manager: "Monitor branch operations, bookings, and staff.", doctor: "Follow visits, patient records, and appointments.", receptionist: "Manage bookings, patients, and check-in.", accountant: "Track invoices, collections, and balances.", user: "Internal system permissions.",
  };
  const stats = baseStats.map((stat, index) => ({ ...stat, value: [String(summary.data?.appointmentsToday ?? 0), String(summary.data?.waitingPatients ?? 0), String(summary.data?.newPatientsThisMonth ?? 0), summary.data?.collectionsToday ?? "0.00"][index] ?? "0" }));
  const roleAlerts = isArabic ? {
    super_admin: [["راجع الحسابات والصلاحيات", "تأكد من أن كل موظف مرتبط بالدور والفرع المناسبين."], ["راجع التقارير الموحدة", "تابع أداء الفروع والتحصيلات من شاشة التقارير."]],
    admin: [["راجع المستخدمين النشطين", "راقب الحسابات المفعلة وأوقف الحسابات غير المستخدمة."], ["تحقق من إعدادات الفروع", "راجع أوقات العمل والخدمات والأسعار قبل بدء اليوم."]],
    branch_manager: [["تابع حجوزات الفرع", "راجع المواعيد القادمة وحالات الوصول وعدم الحضور."], ["راجع جدول الأطباء", "تأكد من توافق الجداول مع ساعات عمل الفرع."]],
    doctor: [["ابدأ بمتابعة الزيارات", "سجّل التشخيص والأدوية وخطة المتابعة لكل زيارة."], ["راجع المرضى المنتظرين", "تابع المواعيد التي تم تسجيل وصول أصحابها اليوم."]],
    receptionist: [["تابع تسجيل الوصول", "سجّل وصول المرضى وحدّث حالة المواعيد أولاً بأول."], ["ابحث قبل إضافة مريض", "استخدم رقم الهاتف أو رقم المريض لتجنب الملفات المكررة."]],
    accountant: [["راجع التحصيل اليومي", "تأكد من تسجيل كل دفعة وربطها بالفاتورة الصحيحة."], ["تابع الأرصدة المستحقة", "راجع الفواتير غير المدفوعة والدفعات الجزئية."]],
    user: [["صلاحيات محدودة", "تواصل مع مدير النظام إذا احتجت إلى إجراء غير متاح."], ["استخدم السجل الموحد", "ابحث عن ملف المريض قبل بدء أي إجراء."]],
  } : {
    super_admin: [["Review accounts and permissions", "Ensure each staff member has the correct role and branch."], ["Review unified reports", "Monitor branch performance and collections from Reports."]],
    admin: [["Review active users", "Monitor enabled accounts and deactivate unused access."], ["Verify branch setup", "Review hours, services, and prices before the day starts."]],
    branch_manager: [["Monitor branch bookings", "Review upcoming appointments and arrival/no-show statuses."], ["Review doctor schedules", "Ensure schedules align with branch working hours."]],
    doctor: [["Follow up on visits", "Record diagnosis, medications, and follow-up plans for each visit."], ["Review waiting patients", "Follow appointments whose patients have checked in today."]],
    receptionist: [["Manage check-in", "Record patient arrival and update appointment statuses promptly."], ["Search before adding", "Use phone or patient ID to avoid duplicate records."]],
    accountant: [["Review today's collections", "Make sure every payment is linked to the correct invoice."], ["Follow outstanding balances", "Review unpaid invoices and partial payments."]],
    user: [["Limited permissions", "Contact an administrator if you need an unavailable action."], ["Use the unified directory", "Search for the patient record before starting an action."]],
  };
  const activeAlerts = roleAlerts[user?.role ?? "user"] ?? roleAlerts.user;

  const quickActions = isArabic
    ? [
        { label: "إضافة مريض", detail: "إنشاء ملف موحد جديد", icon: Users, path: "/patients" },
        { label: "حجز موعد", detail: "اختيار الفرع والطبيب", icon: CalendarDays, path: "/appointments" },
        { label: "فتح زيارة", detail: "تسجيل بيانات الكشف", icon: ClipboardPlus, path: "/medical-records" },
        { label: "تسجيل دفعة", detail: "إصدار إيصال للمريض", icon: CreditCard, path: "/payments" },
      ]
    : [
        { label: "Add patient", detail: "Create a unified record", icon: Users, path: "/patients" },
        { label: "Book appointment", detail: "Choose branch and doctor", icon: CalendarDays, path: "/appointments" },
        { label: "Open visit", detail: "Record consultation details", icon: ClipboardPlus, path: "/medical-records" },
        { label: "Record payment", detail: "Issue a patient receipt", icon: CreditCard, path: "/payments" },
      ];

  return (
    <DashboardLayout>
      <div dir={direction} className="min-h-screen bg-[#f7fafc] text-slate-900">
        <div className="mx-auto max-w-[1440px] space-y-6 p-4 sm:p-6 lg:p-8">
          <header className="flex flex-col gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-teal-700">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-100"><HeartPulse className="h-4 w-4" /></span>
                <span>{isArabic ? "منصة الإدارة الموحدة" : "Unified operations platform"}</span>
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                {isArabic ? "صباح الخير، أهلاً بك في عياداتنا" : "Good morning, welcome to your clinics"}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                {roleDescription[user?.role ?? "user"]}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" className="gap-2 border-slate-200 bg-white" onClick={toggleLanguage}>
                <Globe2 className="h-4 w-4" />
                {isArabic ? "English" : "العربية"}
              </Button>
              <Button className="gap-2 bg-slate-950 text-white hover:bg-slate-800" onClick={() => setLocation("/appointments")}>
                <Plus className="h-4 w-4" />
                {isArabic ? "حجز جديد" : "New booking"}
              </Button>
            </div>
          </header>

          <div className="flex flex-wrap items-center gap-3">
            <Badge className="gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700 hover:bg-emerald-50"><span className="h-2 w-2 rounded-full bg-emerald-500" />{isArabic ? "النظام متصل" : "System online"}</Badge>
            <Badge variant="outline" className="rounded-full border-slate-200 bg-white px-3 py-1.5 text-slate-600">{isArabic ? "3 فروع" : "3 branches"}</Badge>
            <Badge variant="outline" className="rounded-full border-slate-200 bg-white px-3 py-1.5 text-slate-600">{isArabic ? "صلاحية: " : "Role: "}{roleLabel}</Badge>
            <span className="text-sm text-slate-400">{isArabic ? "آخر تحديث: الآن" : "Last updated: now"}</span>
          </div>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map(stat => {
              const Icon = stat.icon;
              return (
                <Card key={stat.label} className="border-0 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.05)]">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                        <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{stat.value}</p>
                      </div>
                      <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${toneClasses[stat.tone]}`}><Icon className="h-5 w-5" /></span>
                    </div>
                    <p className="mt-4 text-xs text-slate-400">{stat.note}</p>
                  </CardContent>
                </Card>
              );
            })}
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
            <Card className="border-0 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.05)]">
              <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 px-5 py-5">
                <div>
                  <CardTitle className="text-lg text-slate-950">{isArabic ? "المواعيد القادمة" : "Upcoming appointments"}</CardTitle>
                  <p className="mt-1 text-sm text-slate-500">{isArabic ? "عرض موحد لكل الفروع والأطباء" : "Unified view across branches and doctors"}</p>
                </div>
                <Button variant="ghost" className="gap-1 text-teal-700 hover:bg-teal-50" onClick={() => setLocation("/appointments")}>
                  {isArabic ? "عرض الكل" : "View all"}<ChevronLeft className={`h-4 w-4 ${isArabic ? "" : "rotate-180"}`} />
                </Button>
              </CardHeader>
              <CardContent className="p-5">
                <div className="flex min-h-[210px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 text-center">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm"><CalendarDays className="h-6 w-6" /></div>
                  <p className="font-medium text-slate-700">{isArabic ? "لا توجد مواعيد مسجلة بعد" : "No appointments recorded yet"}</p>
                  <p className="mt-1 max-w-sm text-sm text-slate-400">{isArabic ? "ابدأ بإضافة أول حجز ليظهر جدول اليوم هنا." : "Create the first booking to populate today's schedule."}</p>
                  <Button variant="outline" className="mt-4 gap-2 border-slate-200 bg-white" onClick={() => setLocation("/appointments")}><Plus className="h-4 w-4" />{isArabic ? "إضافة موعد" : "Add appointment"}</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-slate-950 text-white shadow-[0_12px_35px_rgba(15,23,42,0.12)]">
              <CardHeader className="px-5 py-5">
                <div className="flex items-start justify-between gap-3">
                  <div><CardTitle className="text-lg text-white">{isArabic ? "تنبيهات اليوم" : "Today's alerts"}</CardTitle><p className="mt-1 text-sm text-slate-400">{isArabic ? "تنبيهات تحتاج إلى متابعة" : "Items that may need attention"}</p></div>
                  <BellRing className="h-5 w-5 text-teal-300" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3 px-5 pb-5">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-teal-300" /><div><p className="text-sm font-medium">{activeAlerts[0][0]}</p><p className="mt-1 text-xs leading-5 text-slate-400">{activeAlerts[0][1]}</p></div></div></div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="flex gap-3"><Stethoscope className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" /><div><p className="text-sm font-medium">{activeAlerts[1][0]}</p><p className="mt-1 text-xs leading-5 text-slate-400">{activeAlerts[1][1]}</p></div></div></div>
              </CardContent>
            </Card>
          </section>

          <section>
            <div className="mb-4 flex items-end justify-between"><div><h2 className="text-lg font-semibold text-slate-950">{isArabic ? "إجراءات سريعة" : "Quick actions"}</h2><p className="mt-1 text-sm text-slate-500">{isArabic ? "اختصارات للمهام اليومية المتكررة" : "Shortcuts for common daily tasks"}</p></div><Search className="h-5 w-5 text-slate-300" /></div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {quickActions.map(action => { const Icon = action.icon; return <button key={action.label} onClick={() => setLocation(action.path)} className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-right transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-[0_12px_30px_rgba(15,118,110,0.08)]"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 transition group-hover:bg-teal-600 group-hover:text-white"><Icon className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block font-medium text-slate-800">{action.label}</span><span className="mt-1 block truncate text-xs text-slate-400">{action.detail}</span></span><ArrowUpRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-teal-600" /></button>; })}
            </div>
          </section>

          <footer className="flex flex-col gap-2 border-t border-slate-200 pt-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between"><span>{isArabic ? "النسخة الأولى — جاهزة لتهيئة بيانات العيادات" : "First release — ready for clinic setup"}</span><span>{isArabic ? "بيانات المرضى موحدة بين الفروع" : "Patient records are unified across branches"}</span></footer>
        </div>
      </div>
    </DashboardLayout>
  );
}
