import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { login } from "../../store/slices/authSlice";
import { BookOpen, ChartNoAxesColumn, Loader } from "lucide-react";

const LoginPage = () => {
  const dispatch = useDispatch();

  const { isLoggingIn, isSigningUp, authUser } = useSelector((state) => state.auth);
  const {isLogin, setIsLogin} = useState(true);

  const [formData, setFormData] = useState({
    name: "", // add name for form data
    email: "",
    password: "",
    role: "Student",
  });

  const [errors, setErrors] = useState({});

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    // Make sure name is added
    if(!isLogin && !formData.name) {
      newErrors.name = "Name is required";
    }
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters long";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    // send data to login for authentication
    if(isLogin){
      const data = {
        email: formData.email,
        password: formData.password,
        role: formData.role,

      };
      dispatch(login(data));
    }else{
      const data = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      }
      dispatch(registerUser(data)); // register new user
    }
    // const data = new FormData();
    // data.append("email", formData.email);
    // data.append("password", formData.password);
    // data.append("role", formData.role);

    // dispatch(login(data));
  };

  useEffect(() => {
    if (authUser) {
      switch (formData.role) {
        case "Student":
          navigate("/student");
          break;
        case "Teacher":
          navigate("/teacher");
          break;
        case "Admin":
          navigate("/admin");
          break;
        default:
          navigate("/login");
      }
    }
  }, [authUser]);

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full">
          {/* {Header} */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 rounded-full mb-4">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">
              Educational Project Management
            </h1>
            <p className="text-slate-600 mt-2">
              {isLogin ? "Sign in your account to continue" : "Create an account"}
            </p>
          </div>

          {/* Login Form  */}
          <div className="card shadow-lg p-8 bg-white rounded-lg">
            <form onSubmit={handleSubmit} className="space-y-6">
              {errors.general && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{errors.general}</p>
                </div>
              )}

              {/* Role Selection  */}
              {/* Name field for Sign up */}
              {
                !isLogin && (
                  <div className="">
                    <label htmlFor="" className="label block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                  
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`input w-full px-3 py-2 border rounded-md ${errors.name ? "border-red-500" : "border-gray-300"} `}
                    placeholder="Enter your full name"
                  />
                  {errors.name && (
                    <p className="text-sm text-red-600 mt-1">{errors.name}</p>
                  )}
                  </div>
                )
              }
              <div className="">
                <label htmlFor="" className="label block text-sm font-medium text-gray-700 mb-1">
                  Select Role
                </label>
                <select
                  name="role"
                  id=""
                  className="input w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={formData.role}
                  onChange={handleChange}
                >
                  <option value="Student">Student</option>
                  <option value="Teacher">Teacher</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>

              {/* Email Address  */}
              <div className="">
                <label htmlFor="" className="label block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`input w-full px-3 py-2 border rounded-md ${errors.email ? "border-red-500" : "border-gray-300"}`}
                  placeholder="Enter your email"
                />
                {errors.email && (
                  <p className="text-sm text-red-600 mt-1">{errors.email}</p>
                )}
              </div>

              {/* Password Address  */}
              <div className="">
                <label htmlFor="" className="label">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`input w-full px-2 py-2 border rounded-md ${error.password ? "border-red-500" : "border-gray-300"}`}
                  placeholder="Enter your password"
                />
                {errors.password && (
                  <p className="text-sm text-red-600 mt-1">{errors.password}</p>
                )}
              </div>

              {/* Forgot Password Link  */}
              {isLogin && (<div className="text-right">
                <Link
                  to={"/forgot-password"}
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  Forgot your password?
                </Link>
              </div>
              )}

              {/* Submit Button  */}
              <button
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                type="submit"
                disabled={isLoggingIn || isSigningUp}
              >
                {isLoggingIn ? (
                  <div className="flex justify-center items-center">
                    <Loader className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                    {isLogin ? "Signing in..." : "Signing up.."}
                  </div>
                ) : (
                  isLogin ? "Sign In" : "Sign up"
                )}
              </button>
            </form>

            {/* Sign up */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
              {isLogin ? "Don't have an accoynt" : "Already have an account"}
              <button
               type="button"
               onClick={() => {
                setIsLogin(!isLogin);
                setErrors({});
               }}
               className="text-blue-600 hover:text-blue-600 font-medium"
              >
                {isLogin ? "Sign up here" : "Sign in here"}
              </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;
