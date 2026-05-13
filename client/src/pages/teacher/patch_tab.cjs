const fs = require('fs');

const path = '/Users/abc/Documents/Projects/Student-project-management-system/client/src/pages/teacher/ComprehensiveAssessmentTab.jsx';
let content = fs.readFileSync(path, 'utf8');

const rubricFormStr = `
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
        \`/teacher/projects/\${projectId}/assessments/milestones/\${milestoneCode}/submissions\`,
        { role, cloEntries, overallComment }
      );
      toast.success(\`\${milestoneCode} assessment submitted successfully!\`);
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
          {submitting ? "Submitting..." : \`Submit \${milestoneCode} Assessment\`}
        </button>
      </div>
    </div>
  );
};
`;

content = content.replace(
  'export default function ComprehensiveAssessmentTab({ projectId, projectDisplayName }) {',
  rubricFormStr + '\nexport default function ComprehensiveAssessmentTab({ projectId, projectDisplayName }) {'
);

content = content.replace(
  '<div className="p-8 border border-dashed border-slate-200 rounded text-center text-slate-400 bg-slate-50">\n              [Rubric CLO x Score 1-5 x Comment UI will be rendered here]\n            </div>',
  `<div className="space-y-8">
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
            </div>`
);

content = content.replace(
  '<div className="p-8 border border-dashed border-slate-200 rounded text-center text-slate-400 bg-slate-50">\n              [Reviewer Rubric UI]\n            </div>',
  '<RubricForm milestoneCode="M4" projectId={projectId} role="reviewer" onSaved={fetchAssessment} />'
);

content = content.replace(
  '<div className="p-8 border border-dashed border-slate-200 rounded text-center text-slate-400 bg-slate-50">\n              [Council Assessor List & Rubric Input]\n            </div>',
  '<RubricForm milestoneCode="M5" projectId={projectId} role="member" onSaved={fetchAssessment} />'
);

content = content.replace(
  '<div className="p-8 border border-dashed border-slate-200 rounded text-center text-slate-400 bg-slate-50">\n              [Peer Evaluation Summary]\n            </div>',
  '<RubricForm milestoneCode="M6" projectId={projectId} role="peer" onSaved={fetchAssessment} />'
);

fs.writeFileSync(path, content);
console.log('Patched ComprehensiveAssessmentTab.jsx with RubricForm successfully!');
