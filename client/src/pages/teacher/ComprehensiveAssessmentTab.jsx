import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { axiosInstance } from "../../lib/axios";


const RubricForm = ({ milestoneCode, projectId, role, onSaved }) => {
  const [clos, setClos] = useState([
    { cloCode: "CLO1", score1to5: "", comment: "" },
    { cloCode: "CLO2", score1to5: "", comment: "" },
    { cloCode: "CLO3", score1to5: "", comment: "" },
    { cloCode: "CLO4", score1to5: "", comment: "" },
    { cloCode: "CLO5", score1to5: "", comment: "" },
    { cloCode: "CLO6", score1to5: "", comment: "" },
    { cloCode: "CLO7", score1to5: "", comment: "" },
  ]);
  const [overallComment, setOverallComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleCloChange = (index, field, value) => {
    const newClos = [...clos];
    newClos[index][field] = value;
    setClos(newClos);
  };

  const handleSubmit = async () => {
    const cloEntries = clos
      .filter((c) => c.score1to5 !== "")
      .map((c) => ({
        ...c,
        score1to5: Number(c.score1to5),
      }));

    if (cloEntries.length === 0) {
      toast.error("Please score at least one CLO");
      return;
    }

    try {
      setSubmitting(true);
      await axiosInstance.post(
        `/teacher/projects/${projectId}/assessments/milestones/${milestoneCode}/submissions`,
        { role, cloEntries, overallComment }
      );
      toast.success(`${milestoneCode} assessment submitted successfully!`);
      if (onSaved) onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit assessment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-4 border border-slate-200 rounded overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-100 text-slate-700">
          <tr>
            <th className="px-4 py-3 font-semibold w-24">CLO</th>
            <th className="px-4 py-3 font-semibold w-32">Score (1-5)</th>
            <th className="px-4 py-3 font-semibold">Specific Comment / Evidence</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {clos.map((item, index) => (
            <tr key={item.cloCode}>
              <td className="px-4 py-3 font-medium text-slate-800">{item.cloCode}</td>
              <td className="px-4 py-3">
                <input
                  type="number"
                  min="1"
                  max="5"
                  className="input py-1 px-2 w-full"
                  value={item.score1to5}
                  onChange={(e) => handleCloChange(index, "score1to5", e.target.value)}
                  placeholder="1-5"
                />
              </td>
              <td className="px-4 py-3">
                <input
                  type="text"
                  className="input py-1 px-3 w-full"
                  value={item.comment}
                  onChange={(e) => handleCloChange(index, "comment", e.target.value)}
                  placeholder="Optional evidence or note"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
        <div>
          <label className="text-sm font-medium text-slate-700">Overall Comment (Optional)</label>
          <textarea
            className="input mt-1 min-h-[80px]"
            placeholder="General feedback for this milestone..."
            value={overallComment}
            onChange={(e) => setOverallComment(e.target.value)}
          />
        </div>
        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? "Submitting..." : `Submit ${milestoneCode} Assessment`}
        </button>
      </div>
    </div>
  );
};

export default function ComprehensiveAssessmentTab({ projectId, projectDisplayName }) {
  const [activeTab, setActiveTab] = useState("M1-M3");
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(false);

  const tabs = [
    { id: "M1-M3", label: "M1-M3 Supervision" },
    { id: "M4", label: "M4 Report Review" },
    { id: "M5", label: "M5 Council Defense" },
    { id: "M6", label: "M6 Peer / ICS" },
    { id: "Summary", label: "CLO Summary" },
  ];

  const fetchAssessment = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/teacher/projects/${projectId}/assessments/summary`);
      setAssessment(res.data.data.assessment);
    } catch (err) {
      if (err.response?.status === 404) {
        setAssessment(null);
      } else {
        toast.error("Failed to load assessment data");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchAssessment();
  }, [projectId]);

  const handleInitialize = async () => {
    try {
      await axiosInstance.post(`/teacher/projects/${projectId}/assessments/initialize`);
      toast.success("Assessment initialized");
      fetchAssessment();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to initialize");
    }
  };

  if (loading) return <div className="p-4 text-slate-500 animate-pulse">Loading CLO assessment data...</div>;

  if (!assessment) {
    return (
      <div className="p-6 border border-dashed border-slate-300 rounded-lg bg-slate-50 flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-medium text-slate-800">No Assessment Record Found</h3>
          <p className="text-sm text-slate-500 max-w-md mt-1">
            The project <strong>{projectDisplayName}</strong> has not been initialized for M1-M6 CLO tracking yet. You must initialize it before grading.
          </p>
        </div>
        <button className="btn-primary" onClick={handleInitialize}>
          Initialize M1-M6 Engine
        </button>
      </div>
    );
  }

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white mt-4 shadow-sm">
      <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3 font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === tab.id 
                ? "border-b-2 border-emerald-600 text-emerald-700 bg-white" 
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="p-6">
        {activeTab === "M1-M3" && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-slate-800">M1-M3 Supervision Grading</h3>
            <p className="text-sm text-slate-500">Supervisors evaluate the project proposal (M1), midterm progress (M2), and logbook consistency (M3).</p>
            {/* Rubric Table Placeholder */}
            <div className="space-y-8">
              <div>
                <h4 className="font-semibold text-slate-700 mb-1">M1 - Proposal Phase</h4>
                <RubricForm milestoneCode="M1" projectId={projectId} role="supervisor" onSaved={fetchAssessment} />
              </div>
              <div>
                <h4 className="font-semibold text-slate-700 mb-1">M2 - Midterm Phase</h4>
                <RubricForm milestoneCode="M2" projectId={projectId} role="supervisor" onSaved={fetchAssessment} />
              </div>
              <div>
                <h4 className="font-semibold text-slate-700 mb-1">M3 - Final Polish / Logbook</h4>
                <RubricForm milestoneCode="M3" projectId={projectId} role="supervisor" onSaved={fetchAssessment} />
              </div>
            </div>
          </div>
        )}
        
        {activeTab === "M4" && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-slate-800">M4 Report Review</h3>
            <p className="text-sm text-slate-500">Both Supervisor and assigned Reviewer grade the final thesis report.</p>
            <RubricForm milestoneCode="M4" projectId={projectId} role="reviewer" onSaved={fetchAssessment} />
          </div>
        )}

        {activeTab === "M5" && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-slate-800">M5 Council Defense</h3>
            <p className="text-sm text-slate-500">Each Council Member inputs their CLO rubric. Chairman tracks completion and locks final scores.</p>
            <RubricForm milestoneCode="M5" projectId={projectId} role="member" onSaved={fetchAssessment} />
          </div>
        )}

        {activeTab === "M6" && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-slate-800">M6 Peer Evaluation</h3>
            <p className="text-sm text-slate-500">Students evaluate each other. Teacher reviews and approves.</p>
            <RubricForm milestoneCode="M6" projectId={projectId} role="peer" onSaved={fetchAssessment} />
          </div>
        )}

        {activeTab === "Summary" && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-slate-800">Final CLO Summary</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded border border-slate-200">
                <p className="text-sm text-slate-500">Calculated Final Score</p>
                <p className="text-3xl font-bold text-emerald-600">
                  {assessment.teamFinalScore !== null ? assessment.teamFinalScore : "--"}
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded border border-slate-200">
                <p className="text-sm text-slate-500">Pass Status</p>
                <p className={`text-xl font-bold ${assessment.teamPassStatus ? 'text-emerald-600' : assessment.teamPassStatus === false ? 'text-rose-600' : 'text-slate-400'}`}>
                  {assessment.teamPassStatus === true ? "PASSED" : assessment.teamPassStatus === false ? "FAILED" : "PENDING"}
                </p>
              </div>
            </div>
            
            <h4 className="font-medium text-slate-800 mt-6">CLO Matrix Completion</h4>
            <div className="space-y-2">
              {(assessment.cloResults || []).map((clo, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 border border-slate-100 rounded bg-white shadow-sm">
                  <span className="font-medium text-slate-700">{clo.cloCode}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-500">Score: {clo.score}</span>
                    <span className={`px-2 py-1 text-xs rounded-full ${clo.status === 'achieved' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {clo.status === 'achieved' ? 'Achieved' : 'Not Achieved'}
                    </span>
                  </div>
                </div>
              ))}
              {(!assessment.cloResults || assessment.cloResults.length === 0) && (
                <p className="text-sm text-slate-500 italic">CLO final scores will be calculated after Chairman finalization.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
