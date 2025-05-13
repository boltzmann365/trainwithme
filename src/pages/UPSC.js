import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, Profile } from "../App";

const UPSC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleLogin = () => {
    navigate("/login", { state: { from: "/" } }); // Updated "from" to "/" since UPSC.js is now the homepage
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-800 via-gray-900 to-black text-white font-poppins">
      <nav className="fixed top-0 left-0 w-full bg-gray-900/80 backdrop-blur-md p-3 flex flex-row justify-between items-center shadow-lg z-50 h-16">
        <div className="flex items-center gap-0.5">
          <h1 className="text-lg sm:text-xl md:text-3xl font-extrabold tracking-tight text-indigo-400">
            TrainWithMe
          </h1>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <Profile />
          ) : (
            <button
              onClick={handleLogin}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors duration-300"
            >
              Login
            </button>
          )}
        </div>
      </nav>

      <div className="flex-1">
        <div className="fixed top-16 left-0 w-full bg-gradient-to-br from-gray-800 to-gray-900 p-3 sm:p-4 shadow-md z-40">
          <p className="text-center text-gray-200 text-sm sm:text-base md:text-lg leading-relaxed max-w-3xl mx-auto">
            In their own  comfort everyone is a warrior but the true warrior is one who proves his worth in <span className="text-indigo-400 font-bold">BattleGround</span> - I am an <span className="text-indigo-400 font-bold">AI</span> trained on extensive <span className="text-indigo-400 font-bold">UPSC material</span>, let me help you train for your <span className="text-indigo-400 font-bold">UPSC Battle</span> with my accurate and quality-based <span className="text-indigo-400 font-bold">MCQ</span> specifically designed keeping <span className="text-indigo-400 font-bold">UPSC structure</span> in mind. Let's start your Training with <span className="text-indigo-400 font-bold">TrainWithMe</span>.
          </p>
        </div>

        <div className="flex items-center justify-center h-full pt-72 sm:pt-92 px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row justify-center items-center gap-6 sm:gap-12">
            <Link to="/upsc-prelims">
              <div className="relative w-48 h-48 sm:w-56 sm:h-56 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl shadow-lg flex items-center justify-center text-lg sm:text-xl font-bold text-white transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:from-indigo-600 hover:to-indigo-800 group">
                <span className="relative z-10">UPSC Prelims</span>
                <div className="absolute inset-0 rounded-xl bg-indigo-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
              </div>
            </Link>

            <div className="relative w-48 h-48 sm:w-56 sm:h-56 bg-gradient-to-br from-gray-600 to-gray-700 rounded-xl shadow-lg flex items-center justify-center text-lg sm:text-xl font-bold text-gray-400 transition-all duration-300 transform opacity-60">
              <div className="text-center">
                <span>UPSC Mains</span>
                <p className="text-xs sm:text-sm mt-2 text-gray-500">Coming Soon</p>
              </div>
              <div className="absolute inset-0 rounded-xl bg-gray-500 opacity-0 transition-opacity duration-300"></div>
            </div>
          </div>
        </div>
      </div>

      <footer className="w-full py-3 sm:py-4 bg-gray-900/50 text-center text-gray-300 text-xs sm:text-sm">
        <p>For any complaint/suggestion/issue kindly WhatsApp or call - 8168143035</p>
      </footer>
    </div>
  );
};

export default UPSC;