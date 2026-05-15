const RubricTable = ({
  entries = [],
  onChange,
  disabled = false,
  allowedClos = null,
  title = "Rubric CLO",
}) => {
  const visibleEntries = allowedClos
    ? entries.filter((entry) => allowedClos.includes(entry.cloCode))
    : entries;

  return (
    <div className="space-y-3">
      <p className="font-medium text-slate-700">{title}</p>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="px-3 py-2 text-left">CLO</th>
              <th className="px-3 py-2 text-left">Score (1-5)</th>
              <th className="px-3 py-2 text-left">Comment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {visibleEntries.map((entry) => (
              <tr key={entry.cloCode}>
                <td className="px-3 py-2 font-medium text-slate-700">{entry.cloCode}</td>
                <td className="px-3 py-2">
                  <input
                    className="input w-24"
                    type="number"
                    min="1"
                    max="5"
                    step="0.5"
                    disabled={disabled}
                    value={entry.score1to5}
                    onChange={(event) => onChange?.(entry.cloCode, "score1to5", event.target.value)}
                  />
                </td>
                <td className="px-3 py-2">
                  <textarea
                    className="input min-h-20"
                    disabled={disabled}
                    value={entry.comment}
                    onChange={(event) => onChange?.(entry.cloCode, "comment", event.target.value)}
                    placeholder={`Comment for ${entry.cloCode}`}
                  />
                </td>
              </tr>
            ))}
            {visibleEntries.length === 0 && (
              <tr>
                <td colSpan="3" className="px-3 py-4 text-center text-slate-500">
                  No CLO rows available for this milestone.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RubricTable;
