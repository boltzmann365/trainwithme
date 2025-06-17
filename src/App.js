import React, { createContext, useState, useContext, useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import axios from "axios";
import UPSCPrelims from "./pages/UPSCPrelims";
import NewsCard from "./pages/subjects/NewsCard";
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
import OneLiner from "./pages/subjects/OneLiner";
import Profile from "./pages/subjects/Profile";
import Battleground from "./pages/subjects/Battleground";

const ArticleContext = createContext();
export const useArticles = () => useContext(ArticleContext);

const AuthContext = createContext();
const QandaContext = createContext();

export const useAuth = () => useContext(AuthContext);
export const useQanda = () => useContext(QandaContext);

export const ProfileDropdown = () => {
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

const QandaProvider = ({ children }) => {
  const [qandaPairs, setQandaPairs] = useState([]);
  const [mcqs, setMcqs] = useState([]);
  const [cachedMcqs, setCachedMcqs] = useState([]);
  const [isMcqsFetching, setIsMcqsFetching] = useState(false);
  const [isQandaFetching, setIsQandaFetching] = useState(false);
  const { user } = useAuth();
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";
  const ITEMS_PER_PAGE = 10;
  const isQandaFetchingRef = useRef(false);
  const shouldFetchQandaRef = useRef(true);
  const refreshTimeoutRef = useRef(null);

  const fetchQanda = async () => {
    if (!user || isQandaFetchingRef.current || !shouldFetchQandaRef.current) {
      return;
    }
    isQandaFetchingRef.current = true;
    setIsQandaFetching(true);
    try {
      const params = {
        userId: user.email.split("@")[0],
        page: 1,
        limit: ITEMS_PER_PAGE,
      };
      const response = await axios.get(`${API_URL}/user/get-qanda`, { params });
      let newPairs = response.data.qanda || [];
      for (let i = newPairs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newPairs[i], newPairs[j]] = [newPairs[j], newPairs[i]];
      }
      setQandaPairs(newPairs);
    } catch (err) {
      console.error("QandaProvider: Error fetching Q&A pairs:", err.message);
      setQandaPairs([]);
    } finally {
      isQandaFetchingRef.current = false;
      setIsQandaFetching(false);
      shouldFetchQandaRef.current = false;
    }
  };

  const refreshQanda = () => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    refreshTimeoutRef.current = setTimeout(() => {
      shouldFetchQandaRef.current = true;
      setQandaPairs([]);
      fetchQanda();
    }, 300);
  };

  const fetchNewInitialMCQs = async (userId) => {
    if (!userId) {
      console.error("fetchNewInitialMCQs: Missing userId");
      return;
    }
    setIsMcqsFetching(true);
    try {
      const subjects = ["Polity", "TamilnaduHistory", "Spectrum", "ArtAndCulture", "FundamentalGeography", "IndianGeography", "Science", "Environment", "Economy", "CurrentAffairs", "PreviousYearPapers"];
      const initialCount = 3;
      const questionsPerSubject = Math.ceil(initialCount / subjects.length);
      const initialMCQIds = [...mcqs.map(mcq => mcq.id?.toString()), ...cachedMcqs.map(mcq => mcq.id?.toString())];
      const books = subjects.map(subject => ({
        book: subject,
        requestedCount: questionsPerSubject
      }));
      const response = await fetch(`${API_URL}/user/get-multi-book-mcqs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ books, userId })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      const data = await response.json();
      if (!data.mcqs || data.mcqs.length === 0) {
        console.warn("No MCQs returned from batch endpoint", data.diagnostics || []);
        return;
      }
      const transformedMCQs = data.mcqs
        .filter(mcq => mcq.mcq && mcq.mcq.question && mcq.mcq.options && mcq.mcq.correctAnswer && mcq.mcq.explanation && !initialMCQIds.includes(mcq._id?.toString()))
        .map(mcq => ({
          question: Array.isArray(mcq.mcq.question) ? mcq.mcq.question : mcq.mcq.question.split("\n").filter(line => line.trim()),
          options: mcq.mcq.options,
          correctAnswer: mcq.mcq.correctAnswer,
          explanation: mcq.mcq.explanation,
          category: mcq.category || "",
          id: mcq._id,
        }));
      for (let i = transformedMCQs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [transformedMCQs[i], transformedMCQs[j]] = [transformedMCQs[j], transformedMCQs[i]];
      }
      setCachedMcqs(prev => [...prev, ...transformedMCQs.slice(0, initialCount)]);
    } catch (err) {
      console.error("QandaProvider: New initial MCQ fetch error:", err.message);
      setCachedMcqs([]);
    } finally {
      setIsMcqsFetching(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchQanda();
    } else {
      setQandaPairs([]);
      setMcqs([]);
      setCachedMcqs([]);
      setIsMcqsFetching(false);
      setIsQandaFetching(false);
      shouldFetchQandaRef.current = true;
    }
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [user]);

  useEffect(() => {
    if (shouldFetchQandaRef.current && user) {
      fetchQanda();
    }
  }, [shouldFetchQandaRef.current, user]);

  return (
    <QandaContext.Provider value={{ qandaPairs, setQandaPairs, fetchQanda, refreshQanda, mcqs, setMcqs, fetchNewInitialMCQs, isMcqsFetching, cachedMcqs, setCachedMcqs, isQandaFetching }}>
      {children}
    </QandaContext.Provider>
  );
};

// ========================================================
// START: MODIFICATION TO `ArticleProvider`
// Removed the prefetching logic. Now it just provides an empty
// state and a way to refresh, but the initial fetch is handled
// by the NewsCard component itself.
// ========================================================
const ArticleProvider = ({ children }) => {
  const [articles, setArticles] = useState([]);
  const [isArticlesFetching, setIsArticlesFetching] = useState(false);
  const [articlesError, setArticlesError] = useState(null);
  const { user } = useAuth();
  
  // The refreshArticles function is now a simple state updater that NewsCard can use
  // if you want to implement a manual refresh button later.
  const refreshArticles = () => {
    // This function can be built out later if a manual refresh is needed.
    // For now, it does nothing, as NewsCard fetches on its own mount.
    console.log("Refresh triggered, NewsCard will re-fetch on its next mount.");
  };

  return (
    <ArticleContext.Provider value={{ articles, setArticles, isArticlesFetching, setIsArticlesFetching, articlesError, setArticlesError, refreshArticles }}>
      {children}
    </ArticleContext.Provider>
  );
};
// ========================================================
// END: MODIFICATION TO `ArticleProvider`
// ========================================================


const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
  }, [user]);

  const loginOrSignupWithGoogle = async (token) => {
    const jwtDecode = (t) => {
      const base64Url = t.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(window.atob(base64));
    };
    const decoded = jwtDecode(token);
    const { email, sub: googleId } = decoded;

    try {
      const response = await fetch(`${API_URL}/user/get-profile?email=${email}`);

      if (response.ok) {
        const data = await response.json();
        const existingUser = { email, googleId, username: data.user.username, _id: data.user._id };
        setUser(existingUser);
        return { isNewUser: false };
      } else if (response.status === 404) {
        const newUser = { email, googleId, username: null };
        setUser(newUser);
        return { isNewUser: true };
      } else {
        throw new Error(`Server error: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Error during login/signup process:", error);
      return { error: error.message };
    }
  };

  const setUsername = async (username, setError) => {
    if (!user) return;
    
    const updatedUser = { ...user, username };
    setUser(updatedUser);

    try {
      const response = await fetch(`${API_URL}/save-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, username }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save username');
      }
      const userProfiles = JSON.parse(localStorage.getItem("userProfiles") || "{}");
      userProfiles[user.email] = username;
      localStorage.setItem("userProfiles", JSON.stringify(userProfiles));
    } catch (error) {
      console.error("Error saving username:", error);
      if (setError) setError(error.message);
      setUser(prev => ({ ...prev, username: null }));
    }
  };

  const logout = () => {
    if (window.AndroidBridge && typeof window.AndroidBridge.performGoogleSignOut === 'function') {
      console.log("Calling native performGoogleSignOut...");
      window.AndroidBridge.performGoogleSignOut();
    }
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("userProfiles");
    console.log("React state and localStorage cleared.");
  };

  return (
    <AuthContext.Provider value={{ user, loginOrSignupWithGoogle, setUsername, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

function App() {
  return (
    <GoogleOAuthProvider clientId="315117520479-orqa5uodhm438jd1n37g2q4kt2oc46ep.apps.googleusercontent.com">
      <AuthProvider>
        <ArticleProvider>
          <QandaProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Navigate to="/upsc-prelims" replace />} />
                <Route path="/upsc-prelims" element={<UPSCPrelims />} />
                <Route path="/login" element={<LoginSignup />} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/polity" element={<ProtectedRoute><Polity /></ProtectedRoute>} />
                <Route path="/laxmikanth" element={<ProtectedRoute><Laxmikanth /></ProtectedRoute>} />
                <Route path="/shankarIas" element={<ProtectedRoute><ShankarIas /></ProtectedRoute>} />
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
                <Route path="/history/artandculture" element={<ProtectedRoute><ArtAndCulture /></ProtectedRoute>} />
                <Route path="/science" element={<ProtectedRoute><Science /></ProtectedRoute>} />
                <Route path="/disha-ias-science" element={<ProtectedRoute><DishaIasScience /></ProtectedRoute>} />
                <Route path="/environment" element={<ProtectedRoute><Environment /></ProtectedRoute>} />
                <Route path="/economy" element={<ProtectedRoute><Economy /></ProtectedRoute>} />
                <Route path="/current-affairs" element={<ProtectedRoute><CurrentAffairs /></ProtectedRoute>} />
                <Route path="/vision-ias-dec-2024" element={<ProtectedRoute><VisionIasDec2024 /></ProtectedRoute>} />
                <Route path="/previous-year-papers" element={<ProtectedRoute><PreviousYearPapers /></ProtectedRoute>} />
                <Route path="/disha-ias-previous-year-paper" element={<ProtectedRoute><DishaIasPreviousYearPaper /></ProtectedRoute>} />
                <Route path="/oneliners" element={<ProtectedRoute><OneLiner /></ProtectedRoute>} />
                <Route path="/newscard" element={<ProtectedRoute><NewsCard /></ProtectedRoute>} />
                <Route path="/battleground" element={<ProtectedRoute><Battleground /></ProtectedRoute>} />
                <Route path="*" element={<Navigate to="/upsc-prelims" replace />} />
              </Routes>
            </BrowserRouter>
          </QandaProvider>
        </ArticleProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

const LoginSignup = () => {
  const { user, loginOrSignupWithGoogle, setUsername } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [usernameInput, setUsernameInputState] = useState("");
  const [error, setError] = useState("");

  const from = location.state?.from || "/upsc-prelims";

  const handleTokenReceived = async (token) => {
    if (!token) {
      setError("Received an empty token. Please try again.");
      return;
    }
    setError("");
    const result = await loginOrSignupWithGoogle(token);

    if (result.error) {
      setError(result.error);
    } else if (!result.isNewUser) {
      navigate(from, { replace: true });
    }
  };

  const handleWebGoogleSuccess = (credentialResponse) => {
    handleTokenReceived(credentialResponse.credential);
  };
  
  const handleGoogleFailure = () => {
    setError("Google authentication failed. Please try again.");
  };

  useEffect(() => {
    const handleNativeTokenEvent = (event) => {
      const { token } = event.detail;
      if (token) {
        console.log("Received token from native app.");
        handleTokenReceived(token);
      }
    };
    window.addEventListener('google-sign-in-success', handleNativeTokenEvent);
    
    return () => {
      window.removeEventListener('google-sign-in-success', handleNativeTokenEvent);
    };
  }, []);

  const handleUsernameSubmit = async (e) => {
    e.preventDefault();
    await setUsername(usernameInput, setError);
    navigate(from, { replace: true });
  };

  const NativeGoogleButton = () => (
    <button
      onClick={() => {
        if (window.AndroidBridge && typeof window.AndroidBridge.performGoogleSignIn === 'function') {
          console.log("Calling native performGoogleSignIn...");
          window.AndroidBridge.performGoogleSignIn();
        } else {
          setError("This app is not running in the correct mobile environment.");
          console.error("window.AndroidBridge.performGoogleSignIn not found!");
        }
      }}
      className="w-full bg-blue-600 p-3 rounded-lg hover:bg-blue-700 transition-colors duration-300 text-white font-semibold"
    >
      Continue with Google
    </button>
  );

  const WebGoogleButton = () => (
    <GoogleLogin
      onSuccess={handleWebGoogleSuccess}
      onError={handleGoogleFailure}
    />
  );

  if (user && !user.username) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <form onSubmit={handleUsernameSubmit} className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-2xl mb-4">Choose a Unique Username</h2>
          {error && <p className="text-red-400 mb-4">{error}</p>}
          <input
            type="text"
            value={usernameInput}
            onChange={(e) => setUsernameInputState(e.target.value)}
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
      <div className="bg-gray-800 p-6 rounded-lg text-center">
        <h2 className="text-2xl mb-4">Login or Sign Up</h2>
        {error && <p className="text-red-400 mb-4">{error}</p>}
        
        {window.AndroidBridge ? <NativeGoogleButton /> : <WebGoogleButton />}
      </div>
    </div>
  );
};

export default App;