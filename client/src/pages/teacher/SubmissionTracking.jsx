import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchTeacherMatrix } from "../../store/slices/deadlineSlice";

export default function SubmissionTracking(){
  const dispatch=useDispatch(); const {matrix}=useSelector(s=>s.deadline);
  useEffect(()=>{dispatch(fetchTeacherMatrix())},[dispatch]);
  return <div><h1 className="text-2xl font-bold mb-3">Submission Tracking</h1><table className="min-w-full border"><thead><tr><th className="border p-2">Group</th>{matrix.deadlines.map(d=><th className="border p-2" key={d._id}>{d.title}</th>)}</tr></thead><tbody>{matrix.rows.map(r=><tr key={r.groupId}><td className="border p-2">{r.groupName}</td>{r.cells.map(c=><td key={c.deadlineId} className="border p-2 text-center">{c.submission? '✅':'❌'}</td>)}</tr>)}</tbody></table></div>
}
