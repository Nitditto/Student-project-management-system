import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight, X, Play } from "lucide-react";
import { useTranslation } from "react-i18next";

const getStepsForPage = (pathname, role, t) => {
  const isStudent = role === "Student";
  const isTeacher = role === "Teacher";

  // 1. PROJECT REGISTRATION FORM (Student)
  if (isStudent && pathname.includes("/submit-proposal")) {
    return [
      {
        target: "#proposal-form-container",
        title: t("tour.proposal.step1.title"),
        content: t("tour.proposal.step1.content"),
      },
      {
        target: "#proposal-title-input",
        title: t("tour.proposal.step2.title"),
        content: t("tour.proposal.step2.content"),
      },
      {
        target: "#proposal-desc-input",
        title: t("tour.proposal.step3.title"),
        content: t("tour.proposal.step3.content"),
      },
      {
        target: "#proposal-file-input",
        title: t("tour.proposal.step4.title"),
        content: t("tour.proposal.step4.content"),
      },
      {
        target: "#proposal-realtime-assistant",
        title: t("tour.proposal.step5.title"),
        content: t("tour.proposal.step5.content"),
      },
      {
        target: "#proposal-submit-btn",
        title: t("tour.proposal.step6.title"),
        content: t("tour.proposal.step6.content"),
      },
    ];
  }

  // 2. UPLOAD FILES PAGE (Student)
  if (isStudent && pathname.includes("/upload-files")) {
    return [
      {
        target: "#upload-tabs-wrapper",
        title: t("tour.upload.step1.title"),
        content: t("tour.upload.step1.content"),
      },
      {
        target: "#upload-dropzones-grid",
        title: t("tour.upload.step2.title"),
        content: t("tour.upload.step2.content"),
      },
      {
        target: "#upload-submit-btn",
        title: t("tour.upload.step3.title"),
        content: t("tour.upload.step3.content"),
      },
      {
        target: "#upload-deadlines-list",
        title: t("tour.upload.step4.title"),
        content: t("tour.upload.step4.content"),
      },
      {
        target: "#upload-analysis-btn-first",
        title: t("tour.upload.step5.title"),
        content: t("tour.upload.step5.content"),
      },
    ];
  }

  // 3. SUBMISSION ANALYSIS PAGE (Student)
  if (isStudent && pathname.includes("/analysis/")) {
    return [
      {
        target: "#analysis-plagiarism-card",
        title: t("tour.analysis.step1.title"),
        content: t("tour.analysis.step1.content"),
      },
      {
        target: "#analysis-score-card",
        title: t("tour.analysis.step2.title"),
        content: t("tour.analysis.step2.content"),
      },
      {
        target: "#analysis-clo-breakdown",
        title: t("tour.analysis.step3.title"),
        content: t("tour.analysis.step3.content"),
      },
      {
        target: "#analysis-suggestions-card",
        title: t("tour.analysis.step4.title"),
        content: t("tour.analysis.step4.content"),
      },
    ];
  }

  // 4. TEACHER PENDING REQUESTS PAGE
  if (isTeacher && pathname.includes("/pending-requests")) {
    return [
      {
        target: "#main-content-container",
        title: t("tour.pending.step1.title"),
        content: t("tour.pending.step1.content"),
      },
      {
        target: "#main-content-container",
        title: t("tour.pending.step2.title"),
        content: t("tour.pending.step2.content"),
      },
    ];
  }

  // DEFAULT TOUR (DASHBOARD / HOME PAGE)
  return role === "Teacher" ? [
    {
      target: "#sidebar-container",
      title: t("tour.teacherHome.step1.title"),
      content: t("tour.teacherHome.step1.content"),
    },
    {
      target: "#navbar-help",
      title: t("tour.teacherHome.step2.title"),
      content: t("tour.teacherHome.step2.content"),
    },
    {
      target: "#navbar-notifications",
      title: t("tour.teacherHome.step3.title"),
      content: t("tour.teacherHome.step3.content"),
    },
    {
      target: "#navbar-profile",
      title: t("tour.teacherHome.step4.title"),
      content: t("tour.teacherHome.step4.content"),
    },
    {
      target: "#main-content-container",
      title: t("tour.teacherHome.step5.title"),
      content: t("tour.teacherHome.step5.content"),
    },
  ] : [
    {
      target: "#sidebar-container",
      title: t("tour.studentHome.step1.title"),
      content: t("tour.studentHome.step1.content"),
    },
    {
      target: "#navbar-qr-scanner",
      title: t("tour.studentHome.step2.title"),
      content: t("tour.studentHome.step2.content"),
    },
    {
      target: "#navbar-help",
      title: t("tour.studentHome.step3.title"),
      content: t("tour.studentHome.step3.content"),
    },
    {
      target: "#navbar-notifications",
      title: t("tour.studentHome.step4.title"),
      content: t("tour.studentHome.step4.content"),
    },
    {
      target: "#navbar-profile",
      title: t("tour.studentHome.step5.title"),
      content: t("tour.studentHome.step5.content"),
    },
    {
      target: "#main-content-container",
      title: t("tour.studentHome.step6.title"),
      content: t("tour.studentHome.step6.content"),
    },
  ];
};

