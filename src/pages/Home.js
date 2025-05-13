import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, Profile } from "../App";

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleLogin = () => {
    navigate("/login", { state: { from: "/" } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-900 to-black text-white font-poppins">
      <nav className="fixed top-0 left-0 w-full bg-gray-900/80 backdrop-blur-md p-4 flex flex-col sm:flex-row justify-between items-center shadow-lg z-50">
        <div className="flex justify-between items-center w-full sm:w-auto">
          <div className="flex items-center gap-4">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-indigo-400">
              TrainWithMe
            </h1>
          </div>
          <button className="sm:hidden text-gray-300 focus:outline-none">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-xs sm:text-sm md:text-base italic text-gray-300 mt-2 sm:mt-0 text-center sm:text-right">
            "In the end, you have to believe in something, so why not believe in me?"
          </p>
          {user ? (
            <Profile />
          ) : (
            <button
              onClick={handleLogin}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors duration-300 mt-2 sm:mt-0"
            >
              Login
            </button>
          )}
        </div>
      </nav>

      <div className="flex flex-col items-center justify-center min-h-screen pt-20 pb-10 px-4 sm:px-6">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Prepare Smarter, Achieve Greater
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
            Your ultimate companion for UPSC and SSC preparation, powered by AI-driven insights and tailored training.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-6 sm:gap-12">
          <Link to="/upsc">
            <div className="relative w-56 h-56 sm:w-64 sm:h-64 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl shadow-lg flex items-center justify-center text-xl sm:text-2xl font-bold text-white transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:from-indigo-600 hover:to-indigo-800 group">
              <span className="relative z-10">UPSC</span>
              <div className="absolute inset-0 rounded-xl bg-indigo-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            </div>
          </Link>

          <div className="relative w-56 h-56 sm:w-64 sm:h-64 bg-gradient-to-br from-gray-600 to-gray-700 rounded-xl shadow-lg flex items-center justify-center text-xl sm:text-2xl font-bold text-gray-400 transition-all duration-300 transform opacity-60">
            <div className="text-center">
              <span>SSC</span>
              <p className="text-xs sm:text-sm mt-2 text-gray-500">Coming Soon</p>
            </div>
            <div className="absolute inset-0 rounded-xl bg-gray-500 opacity-0 transition-opacity duration-300"></div>
          </div>
        </div>
      </div>

      <footer className="w-full py-3 sm:py-4 bg-gray-900/50 text-center text-gray-400 text-xs sm:text-sm">
        <p>© 2025 TrainWithMe. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Home;