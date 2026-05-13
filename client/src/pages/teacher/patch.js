const fs = require('fs');
const file = '/Users/abc/Documents/Projects/Student-project-management-system/client/src/pages/teacher/DefenseHubPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// Replacement 1
content = content.replace(
  '  const [loading, setLoading] = useState(true);',
  '  const [currentStep, setCurrentStep] = useState(0);\n  const totalSteps = 6;\n  const [loading, setLoading] = useState(true);'
);

// Replacement 2
content = content.replace(
  `  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Defense Hub</h1>
        <p className="text-emerald-100">
          Manage defense schedule slots, attendance sessions, reviewer assignment, scoring, and final lock.
        </p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">How Teacher Uses This Page</h2>
          <p className="card-subtitle">
            Follow the steps in order so the flow is clear for both teacher and student.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          {[
            "Step 1. Create a defense schedule window with multiple available slots for students to pick.",
            "Step 2. Wait for the representative student to pick one slot, or run auto-assign after the deadline.",
            "Step 3. Before each meeting/reporting session, create an attendance session for one supervised project.",
            "Step 4. During or after the session, review leave requests and manually mark attendance if needed.",
            "Step 5. If you are in a council, assign reviewer, enter scores, export reviewer PDF, and lock final score.",
          ].map((item) => (
            <div key={item} className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
              {item}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="card space-y-4">`,
  `  return (
    <div className="space-y-6 relative pb-24">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg p-6 text-white flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-2">Defense Hub</h1>
          <p className="text-emerald-100">
            Manage defense schedule slots, attendance sessions, reviewer assignment, scoring, and final lock.
          </p>
        </div>
        <div className="text-emerald-50 bg-emerald-700/30 px-4 py-2 rounded-lg font-medium whitespace-nowrap border border-emerald-500/30 shadow-inner">
          Step {currentStep + 1} of {totalSteps}
        </div>
      </div>

      {currentStep === 0 && (
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">How Teacher Uses This Page</h2>
          <p className="card-subtitle">
            Follow the steps in order so the flow is clear for both teacher and student.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          {[
            "Step 1. Create a defense schedule window with multiple available slots for students to pick.",
            "Step 2. Wait for the representative student to pick one slot, or run auto-assign after the deadline.",
            "Step 3. Before each meeting/reporting session, create an attendance session for one supervised project.",
            "Step 4. During or after the session, review leave requests and manually mark attendance if needed.",
            "Step 5. If you are in a council, assign reviewer, enter scores, export reviewer PDF, and lock final score.",
          ].map((item) => (
            <div key={item} className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
              {item}
            </div>
          ))}
        </div>
      </div>
      )}

      {currentStep === 1 && (
        <div className="card space-y-4 max-w-4xl mx-auto">`
);

// Replacement 3 (Section B)
content = content.replace(
  `        <div className="card space-y-4">
          <div className="card-header">
            <h2 className="card-title">Section B. Create Attendance Session</h2>`,
  `      )}

      {currentStep === 2 && (
        <div className="card space-y-4 max-w-4xl mx-auto">
          <div className="card-header">
            <h2 className="card-title">Section B. Create Attendance Session</h2>`
);

// Replacement 4 (Section C)
content = content.replace(
  `        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Section C. Existing Defense Schedule Windows</h2>`,
  `        </div>
      )}

      {currentStep === 3 && (
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Section C. Existing Defense Schedule Windows</h2>`
);

// Replacement 5 (Section D)
content = content.replace(
  `      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Section D. Attendance Sessions and Leave Review</h2>`,
  `      </div>
      )}

      {currentStep === 4 && (
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Section D. Attendance Sessions and Leave Review</h2>`
);

// Replacement 6 (Section E)
content = content.replace(
  `      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Section E. Council Reviewer Assignment and Scoring</h2>`,
  `      </div>
      )}

      {currentStep === 5 && (
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Section E. Council Reviewer Assignment and Scoring</h2>`
);

// Replacement 7 (Arrows at end)
content = content.replace(
  `      </div>
    </div>
  );
};`,
  `      </div>
      )}

      <div className="fixed bottom-8 right-8 flex gap-3 z-50 bg-white/90 backdrop-blur-sm p-2 rounded-2xl shadow-xl border border-slate-200 transition-all hover:shadow-2xl">
        <button
          className="w-12 h-12 flex items-center justify-center rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 text-slate-700"
          onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
          disabled={currentStep === 0}
          title="Previous Step"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          className="w-12 h-12 flex items-center justify-center rounded-xl bg-emerald-600 text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-emerald-700 shadow-md"
          onClick={() => setCurrentStep((prev) => Math.min(totalSteps - 1, prev + 1))}
          disabled={currentStep === totalSteps - 1}
          title="Next Step"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
};`
);

fs.writeFileSync(file, content);
console.log("Patched successfully!");
