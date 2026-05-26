import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { axiosInstance } from "../../lib/axios";
import { toast } from "react-toastify";

export const createDeadline = createAsyncThunk(
  "createDeadline",
  async ({ id, data, isUpdate }, thunkAPI) => {
    try {
      const res = await axiosInstance.post(`/deadline/create-deadline/${id}`, data);
      
      const successMessage = isUpdate ? "Deadline updated successfully" : (res.data.message || "Deadline created");
      toast.success(successMessage);
      
      return res.data.data?.project || res.data.data || res.data;
    } catch (error) {
      toast.error(error.response.data.message || "Failed to create/update deadline");
      return thunkAPI.rejectWithValue(error.response.data.message);
    }
  }
);

const deadlineSlice = createSlice({
  name: "deadline",
  initialState: {
    deadlines: [],
    nearby: [],
    selected: null,
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(createDeadline.fulfilled, (state, action) => {
      const item = action.payload;
      if(item) state.deadlines.push(item);
    })
  },
});

export default deadlineSlice.reducer;
