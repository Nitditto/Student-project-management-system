import { useState } from "react";
import { useDispatch } from "react-redux";
import { createDeadline } from "../../store/slices/deadlineSlice";

export default function DeadlineManagement(){
  const dispatch=useDispatch();
  const [form,setForm]=useState({title:'',description:'',startDate:'',endDate:''});
  return <div className="space-y-3"><h1 className="text-2xl font-bold">Deadline Management</h1>
  <div className="grid gap-2 max-w-xl">{['title','description','startDate','endDate'].map((k)=><input key={k} type={k.includes('Date')?'date':'text'} placeholder={k} className="border p-2 rounded" value={form[k]} onChange={(e)=>setForm({...form,[k]:e.target.value})} />)}
  <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={()=>dispatch(createDeadline(form))}>Create New Deadline</button></div></div>
}
