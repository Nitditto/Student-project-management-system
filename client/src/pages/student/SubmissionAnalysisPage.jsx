import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { axiosInstance } from "../../lib/axios";
import {
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Activity,
  Award,
  BookOpen,
  ThumbsUp,
  AlertTriangle,
  Lightbulb,
  CheckCircle,
  MessageSquare,
  Star,
  RefreshCw,
  HelpCircle,
  FileText
} from "lucide-react";

const SubmissionAnalysisPage = () => {
  const { submissionId } = useParams();
  const [searchParams] = useSearchParams();
  const milestoneFromUrl = searchParams.get("milestone") || "M4";
  
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [pollingStage, setPollingStage] = useState(0);
  const [analysis, setAnalysis] = useState(null);
  
  // Rating state
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSaved, setFeedbackSaved] = useState(false);
  const [showAlgoInfo, setShowAlgoInfo] = useState(false);

  const stages = [
    t("student.analysis.stage1"),
    t("student.analysis.stage2"),
    t("student.analysis.stage3"),
    t("student.analysis.stage4"),
    t("student.analysis.stage5")
  ];

  // Fetch or trigger analysis
  const fetchAnalysis = async (forceTrigger = false) => {
    try {
      const response = await axiosInstance.get(`/ai/analyze-submission/${submissionId}?milestone=${milestoneFromUrl}`);
      
      if (!response.data.data || forceTrigger) {
        // Trigger a new analysis
        await axiosInstance.post("/ai/analyze-submission", {
          submissionId,
          milestoneCode: milestoneFromUrl
        });
        setLoading(true);
        startPolling();
      } else {
        const data = response.data.data;
        setAnalysis(data);
        
        if (data.status === "pending" || data.status === "processing") {
          setLoading(true);
          startPolling();
        } else {
          setLoading(false);
          if (data.studentFeedback?.rating) {
            setRating(data.studentFeedback.rating);
            setComment(data.studentFeedback.comment || "");
            setFeedbackSaved(true);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching analysis:", error);
      toast.error(t("student.analysis.errFetch"));
      setLoading(false);
    }
  };

  let pollInterval = null;
  const startPolling = () => {
    let stageCounter = 0;
    if (pollInterval) clearInterval(pollInterval);
    
    pollInterval = setInterval(async () => {
      // Rotate stages to show progress
      stageCounter = (stageCounter + 1) % stages.length;
      setPollingStage(stageCounter);

      try {
        const response = await axiosInstance.get(`/ai/analyze-submission/${submissionId}?milestone=${milestoneFromUrl}`);
        const data = response.data.data;
        if (data && data.status !== "pending" && data.status !== "processing") {
          clearInterval(pollInterval);
          setAnalysis(data);
          setLoading(false);
          if (data.status === "error") {
            toast.error(t("student.analysis.errProcess") + (data.errorMessage || t("student.analysis.errUnknown")));
          } else {
            toast.success(t("student.analysis.success"));
            if (data.studentFeedback?.rating) {
              setRating(data.studentFeedback.rating);
              setComment(data.studentFeedback.comment || "");
              setFeedbackSaved(true);
            }
          }
        }
      } catch (error) {
        console.error("Error polling analysis:", error);
      }
    }, 2500);
  };

  useEffect(() => {
    fetchAnalysis();
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [submissionId]);

  const handleRetry = () => {
    setFeedbackSaved(false);
    setRating(0);
    setComment("");
    fetchAnalysis(true);
  };

  const handleSendFeedback = async () => {
    if (rating === 0) {
      toast.warning(t("student.analysis.warnRating"));
      return;
    }
    setSubmittingFeedback(true);
    try {
      await axiosInstance.post(`/ai/analyze-submission/${analysis._id}/feedback`, {
        rating,
        comment
      });
      toast.success(t("student.analysis.feedbackSaved"));
      setFeedbackSaved(true);
    } catch (error) {
      console.error("Error saving feedback:", error);
      toast.error(t("student.analysis.feedbackErr"));
    } finally {
      setSubmittingFeedback(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 bg-slate-50 rounded-2xl border border-slate-200 shadow-inner">
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-full border-4 border-blue-100 border-t-blue-500 animate-spin flex items-center justify-center"></div>
          <FileText className="absolute inset-0 m-auto text-blue-500 w-8 h-8" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-800 text-center max-w-md">
          {t("student.analysis.loadingTitle")}
        </h2>
        <p className="text-slate-500 text-sm mt-3 text-center max-w-lg transition-all duration-300">
          {stages[pollingStage]}
        </p>
        <div className="w-64 bg-slate-200 h-1.5 rounded-full overflow-hidden mt-6">
          <div 
            className="bg-blue-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${((pollingStage + 1) / stages.length) * 100}%` }}
          ></div>
        </div>
      </div>
    );
  }

  if (!analysis || analysis.status === "error") {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white rounded-2xl shadow-md border border-slate-200 text-center">
        <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
          <AlertTriangle className="text-red-500 w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">{t("student.analysis.failedTitle")}</h2>
        <p className="text-slate-600 mb-6">
          {analysis?.errorMessage || t("student.analysis.failedDesc")}
        </p>
        <div className="flex gap-4 justify-center">
          <button onClick={() => navigate(-1)} className="btn-outline flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> {t("student.analysis.backBtn")}
          </button>
          <button onClick={handleRetry} className="btn-primary flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> {t("student.analysis.retryBtn")}
          </button>
        </div>
      </div>
    );
  }

  const { plagiarismResult, scoreEstimate, feedback } = analysis;

  // Grade conversion helper matching backend rules
  const convertScore10ToGrade = (score10) => {
    if (score10 === null || score10 === undefined) {
      return { score4: "N/A", letter: "N/A" };
    }
    const score = Number(score10);
    if (score >= 8.95) return { score4: 4.0, letter: "A+" };
    if (score >= 8.45) return { score4: 3.7, letter: "A" };
    if (score >= 7.95) return { score4: 3.5, letter: "B+" };
    if (score >= 6.95) return { score4: 3.0, letter: "B" };
    if (score >= 6.45) return { score4: 2.5, letter: "C+" };
    if (score >= 5.45) return { score4: 2.0, letter: "C" };
    if (score >= 4.95) return { score4: 1.5, letter: "D+" };
    if (score >= 3.95) return { score4: 1.0, letter: "D" };
    return { score4: 0.0, letter: "F" };
  };

  const gradeInfo = convertScore10ToGrade(scoreEstimate.estimatedScore10);
  const displayScore4 = scoreEstimate.estimatedScore4 !== undefined && scoreEstimate.estimatedScore4 !== null 
    ? scoreEstimate.estimatedScore4 
    : gradeInfo.score4;
    
  const displayLetter = scoreEstimate.letterGrade 
    ? scoreEstimate.letterGrade 
    : gradeInfo.letter;

  const isHighPlagiarism = plagiarismResult.overallSimilarity > 0.60 || plagiarismResult.suspiciousChunks?.length > 0;
  const isMediumPlagiarism = !isHighPlagiarism && plagiarismResult.overallSimilarity > 0.30;
  
  // Plagiarism Circle configuration
  const simPercent = Math.round(plagiarismResult.overallSimilarity * 100);
  const strokeColor = isHighPlagiarism ? "#ef4444" : isMediumPlagiarism ? "#f59e0b" : "#10b981";
  const strokeDashoffset = 282.6 - (282.6 * plagiarismResult.overallSimilarity);

  return (
    <div className="space-y-6">
      {/* Clean Academic Header */}
      <div className="relative overflow-hidden rounded-2xl bg-white p-6 text-slate-800 shadow-sm border border-slate-200">
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2">
            <button 
              onClick={() => navigate(-1)} 
              className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 outline-none"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> {t("student.analysis.backToListBtn")}
            </button>
            <h1 className="text-2xl font-black flex items-center gap-2.5 text-slate-800">
              <FileText className="w-7 h-7 text-blue-600" />
              {t("student.analysis.headerTitle")}
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              {t("student.analysis.projectTitle", { title: analysis.project?.title || "N/A" })}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={handleRetry} 
              className="inline-flex items-center gap-1.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors bg-white px-3.5 py-1.5 rounded-lg font-bold shadow-sm cursor-pointer border border-slate-200 outline-none"
            >
              <RefreshCw className="w-3.5 h-3.5" /> {t("student.analysis.reAnalyzeBtn")}
            </button>
            <span className="px-3.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider">
              {t("student.analysis.milestone", { milestone: scoreEstimate.milestone })}
            </span>
            {scoreEstimate.usedRag && (
              <span className="px-3.5 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                <BookOpen className="w-3.5 h-3.5 text-blue-500" /> {t("student.analysis.ragUsed")}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Plagiarism & Score Estimator */}
        <div className="lg:col-span-5 space-y-6">
          {/* Plagiarism Meter */}
          <div id="analysis-plagiarism-card" className="card hover:shadow-md transition-shadow">
            <div className="card-header flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isHighPlagiarism ? (
                  <ShieldAlert className="text-red-500 w-5 h-5" />
                ) : isMediumPlagiarism ? (
                  <ShieldAlert className="text-amber-500 w-5 h-5" />
                ) : (
                  <ShieldCheck className="text-emerald-500 w-5 h-5" />
                )}
                <h3 className="card-title">{t("student.analysis.plagiarismTitle")}</h3>
              </div>
              <span className={`badge font-bold ${
                isHighPlagiarism ? "bg-red-50 text-red-700 border border-red-200" :
                isMediumPlagiarism ? "bg-amber-50 text-amber-700 border border-amber-200" :
                "bg-emerald-50 text-emerald-700 border border-emerald-200"
              }`}>
                {isHighPlagiarism ? t("student.analysis.riskHigh") : isMediumPlagiarism ? t("student.analysis.riskMedium") : t("student.analysis.riskLow")}
              </span>
            </div>

            <div className="flex flex-col items-center justify-center p-4">
              {/* Radial Gauge */}
              <div className="relative w-40 h-40 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="45" 
                    stroke={strokeColor} 
                    strokeWidth="8" 
                    fill="transparent" 
                    strokeDasharray="282.6"
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-3xl font-black text-slate-800">{simPercent}%</span>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">{t("student.analysis.duplicateLabel")}</span>
                </div>
              </div>

              {plagiarismResult.overallSimilarity > 0.30 && (
                <p className="text-xs text-amber-600 font-semibold mt-3 text-center flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  {t("student.analysis.duplicateWarning")}
                </p>
              )}

              <button 
                onClick={() => setShowAlgoInfo(!showAlgoInfo)}
                className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 mt-4 transition-colors focus:outline-none"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                {showAlgoInfo ? t("student.analysis.algoCollapse") : t("student.analysis.algoExpand")}
              </button>

              {showAlgoInfo && (
                <div className="mt-4 p-4 rounded-xl bg-blue-50/40 border border-blue-100/50 space-y-3 animate-fadeIn text-xs leading-relaxed text-slate-700 w-full text-left">
                  <p className="font-bold text-blue-800 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    {t("student.analysis.algoTitle")}
                  </p>
                  <p>
                    {t("student.analysis.algoDesc")}
                  </p>
                  <div className="bg-white border border-blue-100 rounded-xl p-2 text-center font-mono text-slate-800 font-bold my-2">
                    {t("student.analysis.algoFormula")}
                  </div>
                  <div className="space-y-1.5 text-slate-600">
                    <p>{t("student.analysis.algoBullet1")}</p>
                    <p>{t("student.analysis.algoBullet2")}</p>
                    <p>{t("student.analysis.algoBullet3")}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Suspicious Chunks Details */}
            {plagiarismResult.suspiciousChunks && plagiarismResult.suspiciousChunks.length > 0 && (
              <div className="mt-4 border-t border-slate-100 pt-4 space-y-2.5">
                <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                  {t("student.analysis.suspiciousTitle", { count: plagiarismResult.suspiciousChunks.length })}
                </h4>
                <div className="max-h-52 overflow-y-auto space-y-2.5 pr-1">
                  {plagiarismResult.suspiciousChunks.map((chunk, cIdx) => (
                    <div key={cIdx} className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 shadow-sm text-xs space-y-2">
                      <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold">
                        <span>{t("student.analysis.chunkIndex", { index: chunk.chunkIndex + 1 })}</span>
                        <span className="text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                          Cosine: {Math.round(chunk.similarity * 100)}%
                        </span>
                      </div>
                      <p className="text-slate-700 italic font-medium leading-relaxed bg-white p-2 rounded-lg border border-slate-100">
                        "{chunk.text.slice(0, 180)}..."
                      </p>
                      <div className="text-[10px] font-semibold text-slate-600 bg-indigo-50/50 p-1.5 rounded flex items-center gap-1 border border-indigo-100/50">
                        <BookOpen className="w-3 h-3 text-indigo-500" />
                        <span className="truncate">{chunk.matchedProjectTitle ? t("student.analysis.matchedSource", { title: chunk.matchedProjectTitle }) : t("student.analysis.archiveSource")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Score Estimate Card */}
          <div id="analysis-score-card" className="card hover:shadow-md transition-shadow">
            <div className="card-header flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Award className="text-blue-500 w-5 h-5" />
                <h3 className="card-title">{t("student.analysis.scoreTitle")}</h3>
              </div>
              <div className="text-[10px] font-bold text-slate-400">
                {t("student.analysis.confidence", { percent: Math.round(scoreEstimate.confidence * 100) })}
              </div>
            </div>



            {/* CLO Breakdown */}
            <div id="analysis-clo-breakdown" className="space-y-4">
              <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                {t("student.analysis.cloTitle")}
              </h4>
              <div className="space-y-3.5">
                {scoreEstimate.cloBreakdown && scoreEstimate.cloBreakdown.map((clo, cIdx) => (
                  <div key={cIdx} className="space-y-1.5 p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-800">{clo.cloCode}</span>
                      <span className="font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                        {clo.estimatedScore} / 5
                      </span>
                    </div>
                    {/* Score Bar */}
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-blue-500 h-full rounded-full"
                        style={{ width: `${(clo.estimatedScore / 5) * 100}%` }}
                      ></div>
                    </div>
                    {clo.rationale && (
                      <p className="text-[11px] text-slate-600 leading-relaxed pl-1 pt-1 border-l-2 border-slate-200">
                        {clo.rationale}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Feedback Panel */}
        <div className="lg:col-span-7 space-y-6">
          {/* Personalized Feedback */}
          <div id="analysis-suggestions-card" className="card hover:shadow-md transition-shadow">
            <div className="card-header flex items-center gap-2">
              <Activity className="text-indigo-500 w-5 h-5" />
              <h3 className="card-title">{t("student.analysis.feedbackTitle")}</h3>
            </div>

            {/* Overall Comment blockquote */}
            {feedback.overallComment && (
              <div className="relative p-5 rounded-2xl bg-slate-50 border border-slate-200/60 italic text-slate-700 text-sm leading-relaxed mb-6">
                <MessageSquare className="w-8 h-8 text-slate-200 absolute -top-3 -left-2 opacity-50" />
                <p className="relative z-10 pl-4">
                  "{feedback.overallComment}"
                </p>
              </div>
            )}

            <div className="space-y-5">
              {/* Strengths */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold text-emerald-700 bg-emerald-50/50 px-2.5 py-1 rounded border border-emerald-100 flex items-center gap-1.5 w-max">
                  <CheckCircle className="w-3.5 h-3.5" /> {t("student.analysis.strengths")}
                </h4>
                <ul className="space-y-1.5 pl-1.5">
                  {feedback.strengths && feedback.strengths.map((str, idx) => (
                    <li key={idx} className="text-xs text-slate-700 flex items-start gap-2 leading-relaxed">
                      <span className="text-emerald-500 font-bold mt-0.5">•</span>
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Weaknesses */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold text-amber-700 bg-amber-50/50 px-2.5 py-1 rounded border border-amber-100 flex items-center gap-1.5 w-max">
                  <AlertTriangle className="w-3.5 h-3.5" /> {t("student.analysis.weaknesses")}
                </h4>
                <ul className="space-y-1.5 pl-1.5">
                  {feedback.weaknesses && feedback.weaknesses.map((weak, idx) => (
                    <li key={idx} className="text-xs text-slate-700 flex items-start gap-2 leading-relaxed">
                      <span className="text-amber-500 font-bold mt-0.5">•</span>
                      <span>{weak}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Suggestions */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold text-blue-700 bg-blue-50/50 px-2.5 py-1 rounded border border-blue-100 flex items-center gap-1.5 w-max">
                  <Lightbulb className="w-3.5 h-3.5" /> {t("student.analysis.suggestions")}
                </h4>
                <ul className="space-y-1.5 pl-1.5">
                  {feedback.suggestions && feedback.suggestions.map((sug, idx) => (
                    <li key={idx} className="text-xs text-slate-700 flex items-start gap-2 leading-relaxed">
                      <span className="text-blue-500 font-bold mt-0.5">•</span>
                      <span>{sug}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Interactive Rating / Auto-Learning Block */}
          <div className="card hover:shadow-md transition-shadow">
            <div className="card-header flex items-center gap-2">
              <ThumbsUp className="text-indigo-600 w-5 h-5" />
              <h3 className="card-title">{t("student.analysis.ratingTitle")}</h3>
            </div>
            
            {feedbackSaved ? (
              <div className="text-center p-6 bg-emerald-50/30 rounded-2xl border border-emerald-100 space-y-3">
                <CheckCircle className="text-emerald-500 w-12 h-12 mx-auto" />
                <h4 className="font-extrabold text-slate-800">{t("student.analysis.ratingThanks")}</h4>
                <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                  {t("student.analysis.ratingThanksDesc")}
                </p>
                <div className="flex justify-center gap-1 mt-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={`w-5 h-5 ${s <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
                  ))}
                </div>
                {comment && (
                  <p className="text-xs text-slate-700 italic bg-white p-3 rounded-lg border border-slate-100/80 max-w-sm mx-auto">
                    "{comment}"
                  </p>
                )}
                <button 
                  onClick={() => setFeedbackSaved(false)} 
                  className="btn-outline btn-small mt-3 cursor-pointer"
                >
                  {t("student.analysis.changeRatingBtn")}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  {t("student.analysis.ratingDesc")}
                </p>
                
                {/* Stars container */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-700">{t("student.analysis.satisfactionLabel")}</span>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="focus:outline-none transition-transform hover:scale-110 cursor-pointer"
                    >
                      <Star 
                        className={`w-6 h-6 ${
                          star <= (hoverRating || rating) 
                            ? "fill-amber-400 text-amber-400" 
                            : "text-slate-300"
                        }`} 
                      />
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <label className="label text-xs">{t("student.analysis.commentLabel")}</label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows="3"
                    className="input text-xs"
                    placeholder={t("student.analysis.commentPlaceholder")}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button 
                    onClick={handleSendFeedback} 
                    disabled={submittingFeedback}
                    className="btn-primary btn-small flex items-center gap-1 bg-blue-600 hover:bg-blue-700 shadow-sm text-xs"
                  >
                    {submittingFeedback ? t("student.analysis.submitting") : t("student.analysis.submitFeedbackBtn")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubmissionAnalysisPage;
