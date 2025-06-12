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
  const API_URL = "https://new-backend-tx3z.onrender.com";
  const ITEMS_PER_PAGE = 10;
  const isMcqsFetchingRef = useRef(false);
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
      console.error("QandaProvider: Error prefetching Q&A pairs:", err.message);
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

  const batchFetchMCQs = async (subjects, requestedCountPerSubject, initialMCQIds, apiUrl) => {
    try {
      const books = subjects.map(subject => ({
        book: subject,
        requestedCount: requestedCountPerSubject
      }));
      const response = await fetch(`${apiUrl}/user/get-multi-book-mcqs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ books })
      });
      if (!response.ok) return [];
      const data = await response.json();
      if (!data.mcqs || data.mcqs.length === 0) return [];
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
      return transformedMCQs;
    } catch (err) {
      console.error("Error in batchFetchMCQs:", err);
      return [];
    }
  };

  const fetchInitialMCQs = async () => {
    if (isMcqsFetchingRef.current || !user) return;
    isMcqsFetchingRef.current = true;
    setIsMcqsFetching(true);
    try {
      const subjects = ["Polity", "TamilnaduHistory", "Spectrum", "ArtAndCulture", "FundamentalGeography", "IndianGeography", "Science", "Environment", "Economy", "CurrentAffairs", "PreviousYearPapers"];
      const initialCount = 3;
      const cacheCount = 6;
      const totalCount = initialCount + cacheCount;
      const questionsPerSubject = Math.ceil(totalCount / subjects.length);
      const initialMCQIds = [];
      let initialMCQs = await batchFetchMCQs(subjects, questionsPerSubject, initialMCQIds, API_URL);
      initialMCQIds.push(...initialMCQs.map(mcq => mcq.id.toString()));
      initialMCQs = initialMCQs.slice(0, totalCount);
      for (let i = initialMCQs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [initialMCQs[i], initialMCQs[j]] = [initialMCQs[j], initialMCQs[i]];
      }
      setMcqs(initialMCQs.slice(0, initialCount));
      setCachedMcqs(initialMCQs.slice(initialCount));
    } catch (err) {
      console.error("QandaProvider: Initial MCQ fetch error:", err);
      setMcqs([]);
      setCachedMcqs([]);
    } finally {
      isMcqsFetchingRef.current = false;
      setIsMcqsFetching(false);
    }
  };

  const fetchNewInitialMCQs = async () => {
    if (isMcqsFetchingRef.current || cachedMcqs.length >= 3) return;
    isMcqsFetchingRef.current = true;
    setIsMcqsFetching(true);
    try {
      const subjects = ["Polity", "TamilnaduHistory", "Spectrum", "ArtAndCulture", "FundamentalGeography", "IndianGeography", "Science", "Environment", "Economy", "CurrentAffairs", "PreviousYearPapers"];
      const initialCount = 3;
      const questionsPerSubject = Math.ceil(initialCount / subjects.length);
      const initialMCQIds = [...mcqs.map(mcq => mcq.id.toString()), ...cachedMcqs.map(mcq => mcq.id.toString())];
      let initialMCQs = await batchFetchMCQs(subjects, questionsPerSubject, initialMCQIds, API_URL);
      initialMCQs = initialMCQs.slice(0, initialCount);
      for (let i = initialMCQs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [initialMCQs[i], initialMCQs[j]] = [initialMCQs[j], initialMCQs[i]];
      }
      setCachedMcqs(prev => [...prev, ...initialMCQs]);
    } catch (err) {
      console.error("QandaProvider: New initial MCQ fetch error:", err);
      setCachedMcqs([]);
    } finally {
      isMcqsFetchingRef.current = false;
      setIsMcqsFetching(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchQanda();
      fetchInitialMCQs();
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

const ArticleProvider = ({ children }) => {
  const [articles, setArticles] = useState([]);
  const [isArticlesFetching, setIsArticlesFetching] = useState(true);
  const [articlesError, setArticlesError] = useState(null);
  const API_URL = "https://new-backend-tx3z.onrender.com";

  const prefetchArticles = async () => {
    setIsArticlesFetching(true);
    setArticlesError(null);
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const response = await axios.get(`${API_URL}/admin/get-current-affairs-articles`, {
        params: { startDate: thirtyDaysAgo.toISOString().split('T')[0], page: 1, limit: 10 },
      });
      const newArticles = response.data.articles || [];
      setArticles(newArticles);
    } catch (err) {
      console.error("ArticleProvider: Error prefetching articles:", err.message);
      setArticlesError(err.message);
      setArticles([]);
    } finally {
      setIsArticlesFetching(false);
    }
  };

  useEffect(() => {
    prefetchArticles();
  }, []);

  return (
    <ArticleContext.Provider value={{ articles, setArticles, isArticlesFetching, articlesError }}>
      {children}
    </ArticleContext.Provider>
  );
};

// ===================================================================
// START OF MODIFIED SECTION 1: AuthProvider
// ===================================================================
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const areUsersEqual = (prevUser, newUser) => {
    if (prevUser === newUser) return true;
    if (!prevUser || !newUser) return false;
    return prevUser.email === newUser.email && prevUser.googleId === newUser.googleId && prevUser.username === newUser.username;
  };

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
    }
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
  }, [user]);

  const saveUserToServer = async (email, username, setError) => {
    try {
      const response = await fetch("https://new-backend-tx3z.onrender.com/save-user", { // Corrected backend URL
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `${response.statusText}`);
      }
      await response.json();
      return true;
    } catch (error) {
      console.error("Error saving user to server:", error.message);
      if (setError) setError(error.message);
      return false;
    }
  };

  // MODIFIED FUNCTION: It now accepts the token string directly
  const signupWithGoogle = (token) => {
    const jwtDecode = (t) => {
      const base64Url = t.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      return JSON.parse(window.atob(base64));
    };
    const decoded = jwtDecode(token); // Use the token directly
    const email = decoded.email;
    const googleId = decoded.sub;
    const userProfiles = JSON.parse(localStorage.getItem("userProfiles") || "{}");
    const existingUsername = userProfiles[email];
    const newUser = { email, googleId, username: existingUsername || null };
    if (!areUsersEqual(user, newUser)) {
      setUser(newUser);
    }
    // This now correctly returns true if the user is new (needs a username)
    return !existingUsername;
  };

  const setUsername = (username, setError) => {
    setUser((prev) => {
      const updatedUser = { ...prev, username };
      const userProfiles = JSON.parse(localStorage.getItem("userProfiles") || "{}");
      userProfiles[prev.email] = username;
      localStorage.setItem("userProfiles", JSON.stringify(userProfiles));
      saveUserToServer(prev.email, username, setError);
      return updatedUser;
    });
  };

  const loginWithGoogle = (credentialResponse) => {
    // This function can be simplified now, but we'll leave it for compatibility
    // The main flow is handled by signupWithGoogle now
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
        setUser(updatedUser);
      }
      saveUserToServer(email, updatedUser.username);
      return true;
    } else {
      // This part now correctly calls the modified signup function
      signupWithGoogle(credentialResponse.credential); 
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
  };

  return (
    <AuthContext.Provider value={{ user, signupWithGoogle, setUsername, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
// ===================================================================
// END OF MODIFIED SECTION 1
// ===================================================================


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
                <Route path="/current-affairs" element={<ProtectedRoute><NewsCard /></ProtectedRoute>} />
                <Route path="/login" element={<LoginSignup />} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
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
                <Route path="/vision-ias-dec-2024" element={<ProtectedRoute><VisionIasDec2024 /></ProtectedRoute>} />
                <Route path="/previous-year-papers" element={<ProtectedRoute><PreviousYearPapers /></ProtectedRoute>} />
                <Route path="/disha-ias-previous-year-paper" element={<ProtectedRoute><DishaIasPreviousYearPaper /></ProtectedRoute>} />
                <Route path="/oneliners" element={<ProtectedRoute><OneLiner /></ProtectedRoute>} />
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

// ===================================================================
// START OF MODIFIED SECTION 2: LoginSignup Component
// ===================================================================
const LoginSignup = () => {
  const { user, signupWithGoogle, setUsername } = useAuth(); // Removed unused loginWithGoogle
  const navigate = useNavigate();
  const location = useLocation();
  const [usernameInput, setUsernameInputState] = useState(""); // Renamed to avoid conflict
  const [error, setError] = useState("");

  const from = location.state?.from || "/upsc-prelims";

  // This function handles success from the WEB version's GoogleLogin component
  const handleWebGoogleSuccess = (credentialResponse) => {
    const token = credentialResponse.credential;
    const isNewUser = signupWithGoogle(token);
    if (!isNewUser) {
      navigate(from, { replace: true });
    }
  };
  
  // This function handles success from the NATIVE Android app
  const handleNativeGoogleSuccess = (token) => {
    const isNewUser = signupWithGoogle(token);
    if (!isNewUser) {
      navigate(from, { replace: true });
    }
  };

  const handleGoogleFailure = () => {
    setError("Google authentication failed. Please try again.");
  };

  // This `useEffect` listens for the custom event from our native Android "bridge"
  useEffect(() => {
    const handleNativeToken = (event) => {
      const { token } = event.detail;
      if (token) {
        handleNativeGoogleSuccess(token);
      }
    };
    window.addEventListener('google-sign-in-success', handleNativeToken);
    
    // Cleanup the event listener when the component unmounts
    return () => {
      window.removeEventListener('google-sign-in-success', handleNativeToken);
    };
  }, []); // The empty array ensures this runs only once

  const handleUsernameSubmit = async (e) => {
    e.preventDefault();
    setUsername(usernameInput, setError);
    navigate(from, { replace: true });
  };

  // The new button for the Android app
  const NativeGoogleButton = () => (
    <button
      onClick={() => {
        if (window.AndroidBridge && typeof window.AndroidBridge.performGoogleSignIn === 'function') {
          window.AndroidBridge.performGoogleSignIn();
        } else {
          setError("Cannot find native sign-in function.");
        }
      }}
      className="w-full bg-blue-600 p-2 rounded hover:bg-blue-700 transition-colors duration-300 text-white"
    >
      Continue with Google
    </button>
  );

  // Your original GoogleLogin component for the web browser
  const WebGoogleButton = () => (
    <GoogleLogin
      onSuccess={handleWebGoogleSuccess}
      onError={handleGoogleFailure}
    />
  );

  // RENDER LOGIC:
  // If the user is new and needs to set a username, show the username form.
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

  // Otherwise, show the main Login/Sign Up page.
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="bg-gray-800 p-6 rounded-lg text-center">
        <h2 className="text-2xl mb-4">Login or Sign Up</h2>
        {error && <p className="text-red-400 mb-4">{error}</p>}
        
        {/* This is the key: Check if we are inside the app.
            If window.AndroidBridge exists, show the native button.
            Otherwise, show the standard web button. */}
        {window.AndroidBridge ? <NativeGoogleButton /> : <WebGoogleButton />}
      </div>
    </div>
  );
};
// ===================================================================
// END OF MODIFIED SECTION 2
// ===================================================================

export default App;
