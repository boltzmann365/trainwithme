import React, { useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth, Profile } from "../App";

// Import all images
import economyImage from "../assets/economy.jpg";
import environmentImage from "../assets/environment.jpg";
import geographyImage from "../assets/Geography.jpg";
import historyImage from "../assets/history.jpg";
import polityImage from "../assets/polity.jpg";
import previousYearPaperImage from "../assets/previousyearpaper.jpg";
import scienceImage from "../assets/Science.jpeg";
import csatImage from "../assets/csat.jpg";
import currentAffairsImage from "../assets/currentaffairs.webp";
import prelimsBattlegroundImage from "../assets/prelimsbattleground.avif";

const UPSCPrelims = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  console.log("UpscPrelims: Rendered - location:", location.pathname);

  const SUBJECTS = [
    { path: "/polity", name: "Polity", color: "from-blue-500 to-blue-700", hoverColor: "from-blue-600 to-blue-800", image: polityImage },
    { path: "/history", name: "History", color: "from-purple-500 to-purple-700", hoverColor: "from-purple-600 to-purple-800", image: historyImage },
    { path: "/geography", name: "Geography", color: "from-green-500 to-green-700", hoverColor: "from-green-600 to-green-800", image: geographyImage },
    { path: "/science", name: "Science", color: "from-yellow-500 to-yellow-700", hoverColor: "from-yellow-600 to-yellow-800", image: scienceImage },
    { path: "/environment", name: "Environment", color: "from-teal-500 to-teal-700", hoverColor: "from-teal-600 to-teal-800", image: environmentImage },
    { path: "/economy", name: "Economy", color: "from-red-500 to-red-700", hoverColor: "from-red-600 to-red-800", image: economyImage },
    { path: "/csat", name: "CSAT", color: "from-gray-500 to-gray-700", hoverColor: "from-gray-600 to-gray-800", image: csatImage },
    { path: "/current-affairs", name: "Current Affairs", color: "from-indigo-500 to-indigo-700", hoverColor: "from-indigo-600 to-indigo-800", image: currentAffairsImage },
    { path: "/previous-year-papers", name: "Previous Year Papers", color: "from-cyan-500 to-cyan-700", hoverColor: "from-cyan-600 to-cyan-800", image: previousYearPaperImage },
  ];

  const handleGoBack = () => {
    console.log("UpscPrelims: handleGoBack - Navigating to UPSC.js (/)");
    navigate("/"); // Explicitly navigate to the root path (UPSC.js)
  };

  const handleLogin = () => {
    console.log("UpscPrelims: handleLogin - Navigating to /login");
    navigate("/login", { state: { from: "/upsc-prelims" } });
  };

  const handleSubjectClick = (path, action) => (e) => {
    console.log(`handleSubjectClick: path=${path}, user=${user ? user.uid : 'not logged in'}, action=${action ? 'present' : 'not present'}`);
    if (!user) {
      e.preventDefault();
      console.log("handleSubjectClick: User not logged in, redirecting to login");
      navigate("/login", { state: { from: path } });
    } else if (action) {
      e.preventDefault();
      console.log("handleSubjectClick: Executing action");
      action();
    } else {
      console.log("handleSubjectClick: Allowing Link navigation to proceed");
    }
  };

  useEffect(() => {
    console.log("UpscPrelims: user or location changed - user:", user, "location:", location);
  }, [user, location]);

  return (
    <div className="min-h-screen bg-gray-900 text-white font-poppins overscroll-none">
      <nav className="fixed top-0 left-0 w-full bg-[#1F2526]/80 backdrop-blur-md p-3 flex justify-between items-center shadow-lg z-50 h-16">
        <div className="flex items-center gap-0.5 max-w-[40%]">
          <button
            onClick={handleGoBack}
            className="text-zinc-300 hover:text-blue-400 transition-colors duration-300"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg sm:text-xl md:text-3xl font-extrabold tracking-tight text-blue-400">
            TrainWithMe
          </h1>
        </div>
        <div className="flex items-center justify-end gap-1">
          {user ? (
            <Profile />
          ) : (
            <button
              onClick={handleLogin}
              className="bg-blue-600 text-gray-50 px-3 py-2 rounded-md hover:bg-blue-700 transition-transform transform hover:scale-105 duration-300 text-xs sm:text-base"
            >
              Login
            </button>
          )}
        </div>
      </nav>

      <div className="pt-16 pb-10 px-4 sm:px-6 lg:px-8 w-full overflow-y-auto">
        <div
          className="fixed top-16 left-0 w-full bg-[#1F2526]/80 backdrop-blur-md p-3 flex items-center shadow-lg z-40 h-16"
          style={{
            backgroundImage: `url(${prelimsBattlegroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <div className="flex-grow"></div>
          <Link
            to="/battleground"
            className="flex items-center space-x-2 text-white hover:text-blue-400 transition-colors duration-300 focus:outline-none"
          >
            <span className="text-lg sm:text-xl font-bold">
              Enter Prelims Battleground
            </span>
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        <div className="pt-20 w-full">
          <div className="flex flex-row flex-wrap gap-4 sm:gap-6">
            {SUBJECTS.map((subject, index) => (
              <Link
                key={index}
                to={subject.path}
                onClick={handleSubjectClick(subject.path, subject.action)}
              >
                <div
                  className="relative w-[350px] sm:w-[300px] lg:w-[450px] h-48 sm:h-56 lg:h-64 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105 hover:shadow-2xl group cursor-pointer"
                  style={{
                    backgroundImage: subject.image ? `url(${subject.image})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                  }}
                >
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg group-hover:bg-opacity-40 transition-opacity duration-300"></div>
                  <div className="absolute left-0 top-0 bottom-0 w-4 sm:w-6 bg-gray-800 opacity-80 rounded-l-lg shadow-lg">
                    <div className="h-full w-1 bg-gray-700 opacity-90 absolute left-0 top-0"></div>
                  </div>
                  <div className="absolute left-4 sm:left-6 right-0 top-0 bottom-0 rounded-r-lg p-4 sm:p-6 flex flex-col justify-center items-center">
                    <span className="text-white text-center font-bold text-sm sm:text-lg lg:text-xl line-clamp-3 z-10">
                      {subject.name}
                    </span>
                  </div>
                  <div className="absolute inset-0 rounded-lg shadow-[inset_-2px_2px_8px_rgba(0,0,0,0.3)] group-hover:shadow-[inset_-4px_4px_12px_rgba(0,0,0,0.4)] transition-shadow duration-300"></div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UPSCPrelims;