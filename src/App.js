import React, { createContext, useState, useContext, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import UPSCPrelims from "./pages/UPSCPrelims";
import Polity from "./pages/subjects/Polity";
import CSAT from "./pages/subjects/CSAT";
import Geography from "./pages/subjects/Geography";
import History from "./pages/subjects/History";
import Science from "./pages/subjects/Science";
import Environment from "./pages/subjects/Environment";
import Economy from "./pages/subjects/Economy";
import CurrentAffairs from "./pages/subjects/CurrentAffairs";
import PreviousYearPapers from "./pages/subjects/PreviousYearPapers";
import TamilnaduHistory from "./pages/subjects/TamilnaduHistory";
import Spectrum from "./pages/subjects/Spectrum";
import ArtAndCulture from "./pages/subjects/ArtAndCulture";
import FundamentalGeography from "./pages/subjects/FundamentalGeography";
import IndianGeography from "./pages/subjects/IndianGeography";
import Atlas from "./pages/subjects/Atlas";
import Laxmikanth from "./pages/subjects/Laxmikanth";
import ShankarIas from "./pages/subjects/ShankarIas";
import RameshSingh from "./pages/subjects/RameshSingh";
import DishaCSAT from "./pages/subjects/DishaCSAT";
import VisionIasDec2024 from "./pages/subjects/VisionIasDec2024";
import DishaIasPreviousYearPaper from "./pages/subjects/DishaIasPreviousYearPaper";
import DishaIasScience from "./pages/subjects/DishaIasScience";
import Battleground from "./pages/subjects/Battleground";
import NewsCard from "./pages/subjects/NewsCard";
import OneLiner from "./pages/subjects/OneLiner";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const areUsersEqual = (prevUser, newUser) => {
    if (prevUser === newUser) return true;
    if (!prevUser || !newUser) return false;
    return (
      prevUser.email === newUser.email &&
      prevUser.googleId === newUser.googleId &&
      prevUser.username === newUser.username
    );
  };

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      console.log("AuthProvider: Loading user from localStorage:", parsedUser);
      setUser(parsedUser);
    }
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
    console.log("AuthProvider: user state updated:", user);
  }, [user]);

  const saveUserToServer = async (email, username, setError) => {
    try {
      const response = await fetch("https://trainwithme-backend.onrender.com/save-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, username }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to save user: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("User saved to server:", data);
      return true;
    } catch (error) {
      console.error("Error saving user to server:", error.message);
      if (setError) {
        setError(error.message);
      }
      return false;
    }
  };

  const signupWithGoogle = (credentialResponse) => {
    const jwtDecode = (token) => {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      return JSON.parse(window.atob(base64));
    };
    const decoded = jwtDecode(credentialResponse.credential);
    const email = decoded.email;
    const googleId = decoded.sub;

    const userProfiles = JSON.parse(localStorage.getItem("userProfiles") || "{}");
    const existingUsername = userProfiles[email];

    const newUser = {
      email,
      googleId,
      username: existingUsername || null,
    };

    if (!areUsersEqual(user, newUser)) {
      console.log("AuthProvider: Setting new user from signupWithGoogle:", newUser);
      setUser(newUser);
    } else {
      console.log("AuthProvider: User unchanged in signupWithGoogle, skipping setUser");
    }

    return !existingUsername;
  };

  const setUsername = (username, setError) => {
    setUser((prev) => {
      const updatedUser = { ...prev, username };
      const userProfiles = JSON.parse(localStorage.getItem("userProfiles") || "{}");
      userProfiles[prev.email] = username;
      localStorage.setItem("userProfiles", JSON.stringify(userProfiles));

      saveUserToServer(prev.email, username, setError);

      console.log("AuthProvider: Setting username, updated user:", updatedUser);
      return updatedUser;
    });
  };

  const loginWithGoogle = (credentialResponse) => {
    const jwtDecode = (token) => {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      return JSON.parse(window.atob(base64));
    };
    const decoded = jwtDecode(credentialResponse.credential);
    const email = decoded.email;
    const googleId = decoded.sub;

    const savedUser = JSON.parse(localStorage.getItem("user"));
    const userProfiles = JSON.parse(localStorage.getItem("userProfiles") || "{}");
    const existingUsername = userProfiles[email];

    if (savedUser && savedUser.googleId === googleId) {
      const updatedUser = { ...savedUser, username: existingUsername || savedUser.username };
      if (!areUsersEqual(user, updatedUser)) {
        console.log("AuthProvider: Setting user from loginWithGoogle:", updatedUser);
        setUser(updatedUser);
      } else {
        console.log("AuthProvider: User unchanged in loginWithGoogle, skipping setUser");
      }

      saveUserToServer(email, updatedUser.username);

      return true;
    } else {
      signupWithGoogle(credentialResponse);
      return false;
    }
  };

  const logout = () => {
    console.log("AuthProvider: Logging out user");
    setUser(null);
    localStorage.removeItem("user");
  };

  return (
    <AuthContext.Provider value={{ user, signupWithGoogle, setUsername, loginWithGoogle, logout }}>
      <GoogleOAuthProvider clientId="315117520479-orqa5uodhm438jd1n37g2q4kt2oc46ep.apps.googleusercontent.com">
        {children}
      </GoogleOAuthProvider>
    </AuthContext.Provider>
  );
};

