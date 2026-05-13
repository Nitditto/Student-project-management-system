const fs = require('fs');

const path = '/Users/abc/Documents/Projects/Student-project-management-system/client/src/pages/teacher/DefenseHubPage.jsx';
const lines = fs.readFileSync(path, 'utf8').split('\n');

const newLines = lines.slice(0, 812).concat([
  '      <div className="card max-w-6xl mx-auto">',
  '        <div className="card-header">',
  '          <h2 className="card-title">Section E. Comprehensive CLO Assessment (M1-M6)</h2>',
  '          <p className="card-subtitle">',
  '            Manage full project lifecycle rubrics including M1-M3 Supervision, M4 Report, M5 Council, and M6 Peer Evaluations.',
  '          </p>',
  '        </div>',
  '        <div className="space-y-6 mt-4">',
  '          {councils.map((council) => (',
  '            <div key={council._id} className="space-y-4">',
  '              <h3 className="font-semibold text-slate-800 border-b pb-2">{council.name}</h3>',
  '              {(council.projects || []).map((projectItem) => (',
  '                <div key={projectItem.project?._id} className="bg-slate-50 p-4 rounded-lg border border-slate-200">',
  '                  <p className="font-medium text-slate-800 mb-2">',
  '                    Project: {getProjectDisplayName(projectItem.project)}',
  '                  </p>',
  '                  <ComprehensiveAssessmentTab ',
  '                    projectId={projectItem.project?._id} ',
  '                    projectDisplayName={getProjectDisplayName(projectItem.project)}',
  '                  />',
  '                </div>',
  '              ))}',
  '            </div>',
  '          ))}',
  '          {councils.length === 0 && <p className="text-slate-500 italic">No council assignments found to assess.</p>}',
  '        </div>',
  '      </div>'
], lines.slice(989));

// Insert import at the top
const importLine = 'import ComprehensiveAssessmentTab from "./ComprehensiveAssessmentTab.jsx";';
newLines.splice(4, 0, importLine);

fs.writeFileSync(path, newLines.join('\n'));
console.log("Patched Section E successfully!");
