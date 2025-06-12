import React, { useState, useEffect, useRef, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
// Make sure the path to your App.js file is correct to import the context
import { useArticles } from '../../App'; 


const NewsCard = () => {
    // 1. Consume the prefetched articles and their loading state from the global context.
    const { articles: prefetchedArticles, isArticlesFetching: isPrefetching, articlesError: prefetchError } = useArticles();

    // 2. Local state for all articles, initialized with prefetched data.
    const [articles, setArticles] = useState(prefetchedArticles || []);
    // 3. Loading state for fetching *more* articles (infinite scroll), not the initial load.
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    // 4. Page state starts at 2 because page 1 is already prefetched.
    const [page, setPage] = useState(2);
    const [hasMore, setHasMore] = useState(true);
    const [selectedArticle, setSelectedArticle] = useState(null);
    const [suggestionIndex, setSuggestionIndex] = useState(0);
    const [suggestedArticles, setSuggestedArticles] = useState([]);
    const [displayedArticleIds, setDisplayedArticleIds] = useState(new Set());
    const [isScrolled, setIsScrolled] = useState(false);
    const [articleHistory, setArticleHistory] = useState([]);
    const limit = 10;
    
    const scrollContainerRef = useRef(null);
    const modalScrollRef = useRef(null);
    const suggestedSectionRef = useRef(null);
    const suggestionScrollRef = useRef(null);
    const modalRef = useRef(null);
    const touchStartY = useRef(null);
    const touchCurrentY = useRef(null);
    const isDragging = useRef(false);
    const navigate = useNavigate();

    const API_URL = process.env.REACT_APP_API_URL || 'https://new-backend-tx3z.onrender.com';

    // 5. This effect handles fetching *more* articles for the infinite scroll.
    // It is triggered when the `page` state changes (and is greater than 1).
    useEffect(() => {
        // We don't fetch for page 1, as that's handled by the prefetch logic.
        if (page === 1) return;
        if (!hasMore) return;

        const fetchMoreArticles = async () => {
            setLoading(true);
            setError(null);
            try {
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                const response = await axios.get(`${API_URL}/admin/get-current-affairs-articles`, {
                    params: { startDate: thirtyDaysAgo.toISOString().split('T')[0], page, limit },
                });
                const newArticles = response.data.articles || [];
                // Append the newly fetched articles to the existing list.
                setArticles((prev) => [...prev, ...newArticles]);
                setHasMore(newArticles.length === limit);
            } catch (err) {
                console.error('NewsCard: Error fetching more articles:', err.message);
                const errorMessage = err.response 
                    ? `Failed to load articles: ${err.response.data?.error || 'Server error'} (Status: ${err.response.status})`
                    : err.request 
                    ? 'Failed to load articles: Network error, possibly due to server unavailability.'
                    : 'Failed to load articles: An unexpected error occurred.';
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        };

        fetchMoreArticles();
    }, [page, hasMore]); // Depends on the page number to fetch new data.

    // 6. This effect handles the infinite scroll trigger.
    useEffect(() => {
        const handleScroll = () => {
            if (scrollContainerRef.current && hasMore && !loading) {
                const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
                // When the user scrolls near the bottom, increment the page to fetch more articles.
                if (scrollTop + clientHeight >= scrollHeight - 20) {
                    setPage((prev) => prev + 1);
                }
            }
        };
        const container = scrollContainerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll);
            return () => container.removeEventListener('scroll', handleScroll);
        }
    }, [hasMore, loading]);

    // ... after the useEffect that handles infinite scroll trigger

useEffect(() => {
    const handleModalScroll = () => {
        if (modalScrollRef.current) {
            // If scrolled more than 50px, set isScrolled to true
            if (modalScrollRef.current.scrollTop > 10) {
                setIsScrolled(true);
            } else {
                setIsScrolled(false);
            }
        }
    };

    const scrollableModal = modalScrollRef.current;
    if (scrollableModal) {
        scrollableModal.addEventListener('scroll', handleModalScroll);
    }

    // Cleanup: remove the event listener when the component unmounts or article changes
    return () => {
        if (scrollableModal) {
            scrollableModal.removeEventListener('scroll', handleModalScroll);
        }
    };
}, [selectedArticle]); // Rerun this effect when the selected article changes

    useEffect(() => {
        if (selectedArticle && modalScrollRef.current && suggestedSectionRef.current) {
            const modal = modalScrollRef.current;
            if (window.innerWidth >= 640) {
                const suggested = suggestedSectionRef.current;
                const offset = 40;
                const scrollPosition = suggested.offsetTop - modal.clientHeight + offset;
                modal.scrollTop = scrollPosition > 0 ? scrollPosition : 0;
            } else {
                modal.scrollTop = 0;
            }
        }
    }, [selectedArticle]);

    useEffect(() => {
        if (selectedArticle) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [selectedArticle]);

    const handleGoBack = () => {
        navigate('/upsc-prelims');
    };

    const handleCardClick = (article) => {
        setSelectedArticle(article);
        setArticleHistory([article]); 
        setSuggestionIndex(0);
        setIsScrolled(false);
        const filtered = articles.filter((a) => a._id !== article._id);
        const initialSuggestions = filtered.slice(0, 3);
        setSuggestedArticles(initialSuggestions);
        setDisplayedArticleIds(new Set([article._id, ...initialSuggestions.map(a => a._id)]));
    };

    const closeModal = () => {
        if (modalRef.current) {
            modalRef.current.style.transform = 'translateY(100%)';
            setTimeout(() => {
                setSelectedArticle(null);
                if (modalRef.current) {
                    modalRef.current.style.transform = 'translateY(0)';
                }
            }, 300);
        } else {
            setSelectedArticle(null);
        }
        setDisplayedArticleIds(new Set());
    };

    const getSuggestedArticles = () => {
        if (!selectedArticle || articles.length <= 1) return [];
        if (window.innerWidth < 640) {
            return articles.filter((a) => a._id !== selectedArticle._id);
        }
        return suggestedArticles;
    };

    const handleNextSuggestions = () => {
        if (window.innerWidth < 640) {
            const filtered = articles.filter((a) => a._id !== selectedArticle._id);
            setSuggestionIndex((prev) => (prev + 1 >= filtered.length ? 0 : prev + 1));
            if (suggestionScrollRef.current) {
                suggestionScrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
            }
        } else {
            const filtered = articles.filter((a) => !displayedArticleIds.has(a._id));
            setSuggestedArticles((prev) => {
                const newArticles = [...prev.slice(1)];
                const nextArticle = filtered.length > 0 ? filtered[0] : null;
                if (nextArticle) {
                    newArticles.push(nextArticle);
                    setDisplayedArticleIds((prevSet) => new Set([...prevSet, nextArticle._id]));
                }
                return newArticles.filter(a => a);
            });
        }
    };

    const handlePrevSuggestions = () => {
        if (window.innerWidth < 640) {
            const filtered = articles.filter((a) => a._id !== selectedArticle._id);
            setSuggestionIndex((prev) => (prev - 1 < 0 ? filtered.length - 1 : prev - 1));
            if (suggestionScrollRef.current) {
                suggestionScrollRef.current.scrollBy({ left: -200, behavior: 'smooth' });
            }
        } else {
            const currentSuggestionIds = new Set(suggestedArticles.map(a => a._id));
            const availableArticles = articles.filter(a => !currentSuggestionIds.has(a._id) && a._id !== selectedArticle._id);
            setSuggestedArticles((prev) => {
                const newArticles = [...prev.slice(0, -1)];
                const prevArticle = availableArticles.length > 0 ? availableArticles[availableArticles.length - 1] : null;
                if (prevArticle) {
                    newArticles.unshift(prevArticle);
                }
                return newArticles.filter(a => a);
            });
        }
    };
    
    const handleMainNextArticle = () => {
        const suggested = getSuggestedArticles();
        if (suggested.length === 0) return;
        const nextArticle = suggested[0];
        if (!nextArticle) return;
        setSelectedArticle(nextArticle);
        setArticleHistory(prev => [...prev, nextArticle]);
        setIsScrolled(false);

        if (window.innerWidth >= 640) {
            const newDisplayedIds = new Set(displayedArticleIds);
            newDisplayedIds.add(nextArticle._id);
            const filtered = articles.filter((a) => !newDisplayedIds.has(a._id));

            setSuggestedArticles((prev) => {
                const newArticles = [...prev.slice(1)];
                const newSuggestion = filtered.length > 0 ? filtered[0] : null;
                if (newSuggestion) {
                    newArticles.push(newSuggestion);
                    newDisplayedIds.add(newSuggestion._id);
                }
                setDisplayedArticleIds(newDisplayedIds);
                return newArticles.filter(a => a);
            });
        } else {
            const filtered = articles.filter((a) => a._id !== nextArticle._id);
            setSuggestedArticles(filtered.slice(0, 3));
            setDisplayedArticleIds(new Set([nextArticle._id, ...filtered.slice(0, 3).map(a => a._id)]));
            setSuggestionIndex(0);
        }
    };
    const handleMainPrevArticle = () => {
    // Ensure there is a history to go back to
    if (articleHistory.length <= 1) return;

    // Create a new history array without the last (current) article
    const newHistory = articleHistory.slice(0, -1);

    // The previous article is now the last one in the new history array
    const prevArticle = newHistory[newHistory.length - 1];
    
    setSelectedArticle(prevArticle);
    setArticleHistory(newHistory); // Update the history state
    setIsScrolled(false); // Reset scroll effect
};

    const handleTouchStart = (e) => {
        if (window.innerWidth >= 640) return;
        const touch = e.touches[0];
        touchStartY.current = touch.clientY;
        touchCurrentY.current = touch.clientY;
        isDragging.current = false;
        if (modalRef.current) {
            modalRef.current.style.transition = 'none';
        }
    };

    const handleTouchMove = (e) => {
        if (window.innerWidth >= 640) return;
        const touch = e.touches[0];
        touchCurrentY.current = touch.clientY;
        const deltaY = touchCurrentY.current - touchStartY.current;
        if (deltaY > 0 && modalScrollRef.current.scrollTop === 0) {
            isDragging.current = true;
            e.preventDefault();
            const translateY = Math.min(deltaY, 200);
            modalRef.current.style.transform = `translateY(${translateY}px)`;
        }
    };

    const handleTouchEnd = () => {
        if (window.innerWidth >= 640 || !isDragging.current) return;
        const deltaY = touchCurrentY.current - touchStartY.current;
        if (modalRef.current) {
            modalRef.current.style.transition = 'transform 0.3s ease-out';
            if (deltaY > 100) {
                closeModal();
            } else {
                modalRef.current.style.transform = 'translateY(0)';
            }
        }
        isDragging.current = false;
    };

    // 7. Show a loading screen only while the initial prefetch is happening.
    if (isPrefetching) {
        return <div className="text-center text-gray-400 py-10">Loading articles...</div>;
    }

    // Show an error if the prefetch failed.
    if (prefetchError) {
        return <div className="text-center text-red-400 py-10">{prefetchError}</div>;
    }
    
    // Show an error for subsequent fetches.
    if (error) {
        return <div className="text-center text-red-400 py-10">{error}</div>;
    }

    return (
        <div className="w-full bg-gray-900 min-h-screen relative">
            <button
                onClick={handleGoBack}
                aria-label="Go back"
                className="absolute top-5 left-5 w-12 h-12 flex items-center justify-center bg-black bg-opacity-30 backdrop-blur-sm rounded-full text-white shadow-lg z-20 hover:bg-opacity-50 transition-all duration-300"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                </svg>
            </button>
            <div
                ref={scrollContainerRef}
                className="pt-4 pb-4 h-screen overflow-y-auto scrollbar-hide z-10"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                <style>
                    {`
                        .article-card:hover {
                            border: 2px solid #3b82f6 !important;
                            box-shadow: 0 0 15px rgba(59, 130, 246, 0.5) !important;
                            transform: scale(1.05) !important;
                        }
                    `}
                </style>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 px-4 sm:px-6 lg:px-8">
                    {articles.length === 0 && !loading ? (
                        <div className="text-center text-gray-400 col-span-full py-10">No articles available.</div>
                    ) : (
                        articles.map((article, index) => (
                            <div
                                key={`${article._id}-${index}`}
                                className="bg-[#1F2526] rounded-lg shadow-lg overflow-hidden cursor-pointer transform transition-all duration-300 article-card"
                                onClick={() => handleCardClick(article)}
                            >
                                <img
                                    src={article.imageUrl || 'https://via.placeholder.com/300'}
                                    alt={article.heading}
                                    className="w-full h-48 object-cover"
                                />
                                <div className="p-4">
                                    <h3 className="text-white font-bold text-sm sm:text-base line-clamp-2">{article.heading}</h3>
                                </div>
                            </div>
                        ))
                    )}
                    {/* This loading spinner is for subsequent fetches (infinite scroll). */}
                    {loading && (
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
                <div className="fixed inset-0 bg-gray-900 bg-opacity-80 z-50 flex">
                    <div
                        ref={modalRef}
                        className="sm:rounded-none sm:mt-0 rounded-t-3xl bg-gray-800 w-full h-full relative flex flex-col shadow-lg overflow-hidden"
                        style={{ transition: 'transform 0.3s ease-out' }}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    >
                         <style>
                            {`
                                @media (max-width: 639px) {
                                    div[ref="modalRef"]::before {
                                        content: ''; position: absolute; top: 0.5rem; left: 0.25rem; right: 0.25rem; bottom: -0.5rem;
                                        background: rgba(0, 0, 0, 0.6); border-top-left-radius: 1.5rem; border-top-right-radius: 1.5rem;
                                        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5); z-index: -1; pointer-events: none;
                                    }
                                    img.article-image {
                                        width: 100vw !important; height: 20rem !important; max-height: 20rem !important;
                                        margin-left: calc(-1rem - 1px) !important; margin-right: calc(-1rem - 1px) !important;
                                    }
                                    .scroll-down-symbol {
                                        position: absolute; top: 0.5rem; left: 50%; transform: translateX(-50%);
                                        width: 2rem; height: 0.25rem; background: rgba(209, 213, 219, 0.8);
                                        border-radius: 0.125rem; z-index: 60; pointer-events: none;
                                    }
                                }
                            `}
                        </style>
                        <button
                            onClick={closeModal}
                            className="absolute top-4 right-4 text-gray-300 hover:text-white z-60"
                            title="Close"
                        >
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        {/* --- PREVIOUS ARTICLE BUTTON --- */}
{articleHistory.length > 1 && (
    <button
        onClick={handleMainPrevArticle}
        className={`sm:flex items-center justify-center w-14 h-14 rounded-full bg-gray-600 hover:bg-gray-700 absolute left-4 top-1/2 transform -translate-y-1/2 mt-8 text-gray-300 hover:text-white z-60 hidden transition-all duration-150 ${isScrolled ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        title="Previous Article"
    >
        {/* Left-pointing arrow SVG */}
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
    </button>
)}

{/* --- NEXT ARTICLE BUTTON (Your existing button) --- */}
                        <button
    onClick={handleMainNextArticle}
    className={`sm:flex items-center justify-center w-14 h-14 rounded-full bg-gray-600 hover:bg-gray-700 absolute right-4 top-1/2 transform -translate-y-1/2 mt-10 text-gray-300 hover:text-white z-60 hidden transition-all duration-150 ${isScrolled ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
    style={{ marginRight: '1rem' }}
    title="Next Article"
>
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
</button>
                        <div
                            ref={modalScrollRef}
                            className="overflow-y-auto flex-1 sm:pt-8 sm:pr-20 sm:pl-20 pr-4 pl-4 pt-0 pb-12"
                        >
                            {window.innerWidth < 640 && (<div className="scroll-down-symbol" />)}
                            <img
                                src={selectedArticle.imageUrl || 'https://via.placeholder.com/300'}
                                alt={selectedArticle.heading}
                                className="w-full h-48 object-cover rounded-t-3xl mb-4 max-w-none article-image sm:float-left sm:w-80 sm:h-80 sm:rounded-md sm:mr-6 sm:ml-0 sm:mb-4"
                                style={{ maxWidth: 'none' }}
                                width="1000"
                                height="320"
                            />
                            <div className="w-full" style={{ minHeight: 'calc(100vh - 8rem)' }}>
                                <h2 className="text-white font-bold text-xl sm:text-2xl mb-2">{selectedArticle.heading}</h2>
                                <p className="text-gray-200 text-base leading-relaxed whitespace-pre-line">{selectedArticle.content}</p>
                                <div className="clear-both" />
                                <div className="mt-6 sm:hidden"><h3 className="text-white font-bold text-lg">Keep Reading</h3></div>
                            </div>
                            {getSuggestedArticles().length > 0 && (
                                <div ref={suggestedSectionRef} style={{ marginTop: '0.25rem' }}>
                                    <div className="hidden sm:block mt-10">
                                        <div style={{ background: '#1F2526', borderTop: '1px solid #374151', boxShadow: '0 -2px 16px 0 rgba(0,0,0,0.2)', padding: '1rem 2rem' }}>
                                            <h3 className="text-white font-bold text-xl mb-0">You May Also Like</h3>
                                        </div>
                                        <div style={{ background: '#1F2526', padding: '1rem 2rem 2rem 2rem', borderBottomLeftRadius: '1rem', borderBottomRightRadius: '1rem', maxHeight: '50vh', overflowY: 'auto', position: 'relative' }}>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 relative">
                                                {getSuggestedArticles().map((article, index) => (
                                                    <div key={`${article._id}-${index}`} className="bg-[#1F2526] rounded-lg shadow-lg overflow-hidden cursor-pointer transform transition-all duration-300 article-card suggested-article" onClick={() => handleCardClick(article)}>
                                                        <img src={article.imageUrl || 'https://via.placeholder.com/300'} alt={article.heading} className="w-full h-48 object-cover" />
                                                        <div className="p-4"><h3 className="text-white font-bold text-sm sm:text-base line-clamp-2">{article.heading}</h3></div>
                                                    </div>
                                                ))}
                                               <button
    onClick={handlePrevSuggestions}
    className="absolute -left-0.2 top-1/2 transform -translate-y-1/2 -mt-8 w-14 h-14 rounded-full bg-gray-600 hover:bg-gray-700 flex items-center justify-center text-gray-300 hover:text-white z-10 transition-all"
    title="Previous Suggestions"
>
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
</button>                                     <button
    onClick={handleNextSuggestions}
    className="absolute -right-0.5 top-1/2 transform -translate-y-1/2 -mt-8 w-14 h-14 rounded-full bg-gray-600 hover:bg-gray-700 flex items-center justify-center text-gray-300 hover:text-white z-10 transition-all"
    title="Next Suggestions"
>
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
</button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="sm:hidden mt-4 relative">
                                        <div ref={suggestionScrollRef} className="flex flex-row overflow-x-auto scrollbar-hide snap-x snap-mandatory" style={{ scrollBehavior: 'smooth', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                                            <style>{`div[ref="suggestionScrollRef"]::-webkit-scrollbar { display: none; }`}</style>
                                            {getSuggestedArticles().map((article, index) => (
                                                <div key={`${article._id}-${index}`} className="flex-shrink-0 w-56 mx-2 snap-center cursor-pointer" onClick={() => handleCardClick(article)} style={{ maxWidth: '75%' }}>
                                                    <img src={article.imageUrl || 'https://via.placeholder.com/300'} alt={article.heading} className="w-full h-36 object-cover rounded-md mb-2" />
                                                    <h3 className="text-white font-bold text-sm line-clamp-2">{article.heading}</h3>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default React.memo(NewsCard);
