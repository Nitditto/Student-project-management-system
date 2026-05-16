import { useState } from "react";

export default function DeadlineCard({ item, onSubmit, onUnsubmit }) {
  const [file, setFile] = useState(null);
  const isLocked = item.locked;
  const status = item.status;
  return <div className="border rounded p-4 bg-white">
    <h3 className="font-semibold">{item.title}</h3>
    <p className="text-sm text-slate-500">Hạn: {new Date(item.endDate).toLocaleString()}</p>
    {status === 'SUBMITTED' && item.submission && <p className="text-green-600 text-sm">Đã nộp: {item.submission.fileName}</p>}
    {isLocked ? <span className="text-red-500 text-sm">Locked</span> : status === 'SUBMITTED' ? (
      <button className="mt-2 px-3 py-1 border border-red-500 text-red-500 rounded" onClick={() => onUnsubmit(item._id)}>Hủy nộp</button>
    ) : (
      <div className="mt-2 flex gap-2 items-center"><input type="file" onChange={(e)=>setFile(e.target.files?.[0])} /><button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={()=>file&&onSubmit(item._id,file)}>Nộp bài</button></div>
    )}
  </div>;
}
