import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchStudentDeadlines, submitDeadline, unsubmitDeadline } from "../../store/slices/deadlineSlice";
import DeadlineCard from "../../components/deadlines/DeadlineCard";

export default function DeadlinesPage() {
  const dispatch = useDispatch();
  const { deadlines } = useSelector((s) => s.deadline);
  useEffect(()=>{dispatch(fetchStudentDeadlines())},[dispatch]);
  const submitted = deadlines.filter((d)=>d.status==='SUBMITTED').length;
  const total = deadlines.length || 1;
  return <div className="space-y-4"><h1 className="text-2xl font-bold">My Deadlines</h1><p>Hoàn thành {submitted}/{deadlines.length} ({Math.round(submitted*100/total)}%)</p>
  <div className="grid gap-3">{deadlines.map((d)=><DeadlineCard key={d._id} item={d} onSubmit={(id,file)=>dispatch(submitDeadline({deadlineId:id,file})).then(()=>dispatch(fetchStudentDeadlines()))} onUnsubmit={(id)=>dispatch(unsubmitDeadline(id)).then(()=>dispatch(fetchStudentDeadlines()))} />)}</div></div>;
}
