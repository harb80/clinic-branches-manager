import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { BarChart3, CalendarCheck, CircleDollarSign, UserPlus } from "lucide-react";
import { useState } from "react";

export default function ReportsPage() {
  const { isArabic, direction } = useLanguage();
  const [branchId, setBranchId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const report = trpc.reports.summary.useQuery({ branchId: Number(branchId) > 0 ? Number(branchId) : undefined, from: from || undefined, to: to || undefined });
  return <DashboardLayout><div dir={direction} className="min-h-screen bg-[#f7fafc] p-4 text-slate-900 sm:p-8"><div className="mx-auto max-w-6xl space-y-6"><header><p className="text-sm font-medium text-teal-700">{isArabic ? "التحليلات" : "Analytics"}</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">{isArabic ? "التقارير" : "Reports"}</h1><p className="mt-2 text-sm text-slate-500">{isArabic ? "تابع الحجوزات والتحصيل والمرضى الجدد حسب الفترة والفرع." : "Track bookings, collections, and new patients by period and branch."}</p></header><Card className="border-0 bg-white"><CardHeader><CardTitle>{isArabic ? "فلاتر التقرير" : "Report filters"}</CardTitle></CardHeader><CardContent><div className="grid gap-3 md:grid-cols-4"><Input type="number" min="1" placeholder={isArabic ? "رقم الفرع" : "Branch ID"} value={branchId} onChange={event => setBranchId(event.target.value)} /><Input type="date" value={from} onChange={event => setFrom(event.target.value)} /><Input type="date" value={to} onChange={event => setTo(event.target.value)} /><Button variant="outline" onClick={() => void report.refetch()}>{isArabic ? "تحديث التقرير" : "Refresh report"}</Button></div></CardContent></Card>{report.isLoading ? <p className="text-sm text-slate-400">{isArabic ? "جارٍ التحميل..." : "Loading..."}</p> : report.error ? <p className="text-sm text-red-600">{isArabic ? "تعذر تحميل التقرير." : "Could not load the report."}</p> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"><Metric icon={<CalendarCheck className="h-5 w-5" />} label={isArabic ? "الحجوزات" : "Bookings"} value={report.data?.bookings ?? 0} /><Metric icon={<BarChart3 className="h-5 w-5" />} label={isArabic ? "المكتملة" : "Completed"} value={report.data?.completed ?? 0} /><Metric icon={<BarChart3 className="h-5 w-5" />} label={isArabic ? "الملغاة" : "Cancelled"} value={report.data?.cancelled ?? 0} /><Metric icon={<CircleDollarSign className="h-5 w-5" />} label={isArabic ? "التحصيل" : "Collections"} value={`${report.data?.collections ?? "0.00"} EGP`} /><Metric icon={<UserPlus className="h-5 w-5" />} label={isArabic ? "مرضى جدد" : "New patients"} value={report.data?.newPatients ?? 0} /></div>}</div></div></DashboardLayout>;
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) { return <Card className="border-0 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.05)]"><CardContent className="p-5"><div className="flex items-center justify-between"><span className="text-sm text-slate-500">{label}</span><span className="text-teal-700">{icon}</span></div><p className="mt-4 text-2xl font-semibold">{value}</p></CardContent></Card>; }
