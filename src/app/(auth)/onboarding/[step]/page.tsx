"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
// Auth + onboarding handled via API routes
import { INDUSTRIES, type IndustrySlug } from "@/lib/constants/brand";
import {
  Thermometer, Wrench, Zap, Paintbrush, TreePine, Home,
  Sparkles, Building, HardHat, Bug, Waves, Droplets, Maximize,
  Hammer, ChevronRight, ChevronLeft, Loader2, Check,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const TOTAL_STEPS = 5;

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Thermometer, Wrench, Zap, Paintbrush, TreePine, Home,
  Sparkles, Building, HardHat, Bug, Waves, Droplets, Maximize, Hammer,
};

// ─── Step-specific data shapes ────────────────────────────────────────────────

interface Step1Data { industry: IndustrySlug }
interface Step2Data {
  teamSize: string;
  businessModel: string;
  pricingMethod: string;
}
interface Step3Data {
  currentTools: string[];
  biggestPain: string;
}
interface Step4Data { tradeAnswers: Record<string, string> }
interface Step5Data {
  hasQuickbooks: boolean;
  paymentMethods: string[];
}

type StepData = Step1Data | Step2Data | Step3Data | Step4Data | Step5Data;

// ─── Trade-specific step-4 questions ─────────────────────────────────────────

const TRADE_QUESTIONS: Record<IndustrySlug, Array<{ id: string; label: string; options: string[] }>> = {
  hvac: [
    { id: "services", label: "What services do you primarily offer?", options: ["Residential HVAC", "Commercial HVAC", "Both", "HVAC + Plumbing"] },
    { id: "refrigerant", label: "Do you track refrigerant usage?", options: ["Yes — EPA requires it", "Occasionally", "Not yet"] },
  ],
  plumbing: [
    { id: "services", label: "What type of plumbing work?", options: ["Residential", "Commercial", "Both", "New construction"] },
    { id: "emergency", label: "Do you offer 24/7 emergency service?", options: ["Yes", "Business hours only", "On-call after hours"] },
  ],
  electrical: [
    { id: "services", label: "What electrical work do you focus on?", options: ["Residential", "Commercial", "Industrial", "All of the above"] },
    { id: "panels", label: "Do you document electrical panels per property?", options: ["Yes", "Sometimes", "No, want to start"] },
  ],
  painting: [
    { id: "workType", label: "What type of painting work?", options: ["Interior residential", "Exterior residential", "Commercial", "All"] },
    { id: "colorTracking", label: "Do clients ask you to track paint colors?", options: ["Always", "Sometimes", "Rarely"] },
  ],
  landscaping: [
    { id: "services", label: "What services do you offer?", options: ["Lawn maintenance", "Design & install", "Both", "Snow + lawn"] },
    { id: "routes", label: "How do you currently manage weekly routes?", options: ["Paper / whiteboard", "Google Maps", "Software", "Nothing formal"] },
  ],
  roofing: [
    { id: "workType", label: "What type of roofing work?", options: ["Residential replacements", "Commercial flat roofing", "Repairs only", "All"] },
    { id: "measurements", label: "How do you get roof measurements?", options: ["EagleView / HOVER", "Manual measurement", "Estimate by eye"] },
  ],
  "cleaning-residential": [
    { id: "frequency", label: "How often do most clients book?", options: ["Weekly", "Bi-weekly", "Monthly", "One-time / irregular"] },
    { id: "autoCharge", label: "Do you auto-charge clients on a schedule?", options: ["Yes", "No — invoice each time", "Want to start"] },
  ],
  "cleaning-commercial": [
    { id: "contracts", label: "What's your typical contract length?", options: ["Monthly", "Annual", "No contracts", "Per-shift"] },
    { id: "shifts", label: "Do you need shift / overnight scheduling?", options: ["Yes", "Daytime only", "Both"] },
  ],
  "general-contracting": [
    { id: "projectSize", label: "What's your average project size?", options: ["Under $10K", "$10K–$50K", "$50K–$250K", "$250K+"] },
    { id: "subcontractors", label: "Do you manage subcontractors?", options: ["Yes, regularly", "Sometimes", "No"] },
  ],
  "pest-control": [
    { id: "services", label: "What pest control services?", options: ["Residential", "Commercial", "Both", "Termite specialist"] },
    { id: "chemicals", label: "Do you need chemical application logs?", options: ["Yes — required", "For reference", "Not currently"] },
  ],
  "pool-service": [
    { id: "routes", label: "How many pools on your route?", options: ["1–20", "21–50", "51–100", "100+"] },
    { id: "chemicals", label: "Do you log water chemistry readings?", options: ["Every visit", "When needed", "Not yet"] },
  ],
  "pressure-washing": [
    { id: "workType", label: "What surfaces do you primarily clean?", options: ["Driveways & concrete", "Houses / siding", "Commercial lots", "All"] },
    { id: "estimating", label: "How do you estimate jobs?", options: ["Square footage rate", "Flat rate", "Time + materials", "Eyeball it"] },
  ],
  "window-cleaning": [
    { id: "workType", label: "What type of window cleaning?", options: ["Residential", "Commercial high-rise", "Storefront", "All"] },
    { id: "frequency", label: "Do clients book on a recurring schedule?", options: ["Mostly yes", "Mixed", "Mostly one-time"] },
  ],
  handyman: [
    { id: "specialty", label: "Do you specialize in anything?", options: ["Carpentry", "Drywall / patching", "General repairs", "No specialty"] },
    { id: "billing", label: "How do you typically charge?", options: ["Hourly rate", "Flat rate per job", "Time + materials", "Varies"] },
  ],
};

