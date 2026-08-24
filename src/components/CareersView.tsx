import * as React from "react";
import {
  Briefcase,
  Building2,
  CheckCircle2,
  Flag,
  GraduationCap,
  HeartHandshake,
  MapPin,
  Rocket,
  Send,
  Sparkles,
  TrendingUp,
  Upload,
  Wrench
} from "lucide-react";
import { PageHero } from "@/src/components/ui/PageHero";
import { SectionHeader } from "@/src/components/ui/SectionHeader";
import { CTASection } from "@/src/components/ui/CTASection";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { toast } from "@/src/lib/toast";
import { supabase, isRealSupabase } from "@/src/lib/supabaseClient";
import { trackMetaEvent } from "@/src/lib/metaPixel";

interface CareersViewProps {
  onBackToHome: () => void;
  onNavigateToInventory: () => void;
}

const CAREERS_META_DESCRIPTION =
  "Join 1stCars and help build a safer, simpler and more transparent pre-owned car experience.";

const POSITIONS = [
  {
    id: "sales-associate",
    title: "Sales Associate",
    location: "Surat, Gujarat",
    department: "Sales",
    about:
      "Help customers find the right pre-owned car and guide them throughout their buying journey.",
    responsibilities: [
      "Handle customer enquiries and follow-ups.",
      "Understand customer requirements and recommend suitable cars.",
      "Coordinate test drives and sales activities.",
      "Maintain regular communication with customers.",
      "Work with the team to achieve sales goals."
    ],
    lookingFor: [
      "Good communication and interpersonal skills.",
      "Sales or automotive experience preferred.",
      "Customer-focused attitude.",
      "Ability to work in a fast-paced environment."
    ]
  },
  {
    id: "inspection-engineer",
    title: "Inspection Engineer",
    location: "Surat, Gujarat",
    department: "Vehicle Inspection",
    about:
      "Inspect pre-owned vehicles and help ensure customers receive accurate and transparent vehicle information.",
    responsibilities: [
      "Inspect vehicles using the company's inspection process.",
      "Check mechanical, electrical, exterior and interior condition.",
      "Identify defects and document inspection findings.",
      "Prepare accurate vehicle inspection reports.",
      "Coordinate with sellers and the internal team."
    ],
    lookingFor: [
      "Automotive engineering/technical background.",
      "Good knowledge of vehicle systems.",
      "Strong attention to detail.",
      "Honest and responsible approach.",
      "Relevant automotive experience preferred."
    ]
  }
];

const WHY_US = [
  {
    icon: Rocket,
    title: "Make an Impact",
    desc: "Your work directly helps customers make better car decisions."
  },
  {
    icon: GraduationCap,
    title: "Learn & Grow",
    desc: "Learn quickly, take ownership and grow with the company."
  },
  {
    icon: HeartHandshake,
    title: "Customer First",
    desc: "Everything we build starts with the customer."
  },
  {
    icon: Wrench,
    title: "Build With Us",
    desc: "Be part of a growing automotive technology company."
  }
];

const LIFE_POINTS = [
  {
    icon: Flag,
    title: "Ownership",
    desc: "Take responsibility and make things happen."
  },
  {
    icon: GraduationCap,
    title: "Learning",
    desc: "Learn from real challenges and real customers."
  },
  {
    icon: TrendingUp,
    title: "Growth",
    desc: "Grow with the business and take on new opportunities."
  }
];

