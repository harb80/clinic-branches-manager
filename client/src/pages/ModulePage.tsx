import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowLeft, ArrowRight, Construction, Search } from "lucide-react";
import { useLocation } from "wouter";

type ModuleKey = "appointments" | "patients" | "medical-records" | "doctors" | "branches" | "payments" | "reports" | "settings";

const copy: Record<ModuleKey, { ar: string; en: string; arDescription: string; enDescription: string }> = {
  appointments: { ar: "المواعيد والحجوزات", en: "Appointments", arDescription: "تقويم يومي وأسبوعي لإدارة الحجوزات وحالات الوصول والمتابعة.", enDescription: "Daily and weekly calendar for bookings, arrivals, and follow-ups." },
  patients: { ar: "المرضى", en: "Patients", arDescription: "ملفات موحدة للمرضى قابلة للبحث عبر جميع الفروع.", enDescription: "Unified searchable patient records across all branches." },
  "medical-records": { ar: "الملفات الطبية", en: "Medical records", arDescription: "سجل الزيارات والتشخيص والأدوية وخطة المتابعة والمرفقات.", enDescription: "Visits, diagnosis, medications, follow-up plans, and attachments." },
  doctors: { ar: "الأطباء والتخصصات", en: "Doctors & specialties", arDescription: "الأطباء والتخصصات والجداول والفروع المرتبطة بكل طبيب.", enDescription: "Doctors, specialties, schedules, and branch assignments." },
  branches: { ar: "الفروع", en: "Branches", arDescription: "إدارة الفروع وساعات العمل والخدمات والمستخدمين.", enDescription: "Branches, working hours, services, and user assignments." },
  payments: { ar: "المدفوعات والفواتير", en: "Payments & invoices", arDescription: "الفواتير والمدفوعات والإيصالات والرصيد المستحق.", enDescription: "Invoices, payments, receipts, and outstanding balances." },
  reports: { ar: "التقارير", en: "Reports", arDescription: "تقارير تشغيلية ومالية قابلة للتصفية حسب الفرع والفترة.", enDescription: "Operational and financial reports filterable by branch and period." },
  settings: { ar: "الإعدادات", en: "Settings", arDescription: "إعدادات النظام واللغة وطرق الدفع وسجل العمليات.", enDescription: "System, language, payment, and audit settings." },
};

export default function ModulePage({ module }: { module: ModuleKey }) {
  const { isArabic, direction } = useLanguage();
  const [, setLocation] = useLocation();
  const item = copy[module];
  const title = isArabic ? item.ar : item.en;
  return (
    <DashboardLayout>
      <div dir={direction} className="min-h-screen bg-[#f7fafc] p-4 text-slate-900 sm:p-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="flex items-center gap-4 border-b border-slate-200 pb-6">
            <Button variant="outline" size="icon" className="border-slate-200 bg-white" onClick={() => setLocation("/")} aria-label={isArabic ? "العودة" : "Back"}>
              {isArabic ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
            </Button>
            <div><p className="text-sm font-medium text-teal-700">{isArabic ? "نظام إدارة العيادات" : "Clinic management system"}</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">{title}</h1></div>
          </div>
          <Card className="border-0 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.05)]">
            <CardHeader><CardTitle className="flex items-center gap-3"><Construction className="h-5 w-5 text-teal-700" />{isArabic ? "الوحدة قيد التجهيز" : "Module in progress"}</CardTitle></CardHeader>
            <CardContent>
              <p className="max-w-2xl leading-7 text-slate-500">{isArabic ? item.arDescription : item.enDescription}</p>
              <div className="mt-6 flex flex-wrap gap-3"><Button className="gap-2 bg-slate-950 text-white hover:bg-slate-800" onClick={() => setLocation("/")}>{isArabic ? "العودة للوحة التحكم" : "Return to dashboard"}{isArabic ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}</Button><Button variant="outline" className="gap-2 border-slate-200 bg-white"><Search className="h-4 w-4" />{isArabic ? "استكشف المتطلبات" : "Explore requirements"}</Button></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