// ─── Step components ──────────────────────────────────────────────────────────

function Step1({ data, onChange }: { data: Partial<Step1Data>; onChange: (d: Step1Data) => void }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-1">What&apos;s your trade?</h2>
      <p className="text-sm text-[#6b7280] mb-5">
        Gritly will configure itself for how your industry works.
      </p>
      <div className="grid grid-cols-2 gap-2.5">
        {INDUSTRIES.map((ind) => {
          const Icon = ICON_MAP[ind.icon] ?? Hammer;
          const selected = data.industry === ind.slug;
          return (
            <button
              key={ind.slug}
              type="button"
              onClick={() => onChange({ industry: ind.slug })}
              className={cn(
                "flex items-center gap-2.5 px-3 py-3 rounded-xl border text-left transition-all",
                selected
                  ? "border-orange-500 bg-orange-500/10 text-white"
                  : "border-[#1f1f1f] bg-[#111111] text-[#9ca3af] hover:border-[#374151] hover:text-white"
              )}
            >
              <Icon className={cn("w-4 h-4 shrink-0", selected ? "text-orange-500" : "")} />
              <span className="text-sm font-medium">{ind.name}</span>
              {selected && <Check className="w-3.5 h-3.5 text-orange-500 ml-auto shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const TEAM_SIZES = ["Just me", "2–5", "6–15", "16–50", "50+"];
const BUSINESS_MODELS = [
  { value: "recurring", label: "Recurring clients (maintenance plans, routes)" },
  { value: "one-time", label: "Mostly one-time or project-based work" },
  { value: "mixed", label: "A mix of both" },
];
const PRICING_METHODS = [
  { value: "flat-rate", label: "Flat-rate / pricebook" },
  { value: "hourly", label: "Time & materials" },
  { value: "project", label: "Project estimates" },
  { value: "mixed", label: "All of the above" },
];

function Step2({ data, onChange }: { data: Partial<Step2Data>; onChange: (d: Step2Data) => void }) {
  const update = (key: keyof Step2Data, val: string) =>
    onChange({ teamSize: data.teamSize ?? "", businessModel: data.businessModel ?? "", pricingMethod: data.pricingMethod ?? "", [key]: val });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Tell us about your business</h2>
        <p className="text-sm text-[#6b7280]">We&apos;ll set up the right features for your size and model.</p>
      </div>

      <div>
        <p className="text-sm font-medium text-[#d1d5db] mb-2">How many people on your team?</p>
        <div className="flex flex-wrap gap-2">
          {TEAM_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => update("teamSize", size)}
              className={cn(
                "px-4 py-1.5 rounded-full border text-sm transition-all",
                data.teamSize === size
                  ? "border-orange-500 bg-orange-500/10 text-white"
                  : "border-[#1f1f1f] text-[#9ca3af] hover:border-[#374151] hover:text-white"
              )}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-[#d1d5db] mb-2">Business model</p>
        <div className="space-y-2">
          {BUSINESS_MODELS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => update("businessModel", opt.value)}
              className={cn(
                "w-full text-left px-4 py-2.5 rounded-xl border text-sm transition-all",
                data.businessModel === opt.value
                  ? "border-orange-500 bg-orange-500/10 text-white"
                  : "border-[#1f1f1f] text-[#9ca3af] hover:border-[#374151] hover:text-white"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-[#d1d5db] mb-2">How do you price jobs?</p>
        <div className="space-y-2">
          {PRICING_METHODS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => update("pricingMethod", opt.value)}
              className={cn(
                "w-full text-left px-4 py-2.5 rounded-xl border text-sm transition-all",
                data.pricingMethod === opt.value
                  ? "border-orange-500 bg-orange-500/10 text-white"
                  : "border-[#1f1f1f] text-[#9ca3af] hover:border-[#374151] hover:text-white"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const TOOL_OPTIONS = [
  "Jobber", "Housecall Pro", "ServiceTitan", "FieldEdge",
  "QuickBooks", "Excel / Spreadsheets", "Paper / whiteboard", "Nothing yet",
];
const PAIN_OPTIONS = [
  "Getting paid faster", "Scheduling chaos", "Following up on quotes",
  "Tracking job costs", "Managing my team", "Client communication",
];

function Step3({ data, onChange }: { data: Partial<Step3Data>; onChange: (d: Step3Data) => void }) {
  const tools = data.currentTools ?? [];

  const toggleTool = (tool: string) => {
    const next = tools.includes(tool) ? tools.filter((t) => t !== tool) : [...tools, tool];
    onChange({ currentTools: next, biggestPain: data.biggestPain ?? "" });
  };

  const setPain = (pain: string) => {
    onChange({ currentTools: tools, biggestPain: pain });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">What are you using now?</h2>
        <p className="text-sm text-[#6b7280]">Select all that apply.</p>
      </div>

      <div>
        <p className="text-sm font-medium text-[#d1d5db] mb-2">Current tools</p>
        <div className="flex flex-wrap gap-2">
          {TOOL_OPTIONS.map((tool) => (
            <button
              key={tool}
              type="button"
              onClick={() => toggleTool(tool)}
              className={cn(
                "px-3.5 py-1.5 rounded-full border text-sm transition-all",
                tools.includes(tool)
                  ? "border-orange-500 bg-orange-500/10 text-white"
                  : "border-[#1f1f1f] text-[#9ca3af] hover:border-[#374151] hover:text-white"
              )}
            >
              {tools.includes(tool) && <Check className="w-3 h-3 inline mr-1.5 text-orange-500" />}
              {tool}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-[#d1d5db] mb-2">What&apos;s your biggest pain point right now?</p>
        <div className="space-y-2">
          {PAIN_OPTIONS.map((pain) => (
            <button
              key={pain}
              type="button"
              onClick={() => setPain(pain)}
              className={cn(
                "w-full text-left px-4 py-2.5 rounded-xl border text-sm transition-all",
                data.biggestPain === pain
                  ? "border-orange-500 bg-orange-500/10 text-white"
                  : "border-[#1f1f1f] text-[#9ca3af] hover:border-[#374151] hover:text-white"
              )}
            >
              {pain}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Step4({
  data,
  onChange,
  industry,
}: {
  data: Partial<Step4Data>;
  onChange: (d: Step4Data) => void;
  industry: IndustrySlug;
}) {
  const questions = TRADE_QUESTIONS[industry] ?? [];
  const answers = data.tradeAnswers ?? {};

  const setAnswer = (id: string, val: string) =>
    onChange({ tradeAnswers: { ...answers, [id]: val } });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">A few quick trade questions</h2>
        <p className="text-sm text-[#6b7280]">Helps us fine-tune your setup.</p>
      </div>

      {questions.map((q) => (
        <div key={q.id}>
          <p className="text-sm font-medium text-[#d1d5db] mb-2">{q.label}</p>
          <div className="space-y-2">
            {q.options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setAnswer(q.id, opt)}
                className={cn(
                  "w-full text-left px-4 py-2.5 rounded-xl border text-sm transition-all",
                  answers[q.id] === opt
                    ? "border-orange-500 bg-orange-500/10 text-white"
                    : "border-[#1f1f1f] text-[#9ca3af] hover:border-[#374151] hover:text-white"
                )}
              >
                {answers[q.id] === opt && <Check className="w-3 h-3 inline mr-1.5 text-orange-500" />}
                {opt}
              </button>
            ))}
          </div>
        </div>
      ))}

      {questions.length === 0 && (
        <p className="text-sm text-[#6b7280]">No additional questions for your trade.</p>
      )}
    </div>
  );
}

const PAYMENT_METHODS = [
  "Credit / debit card", "ACH / bank transfer", "Cash", "Cheque",
  "Consumer financing (Wisetack)", "E-transfer / Interac",
];

function Step5({ data, onChange }: { data: Partial<Step5Data>; onChange: (d: Step5Data) => void }) {
  const methods = data.paymentMethods ?? [];

  const toggleMethod = (m: string) => {
    const next = methods.includes(m) ? methods.filter((x) => x !== m) : [...methods, m];
    onChange({ hasQuickbooks: data.hasQuickbooks ?? false, paymentMethods: next });
  };

  const setQB = (val: boolean) => {
    onChange({ hasQuickbooks: val, paymentMethods: methods });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Last step — financial setup</h2>
        <p className="text-sm text-[#6b7280]">We&apos;ll connect the right integrations.</p>
      </div>

      <div>
        <p className="text-sm font-medium text-[#d1d5db] mb-2">
          Do you use QuickBooks or Xero?
        </p>
        <div className="flex gap-2">
          {[{ val: true, label: "Yes" }, { val: false, label: "No" }].map(({ val, label }) => (
            <button
              key={label}
              type="button"
              onClick={() => setQB(val)}
              className={cn(
                "flex-1 py-2.5 rounded-xl border text-sm transition-all",
                data.hasQuickbooks === val
                  ? "border-orange-500 bg-orange-500/10 text-white"
                  : "border-[#1f1f1f] text-[#9ca3af] hover:border-[#374151] hover:text-white"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-[#d1d5db] mb-2">
          How do your clients pay you? (select all)
        </p>
        <div className="flex flex-wrap gap-2">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => toggleMethod(m)}
              className={cn(
                "px-3.5 py-1.5 rounded-full border text-sm transition-all",
                methods.includes(m)
                  ? "border-orange-500 bg-orange-500/10 text-white"
                  : "border-[#1f1f1f] text-[#9ca3af] hover:border-[#374151] hover:text-white"
              )}
            >
              {methods.includes(m) && <Check className="w-3 h-3 inline mr-1.5 text-orange-500" />}
              {m}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function OnboardingPage({ params }: { params: Promise<{ step: string }> }) {
  const { step } = use(params);
  const stepNum = Math.max(1, Math.min(TOTAL_STEPS, parseInt(step, 10) || 1));
  const router = useRouter();

  const [stepData, setStepData] = useState<Record<number, StepData>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get the industry chosen in step 1 for step 4 trade questions
  const selectedIndustry = ((stepData[1] as Partial<Step1Data> | undefined)?.industry) ?? "hvac";

  function canProceed(): boolean {
    const d = stepData[stepNum];
    if (!d) return false;
    switch (stepNum) {
      case 1: return !!(d as Step1Data).industry;
      case 2: {
        const s2 = d as Step2Data;
        return !!(s2.teamSize && s2.businessModel && s2.pricingMethod);
      }
      case 3: {
        const s3 = d as Step3Data;
        return !!(s3.biggestPain);
      }
      case 4: {
        const questions = TRADE_QUESTIONS[selectedIndustry] ?? [];
        if (questions.length === 0) return true;
        const answers = (d as Step4Data).tradeAnswers ?? {};
        return questions.every((q) => !!answers[q.id]);
      }
      case 5: {
        const s5 = d as Step5Data;
        return s5.hasQuickbooks !== undefined && (s5.paymentMethods?.length ?? 0) > 0;
      }
      default: return false;
    }
  }

  async function saveStep(step: number, data: StepData) {
    await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step, data }),
    });
  }

  async function handleNext() {
    const data = stepData[stepNum];
    if (!data || !canProceed()) return;

    setLoading(true);
    setError(null);

    try {
      await saveStep(stepNum, data);

      if (stepNum < TOTAL_STEPS) {
        router.push(`/onboarding/${stepNum + 1}`);
      } else {
        await finishOnboarding();
      }
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function finishOnboarding() {
    const industry = ((stepData[1] as Partial<Step1Data> | undefined)?.industry) ?? "hvac";

    await fetch("/api/onboarding", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ industry }),
    });

    window.location.href = "/dash";
  }

  function handleBack() {
    if (stepNum > 1) {
      router.push(`/onboarding/${stepNum - 1}`);
    }
  }

  const progressPct = ((stepNum - 1) / (TOTAL_STEPS - 1)) * 100;

  // Restore step data from previous visits when navigating back
  useEffect(() => {
    // intentionally blank — step data is kept in component state throughout session
  }, [stepNum]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <div className="border-b border-[#1f1f1f] px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">G</span>
          </div>
          <span className="text-white font-semibold">Gritly</span>
        </div>
        <span className="text-sm text-[#6b7280]">
          Step {stepNum} of {TOTAL_STEPS}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-[#1f1f1f]">
        <div
          className="h-full bg-orange-500 transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-8">
        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="flex-1">
          {stepNum === 1 && (
            <Step1
              data={(stepData[1] as Partial<Step1Data>) ?? {}}
              onChange={(d) => setStepData((prev) => ({ ...prev, 1: d }))}
            />
          )}
          {stepNum === 2 && (
            <Step2
              data={(stepData[2] as Partial<Step2Data>) ?? {}}
              onChange={(d) => setStepData((prev) => ({ ...prev, 2: d }))}
            />
          )}
          {stepNum === 3 && (
            <Step3
              data={(stepData[3] as Partial<Step3Data>) ?? {}}
              onChange={(d) => setStepData((prev) => ({ ...prev, 3: d }))}
            />
          )}
          {stepNum === 4 && (
            <Step4
              data={(stepData[4] as Partial<Step4Data>) ?? {}}
              onChange={(d) => setStepData((prev) => ({ ...prev, 4: d }))}
              industry={selectedIndustry}
            />
          )}
          {stepNum === 5 && (
            <Step5
              data={(stepData[5] as Partial<Step5Data>) ?? {}}
              onChange={(d) => setStepData((prev) => ({ ...prev, 5: d }))}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-[#1f1f1f]">
          <button
            type="button"
            onClick={handleBack}
            disabled={stepNum === 1}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-sm transition-all",
              stepNum === 1
                ? "border-transparent text-[#374151] cursor-not-allowed"
                : "border-[#1f1f1f] text-[#9ca3af] hover:border-[#374151] hover:text-white"
            )}
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <button
            type="button"
            onClick={handleNext}
            disabled={!canProceed() || loading}
            className={cn(
              "flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all",
              canProceed() && !loading
                ? "bg-orange-500 hover:bg-orange-600 text-white"
                : "bg-[#1f1f1f] text-[#4b5563] cursor-not-allowed"
            )}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {stepNum === TOTAL_STEPS ? "Launch Gritly" : "Continue"}
            {!loading && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
