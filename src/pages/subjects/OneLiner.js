import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, useQanda } from "../../App";
import BottomBar from "./BottomBar";
import axios from "axios";

const OneLiner = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { qandaPairs: prefetchedQandaPairs, setQandaPairs, fetchQanda, isQandaFetching, refreshQanda } = useQanda();
  const [qandaPairs, setLocalQandaPairs] = useState([]);
  const [categoryCache, setCategoryCache] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [view, setView] = useState("qanda");
  const scrollContainerRef = useRef(null);
  const isFetchingRef = useRef(false);
  const isPrefetchingRef = useRef({}); // Track prefetching per category
  const isFirstMountRef = useRef(true);
  const API_URL = "https://new-backend-tx3z.onrender.com";
  const ITEMS_PER_PAGE = 10;

  const categories = [
    "All",
    "History",
    "Politics",
    "Geography",
    "Economy",
    "Current Affairs",
    "Science",
    "Environment",
    "Culture",
  ];

  // Prefetch pairs for all categories except "All" on mount
  useEffect(() => {
    if (!user) {
      navigate("/login", { state: { from: "/oneliners" } });
      return;
    }

    if (isFirstMountRef.current) {
      const prefetchCategories = categories.filter((cat) => cat !== "All");
      Promise.all(
        prefetchCategories.map((category) =>
          fetchQandA(true, category, true).then((pairs) => ({ category, pairs }))
        )
      ).then((results) => {
        const newCache = results.reduce((acc, { category, pairs }) => {
          acc[category] = pairs;
          return acc;
        }, {});
        setCategoryCache((prev) => ({ ...prev, ...newCache }));
        console.log("OneLiner: Prefetched pairs for categories:", Object.keys(newCache));
      }).catch((err) => {
        console.error("OneLiner: Error prefetching category pairs:", err.message);
      });
    }

    if (isQandaFetching) {
      console.log("OneLiner: Waiting for prefetched Q&A pairs...");
      setLoading(true);
      setLoadingMessage("Loading Q&A pairs...");
    } else if (selectedCategory === "All" && prefetchedQandaPairs.length >= ITEMS_PER_PAGE) {
      console.log("OneLiner: Using prefetched Q&A pairs:", prefetchedQandaPairs.length);
      setLocalQandaPairs(prefetchedQandaPairs);
      setPage(2);
      setHasMore(true);
      setLoading(false);
      isFirstMountRef.current = false;
    } else if (!isQandaFetching && isFirstMountRef.current && prefetchedQandaPairs.length === 0) {
      console.log("OneLiner: Initial mount, no prefetched pairs, waiting...");
      setLoading(true);
      setLoadingMessage("Loading Q&A pairs...");
    }
  }, [user, prefetchedQandaPairs, isQandaFetching, navigate, selectedCategory]);

  // Handle category changes
  useEffect(() => {
    setLocalQandaPairs([]);
    setPage(1);
    setHasMore(true);
    if (selectedCategory === "All" && prefetchedQandaPairs.length >= ITEMS_PER_PAGE && !isQandaFetching) {
      console.log("OneLiner: Restoring prefetched Q&A pairs for All category");
      setLocalQandaPairs(prefetchedQandaPairs);
      setPage(2);
      setHasMore(true);
      setLoading(false);
    } else if (selectedCategory !== "All" && categoryCache[`${selectedCategory}_next`] && !isQandaFetching) {
      console.log(`OneLiner: Using prefetched next Q&A pairs for ${selectedCategory}:`, categoryCache[`${selectedCategory}_next`].length);
      setLocalQandaPairs(categoryCache[`${selectedCategory}_next`]);
      setCategoryCache((prev) => {
        const newCache = { ...prev, [selectedCategory]: prev[`${selectedCategory}_next`] };
        delete newCache[`${selectedCategory}_next`];
        return newCache;
      });
      setPage(2);
      setHasMore(true);
      setLoading(false);
    } else if (selectedCategory !== "All" && categoryCache[selectedCategory] && !isQandaFetching) {
      console.log(`OneLiner: Using cached Q&A pairs for ${selectedCategory}:`, categoryCache[selectedCategory].length);
      setLocalQandaPairs(categoryCache[selectedCategory]);
      setPage(2);
      setHasMore(true);
      setLoading(false);
    } else if (!isQandaFetching) {
      console.log("OneLiner: Fetching Q&A pairs for category change...");
      fetchQandA(true);
    }
  }, [selectedCategory, prefetchedQandaPairs, isQandaFetching, categoryCache]);

  // Infinite scrolling
  useEffect(() => {
    const handleScroll = () => {
      if (scrollContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        if (scrollTop + clientHeight >= scrollHeight - 10 && hasMore && !loading) {
          setPage((prev) => prev + 1);
          fetchQandA(false);
        }
      }
    };

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, [qandaPairs, hasMore, loading]);

  const prefetchNextPairs = async (category) => {
    if (isPrefetchingRef.current[category]) {
      console.log(`OneLiner: Skipping prefetch for ${category}, already in progress`);
      return;
    }
    isPrefetchingRef.current[category] = true;
    try {
      const newPairs = await fetchQandA(true, category, true);
      setCategoryCache((prev) => ({
        ...prev,
        [`${category}_next`]: newPairs,
      }));
      console.log(`OneLiner: Prefetched next 10 Q&A pairs for ${category}`);
    } catch (err) {
      console.error(`OneLiner: Error prefetching next pairs for ${category}:`, err.message);
    } finally {
      isPrefetchingRef.current[category] = false;
    }
  };

  const fetchQandA = async (reset = false, category = selectedCategory, isPrefetch = false) => {
    if (!hasMore && !reset && !isPrefetch) return;
    if (loading && !isPrefetch) return;
    if (isFetchingRef.current && !isPrefetch) return;

    if (!isPrefetch) {
      isFetchingRef.current = true;
      setLoading(true);
      setError(null);
    }

    try {
      const categoryParam = category === "All" ? undefined : category;
      const params = {
        userId: user.email.split("@")[0],
        category: categoryParam,
        page: reset ? 1 : page,
        limit: ITEMS_PER_PAGE,
      };
      console.log("Sending API request with params:", params);
      const response = await axios.get(`${API_URL}/user/get-qanda`, { params });
      const newPairs = response.data.qanda || [];
      console.log(
        `Fetched Q&A for category "${category}":`,
        newPairs.map((pair) => ({
          question: pair.question,
          category: pair.category,
        }))
      );

      if (isPrefetch) {
        return newPairs;
      }

      const updatedPairs = reset ? newPairs : [...qandaPairs, ...newPairs];
      setLocalQandaPairs(updatedPairs);
      if (category === "All") {
        setQandaPairs(updatedPairs);
      } else {
        setCategoryCache((prev) => ({ ...prev, [category]: updatedPairs }));
      }

      setHasMore(newPairs.length === ITEMS_PER_PAGE);
      if (reset) setPage(2);
    } catch (err) {
      const errorMsg =
        err.response?.status === 404
          ? `No Q and A pairs available for ${category === "All" ? "any category" : category}.`
          : err.response?.data?.error || "Failed to load Q and A pairs.";
      if (!isPrefetch) {
        setError(errorMsg);
        setHasMore(false);
        console.error("fetchQandA error:", err.message);
      }
      if (isPrefetch) {
        return [];
      }
    } finally {
      if (!isPrefetch) {
        setLoading(false);
        isFetchingRef.current = false;
        isFirstMountRef.current = false;
      }
    }
  };

 const handleCategoryChange = (category) => {
  if (category !== "All" && selectedCategory !== "All") {
    const prevCategory = selectedCategory;

    // 1. Show cached Q&A for the new category if available (handled by useEffect)
    // 2. Clear cache for previous category
    setCategoryCache((prev) => {
      const newCache = { ...prev };
      delete newCache[prevCategory];
      return newCache;
    });

    // 3. Prefetch new Q&A for previous category and store as `${prevCategory}_next`
    prefetchNextPairs(prevCategory);
  }
  setSelectedCategory(category);
};

  return (
    <div className="h-screen bg-gray-900 text-white font-poppins flex flex-col overflow-hidden">
      <style>
        {`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .qanda-card {
            animation: fadeInUp 0.5s ease-out forwards;
          }
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .category-button {
            background: rgba(31, 37, 47, 0.6);
            backdrop-filter: blur(10px);
            border: none;
            border-radius: 12px;
            padding: 8px 16px;
            font-size: 0.875rem;
            font-weight: 600;
            color: #d1d5db;
            transition: all 0.3s ease;
            min-width: 100px;
            text-align: center;
            white-space: nowrap;
          }
          .category-button:hover {
            transform: scale(1.05);
            background: rgba(59, 130, 246, 0.3);
            color: #ffffff;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          }
          .category-button.active {
            background: rgba(59, 130, 246, 0.6);
            color: #ffffff;
            box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
          }
          .filter-container {
            position: sticky;
            top: 0;
            display: flex;
            flex-wrap: nowrap;
            gap: 8px;
            overflow-x: auto;
            padding: 16px 0;
            z-index: 10;
            background: transparent;
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          .filter-container::-webkit-scrollbar {
            display: none;
          }
          @media (min-width: 640px) {
            .filter-container {
              flex-wrap: wrap;
              overflow-x: visible;
              justify-content: space-between;
            }
            .category-button {
              flex: 1;
              min-width: 0;
              text-overflow: ellipsis;
            }
          }
        `}
      </style>

      <div className="flex-1 pb-16 px-4 sm:px-6 lg:px-8 w-full overflow-hidden">
        <div
          ref={scrollContainerRef}
          className="h-full overflow-y-auto scrollbar-hide"
          style={{ scrollBehavior: "smooth" }}
        >
          <div className="filter-container">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryChange(category)}
                className={`category-button ${selectedCategory === category ? "active" : ""}`}
              >
                {category}
              </button>
            ))}
          </div>

          {error && (
            <div className="p-4 bg-red-950 border border-red-700 rounded-lg w-full mb-6 mt-4">
              <p className="text-base sm:text-lg text-red-200">{error}</p>
            </div>
          )}
          {qandaPairs.length === 0 && !loading && !error ? (
            <p className="text-gray-400 text-center mt-4">
              No Q and A pairs available for {selectedCategory === "All" ? "any category" : selectedCategory}.
            </p>
          ) : (
            qandaPairs.map((pair, index) => (
              <div
                key={index}
                className="qanda-card bg-gradient-to-br from-gray-800 to-gray-700 p-6 rounded-xl shadow-lg hover:shadow-xl shadow-gray-600/50 border border-gray-600/30 mb-6 w-full transition-all duration-300 mt-4"
              >
                <p className="text-lg sm:text-xl font-bold text-white mb-3">{pair.question}</p>
                <p className="text-base text-gray-200 leading-relaxed">{pair.answer}</p>
                <p className="text-sm text-gray-400 mt-3 italic">Subject: {pair.category}</p>
              </div>
            ))
          )}
          {loading && (
            <div className="flex items-center justify-center py-4">
              <span className="inline-block w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></span>
            </div>
          )}
        </div>
      </div>

      <BottomBar view={view} setView={setView} />
    </div>
  );
};

export default OneLiner;