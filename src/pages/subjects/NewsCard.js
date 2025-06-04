import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

const NewsCard = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const limit = 10;
  const scrollContainerRef = useRef(null);

  const API_URL = process.env.REACT_APP_API_URL || "https://new-backend-tx3z.onrender.com";

  useEffect(() => {
    const fetchArticles = async () => {
      if (!hasMore) return;
      try {
        setLoading(true);
        setError(null);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const response = await axios.get(`${API_URL}/admin/get-current-affairs-articles`, {
          params: { startDate: thirtyDaysAgo.toISOString().split('T')[0], page, limit }
        });
        const newArticles = response.data.articles || [];
        setArticles(prev => page === 1 ? newArticles : [...prev, ...newArticles]);
        setHasMore(newArticles.length === limit);
        setLoading(false);
        console.log(`NewsCard: Fetched ${newArticles.length} articles for page ${page}`);
      } catch (err) {
        console.error("NewsCard: Error fetching articles:", err.message, err.response?.data, err.response?.status);
        if (err.response) {
          setError(`Failed to load articles: ${err.response.data?.error || "Server error"} (Status: ${err.response.status})`);
        } else if (err.request) {
          setError("Failed to load articles: Network error, possibly due to server unavailability.");
        } else {
          setError("Failed to load articles: An unexpected error occurred.");
        }
        setLoading(false);
      }
    };
    fetchArticles();
  }, [page]);

  useEffect(() => {
    const handleScroll = () => {
      if (scrollContainerRef.current && hasMore && !loading) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        if (scrollTop + clientHeight >= scrollHeight - 10) {
          setPage(prev => prev + 1);
        }
      }
    };
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, [hasMore, loading]);

  const handleCardClick = (article) => {
    console.log("NewsCard: Opening article:", article.heading);
    setSelectedArticle(article);
  };

  const closeModal = () => {
    console.log("NewsCard: Closing modal");
    setSelectedArticle(null);
  };

  if (loading && page === 1) {
    return <div className="text-center text-gray-400 py-10">Loading articles...</div>;
  }

  if (error) {
    return <div className="text-center text-red-400 py-10">{error}</div>;
  }

  return (
    <div className="w-full">
      <div
        ref={scrollContainerRef}
        className="pt-2 pb-16 h-[calc(100vh-4rem)] overflow-y-auto scrollbar-hide z-10"
        style={{ scrollBehavior: "smooth" }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 px-4 sm:px-6 lg:px-8">
          {articles.length === 0 ? (
            <div className="text-center text-gray-400 col-span-full py-10">No articles available.</div>
          ) : (
            articles.map((article, index) => (
              <div
                key={`${article._id}-${index}`}
                className="bg-[#1F2526] rounded-lg shadow-lg overflow-hidden cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                onClick={() => handleCardClick(article)}
              >
                <img
                  src={article.imageUrl || "https://via.placeholder.com/300"}
                  alt={article.heading}
                  className="w-full h-48 object-cover"
                />
                <div className="p-4">
                  <h3 className="text-white font-bold text-sm sm:text-base line-clamp-2">{article.heading}</h3>
                  <p className="text-gray-400 text-xs mt-1">{new Date(article.date).toLocaleDateString()}</p>
                </div>
              </div>
            ))
          )}
          {loading && page > 1 && (
            <div className="col-span-full flex items-center justify-center py-4">
              <span className="inline-block w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></span>
            </div>
          )}
          {!hasMore && articles.length > 0 && (
            <div className="col-span-full text-center text-gray-400 py-4">No more articles to load.</div>
          )}
        </div>
      </div>
      {selectedArticle && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center p-4 z-100">
          <div className="bg-white rounded-lg w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto p-6 relative">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-gray-600 hover:text-gray-800"
              title="Close"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={selectedArticle.imageUrl || "https://via.placeholder.com/300"}
              alt={selectedArticle.heading}
              className="w-full h-48 object-cover rounded-md mb-4"
            />
            <h2 className="text-gray-800 font-bold text-lg sm:text-xl mb-2">{selectedArticle.heading}</h2>
            <p className="text-gray-500 text-xs sm:text-sm mb-3">
              {new Date(selectedArticle.date).toLocaleDateString()} | {selectedArticle.source || "Unknown Source"}
            </p>
            <p className="text-gray-600 text-sm sm:text-base leading-relaxed">{selectedArticle.content}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewsCard;