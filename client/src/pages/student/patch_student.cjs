const fs = require('fs');

const path = '/Users/abc/Documents/Projects/Student-project-management-system/client/src/pages/student/MyDefensePage.jsx';
let content = fs.readFileSync(path, 'utf8');

const importStr = `import StudentAssessmentTab from "./StudentAssessmentTab.jsx";\n`;

if (!content.includes(importStr)) {
  content = content.replace('import { axiosInstance } from "../../lib/axios";', 'import { axiosInstance } from "../../lib/axios";\n' + importStr);
}

const targetDivs = `      </div>\n    </div>\n  );\n};`;
const replacementDivs = `      </div>
      
      {project?._id && (
        <div className="mt-6">
          <StudentAssessmentTab projectId={project._id} projectMembers={project.members || []} />
        </div>
      )}
    </div>
  );
};`;

content = content.replace(targetDivs, replacementDivs);

fs.writeFileSync(path, content);
console.log('Patched MyDefensePage.jsx successfully!');
