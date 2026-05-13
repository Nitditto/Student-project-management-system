import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import { axiosInstance } from "../../lib/axios";

const PeerEvaluationForm = ({ projectId, targetStudent, onSaved }) => {
  const [clos, setClos] = useState([
    { cloCode: "CLO1", score1to5: "", comment: "" },
    { cloCode: "CLO2", score1to5: "", comment: "" },
    { cloCode: "CLO3", score1to5: "", comment: "" },
  ]); // Simplified CLOs for peer eval
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
      await axiosInstance.post(`/student/projects/${projectId}/peer-evaluations`, {
        targetStudentId: targetStudent._id,
        cloEntries,
        overallComment
      });
      toast.success(`Peer evaluation for ${targetStudent.name} submitted!`);
      if (onSaved) onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit evaluation");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-3 border border-slate-200 rounded overflow-hidden">
      <div className="bg-slate-50 p-3 font-medium text-slate-700 border-b border-slate-200">
        Evaluate: {targetStudent.name} ({targetStudent.email})
      </div>
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-100 text-slate-600">
          <tr>
            <th className="px-4 py-2 w-24">CLO</th>
            <th className="px-4 py-2 w-32">Score (1-5)</th>
            <th className="px-4 py-2">Comment</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {clos.map((item, index) => (
            <tr key={item.cloCode}>
              <td className="px-4 py-2 font-medium text-slate-800">{item.cloCode}</td>
              <td className="px-4 py-2">
                <input
                  type="number" min="1" max="5"
                  className="input py-1 px-2 w-full text-sm"
                  value={item.score1to5}
                  onChange={(e) => handleCloChange(index, "score1to5", e.target.value)}
                />
              </td>
              <td className="px-4 py-2">
                <input
                  type="text"
                  className="input py-1 px-3 w-full text-sm"
                  value={item.comment}
                  onChange={(e) => handleCloChange(index, "comment", e.target.value)}
                  placeholder="Optional note"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="p-3 bg-slate-50 border-t border-slate-200">
        <input
          type="text"
          className="input w-full text-sm mb-2"
          placeholder="Overall comment for this peer..."
          value={overallComment}
          onChange={(e) => setOverallComment(e.target.value)}
        />
        <button className="btn-primary text-sm py-1.5" onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Submitting..." : "Submit Peer Evaluation"}
        </button>
      </div>
    </div>
  );
};

export default function StudentAssessmentTab({ projectId, projectMembers }) {
  const { authUser } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [board, setBoard] = useState(null);

  const fetchBoard = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/student/projects/${projectId}/assessment-board`);
      setBoard(res.data.data);
    } catch (err) {
      if (err.response?.status !== 404) {
        toast.error("Failed to load assessment data");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchBoard();
  }, [projectId]);

  if (loading) return <div className="p-4 text-slate-500 animate-pulse">Loading CLO results...</div>;

  if (!board || !board.projectAssessment) {
    return (
      <div className="p-6 border border-dashed border-slate-300 rounded-lg bg-slate-50 text-center">
        <p className="text-slate-500">CLO Assessment tracking has not been initialized for this project yet.</p>
      </div>
    );
  }

  const { projectAssessment, studentAssessment } = board;
  const isFinalized = projectAssessment.teamPassStatus !== null && projectAssessment.teamPassStatus !== undefined;

  // Filter peers (everyone in projectMembers except authUser)
  const peers = (projectMembers || []).filter(m => m._id !== authUser._id);
  
  // Find which peers we already evaluated (we check studentAssessment of the peers? No, we can only see our own studentAssessment. 
  // Wait, to see who WE evaluated, we need to look at other students' peerSubmissionsReceived.
  // Actually, the easiest way for the frontend to know who we haven't evaluated yet is if the API returns it.
  // But we can just allow them to submit, the backend will block duplicates.

  return (
    <div className="space-y-6">
      <div className="card border-emerald-200">
        <div className="card-header">
          <h2 className="card-title text-emerald-800">Final CLO Result (M1-M6)</h2>
          <p className="card-subtitle">Your official final score calculated by the scoring engine.</p>
        </div>
        
        {isFinalized ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-emerald-50 rounded border border-emerald-200">
                <p className="text-sm text-emerald-700">Team Final Score</p>
                <p className="text-3xl font-bold text-emerald-800">{projectAssessment.teamFinalScore}</p>
              </div>
              <div className="p-4 bg-emerald-50 rounded border border-emerald-200">
                <p className="text-sm text-emerald-700">Status</p>
                <p className="text-2xl font-bold text-emerald-800">
                  {projectAssessment.teamPassStatus ? "PASSED" : "FAILED"}
                </p>
              </div>
            </div>
            
            <h4 className="font-medium text-slate-800 mt-4">CLO Achievements</h4>
            <div className="space-y-2">
              {(projectAssessment.cloResults || []).map((clo, idx) => (
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
            </div>
          </div>
        ) : (
          <p className="text-slate-500 italic">Scores are currently being calculated and will be available once the Chairman finalizes the assessment.</p>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">M6 - Peer Evaluation</h2>
          <p className="card-subtitle">Evaluate your teammates. This contributes to their personal official score.</p>
        </div>
        
        <div className="space-y-6">
          {peers.length === 0 ? (
            <p className="text-slate-500 text-sm">You are the only member in this project.</p>
          ) : (
            peers.map(peer => (
              <div key={peer._id}>
                <PeerEvaluationForm projectId={projectId} targetStudent={peer} onSaved={fetchBoard} />
              </div>
            ))
          )}
        </div>
        
        <div className="mt-8 border-t border-slate-100 pt-6">
          <h3 className="font-medium text-slate-800 mb-3">Feedback Received (Anonymous)</h3>
          {(studentAssessment?.peerSubmissionsReceived || []).length === 0 ? (
            <p className="text-sm text-slate-500">No peer evaluations received yet.</p>
          ) : (
            <div className="space-y-3">
              {studentAssessment.peerSubmissionsReceived.map((sub, idx) => (
                <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded">
                  <p className="text-sm font-medium text-slate-700 mb-2">From: Teammate #{idx + 1}</p>
                  <ul className="text-sm text-slate-600 mb-2 space-y-1">
                    {sub.cloEntries.map((c, i) => (
                      <li key={i}>{c.cloCode}: {c.score1to5}/5 - {c.comment}</li>
                    ))}
                  </ul>
                  {sub.comment && <p className="text-sm text-slate-500 italic">"{sub.comment}"</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
