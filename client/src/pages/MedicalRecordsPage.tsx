import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { FileUp, Paperclip } from "lucide-react";
import { useState } from "react";

export default function MedicalRecordsPage() {
  const { isArabic, direction } = useLanguage();
  const [visitId, setVisitId] = useState("");
  const [patientId, setPatientId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const upload = trpc.medicalAttachments.upload.useMutation({ onSuccess: () => setFile(null) });
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return;
    const dataBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    upload.mutate({ visitId: Number(visitId), patientId: Number(patientId), fileName: file.name, mimeType: file.type as "application/pdf" | "image/jpeg" | "image/png" | "image/webp", dataBase64, sizeBytes: file.size });
  };
  return <DashboardLayout><div dir={direction} className="min-h-screen bg-[#f7fafc] p-4 text-slate-900 sm:p-8"><div className="mx-auto max-w-5xl space-y-6"><header><p className="text-sm font-medium text-teal-700">{isArabic ? "الملف الطبي" : "Medical records"}</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">{isArabic ? "مرفقات الزيارة" : "Visit attachments"}</h1><p className="mt-2 text-sm text-slate-500">{isArabic ? "اربط التحاليل والأشعة والمستندات بزيارة طبية محددة." : "Link lab results, radiology, and documents to a specific visit."}</p></header><Card className="border-0 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.05)]"><CardHeader><CardTitle className="flex items-center gap-2"><Paperclip className="h-5 w-5 text-teal-700" />{isArabic ? "رفع مرفق" : "Upload attachment"}</CardTitle></CardHeader><CardContent><form onSubmit={submit} className="grid gap-4 md:grid-cols-2"><Input required type="number" min="1" placeholder={isArabic ? "رقم الزيارة" : "Visit ID"} value={visitId} onChange={event => setVisitId(event.target.value)} /><Input required type="number" min="1" placeholder={isArabic ? "رقم المريض" : "Patient ID"} value={patientId} onChange={event => setPatientId(event.target.value)} /><Input required className="md:col-span-2" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={event => setFile(event.target.files?.[0] ?? null)} /><p className="text-xs text-slate-500 md:col-span-2">{isArabic ? "الأنواع المسموحة: PDF وJPG وPNG وWEBP، بحد أقصى 10 ميجابايت." : "Allowed: PDF, JPG, PNG, and WEBP, up to 10 MB."}</p><Button type="submit" disabled={!file || upload.isPending} className="w-fit gap-2 bg-teal-700 text-white hover:bg-teal-800"><FileUp className="h-4 w-4" />{upload.isPending ? (isArabic ? "جارٍ الرفع..." : "Uploading...") : (isArabic ? "رفع المرفق" : "Upload")}</Button></form>{upload.isSuccess && <p className="mt-4 text-sm text-emerald-700">{isArabic ? "تم ربط المرفق بالزيارة بنجاح." : "Attachment linked to the visit successfully."}</p>}{upload.error && <p className="mt-4 text-sm text-red-600">{isArabic ? "تعذر رفع المرفق أو أن الزيارة لا تخص المريض المحدد." : "Upload failed or the visit does not belong to the selected patient."}</p>}</CardContent></Card></div></div></DashboardLayout>;
}
