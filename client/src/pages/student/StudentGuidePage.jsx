import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  Upload,
  Activity,
  CheckCircle2,
  Calendar,
  QrCode,
  ShieldAlert,
  ChevronRight,
  Info,
  Clock,
  UserCheck,
  Award
} from "lucide-react";

const StudentGuidePage = () => {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState("registration");

  const guideSections = [
    {
      id: "registration",
      titleKey: "student.guide.reg.title",
      icon: <BookOpen className="h-5 w-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-slate-600 leading-relaxed">
            {t("student.guide.reg.intro")}
          </p>
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
            <h5 className="font-semibold text-slate-800 flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-blue-500" />
              {t("student.guide.reg.sub")}
            </h5>
            <ul className="list-decimal pl-5 space-y-2 text-slate-600 text-sm">
              <li>{t("student.guide.reg.step1")}</li>
              <li>{t("student.guide.reg.step2")}</li>
              <li>{t("student.guide.reg.step3")}</li>
              <li>{t("student.guide.reg.step4")}</li>
            </ul>
          </div>
          <div className="flex gap-3 bg-blue-50/50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
            <Info className="h-5 w-5 flex-shrink-0 text-blue-600 mt-0.5" />
            <div>
              <span className="font-semibold">{t("student.guide.reg.noteHeader")}</span>
              <p className="mt-1 text-blue-700 leading-relaxed">
                {t("student.guide.reg.noteText")}
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "progress",
      titleKey: "student.guide.prog.title",
      icon: <QrCode className="h-5 w-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-slate-600 leading-relaxed">
            {t("student.guide.prog.intro")}
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-100 bg-white p-4 space-y-2">
              <h5 className="font-semibold text-slate-800 flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                {t("student.guide.prog.item1Header")}
              </h5>
              <p className="text-sm text-slate-500 leading-relaxed">
                {t("student.guide.prog.item1Text")}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-white p-4 space-y-2">
              <h5 className="font-semibold text-slate-800 flex items-center gap-2">
                <QrCode className="h-4 w-4 text-blue-500" />
                {t("student.guide.prog.item2Header")}
              </h5>
              <p className="text-sm text-slate-500 leading-relaxed">
                {t("student.guide.prog.item2Text")}
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "uploads",
      titleKey: "student.guide.up.title",
      icon: <Upload className="h-5 w-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-slate-600 leading-relaxed">
            {t("student.guide.up.intro")}
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-white hover:bg-slate-50 transition-colors">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">M1</span>
              <div>
                <p className="text-sm font-semibold text-slate-800">{t("student.guide.up.m1Title")}</p>
                <p className="text-xs text-slate-500">{t("student.guide.up.m1Desc")}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-150 bg-white hover:bg-slate-50 transition-colors">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">M2</span>
              <div>
                <p className="text-sm font-semibold text-slate-800">{t("student.guide.up.m2Title")}</p>
                <p className="text-xs text-slate-500">{t("student.guide.up.m2Desc")}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-150 bg-white hover:bg-slate-50 transition-colors">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">M3</span>
              <div>
                <p className="text-sm font-semibold text-slate-800">{t("student.guide.up.m3Title")}</p>
                <p className="text-xs text-slate-500">{t("student.guide.up.m3Desc")}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-150 bg-white hover:bg-slate-50 transition-colors">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">M4</span>
              <div>
                <p className="text-sm font-semibold text-slate-800">{t("student.guide.up.m4Title")}</p>
                <p className="text-xs text-slate-500">{t("student.guide.up.m4Desc")}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-3 bg-amber-50/50 border border-amber-100 rounded-xl p-4 text-sm text-amber-800">
            <ShieldAlert className="h-5 w-5 flex-shrink-0 text-amber-600 mt-0.5" />
            <div>
              <span className="font-semibold">{t("student.guide.up.noteHeader")}</span>
              <p className="mt-1 text-amber-700 leading-relaxed">
                {t("student.guide.up.noteText")}
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "analysis",
      titleKey: "student.guide.anal.title",
      icon: <Activity className="h-5 w-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-slate-600 leading-relaxed">
            {t("student.guide.anal.intro")}
          </p>
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-4">
            <div>
              <h5 className="font-semibold text-slate-800 text-sm">{t("student.guide.anal.part1Header")}</h5>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                {t("student.guide.anal.part1Text")}
              </p>
              
              {/* Detailed Cosine Similarity Explanation */}
              <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3.5 space-y-2.5 shadow-sm">
                <p className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5" />
                  {t("student.guide.anal.algoTitle")}
                </p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {t("student.guide.anal.algoDesc")}
                </p>
                <div className="bg-slate-50 border border-slate-150 rounded-lg p-2 text-center text-xs font-mono text-slate-800">
                  {t("student.guide.anal.algoFormula")}
                </div>
                <div className="text-[11px] text-slate-500 space-y-1.5 pl-1.5 border-l-2 border-slate-200">
                  <p>{t("student.guide.anal.algoBullet1")}</p>
                  <p>{t("student.guide.anal.algoBullet2")}</p>
                  <p>{t("student.guide.anal.algoBullet3")}</p>
                </div>
              </div>
            </div>
            <div className="border-t border-slate-200/60 pt-3">
              <h5 className="font-semibold text-slate-800 text-sm">{t("student.guide.anal.part2Header")}</h5>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                {t("student.guide.anal.part2Text")}
              </p>
            </div>
            <div className="border-t border-slate-200/60 pt-3">
              <h5 className="font-semibold text-slate-800 text-sm">{t("student.guide.anal.part3Header")}</h5>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                {t("student.guide.anal.part3Text")}
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "evaluation",
      titleKey: "student.guide.eval.title",
      icon: <UserCheck className="h-5 w-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-slate-600 leading-relaxed">
            {t("student.guide.eval.intro")}
          </p>
          <ul className="list-disc pl-5 space-y-2 text-slate-600 text-sm">
            <li>{t("student.guide.eval.item1")}</li>
            <li>{t("student.guide.eval.item2")}</li>
          </ul>
          <p className="text-slate-600 leading-relaxed text-sm">
            {t("student.guide.eval.footer")}
          </p>
        </div>
      ),
    },
    {
      id: "defense",
      titleKey: "student.guide.def.title",
      icon: <Calendar className="h-5 w-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-slate-600 leading-relaxed">
            {t("student.guide.def.intro")}
          </p>
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3 text-sm">
            <p className="text-slate-700 font-medium">{t("student.guide.def.sub")}</p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600 text-xs">
              <li>{t("student.guide.def.bullet1")}</li>
              <li>{t("student.guide.def.bullet2")}</li>
              <li>{t("student.guide.def.bullet3")}</li>
            </ul>
          </div>
          <p className="text-slate-600 leading-relaxed text-sm">
            {t("student.guide.def.footer")}
          </p>
        </div>
      ),
    },
    {
      id: "final",
      titleKey: "student.guide.fin.title",
      icon: <CheckCircle2 className="h-5 w-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-slate-600 leading-relaxed">
            {t("student.guide.fin.intro")}
          </p>
          <div className="rounded-xl border border-slate-100 bg-blue-50/30 p-4 space-y-2 text-sm text-slate-700">
            <p className="font-semibold text-slate-800">{t("student.guide.fin.sub")}</p>
            <ol className="list-decimal pl-5 space-y-1 text-slate-600 text-xs">
              <li>{t("student.guide.fin.step1")}</li>
              <li>{t("student.guide.fin.step2")}</li>
              <li>{t("student.guide.fin.step3")}</li>
            </ol>
          </div>
        </div>
      ),
    },
    {
      id: "clo",
      titleKey: "student.guide.clo.title",
      icon: <Award className="h-5 w-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-slate-600 leading-relaxed">
            {t("student.guide.clo.intro")}
          </p>
          <div className="grid gap-3 text-sm">
            <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50">
              {t("student.guide.clo.clo1")}
            </div>
            <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50">
              {t("student.guide.clo.clo2")}
            </div>
            <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50">
              {t("student.guide.clo.clo3")}
            </div>
            <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50">
              {t("student.guide.clo.clo4")}
            </div>
            <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50">
              {t("student.guide.clo.clo5")}
            </div>
            <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50">
              {t("student.guide.clo.clo6")}
            </div>
            <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50">
              {t("student.guide.clo.clo7")}
            </div>
          </div>
          <div className="flex gap-3 bg-blue-50/50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
            <Info className="h-5 w-5 flex-shrink-0 text-blue-600 mt-0.5" />
            <div>
              <span className="font-semibold">{t("student.guide.clo.noteHeader")}</span>
              <p className="mt-1 text-blue-700 leading-relaxed text-xs">
                {t("student.guide.clo.noteText")}
              </p>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12">
      {/* Header Banner */}
      <div className="bg-white border-b border-slate-200 py-8 px-6 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 shadow-inner">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {t("student.guide.headerTitle")}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {t("student.guide.headerSub")}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-5xl mx-auto px-6 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Navigation Sidebar */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-3">
              {t("student.guide.sidebarTitle")}
            </p>
            {guideSections.map((sec) => (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-left text-sm font-medium transition-all ${
                  activeSection === sec.id
                    ? "bg-blue-500 text-white shadow-md shadow-blue-500/20"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`${activeSection === sec.id ? "text-white" : "text-slate-400"}`}>
                    {sec.icon}
                  </span>
                  <span>{t(sec.titleKey).substring(3)}</span>
                </div>
                <ChevronRight
                  className={`h-4 w-4 transition-transform ${
                    activeSection === sec.id ? "translate-x-0.5 text-white" : "text-slate-300"
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Guide Content Display */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm min-h-[420px] flex flex-col justify-between">
            <div>
              {/* Content Header */}
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  {guideSections.find((s) => s.id === activeSection)?.icon}
                </div>
                <h2 className="text-lg font-bold text-slate-800">
                  {t(guideSections.find((s) => s.id === activeSection)?.titleKey)}
                </h2>
              </div>

              {/* Content Details */}
              <div className="transition-all duration-200">
                {guideSections.find((s) => s.id === activeSection)?.content}
              </div>
            </div>

            {/* Pagination Controls */}
            <div className="border-t border-slate-100 pt-5 mt-8 flex justify-between items-center text-sm">
              <button
                disabled={activeSection === guideSections[0].id}
                onClick={() => {
                  const idx = guideSections.findIndex((s) => s.id === activeSection);
                  if (idx > 0) setActiveSection(guideSections[idx - 1].id);
                }}
                className="btn-outline px-4 py-2 disabled:opacity-40 disabled:hover:bg-white"
              >
                {t("student.guide.backBtn")}
              </button>
              <span className="text-xs text-slate-400 font-medium">
                {t("student.guide.stepCounter", { current: guideSections.findIndex((s) => s.id === activeSection) + 1, total: guideSections.length })}
              </span>
              <button
                disabled={activeSection === guideSections[guideSections.length - 1].id}
                onClick={() => {
                  const idx = guideSections.findIndex((s) => s.id === activeSection);
                  if (idx < guideSections.length - 1) setActiveSection(guideSections[idx + 1].id);
                }}
                className="btn-primary px-4 py-2 disabled:opacity-40 disabled:hover:bg-blue-600"
              >
                {t("student.guide.nextBtn")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentGuidePage;