const STORAGE_KEY = "1stcars_career_applications";
const RESUME_BUCKET = "resumes";

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function CareersView({ onBackToHome, onNavigateToInventory }: CareersViewProps) {
  const [form, setForm] = React.useState({
    fullName: "",
    phone: "",
    email: "",
    position: POSITIONS[0].title,
    experience: "",
    message: ""
  });
  const [resume, setResume] = React.useState<File | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // SEO: page title + meta description for the /careers route. The title is
  // also set by the router, but this guarantees the meta description (and a
  // canonical URL) while the page is mounted, restoring defaults on unmount.
  React.useEffect(() => {
    const meta = document.head.querySelector<HTMLMetaElement>('meta[name="description"]');
    const prevContent = meta?.getAttribute("content") || "";
    const canon = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const prevCanon = canon?.getAttribute("href") || "";
    if (meta) meta.setAttribute("content", CAREERS_META_DESCRIPTION);
    if (canon) canon.setAttribute("href", `${window.location.origin}/careers`);
    return () => {
      if (meta) meta.setAttribute("content", prevContent);
      if (canon) canon.setAttribute("href", prevCanon);
    };
  }, []);

  const applyForPosition = (positionTitle: string) => {
    setForm((prev) => ({ ...prev, position: positionTitle }));
    setSubmitted(false);
    scrollToSection("careers-application");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file && file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, resume: "Resume must be under 5 MB." }));
      setResume(null);
      e.target.value = "";
      return;
    }
    setErrors((prev) => ({ ...prev, resume: "" }));
    setResume(file);
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!form.fullName.trim()) next.fullName = "Please enter your full name.";
    if (!/^[\d\s+\-()]{10,15}$/.test(form.phone.trim())) next.phone = "Please enter a valid phone number.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = "Please enter a valid email address.";
    if (!form.position) next.position = "Please select a position.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const uploadResume = async (file: File): Promise<{ url: string; name: string }> => {
    // The "resumes" storage bucket may not exist yet on the live backend — any
    // upload failure is non-fatal (we still record the file name with the app).
    if (!isRealSupabase) return { url: "", name: file.name };
    try {
      const path = `applications/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
      const { error } = await supabase.storage.from(RESUME_BUCKET).upload(path, file, {
        upsert: false
      });
      if (error) throw error;
      const { data } = supabase.storage.from(RESUME_BUCKET).getPublicUrl(path);
      return { url: data.publicUrl, name: file.name };
    } catch (e) {
      console.warn("Resume upload skipped (bucket unavailable):", e);
      return { url: "", name: file.name };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const resumeInfo = resume ? await uploadResume(resume) : null;
      const record = {
        full_name: form.fullName.trim(),
        phone: form.phone.trim().replace(/\D/g, "").slice(-10),
        email: form.email.trim().toLowerCase(),
        position: form.position,
        experience: form.experience.trim(),
        message: form.message.trim(),
        resume_url: resumeInfo?.url || null,
        resume_name: resumeInfo?.name || (resume ? resume.name : null),
        status: "pending"
      };

      // Source of truth: Supabase `career_applications` (see
      // public/add_career_applications.sql). The application is never lost —
      // it is mirrored to localStorage first, and if the table/bucket isn't
      // provisioned yet (e.g. migration not run) the submission still succeeds
      // locally and the team is told to run the migration.
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      localStorage.setItem(STORAGE_KEY, JSON.stringify([record, ...existing]));

      let dbError: any = null;
      try {
        const { error } = await supabase.from("career_applications").insert(record);
        dbError = error;
      } catch (err) {
        dbError = err;
      }
      if (dbError) {
        const tableMissing = /could not find the table|PGRST205|relation .* does not exist/i.test(
          String(dbError.message || dbError)
        );
        console.warn(
          tableMissing
            ? "career_applications table not found — run public/add_career_applications.sql in Supabase. Application saved locally."
            : "career_applications insert failed:",
          dbError
        );
      }

      trackMetaEvent("Lead", {
        content_name: `Job Application - ${record.position}`,
        content_category: "Careers",
        value: 1,
        currency: "INR"
      });

      setSubmitted(true);
      setForm({ fullName: "", phone: "", email: "", position: form.position, experience: "", message: "" });
      setResume(null);
      toast.success(`Application submitted for ${form.position}! Our team will review it shortly.`);
    } catch (err: any) {
      console.error("Failed to submit career application:", err);
      toast.error("Could not submit your application. Please try again or email us at support@1stcars.com.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-background min-h-screen text-slate-900">
      {/* 1. HERO */}
      <PageHero
        label="CAREERS AT 1STCARS"
        labelIcon={<Briefcase className="h-4 w-4" />}
        title={
          <>
            Careers at <span className="text-[#2E7D32]">1stCars</span>
          </>
        }
        subtitle={
          <span className="space-y-3 block">
            <strong className="block text-slate-800">Build the future of pre-owned car buying with us.</strong>
            <span>Join our team and help make buying and selling cars simpler, safer and more transparent.</span>
          </span>
        }
        ctas={[
          { label: "View Open Positions", onClick: () => scrollToSection("careers-open-positions") }
        ]}
      />

      {/* 2. WHY 1STCARS */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 sm:mt-20">
        <SectionHeader
          badge="WHY 1STCARS?"
          badgeIcon={<Sparkles className="h-3.5 w-3.5" />}
          title="Why work with us?"
          subtitle="We are building a better way to buy and sell pre-owned cars — powered by technology, transparency and people."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-10 animate-fade-up">
          {WHY_US.map((v) => {
            const Icon = v.icon;
            return (
              <div
                key={v.title}
                className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-3 shadow-xs hover:shadow-lg hover:shadow-[#2E7D32]/5 hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className="p-3 rounded-xl bg-[#2E7D32]/10 text-[#2E7D32] w-fit">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-black text-sm text-slate-900 tracking-tight">{v.title}</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">{v.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. OPEN POSITIONS */}
      <div id="careers-open-positions" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20 scroll-mt-24">
        <SectionHeader
          badge="OPEN POSITIONS"
          badgeIcon={<Briefcase className="h-3.5 w-3.5" />}
          title="Open Positions"
          subtitle="We are currently hiring for the following roles."
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-10 animate-fade-up">
          {POSITIONS.map((job) => (
            <div
              key={job.id}
              className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 shadow-xs hover:shadow-lg hover:shadow-[#2E7D32]/5 hover:-translate-y-0.5 transition-all duration-300 flex flex-col"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h3 className="font-sans text-2xl font-black tracking-tight text-slate-900">{job.title}</h3>
                <div className="flex flex-col items-end gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-[#2E7D32] bg-[#2E7D32]/10 border border-[#2E7D32]/20 rounded-full px-3 py-1">
                    <MapPin className="h-3.5 w-3.5" /> {job.location}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-slate-600 bg-slate-100 border border-slate-200 rounded-full px-3 py-1">
                    <Building2 className="h-3.5 w-3.5" /> {job.department}
                  </span>
                </div>
              </div>

              <div className="mt-5 space-y-5">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-2">About the Role</h4>
                  <p className="text-sm text-slate-600 font-medium leading-relaxed">{job.about}</p>
                </div>

                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-2">Key Responsibilities</h4>
                  <ul className="space-y-2">
                    {job.responsibilities.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600 font-medium">
                        <CheckCircle2 className="h-4 w-4 text-[#2E7D32] shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-2">What We&apos;re Looking For</h4>
                  <ul className="space-y-2">
                    {job.lookingFor.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600 font-medium">
                        <CheckCircle2 className="h-4 w-4 text-[#2E7D32] shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-auto pt-7">
                <Button
                  onClick={() => applyForPosition(job.title)}
                  className="bg-[#2E7D32] hover:bg-[#25632a] text-white font-extrabold text-xs tracking-wider uppercase px-7 py-3.5 rounded-full shadow-md shadow-[#2E7D32]/25 w-full sm:w-auto"
                >
                  Apply Now
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. APPLICATION FORM */}
      <div id="careers-application" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mt-20 scroll-mt-24">
        <SectionHeader
          badge="APPLICATION"
          badgeIcon={<Send className="h-3.5 w-3.5" />}
          title="Submit Your Application"
          subtitle="Fill in the form below and our team will get back to you."
        />
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-10 shadow-xl shadow-slate-200/50 mt-10 animate-fade-up">
          {submitted ? (
            <div className="text-center py-10 space-y-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-[#2E7D32]/10 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-[#2E7D32]" />
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Application Submitted</h3>
              <p className="text-sm text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
                Thank you for applying to 1stCars. Our team will review your application and get in touch if your
                profile matches the role.
              </p>
              <Button
                onClick={() => {
                  setSubmitted(false);
                  scrollToSection("careers-open-positions");
                }}
                className="bg-[#2E7D32] hover:bg-[#25632a] text-white font-extrabold text-xs tracking-wider uppercase px-7 py-3.5 rounded-full shadow-md shadow-[#2E7D32]/25"
              >
                Back to Open Positions
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Input
                  label="Full Name *"
                  placeholder="Your full name"
                  value={form.fullName}
                  onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                  error={errors.fullName}
                />
                <Input
                  label="Phone Number *"
                  type="tel"
                  placeholder="+91 XXXXX XXXXX"
                  value={form.phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                  error={errors.phone}
                />
              </div>

              <Input
                label="Email *"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                error={errors.email}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="w-full flex flex-col space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Position Applying For *
                  </label>
                  <select
                    value={form.position}
                    onChange={(e) => setForm((prev) => ({ ...prev, position: e.target.value }))}
                    className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition-all placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary cursor-pointer"
                  >
                    {POSITIONS.map((job) => (
                      <option key={job.id} value={job.title}>
                        {job.title}
                      </option>
                    ))}
                  </select>
                  {errors.position && <p className="text-xs font-medium text-destructive mt-0.5">{errors.position}</p>}
                </div>
                <Input
                  label="Experience"
                  placeholder="e.g. 2 years in sales"
                  value={form.experience}
                  onChange={(e) => setForm((prev) => ({ ...prev, experience: e.target.value }))}
                />
              </div>

              <div className="w-full flex flex-col space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Resume Upload (PDF or Word, max 5 MB)
                </label>
                <label className="flex h-12 w-full items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white px-4 text-sm text-slate-500 font-medium shadow-sm transition-all hover:border-[#2E7D32] hover:text-[#2E7D32] cursor-pointer">
                  <Upload className="h-4 w-4 shrink-0" />
                  <span className="truncate">{resume ? resume.name : "Choose a file…"}</span>
                  <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleFileChange} />
                </label>
                {errors.resume && <p className="text-xs font-medium text-destructive mt-0.5">{errors.resume}</p>}
              </div>

              <div className="w-full flex flex-col space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Message
                </label>
                <textarea
                  rows={4}
                  placeholder="Anything you'd like us to know…"
                  value={form.message}
                  onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
                  className="flex w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition-all placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary resize-none"
                />
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="bg-[#2E7D32] hover:bg-[#25632a] text-white font-extrabold text-xs tracking-wider uppercase px-8 py-3.5 rounded-full shadow-md shadow-[#2E7D32]/25 w-full sm:w-auto"
              >
                {submitting ? "Submitting…" : "Submit Application"}
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* 5. LIFE AT 1STCARS */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20">
        <SectionHeader
          badge="LIFE AT 1STCARS"
          badgeIcon={<HeartHandshake className="h-3.5 w-3.5" />}
          title="Life at 1stCars"
          subtitle={
            <span className="space-y-2 block">
              <strong className="block text-slate-700">Learn. Build. Grow.</strong>
              Work with a team that combines automotive experience, technology and a customer-first mindset.
            </span>
          }
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-10 animate-fade-up">
          {LIFE_POINTS.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.title}
                className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-3 shadow-xs hover:shadow-lg hover:shadow-[#2E7D32]/5 hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className="p-3 rounded-xl bg-[#2E7D32] text-white w-fit shadow-md shadow-[#2E7D32]/25">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-black text-sm text-slate-900 tracking-tight">{p.title}</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">{p.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. FINAL CTA */}
      <CTASection
        badge="JOIN THE TEAM"
        title="Ready to build with us?"
        subtitle="We'd love to hear from you."
        ctas={[
          { label: "View Open Positions", onClick: () => scrollToSection("careers-open-positions") }
        ]}
      />
    </div>
  );
}