import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../App";

const Economy = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const BOOKS = [
    { name: "Ramesh Singh Indian Economy Book", path: "/ramesh-singh" },
    // Add more books in the future, e.g., { name: "Another Book", path: "/another-book" }
  ];

  const handleGoBack = () => {
    console.log("Navigating back to previous page");
    navigate(-1);
  };

  const handleCardClick = (path) => (e) => {
    console.log(`handleCardClick: path=${path}, user=${user ? user.uid : 'not logged in'}`);
    if (!user) {
      e.preventDefault();
      console.log("handleCardClick: User not logged in, redirecting to login");
      navigate("/login", { state: { from: path } });
    } else {
      console.log("handleCardClick: Allowing Link navigation to proceed");
    }
  };

  return (
    <div className="h-screen bg-gray-900 text-white font-poppins overflow-hidden overscroll-none">
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
      </nav>

      <div className="pt-16 pb-10 px-4 sm:px-6 lg:px-8 w-full overflow-hidden">
        <div className="h-[calc(100vh-4rem)] w-full overflow-y-auto">
          {/* Enter Economy Battleground Button Section */}
          <div className="pt-8 pb-6 flex justify-center">
            <Link to="/economy-battleground" onClick={handleCardClick("/economy-battleground")}>
              <button
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-lg shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105 text-lg sm:text-xl font-semibold"
              >
                Enter Economy Battleground
              </button>
            </Link>
          </div>

          {/* Separator and Economy Books Header */}
          <div className="text-center mb-6">
            <p className="text-gray-400 text-lg sm:text-xl font-medium">OR</p>
            <h3 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-50 tracking-tight">
              Choose Your Economy Books
            </h3>
          </div>

          {/* Economy Books Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 px-2 sm:px-4 lg:px-8">
            {BOOKS.map((book, index) => (
              <Link
                key={index}
                to={book.path}
                onClick={handleCardClick(book.path)}
              >
                <div className="relative w-full h-48 sm:h-56 lg:h-64 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105 hover:shadow-2xl group cursor-pointer bg-gradient-to-br from-gray-800 to-gray-900">
                  {/* Book Spine Effect */}
                  <div className="absolute left-0 top-0 bottom-0 w-4 sm:w-6 bg-gray-800 opacity-80 rounded-l-lg shadow-lg">
                    <div className="h-full w-1 bg-gray-700 opacity-90 absolute left-0 top-0"></div>
                  </div>
                  {/* Book Cover */}
                  <div className="absolute left-4 sm:left-6 right-0 top-0 bottom-0 bg-gradient-to-br from-gray-800 to-gray-900 rounded-r-lg p-4 sm:p-6 flex flex-col justify-center items-center">
                    <span className="text-white text-center font-bold text-sm sm:text-lg lg:text-xl line-clamp-3">
                      {book.name}
                    </span>
                  </div>
                  {/* 3D Shadow Effect */}
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

export default Economy;