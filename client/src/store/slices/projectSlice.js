import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { axiosInstance } from "../../lib/axios";
import { toast } from "react-toastify";

export const downloadProjectFile = createAsyncThunk(
  "downloadProjectFile",
  async ({ projectId, fileId, name }, { thunkAPI }) => {
    try {
      const response = await axiosInstance.get(
        `/project/${projectId}/files/${fileId}/download`,
        {
          responseType: "blob",
        },
      );
      return { blob: response.data, projectId, fileId };
    } catch (error) {
      toast.error(error.response.data.message || "Failed to download file");
      return thunkAPI.rejectWithValue(error.response.data.message);
    }
  },
);

const projectSlice = createSlice({
  name: "project",
  initialState: {
    projects: [],
    selected: null,
  },
  reducers: {},
  extraReducers: (builder) => {},
});

export default projectSlice.reducer;
