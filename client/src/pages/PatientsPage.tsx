import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ArrowRight, Plus, Search, UserRound, X } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function PatientsPage() {
  const { user } = useAuth();
  const { isArabic, direction } = useLanguage();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ patientNumber: "", fullName: "", phone: "", email: "", gender: "female" as "female" | "male" | "other", allergies: "", chronicConditions: "", notes: "" });
  const patientsQuery = trpc.patients.search.useQuery({ search }, { enabled: Boolean(user) });
  const createMutation = trpc.patients.create.useMutation({
    onSuccess: () => {
      setShowForm(false);
      setForm({ patientNumber: "", fullName: "", phone: "", email: "", gender: "female", allergies: "", chronicConditions: "", notes: "" });
      void patientsQuery.refetch();
    },
  });
  const patients = patientsQuery.data ?? [];

  const update = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    createMutation.mutate(form);
  };

  return (
    <DashboardLayout>
      <div dir={direction} className="min-h-screen bg-[#f7fafc] p-4 text-slate-900 sm:p-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-sm font-medium text-teal-700">{isArabic ? "بيانات موحدة بين الفروع" : "Unified across branches"}</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">{isArabic ? "المرضى" : "Patients"}</h1><p className="mt-2 text-sm text-slate-500">{isArabic ? "ابحث في الملفات الطبية من أي فرع وأنشئ ملفًا موحدًا جديدًا." : "Search medical records from any branch and create unified patient profiles."}</p></div>
            <Button className="gap-2 bg-slate-950 text-white hover:bg-slate-800" onClick={() => setShowForm(true)}><Plus className="h-4 w-4" />{isArabic ? "إضافة مريض" : "Add patient"}</Button>
          </header>

          <Card className="border-0 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.05)]"><CardContent className="p-5"><div className="relative"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={event => setSearch(event.target.value)} className="h-12 border-slate-200 bg-slate-50 pr-10" placeholder={isArabic ? "البحث بالاسم أو الهاتف أو رقم المريض..." : "Search by name, phone, or patient ID..."} dir={direction} /></div></CardContent></Card>

          {showForm && <Card className="border-teal-100 bg-white shadow-[0_12px_35px_rgba(15,118,110,0.08)]"><CardHeader className="flex flex-row items-center justify-between"><CardTitle>{isArabic ? "ملف مريض جديد" : "New patient record"}</CardTitle><Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><X className="h-4 w-4" /></Button></CardHeader><CardContent><form onSubmit={submit} className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>{isArabic ? "رقم المريض" : "Patient ID"}</Label><Input required value={form.patientNumber} onChange={event => update("patientNumber", event.target.value)} placeholder="PT-0001" /></div><div className="space-y-2"><Label>{isArabic ? "الاسم الكامل" : "Full name"}</Label><Input required value={form.fullName} onChange={event => update("fullName", event.target.value)} /></div><div className="space-y-2"><Label>{isArabic ? "رقم الهاتف" : "Phone"}</Label><Input required value={form.phone} onChange={event => update("phone", event.target.value)} /></div><div className="space-y-2"><Label>{isArabic ? "البريد الإلكتروني" : "Email"}</Label><Input type="email" value={form.email} onChange={event => update("email", event.target.value)} /></div><div className="space-y-2"><Label>{isArabic ? "النوع" : "Gender"}</Label><select value={form.gender} onChange={event => update("gender", event.target.value)} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"><option value="female">{isArabic ? "أنثى" : "Female"}</option><option value="male">{isArabic ? "ذكر" : "Male"}</option><option value="other">{isArabic ? "آخر" : "Other"}</option></select></div><div className="space-y-2"><Label>{isArabic ? "الحساسية والحساسيات" : "Allergies / sensitivities"}</Label><Textarea value={form.allergies} onChange={event => update("allergies", event.target.value)} /></div><div className="space-y-2"><Label>{isArabic ? "الأمراض المزمنة" : "Chronic conditions"}</Label><Textarea value={form.chronicConditions} onChange={event => update("chronicConditions", event.target.value)} /></div><div className="space-y-2 md:col-span-2"><Label>{isArabic ? "ملاحظات عامة" : "General notes"}</Label><Textarea value={form.notes} onChange={event => update("notes", event.target.value)} /></div><div className="flex items-center gap-3 md:col-span-2"><Button type="submit" disabled={createMutation.isPending} className="bg-teal-700 text-white hover:bg-teal-800">{createMutation.isPending ? (isArabic ? "جارٍ الحفظ..." : "Saving...") : (isArabic ? "حفظ الملف" : "Save record")}</Button>{createMutation.error && <p className="text-sm text-red-600">{createMutation.error.message.includes("already exists") ? (isArabic ? "يوجد ملف بنفس رقم المريض أو رقم الهاتف. ابحث عن الملف الحالي بدل إنشاء ملف مكرر." : "A patient with this ID or phone already exists. Search for the existing record instead.") : (isArabic ? "تعذر حفظ الملف. تحقق من البيانات." : "Could not save the record. Check the fields.")}</p>}</div></form></CardContent></Card>}

          <Card className="border-0 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.05)]"><CardHeader><div className="flex items-center justify-between"><div><CardTitle>{isArabic ? "سجل المرضى" : "Patient directory"}</CardTitle><p className="mt-1 text-sm text-slate-500">{isArabic ? `${patients.length} ملف ظاهر` : `${patients.length} records shown`}</p></div><Badge variant="outline" className="border-slate-200">{isArabic ? "موحد" : "Unified"}</Badge></div></CardHeader><CardContent>{patientsQuery.isLoading ? <div className="p-8 text-center text-sm text-slate-400">{isArabic ? "جارٍ تحميل الملفات..." : "Loading records..."}</div> : patients.length === 0 ? <div className="flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 text-center"><UserRound className="mb-3 h-8 w-8 text-slate-300" /><p className="font-medium text-slate-700">{isArabic ? "لا توجد ملفات مطابقة" : "No matching records"}</p><p className="mt-1 text-sm text-slate-400">{isArabic ? "أضف أول مريض أو غيّر كلمات البحث." : "Add the first patient or change your search."}</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm"><thead><tr className="border-b border-slate-100 text-right text-slate-400"><th className="px-3 py-3 font-medium">{isArabic ? "رقم المريض" : "Patient ID"}</th><th className="px-3 py-3 font-medium">{isArabic ? "الاسم" : "Name"}</th><th className="px-3 py-3 font-medium">{isArabic ? "الهاتف" : "Phone"}</th><th className="px-3 py-3 font-medium">{isArabic ? "الحالة الصحية" : "Health notes"}</th><th className="px-3 py-3 font-medium">{isArabic ? "إجراء" : "Action"}</th></tr></thead><tbody>{patients.map(patient => <tr key={patient.id} className="border-b border-slate-50 last:border-0"><td className="px-3 py-4 font-medium text-teal-700">{patient.patientNumber}</td><td className="px-3 py-4 text-slate-800">{patient.fullName}</td><td className="px-3 py-4 text-slate-500">{patient.phone}</td><td className="max-w-[240px] truncate px-3 py-4 text-slate-500">{patient.chronicConditions || patient.allergies || (isArabic ? "لا توجد ملاحظات" : "No notes")}</td><td className="px-3 py-4"><Button variant="ghost" size="sm" onClick={() => setLocation(`/patients/${patient.id}`)}>{isArabic ? "فتح الملف" : "Open"}{isArabic ? <ArrowLeft className="mr-1 h-3.5 w-3.5" /> : <ArrowRight className="ml-1 h-3.5 w-3.5" />}</Button></td></tr>)}</tbody></table></div>}</CardContent></Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