export const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    setShowProfile(false);
  };

  return (
    <div className="relative">
      <div
        className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center cursor-pointer"
        onClick={() => setShowProfile(!showProfile)}
      >
        <span className="text-xl">{user.username ? user.username[0].toUpperCase() : user.email[0].toUpperCase()}</span>
      </div>
      {showProfile && (
        <div className="absolute top-12 right-0 bg-gray-800 p-4 rounded-lg shadow-lg z-100">
          <p>Email: {user.email}</p>
          <p>Username: {user.username || "Not set"}</p>
          <button
            onClick={handleLogout}
            className="mt-2 text-blue-400 hover:text-blue-500 transition-colors duration-300"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  return user ? children : <Navigate to="/login" state={{ from: location.pathname }} />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<UPSCPrelims />} />
          <Route path="/upsc-prelims" element={<Navigate to="/" replace />} />
          <Route path="/news" element={<ProtectedRoute><NewsCard /></ProtectedRoute>} />
          <Route path="/battleground" element={<ProtectedRoute><Battleground /></ProtectedRoute>} />
          <Route path="/login" element={<LoginSignup />} />
          <Route path="/polity" element={<ProtectedRoute><Polity /></ProtectedRoute>} />
          <Route path="/laxmikanth" element={<ProtectedRoute><Laxmikanth /></ProtectedRoute>} />
          <Route path="/shankelias" element={<ProtectedRoute><ShankarIas /></ProtectedRoute>} />
          <Route path="/ramesh-singh" element={<ProtectedRoute><RameshSingh /></ProtectedRoute>} />
          <Route path="/csat" element={<ProtectedRoute><CSAT /></ProtectedRoute>} />
          <Route path="/disha-csat" element={<ProtectedRoute><DishaCSAT /></ProtectedRoute>} />
          <Route path="/geography" element={<ProtectedRoute><Geography /></ProtectedRoute>} />
          <Route path="/geography/fundamental-geography" element={<ProtectedRoute><FundamentalGeography /></ProtectedRoute>} />
          <Route path="/geography/indian-geography" element={<ProtectedRoute><IndianGeography /></ProtectedRoute>} />
          <Route path="/geography/atlas" element={<ProtectedRoute><Atlas /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
          <Route path="/history/tamilnadu" element={<ProtectedRoute><TamilnaduHistory /></ProtectedRoute>} />
          <Route path="/history/spectrum" element={<ProtectedRoute><Spectrum /></ProtectedRoute>} />
          <Route path="/history/artifacts" element={<ProtectedRoute><ArtAndCulture /></ProtectedRoute>} />
          <Route path="/science" element={<ProtectedRoute><Science /></ProtectedRoute>} />
          <Route path="/disha-ias-science" element={<ProtectedRoute><DishaIasScience /></ProtectedRoute>} />
          <Route path="/environment" element={<ProtectedRoute><Environment /></ProtectedRoute>} />
          <Route path="/economy" element={<ProtectedRoute><Economy /></ProtectedRoute>} />
          <Route path="/current-affairs" element={<ProtectedRoute><CurrentAffairs /></ProtectedRoute>} />
          <Route path="/vision-ias-dec-2024" element={<ProtectedRoute><VisionIasDec2024 /></ProtectedRoute>} />
          <Route path="/previous-year-papers" element={<ProtectedRoute><PreviousYearPapers /></ProtectedRoute>} />
          <Route path="/disha-ias-previous-year-paper" element={<ProtectedRoute><DishaIasPreviousYearPaper /></ProtectedRoute>} />
          <Route path="/oneliners" element={<ProtectedRoute><OneLiner /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

const LoginSignup = () => {
  const { user, signupWithGoogle, loginWithGoogle, setUsername } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsernameInput] = useState("");
  const [error, setError] = useState("");

  const from = location.state?.from || "/";

  const handleGoogleSuccess = (credentialResponse) => {
    const isNewUser = signupWithGoogle(credentialResponse);
    if (!isNewUser) {
      navigate(from, { replace: true });
    }
  };

  const handleGoogleFailure = () => {
    setError("Google authentication failed");
  };

  const handleUsernameSubmit = async (e) => {
    e.preventDefault();
    setUsername(username, setError);
    navigate(from, { replace: true });
  };

  if (user && !user.username) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <form onSubmit={handleUsernameSubmit} className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-2xl mb-4">Choose a Unique Username</h2>
          {error && <p className="text-red-400 mb-4">{error}</p>}
          <input
            type="text"
            value={username}
            onChange={(e) => setUsernameInput(e.target.value)}
            placeholder="Enter unique username"
            className="w-full p-2 mb-4 bg-gray-700 rounded text-white"
            required
          />
          <button type="submit" className="w-full bg-blue-600 p-2 rounded hover:bg-blue-700 transition-colors duration-300">
            Set Username
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-2xl mb-4">Login or Sign Up</h2>
        {error && <p className="text-red-400 mb-4">{error}</p>}
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleFailure}
          buttonText="Continue with Google"
          className="w-full bg-white text-black p-2 rounded hover:bg-gray-200"
        />
      </div>
    </div>
  );
};

export default App;