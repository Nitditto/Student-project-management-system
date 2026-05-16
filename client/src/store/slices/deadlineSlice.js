import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { axiosInstance } from "../../lib/axios";
import { toast } from "react-toastify";

export const fetchStudentDeadlines = createAsyncThunk("deadline/fetchStudent", async (_, thunkAPI) => {
  try { const res = await axiosInstance.get('/deadline/student'); return res.data.data; }
  catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || 'Fetch failed'); }
});
export const fetchTeacherMatrix = createAsyncThunk("deadline/fetchMatrix", async (_, thunkAPI) => {
  try { const res = await axiosInstance.get('/deadline/teacher/matrix'); return res.data.data; }
  catch (e) { return thunkAPI.rejectWithValue(e.response?.data?.message || 'Fetch failed'); }
});
export const createDeadline = createAsyncThunk("deadline/create", async (data, thunkAPI) => {
  try { const res = await axiosInstance.post('/deadline', data); toast.success(res.data.message); return res.data.data.deadline; }
  catch (e) { toast.error(e.response?.data?.message || 'Create failed'); return thunkAPI.rejectWithValue(e.response?.data?.message); }
});
export const submitDeadline = createAsyncThunk("deadline/submit", async ({ deadlineId, file }, thunkAPI) => {
  try { const fd = new FormData(); fd.append('file', file); await axiosInstance.post(`/deadline/${deadlineId}/submit`, fd); toast.success('Nộp bài thành công'); return deadlineId; }
  catch (e) { toast.error(e.response?.data?.message || 'Submit failed'); return thunkAPI.rejectWithValue(e.response?.data?.message); }
});
export const unsubmitDeadline = createAsyncThunk("deadline/unsubmit", async (deadlineId, thunkAPI) => {
  try { await axiosInstance.post(`/deadline/${deadlineId}/unsubmit`); toast.success('Đã hủy nộp'); return deadlineId; }
  catch (e) { toast.error(e.response?.data?.message || 'Unsubmit failed'); return thunkAPI.rejectWithValue(e.response?.data?.message); }
});

const slice = createSlice({ name: 'deadline', initialState: { deadlines: [], matrix: { deadlines: [], rows: [] }, loading: false, error: null }, reducers: {}, extraReducers: (b) => {
  b.addCase(fetchStudentDeadlines.fulfilled, (s,a)=>{s.deadlines=a.payload.deadlines||[];})
   .addCase(fetchTeacherMatrix.fulfilled, (s,a)=>{s.matrix=a.payload||s.matrix;})
   .addMatcher((a)=>a.type.startsWith('deadline/')&&a.type.endsWith('/pending'), (s)=>{s.loading=true; s.error=null;})
   .addMatcher((a)=>a.type.startsWith('deadline/')&&a.type.endsWith('/rejected'), (s,a)=>{s.loading=false; s.error=a.payload;})
   .addMatcher((a)=>a.type.startsWith('deadline/')&&a.type.endsWith('/fulfilled'), (s)=>{s.loading=false;});
}});

export default slice.reducer;
