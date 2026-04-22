import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { axiosInstance } from "../../lib/axios";
import { toast } from "react-toastify";

export const fetchCurrentRegistrationPeriod = createAsyncThunk(
  "registration/fetchCurrentRegistrationPeriod",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get("/registration/current");
      return res.data.data.registrationPeriod;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch current registration period"
      );
    }
  }
);

export const fetchAllRegistrationPeriods = createAsyncThunk(
  "registration/fetchAllRegistrationPeriods",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get("/registration/all");
      return res.data.data.registrationPeriods;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch registration periods"
      );
    }
  }
);

export const createRegistrationPeriod = createAsyncThunk(
  "registration/createRegistrationPeriod",
  async (data, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post(
        "/registration/create-registration-period",
        data
      );
      toast.success(res.data.message || "Registration period created successfully");
      return res.data.data.registrationPeriod;
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to create registration period"
      );
      return rejectWithValue(
        error.response?.data?.message || "Failed to create registration period"
      );
    }
  }
);

export const openRegistrationPeriod = createAsyncThunk(
  "registration/openRegistrationPeriod",
  async (id, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.put(
        `/registration/open-registration-period/${id}`
      );
      toast.success(res.data.message || "Registration period opened successfully");
      return res.data.data.registrationPeriod;
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to open registration period"
      );
      return rejectWithValue(
        error.response?.data?.message || "Failed to open registration period"
      );
    }
  }
);

export const closeRegistrationPeriod = createAsyncThunk(
  "registration/closeRegistrationPeriod",
  async (id, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.put(
        `/registration/close-registration-period/${id}`
      );
      toast.success(res.data.message || "Registration period closed successfully");
      return res.data.data.registrationPeriod;
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to close registration period"
      );
      return rejectWithValue(
        error.response?.data?.message || "Failed to close registration period"
      );
    }
  }
);

const registrationSlice = createSlice({
  name: "registration",
  initialState: {
    currentRegistrationPeriod: null,
    registrationPeriods: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearRegistrationError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCurrentRegistrationPeriod.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCurrentRegistrationPeriod.fulfilled, (state, action) => {
        state.loading = false;
        state.currentRegistrationPeriod = action.payload;
      })
      .addCase(fetchCurrentRegistrationPeriod.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(fetchAllRegistrationPeriods.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllRegistrationPeriods.fulfilled, (state, action) => {
        state.loading = false;
        state.registrationPeriods = action.payload || [];
      })
      .addCase(fetchAllRegistrationPeriods.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(createRegistrationPeriod.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createRegistrationPeriod.fulfilled, (state, action) => {
        state.loading = false;
        state.registrationPeriods.unshift(action.payload);
      })
      .addCase(createRegistrationPeriod.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(openRegistrationPeriod.fulfilled, (state, action) => {
        state.currentRegistrationPeriod = action.payload;
        state.registrationPeriods = state.registrationPeriods.map((item) =>
          item._id === action.payload._id ? action.payload : item
        );
      })

      .addCase(closeRegistrationPeriod.fulfilled, (state, action) => {
        state.currentRegistrationPeriod =
          state.currentRegistrationPeriod?._id === action.payload._id
            ? action.payload
            : state.currentRegistrationPeriod;

        state.registrationPeriods = state.registrationPeriods.map((item) =>
          item._id === action.payload._id ? action.payload : item
        );
      });
  },
});

export const { clearRegistrationError } = registrationSlice.actions;
export default registrationSlice.reducer;