const isElementVisible = (element) => {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  
  // Check if element is offscreen horizontally (like sidebar container when closed on mobile)
  if (rect.right <= 0 || rect.left >= window.innerWidth) return false;
  
  // Check if element is offscreen vertically
  if (rect.bottom <= 0 || rect.top >= window.innerHeight) return false;
  
  return true;
};

const OnboardingTour = ({ userRole, isOpen, onClose }) => {
  const location = useLocation();
  const pathname = location.pathname;
  const { t } = useTranslation();

  const [currentStep, setCurrentStep] = useState(0);
  const [coords, setCoords] = useState(null);
  const resizeTimeoutRef = useRef(null);

  const steps = getStepsForPage(pathname, userRole, t);

  const updateCoordinates = () => {
    if (!isOpen || currentStep >= steps.length) return;

    const step = steps[currentStep];
    const element = document.querySelector(step.target);

    if (isElementVisible(element)) {
      const rect = element.getBoundingClientRect();
      setCoords({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    } else {
      setCoords(null);
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateCoordinates();
    }
  }, [currentStep, isOpen, pathname, userRole]);

  useEffect(() => {
    const handleResize = () => {
      clearTimeout(resizeTimeoutRef.current);
      resizeTimeoutRef.current = setTimeout(updateCoordinates, 150);
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
      clearTimeout(resizeTimeoutRef.current);
    };
  }, [currentStep, isOpen, pathname]);

  // Reset steps counter when page changes
  useEffect(() => {
    setCurrentStep(0);
    setCoords(null);
  }, [pathname]);

  useEffect(() => {
    if (isOpen && coords === null) {
      const timer = setTimeout(() => {
        const step = steps[currentStep];
        const element = document.querySelector(step.target);
        const visible = isElementVisible(element);
        
        if (!visible) {
          if (currentStep < steps.length - 1) {
            setCurrentStep((prev) => prev + 1);
          } else {
            handleEndTour();
          }
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, coords, currentStep, pathname]);

  const handleEndTour = () => {
    setCurrentStep(0);
    setCoords(null);
    onClose();
  };

  if (!isOpen || steps.length === 0) return null;

  const activeStep = steps[currentStep];

  const getTooltipStyle = () => {
    if (!coords) {
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        position: "fixed",
      };
    }

    const margin = 16;
    const tooltipWidth = 320;
    const spaceBelow = window.innerHeight - (coords.top + coords.height);
    const spaceAbove = coords.top;
    const spaceRight = window.innerWidth - (coords.left + coords.width);

    let top = coords.top + coords.height + margin;
    let left = Math.max(margin, Math.min(coords.left, window.innerWidth - tooltipWidth - margin));
    let transform = "none";

    if (spaceBelow < 220 && spaceAbove > 220) {
      top = coords.top - 180 - margin;
    }

    if (activeStep.target === "#sidebar-container" && spaceRight > 350) {
      top = coords.top + 80;
      left = coords.left + coords.width + margin;
    }

    return {
      top: `${top}px`,
      left: `${left}px`,
      transform,
      position: "fixed",
    };
  };

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-[1px] pointer-events-auto" />

      {coords && (
        <div
          className="fixed rounded-xl border-2 border-blue-500 bg-transparent transition-all duration-300 pointer-events-none z-[9999] shadow-[0_0_0_9999px_rgba(15,23,42,0.65)]"
          style={{
            top: `${coords.top - 6}px`,
            left: `${coords.left - 6}px`,
            width: `${coords.width + 12}px`,
            height: `${coords.height + 12}px`,
          }}
        />
      )}

      <div
        className="z-[9999] w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-100 bg-white p-5 shadow-2xl pointer-events-auto transition-all duration-300"
        style={getTooltipStyle()}
      >
        <div className="flex items-start justify-between gap-4">
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
            {activeStep?.title}
          </h4>
          <button
            onClick={handleEndTour}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-2.5 text-xs text-slate-600 leading-relaxed">
          {activeStep?.content}
        </p>

        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3">
          <div className="flex gap-1">
            {Array.from({ length: steps.length }).map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentStep ? "bg-blue-500 w-4" : "bg-slate-200 w-1.5"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={currentStep === 0}
              onClick={() => setCurrentStep((prev) => prev - 1)}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-40 disabled:hover:bg-white transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            {currentStep < steps.length - 1 ? (
              <button
                onClick={() => setCurrentStep((prev) => prev + 1)}
                className="btn-primary py-1.5 px-3 text-xs flex items-center gap-0.5"
              >
                {t("tour.btn.next")}
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                onClick={handleEndTour}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-1.5 px-3 text-xs rounded-xl flex items-center gap-0.5 shadow-sm transition-all"
              >
                {t("tour.btn.finish")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;
