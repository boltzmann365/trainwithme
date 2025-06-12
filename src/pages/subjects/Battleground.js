import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, useQanda } from "../../App";

const Battleground = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { mcqs, setMcqs, fetchNewInitialMCQs, isMcqsFetching, cachedMcqs, setCachedMcqs } = useQanda();
  const [testStarted, setTestStarted] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState([]);
  const [questionStatuses, setQuestionStatuses] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [error, setError] = useState(null);
  const [selectedOption, setSelectedOption] = useState("");
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(null);
  const [showResultsPage, setShowResultsPage] = useState(false);
  const [filter, setFilter] = useState("all");
  const [showSidebar, setShowSidebar] = useState(false);
  const [fontSize, setFontSize] = useState(24);
  const [maxQuestionReached, setMaxQuestionReached] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [timeLeft, setTimeLeft] = useState(6 * 60); // 6 minutes for 10 questions
  const [timerActive, setTimerActive] = useState(false);
  const [totalQuestions, setTotalQuestions] = useState(10);

  const [scoreDetails, setScoreDetails] = useState({
    totalQuestions: 0,
    attempted: 0,
    answeredCorrectly: 0,
    answeredIncorrectly: 0,
    unattempted: 0,
    totalScore: 0,
    percentage: 0,
  });

  const API_URL = process.env.REACT_APP_API_URL || "https://new-backend-tx3z.onrender.com";
  const PRELIMS_CUTOFF = 50;
  const isFetchingRef = useRef(false);
  const hasInitialized = useRef(false);

  useEffect(() => {
    console.log("Battleground: Initial state", { user, testStarted, loading, error });
  }, [user]);

  useEffect(() => {
    let timer;
    if (timerActive && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setTimerActive(false);
            submitTest();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [timerActive, timeLeft]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleGoBack = () => {
    fetchNewInitialMCQs();
    navigate("/upsc-prelims");
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

      if (!response.ok) {
        console.warn(`Failed to fetch MCQs: HTTP ${response.status}`);
        return [];
      }

      const data = await response.json();
      if (!data.mcqs || data.mcqs.length === 0) {
        console.warn("No MCQs returned from batch endpoint");
        return [];
      }

      const transformedMCQs = data.mcqs
        .filter(mcq => {
          if (!mcq.mcq || !mcq.mcq.question || !mcq.mcq.options || !mcq.mcq.correctAnswer || !mcq.mcq.explanation) {
            return false;
          }
          if (initialMCQIds.includes(mcq._id?.toString())) {
            return false;
          }
          return true;
        })
        .map(mcq => ({
          question: Array.isArray(mcq.mcq.question) ? mcq.mcq.question : mcq.mcq.question.split("\n").filter(line => line.trim()),
          options: mcq.mcq.options,
          correctAnswer: mcq.mcq.correctAnswer,
          explanation: mcq.mcq.explanation,
          category: mcq.category || null,
          id: mcq._id,
        }));

      return transformedMCQs;
    } catch (err) {
      console.error("Error in batchFetchMCQs:", err);
      return [];
    }
  };

  const fetchRemainingMCQs = async (desiredCount, initialMCQIds) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    console.log("Battleground: fetchRemainingMCQs called with desiredCount", desiredCount);

    try {
      const subjects = [
        "Polity", "TamilnaduHistory", "Spectrum", "ArtAndCulture",
        "FundamentalGeography", "IndianGeography", "Science",
        "Environment", "Economy", "CurrentAffairs", "PreviousYearPapers",
      ];
      const remainingCount = Math.max(desiredCount - questions.length, 0);
      const questionsPerSubject = Math.ceil(remainingCount / subjects.length);
      let remainingMCQs = [];

      console.log(`Battleground: Attempting to fetch ${remainingCount} remaining MCQs`);

      remainingMCQs = await batchFetchMCQs(subjects, questionsPerSubject, initialMCQIds, API_URL);

      if (remainingMCQs.length > 0) {
        setQuestions(prevQuestions => {
          const allMCQs = [...prevQuestions, ...remainingMCQs];
          return allMCQs.slice(0, desiredCount);
        });
        setMcqs(prevMcqs => {
          const allMCQs = [...prevMcqs, ...remainingMCQs];
          return allMCQs.slice(0, desiredCount);
        });
        setUserAnswers(prevAnswers => [...prevAnswers, ...new Array(remainingMCQs.length).fill(null)]);
        setQuestionStatuses(prevStatuses => [...prevStatuses, ...new Array(remainingMCQs.length).fill("unattempted")]);
        setTotalQuestions(desiredCount);
      }

      console.log("Battleground: Fetched remaining MCQs", remainingMCQs.length);

      if (questions.length + remainingMCQs.length < desiredCount) {
        setError(`Warning: Loaded ${questions.length + remainingMCQs.length} out of ${desiredCount} requested MCQs. Some subjects may have no available questions.`);
      }
    } catch (err) {
      console.error("Error in fetchRemainingMCQs:", err);
      setError("Failed to load additional MCQs. Please try again.");
    } finally {
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    if (!user) {
      console.log("Battleground: No user, redirecting to login");
      navigate("/login", { state: { from: "/battleground" } });
      return;
    }

    if (!hasInitialized.current) {
      if (mcqs.length > 0) {
        console.log("Battleground: Initializing 10-question test with preloaded MCQs", mcqs.length);
        hasInitialized.current = true;
        setQuestions([...mcqs]);
        setUserAnswers(new Array(mcqs.length).fill(null));
        setQuestionStatuses(new Array(mcqs.length).fill("unattempted"));
        setCurrentQuestionIndex(0);
        setScore(null);
        setSelectedOption("");
        setShowExplanation(false);
        setShowResultsPage(false);
        setTestStarted(true);
        setTimerActive(true);
        setTotalQuestions(10);
        setLoading(false);
      } else if (isMcqsFetching) {
        console.log("Battleground: Waiting for initial MCQs to load");
        setLoading(true);
        setLoadingMessage("Loading MCQs...");
      } else {
        console.log("Battleground: No preloaded MCQs and not fetching, setting error");
        setError("Failed to load initial MCQs. Please try again.");
        setLoading(false);
        setTestStarted(false);
      }
    }
  }, [user, navigate, mcqs, isMcqsFetching]);

  useEffect(() => {
    if (testStarted && questions.length > 0 && questions.length < totalQuestions && !isFetchingRef.current) {
      console.log("Battleground: Triggering fetchRemainingMCQs", { desired: totalQuestions, current: questions.length });
      fetchRemainingMCQs(totalQuestions, questions.map(q => q.id.toString()));
    }
  }, [testStarted, questions.length, totalQuestions]);

  const toggleSidebar = () => {
    if (!showSidebar && cachedMcqs.length < 3) {
      fetchNewInitialMCQs();
    }
    setShowSidebar(prev => !prev);
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch(`${API_URL}/battleground/leaderboard`, {
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setLeaderboard(data.rankings || []);
      console.log("Battleground: Fetched leaderboard", data.rankings?.length || 0);
    } catch (error) {
      console.error("Error fetching leaderboard:", error.message);
      setLeaderboard([]);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  useEffect(() => {
    const questionBox = document.querySelector('.question-box');
    const content = document.querySelector('.question-content');
    const questionNumber = document.querySelector('.question-number');
    if (questionBox && content) {
      let pElementsHeight = 0;
      if (questionNumber) {
        const style = window.getComputedStyle(questionNumber);
        pElementsHeight += questionNumber.offsetHeight + parseFloat(style.marginBottom);
      }

      const paddingHeight = 16;
      const effectiveHeight = questionBox.clientHeight - pElementsHeight - paddingHeight;

      let currentFontSize = 24;
      content.style.fontSize = `${currentFontSize}px`;
      while (content.scrollHeight > effectiveHeight && currentFontSize > 8) {
        currentFontSize -= 1;
        content.style.fontSize = `${currentFontSize}px`;
      }
      setFontSize(currentFontSize);
    }
  }, [questions, currentQuestionIndex]);

  const handleOptionSelect = (option) => {
    const newAnswers = [...userAnswers];
    const newStatuses = [...questionStatuses];
    newAnswers[currentQuestionIndex] = option;
    newStatuses[currentQuestionIndex] = option === questions[currentQuestionIndex].correctAnswer ? "correct" : "wrong";
    setUserAnswers(newAnswers);
    setQuestionStatuses(newStatuses);
    setSelectedOption(option);
    setShowExplanation(false);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex >= totalQuestions - 1 || currentQuestionIndex >= questions.length - 1) return;

    if (selectedOption === "") {
      const newStatuses = [...questionStatuses];
      newStatuses[currentQuestionIndex] = "unattempted";
      setQuestionStatuses(newStatuses);
    }

    const nextIndex = currentQuestionIndex + 1;
    setCurrentQuestionIndex(nextIndex);
    setSelectedOption(userAnswers[nextIndex] || "");
    setShowExplanation(false);
    if (nextIndex > maxQuestionReached) {
      setMaxQuestionReached(nextIndex);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      if (selectedOption === "") {
        const newStatuses = [...questionStatuses];
        newStatuses[currentQuestionIndex] = "unattempted";
        setQuestionStatuses(newStatuses);
      }

      const prevIndex = currentQuestionIndex - 1;
      setCurrentQuestionIndex(prevIndex);
      setSelectedOption(userAnswers[prevIndex] || "");
      setShowExplanation(false);
    }
  };

  const submitTest = () => {
    let newAnswers = [...userAnswers];
    if (selectedOption !== "") {
      newAnswers[currentQuestionIndex] = selectedOption;
      setUserAnswers(newAnswers);
    }

    let correctCount = 0;
    let wrongCount = 0;
    let attempted = 0;
    const newStatuses = [...questionStatuses];

    newAnswers.forEach((answer, index) => {
      if (answer && index < questions.length) {
        attempted++;
        if (answer === questions[index].correctAnswer) {
          correctCount++;
          newStatuses[index] = "correct";
        } else {
          wrongCount++;
          newStatuses[index] = "wrong";
        }
      } else {
        newStatuses[index] = "unattempted";
      }
    });

    setQuestionStatuses(newStatuses);

    const unattempted = questions.length - attempted;
    const totalScore = (correctCount * 2) - (wrongCount * 0.66);
    const percentage = questions.length > 0 ? (totalScore / (questions.length * 2)) * 100 : 0;

    setScore(totalScore);
    setTimerActive(false);

    setScoreDetails({
      totalQuestions: questions.length,
      attempted,
      answeredCorrectly: correctCount,
      answeredIncorrectly: wrongCount,
      unattempted,
      totalScore: totalScore.toFixed(2),
      percentage: percentage.toFixed(2),
    });

    setShowResultsPage(true);

    fetch(`${API_URL}/battleground/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: user.username,
        score: totalScore,
      }),
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        setLeaderboard(data.rankings || []);
        console.log("Battleground: Test submitted, leaderboard updated", data.rankings?.length || 0);
      })
      .catch(error => {
        console.error("Error submitting test:", error);
      });
  };

  const resetTest = (questionCount) => {
    console.log("Battleground: Resetting test with", questionCount, "questions");
    setTestStarted(false);
    setQuestions([...mcqs]);
    setUserAnswers(new Array(mcqs.length).fill(null));
    setQuestionStatuses(new Array(mcqs.length).fill("unattempted"));
    setCurrentQuestionIndex(0);
    setScore(null);
    setSelectedOption("");
    setShowExplanation(false);
    setShowResultsPage(false);
    setFilter("all");
    setShowSidebar(false);
    setMaxQuestionReached(0);
    setScoreDetails({
      totalQuestions: 0,
      attempted: 0,
      answeredCorrectly: 0,
      answeredIncorrectly: 0,
      unattempted: 0,
      totalScore: 0,
      percentage: 0,
    });
    setLoading(false);
    setTimeLeft(questionCount === 25 ? 12 * 60 : questionCount === 50 ? 30 * 60 : questionCount === 100 ? 60 * 60 : 6 * 60);
    setTimerActive(true);
    setTotalQuestions(questionCount);
    setTestStarted(true);
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    if (newFilter === "wrong") {
      const firstWrongIndex = questionStatuses.findIndex(status => status === "wrong");
      if (firstWrongIndex !== -1) {
        setCurrentQuestionIndex(firstWrongIndex);
        setSelectedOption(userAnswers[firstWrongIndex] || "");
        setShowExplanation(false);
      }
    }
  };

  const handleQuestionCountSelect = (count) => {
    const parsedCount = parseInt(count, 10);
    if (parsedCount && [25, 50, 100].includes(parsedCount)) {
      console.log("Battleground: Selected question count", parsedCount);
      if (cachedMcqs.length >= 3) {
        setMcqs(cachedMcqs.slice(0, 3));
        setCachedMcqs(cachedMcqs.slice(3));
        resetTest(parsedCount);
        fetchNewInitialMCQs();
      } else if (isMcqsFetching) {
        console.log("Battleground: Waiting for MCQs to load for question count", parsedCount);
        setLoading(true);
        setLoadingMessage("Loading MCQs...");
      } else {
        setError("Failed to load MCQs. Please try again.");
      }
    }
  };

  // ---- Question Type Detection Functions ----
  const isTableBasedQuestion = (questionLines) => (
    questionLines &&
    questionLines.some((line) => line.includes("      ")) &&
    questionLines.some((line) => /^\([A-D]\)/.test(line))
  );

  const isAssertionReasonQuestion = (questionLines) => (
    questionLines &&
    questionLines.some((line) => line.startsWith("Assertion (A):")) &&
    questionLines.some((line) => line.startsWith("Reason (R):"))
  );

  const isStatementBasedQuestion = (questionLines) => (
    questionLines &&
    questionLines.some((line) => /^\d+\./.test(line)) &&
    (questionLines.some((line) => line.includes("Which of the statements given above is/are correct?")) ||
     questionLines.some((line) => line.includes("How many of the above statements are correct?")))
  );

  const isChronologicalOrderQuestion = (questionLines) => (
    questionLines &&
    questionLines.some((line) => line.includes("Arrange the following")) &&
    questionLines.some((line) => line.includes("chronological order"))
  );

  const isCorrectlyMatchedPairsQuestion = (questionLines) => (
    questionLines &&
    questionLines.some((line) => line.includes("Consider the following pairs")) &&
    questionLines.some((line) => line.includes("Which of the pairs are correctly matched?"))
  );

  const isDirectQuestion = (questionLines) => (
    questionLines &&
    !isStatementBasedQuestion(questionLines) &&
    !isAssertionReasonQuestion(questionLines) &&
    !isTableBasedQuestion(questionLines) &&
    !isChronologicalOrderQuestion(questionLines) &&
    !isCorrectlyMatchedPairsQuestion(questionLines)
  );

  // ---- Question Rendering Logic ----
  const renderQuestion = (questionLines, mcq) => {
    if (!questionLines || !Array.isArray(questionLines) || !mcq) {
      return <p className="text-red-200">Error: Question content missing</p>;
    }

    if (isTableBasedQuestion(questionLines)) {
      const introLine = questionLines[0];
      const columnHeaders = questionLines[1];
      const matchingItems = questionLines.slice(2, questionLines.length - 1);
      const closingLine = questionLines[questionLines.length - 1];
      const headers = columnHeaders.split(/\s{4,}/);

      return (
        <div>
          <p className="text-base sm:text-lg font-medium text-ivory mb-2">{introLine}</p>
          <table className="table-auto w-full text-left text-ivory mb-4 border-collapse">
            <thead>
              <tr>
                {headers.map((header, index) => (
                  <th key={index} className="px-2 sm:px-4 py-1 sm:py-2 border-b border-gray-600">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matchingItems.map((item, index) => {
                const [left, right] = item.split(/\s{4,}/);
                return (
                  <tr key={index}>
                    <td className="px-2 sm:px-4 py-1 sm:py-2 border-b border-gray-600">{left}</td>
                    <td className="px-2 sm:px-4 py-1 sm:py-2 border-b border-gray-600">{right}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-base sm:text-lg font-medium text-ivory">{closingLine}</p>
        </div>
      );
    }

    if (isAssertionReasonQuestion(questionLines)) {
      const assertionLine = questionLines.find((line) => line.startsWith("Assertion (A):"));
      const reasonLine = questionLines.find((line) => line.startsWith("Reason (R):"));
      if (!assertionLine || !reasonLine) {
        return <p className="text-red-200">Error: Incomplete Assertion-Reason question</p>;
      }
      return (
        <div className="mb-2">
          <p className="mb-1 text-ivory">{assertionLine}</p>
          <p className="mb-1 text-ivory">{reasonLine}</p>
        </div>
      );
    }
    
    return (
      <div className="mb-2">
        {questionLines.map((line, index) => (
          <p key={index} className="mb-1 text-ivory">{line}</p>
        ))}
      </div>
    );
  };

  // --- Full-Screen Results Page ---
  if (showResultsPage) {
    const { totalQuestions, attempted, answeredCorrectly, answeredIncorrectly, unattempted, totalScore, percentage } = scoreDetails;
    const passed = parseFloat(percentage) >= PRELIMS_CUTOFF;
    const cutoffDifference = Math.abs(parseFloat(percentage) - PRELIMS_CUTOFF).toFixed(2);

    return (
      <div className="min-h-screen h-screen bg-gray-900 text-white font-poppins flex flex-col">
        <header className="flex-shrink-0 flex justify-between items-center p-4 sm:p-6 bg-gray-900/80 backdrop-blur-sm z-10">
          <button
            onClick={() => setShowResultsPage(false)}
            className="flex items-center gap-2 text-blue-400 hover:text-blue-300 font-semibold transition-colors duration-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
            <span>Back to Solutions</span>
          </button>
          <button
            onClick={handleGoBack}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg shadow-lg transition-transform transform hover:scale-105 duration-300"
          >
            Exit Battleground
          </button>
        </header>

        <main className="flex-grow overflow-y-auto bg-gray-800">
          <div className="bg-gray-800 p-6 sm:p-8 text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-blue-400 mb-2">Test Complete!</h1>
            <p className="text-gray-300 mb-4">Here's your performance summary.</p>
            <div className={`p-4 rounded-lg mb-6 max-w-2xl mx-auto ${passed ? 'bg-green-900/50' : 'bg-red-900/50'}`}>
              <p className="text-xl sm:text-2xl font-bold">{`Your Score: ${totalScore}`}</p>
              <p className="text-lg text-gray-200">{`Percentage: ${percentage}%`}</p>
              <p className={`mt-2 font-semibold ${passed ? 'text-green-400' : 'text-red-400'}`}>
                {passed ? `🎉 Congratulations! You are above the prelims cutoff by ${cutoffDifference}%.` : `Below the prelims cutoff by ${cutoffDifference}%. Keep practicing!`}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 text-white max-w-4xl mx-auto">
              <div className="bg-gray-700 p-3 rounded-lg">
                <p className="text-2xl font-bold">{totalQuestions}</p><p className="text-sm text-gray-400">Total</p>
              </div>
              <div className="bg-gray-700 p-3 rounded-lg">
                <p className="text-2xl font-bold">{attempted}</p><p className="text-sm text-gray-400">Attempted</p>
              </div>
              <div className="bg-green-700 p-3 rounded-lg">
                <p className="text-2xl font-bold">{answeredCorrectly}</p><p className="text-sm text-green-200">Correct</p>
              </div>
              <div className="bg-red-700 p-3 rounded-lg">
                <p className="text-2xl font-bold">{answeredIncorrectly}</p><p className="text-sm text-red-200">Incorrect</p>
              </div>
              <div className="bg-yellow-700 p-3 rounded-lg col-span-2 md:col-span-1">
                <p className="text-2xl font-bold">{unattempted}</p><p className="text-sm text-yellow-200">Unattempted</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 p-6 sm:p-8">
            <div className="max-w-4xl mx-auto">
              <h3 className="text-xl sm:text-2xl font-semibold text-gray-50 mb-4 text-center">
                Leaderboard
              </h3>
              {leaderboard.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-zinc-300 text-sm sm:text-base">
                    <thead>
                      <tr className="border-b-2 border-gray-700">
                        <th className="px-2 sm:px-4 py-2 text-blue-300">Rank</th>
                        <th className="px-2 sm:px-4 py-2 text-blue-300">Username</th>
                        <th className="px-2 sm:px-4 py-2 text-blue-300">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map((entry, index) => (
                        <tr key={index} className={`border-b border-gray-700 ${user.username === entry.username ? 'bg-blue-900/50' : ''}`}>
                          <td className="px-2 sm:px-4 py-3 font-bold">{index + 1}</td>
                          <td className="px-2 sm:px-4 py-3">{entry.username}</td>
                          <td className="px-2 sm:px-4 py-3">{entry.score}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-zinc-400 text-center text-sm sm:text-base">Leaderboard is currently empty.</p>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white font-poppins overflow-hidden overscroll-none">
      <div className="fixed top-0 left-0 w-full h-12 flex justify-between items-center z-50">
        <style>
          {`
            .glass-button {
              background: transparent;
              border: none;
              border-radius: 8px;
              transition: all 0.3s ease;
              padding: 8px;
              box-shadow: none;
            }
            .glass-button:hover {
              transform: scale(1.08);
              background: rgba(59, 130, 246, 0.08);
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
            }
            .glass-timer {
              background: rgba(31, 37, 47, 0.6);
              backdrop-filter: blur(10px);
              border-radius: 8px;
              padding: 4px 12px;
              transition: all 0.3s ease;
            }
            .question-upbar {
              background: rgba(31, 37, 47, 0.8);
              backdrop-filter: blur(10px);
              border-radius: 12px;
              padding: 6px 12px;
              display: flex;
              align-items: center;
              gap: 8px;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
              transition: transform 0.3s ease;
            }
            .question-upbar:hover {
              transform: scale(1.05);
            }
            .question-upbar svg {
              width: 16px;
              height: 16px;
            }
            .question-upbar select {
              background: rgba(55, 65, 81, 0.9);
              color: white;
              border: none;
              border-radius: 8px;
              padding: 4px 8px;
              font-size: 0.875rem;
              cursor: pointer;
              outline: none;
              appearance: none;
              transition: background 0.3s ease;
            }
            .question-upbar select:hover {
              background: rgba(75, 85, 99, 0.9);
            }
            @media (min-width: 640px) {
              .question-upbar select {
                font-size: 1rem;
                padding: 6px 10px;
              }
            }
          `}
        </style>
        <button
          onClick={handleGoBack}
          className="glass-button absolute left-4 flex items-center justify-center"
          style={{ background: "transparent", boxShadow: "none", padding: 0 }}
          aria-label="Go Back"
        >
          <svg
            className="w-8 h-8 text-white opacity-80 hover:opacity-100"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="glass-timer text-sm sm:text-base font-semibold text-white absolute left-1/2 transform -translate-x-1/2">
          {testStarted && `Time Left: ${formatTime(timeLeft)}`}
        </div>
        <button
          onClick={toggleSidebar}
          className="glass-button absolute right-4 flex items-center justify-center"
          aria-label="Sidebar"
        >
          <span className="block">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect y="6" width="28" height="2.5" rx="1.25" fill="#fff" />
              <rect y="13" width="28" height="2.5" rx="1.25" fill="#fff" />
              <rect y="20" width="28" height="2.5" rx="1.25" fill="#fff" />
            </svg>
          </span>
        </button>
      </div>

      {loading && (
        <div className="fixed top-16 left-0 right-0 bottom-0 z-[1000] flex items-center justify-center bg-gray-900">
          <div className="flex flex-col items-center">
            <span className="inline-block w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></span>
            <p className="mt-4 text-lg sm:text-xl font-bold text-blue-300 tracking-wide">
              {loadingMessage}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed top-16 left-0 right-0 bottom-0 z-[999] flex items-center justify-center bg-gray-900">
          <div className="p-4 bg-red-950 border border-red-700 rounded-lg mx-auto max-w-2xl text-center">
            <p className="text-base sm:text-lg text-red-200">{error}</p>
            <button
              onClick={() => {
                setError(null);
                fetchNewInitialMCQs();
              }}
              className="mt-4 bg-purple-600 text-gray-50 px-4 py-2 rounded-full shadow-lg hover:bg-purple-700 transition-transform transform hover:scale-105 duration-300"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {testStarted && !loading && !error && (
        <div className="pt-16 pb-10 px-4 sm:px-6 lg:px-8 w-full overflow-hidden">
          {questions.length > 0 && currentQuestionIndex < questions.length ? (
            <>
              {filter !== "all" && (
                <div
                  className="fixed top-[4rem] left-0 w-full bg-gray-800 z-40 p-2 overflow-x-auto overflow-y-hidden flex space-x-2 items-center border-2 border-red-500"
                  style={{
                    height: '3rem',
                    opacity: 1,
                    visibility: 'visible',
                    position: 'fixed'
                  }}
                >
                  {(() => {
                    const filteredIndices = Array.from({ length: totalQuestions })
                      .map((_, i) => i)
                      .filter(i => filter === "all" || questionStatuses[i] === filter);

                    if (filteredIndices.length === 0) {
                      return (
                        <p className="text-white text-xs sm:text-sm">
                          No {filter} questions found.
                        </p>
                      );
                    }
                    return filteredIndices.map((actualIndex) => {
                      const status = questionStatuses[actualIndex] || "unattempted";
                      const isCurrent = actualIndex === currentQuestionIndex && !showExplanation;
                      const colorClass = isCurrent
                        ? "bg-gray-700"
                        : status === "correct"
                          ? "bg-green-500"
                          : status === "wrong"
                            ? "bg-red-500"
                            : "bg-white";
                      return (
                        <div
                          key={actualIndex}
                          className={`flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full ${colorClass} flex items-center justify-center text-gray-900 text-sm sm:text-base font-semibold shadow-md transition-colors duration-300 cursor-pointer`}
                          onClick={() => {
                            if (actualIndex < questions.length) {
                              setCurrentQuestionIndex(actualIndex);
                              setSelectedOption(userAnswers[actualIndex] || "");
                              setShowExplanation(false);
                            }
                          }}
                        >
                          {actualIndex + 1}
                        </div>
                      );
                    });
                  })()}
                </div>
              )}

              <div
                className="fixed left-0 w-full z-60 px-3 sm:px-4 lg:px-6 question-box bg-gray-900"
                style={{
                  top: '4rem',
                  height: 'calc((100dvh - 8rem) * 0.5)',
                }}
                onClick={() => score !== null && setShowExplanation(!showExplanation)}
              >
                <p className="text-sm sm:text-base text-white mb-1 question-number">
                  Question {currentQuestionIndex + 1} of {totalQuestions}
                </p>
                <div className="h-full font-medium text-white bg-gradient-to-br from-gray-800 to-blue-900 p-2 rounded-lg shadow-inner">
                  <div className="question-content leading-tight" style={{ fontSize: `${fontSize}px` }}>
                    {renderQuestion(questions[currentQuestionIndex].question, questions[currentQuestionIndex])}
                  </div>
                </div>
              </div>

              <div
                className="absolute left-0 w-full bg-gray-900 z-20 px-2 sm:px-8 lg:px-6"
                style={{
                  top: 'calc(4rem + (100dvh - 8rem) * 0.5)',
                  bottom: '4rem',
                }}
              >
                <div className="bg-gray-800 rounded-lg p-2 sm:p-2 h-full overflow-y-auto">
                  <div className="flex flex-col gap-0.5">
                    {Object.entries(questions[currentQuestionIndex].options).map(([key, option]) => {
                      const isUserAnswer = userAnswers[currentQuestionIndex] === key;
                      const isCorrectAnswer = questions[currentQuestionIndex].correctAnswer === key;
                      let baseClassName = `
                        w-full text-left p-5 sm:p-5 rounded-md border transition-colors duration-300
                        text-sm sm:text-lg
                        flex items-center justify-start
                        min-h-[2.5rem] sm:min-h-[3rem]
                        overflow-y-auto
                        focus:outline-none focus:ring-2 focus:ring-orange-400
                      `;
                      let stateClassName = score !== null
                        ? isUserAnswer && !isCorrectAnswer
                          ? "bg-red-600 border-red-500 text-white"
                          : isCorrectAnswer
                            ? "bg-emerald-600 border-emerald-500 text-white"
                            : "bg-gray-700 border-gray-600 text-zinc-300"
                        : selectedOption === key
                          ? "bg-orange-600 border-orange-400 text-white"
                          : "bg-gray-700 border-gray-600 text-zinc-300 hover:bg-gray-600 hover:border-gray-500";

                      return (
                        <button
                          key={key}
                          onClick={() => handleOptionSelect(key)}
                          className={`${baseClassName} ${stateClassName}`}
                          disabled={score !== null}
                        >
                          <span className="font-medium mr-2">{key})</span> {option}
                          {score !== null && isUserAnswer && !isCorrectAnswer && (
                            <span className="ml-2 text-red-300 font-medium text-[10px] sm:text-xs">(Wrong Answer)</span>
                          )}
                          {score !== null && isCorrectAnswer && (
                            <span className="ml-2 text-emerald-300 font-medium text-[10px] sm:text-xs">(Correct Answer)</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {score !== null && showExplanation && (
                  <div
                    className="absolute top-0 left-0 right-0 bottom-0 rounded-lg z-70 pointer-events-auto"
                    onClick={() => setShowExplanation(false)}
                  >
                    <div className="absolute top-0 left-0 right-0 bg-black/80 backdrop-blur-md p-2 sm:p-3 rounded-lg flex flex-col h-full">
                      <p className="text-base sm:text-lg font-medium text-zinc-200 mb-2">Explanation:</p>
                      <div className="flex-1 overflow-y-auto">
                        <p className="text-[16px] sm:text-xl text-zinc-200 leading-relaxed">
                          {questions[currentQuestionIndex].explanation}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handlePreviousQuestion}
                disabled={currentQuestionIndex === 0}
                className={`fixed bottom-2.5 left-2 px-6 py-1.5 text-sm sm:text-base rounded-full shadow-xl transition-transform transform hover:scale-105 duration-300 z-50 ${
                  currentQuestionIndex === 0
                    ? "bg-gray-400 text-gray-200 cursor-not-allowed border border-gray-300"
                    : "bg-red-700 text-white hover:bg-red-800 border border-red-700"
                } focus:outline-none focus:ring-2 focus:ring-blue-400`}
                style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.18)" }}
              >
                Previous
              </button>

              <div
                className="fixed bottom-2.5 left-1/2 transform -translate-x-1/2 question-upbar z-50"
              >
                <svg
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                </svg>
                <select
                  id="question-count-select"
                  onChange={(e) => handleQuestionCountSelect(e.target.value)}
                  className="text-gray-50"
                >
                  <option value="">Questions</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>

              <button
                onClick={currentQuestionIndex === totalQuestions - 1 ? submitTest : handleNextQuestion}
                disabled={score !== null}
                className={`fixed bottom-2.5 right-2 px-6 py-1.5 text-sm sm:text-base rounded-full shadow-xl transition-transform transform hover:scale-105 duration-300 border border-white/10 z-50 ${
                  score !== null
                    ? "bg-gray-300 text-gray-400 cursor-not-allowed"
                    : currentQuestionIndex === totalQuestions - 1
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "bg-white text-black hover:bg-gray-100"
                } focus:outline-none focus:ring-2 focus:ring-blue-400`}
                style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.18)" }}
              >
                {currentQuestionIndex === totalQuestions - 1 ? "Submit" : "Next"}
              </button>
            </>
          ) : testStarted && questions.length > 0 ? (
            <div className="p-4 bg-red-600 border border-gray-700 rounded-lg mx-auto max-w-sm sm:max-w-md text-center">
              <p className="text-sm sm:text-base text-white font-semibold">Error: Invalid question index. Please try again.</p>
              <button
                onClick={() => resetTest(totalQuestions)}
                className="mt-4 bg-blue-600 text-white px-4 py-1.5 text-sm sm:text-base rounded-full shadow-lg hover:bg-blue-700 transition-transform transform duration-300"
              >
                Reset Test
              </button>
            </div>
          ) : (
            <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg mx-auto max-w-sm sm:max-w-md text-center">
              <p className="text-sm sm:text-base text-gray-200 font-semibold">No questions loaded yet. Please try again.</p>
              <button
                onClick={() => {
                  setError(null);
                  fetchNewInitialMCQs();
                }}
                className="mt-4 bg-blue-600 text-white px-4 py-1.5 text-sm sm:text-base rounded-full shadow-lg hover:bg-blue-700 transition-transform transform duration-300"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      )}

      {!testStarted && !loading && !error && (
        <div className="fixed top-16 left-0 right-0 bottom-0 z-[999] flex items-center justify-center bg-gray-900">
          <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg mx-auto max-w-sm sm:max-w-md text-center">
            <p className="text-sm sm:text-base text-gray-200 font-semibold">Loading test... Please wait.</p>
            <button
              onClick={() => resetTest(totalQuestions)}
              className="mt-4 bg-blue-600 text-white px-4 py-1.5 text-sm sm:text-base rounded-full shadow-lg hover:bg-blue-700 transition-transform transform duration-300"
            >
              Start Test
            </button>
          </div>
        </div>
      )}
      
      {testStarted && (
        <div
          className="fixed top-16 right-0 h-[calc(100vh-4rem)] w-64 sm:w-72 bg-gray-800 shadow-lg z-[9999] transition-all duration-300 ease-in-out"
          style={{ right: showSidebar ? "0" : "-288px" }}
        >
          <div className="p-4 sm:p-6 h-full flex flex-col relative">
            {score !== null && (
              <button
                onClick={() => setShowResultsPage(true)}
                className="bg-blue-600 text-white px-3 py-1.5 text-sm sm:text-base rounded-md hover:bg-blue-700 transition-transform duration-300 mb-4"
              >
                View Results
              </button>
            )}
            <div className="mb-4 z-10">
              <label className="block text-xs sm:text-sm font-semibold text-blue-300 mb-1" htmlFor="sidebar-filter-select">
                Filter
              </label>
              <select
                id="sidebar-filter-select"
                value={filter}
                onChange={(e) => handleFilterChange(e.target.value)}
                className="w-full text-gray-50 bg-gray-700 px-4 py-1.5 text-sm sm:text-base rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-200"
              >
                <option value="all">All Questions</option>
                <option value="correct">Correct Answers</option>
                <option value="wrong">Wrong Answers</option>
                <option value="unattempted">Unattempted</option>
              </select>
            </div>

            <div className="flex-1 overflow-y-auto">
              <h3 className={`text-sm sm:text-base font-semibold text-white mb-2 p-2 rounded-lg ${filter === "wrong" ? "bg-red-500" : "bg-gray-700"}`}>
                Question Progress
              </h3>
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: totalQuestions }).map((_, actualIndex) => {
                  const status = questionStatuses[actualIndex] || "unattempted";
                  const isCurrent = actualIndex === currentQuestionIndex && !showExplanation;
                  let colorClass = score !== null
                    ? status === "correct"
                      ? "bg-green-500"
                      : status === "wrong"
                        ? "bg-red-500"
                        : "bg-white"
                    : actualIndex <= maxQuestionReached
                      ? userAnswers[actualIndex]
                        ? "bg-blue-200"
                        : "bg-white"
                      : "bg-gray-200";
                  
                  if (isCurrent && score !== null) {
                    colorClass = `${colorClass} ring-2 ring-white`;
                  }

                  return (
                    <div
                      key={actualIndex}
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg ${colorClass} flex items-center justify-center text-gray-900 text-xs sm:text-sm font-semibold shadow-md transition-transform duration-200 cursor-pointer hover:scale-105`}
                      onClick={() => {
                        if (actualIndex < questions.length) {
                          setCurrentQuestionIndex(actualIndex);
                          setSelectedOption(userAnswers[actualIndex] || "");
                          setShowExplanation(false);
                        }
                      }}
                    >
                      {actualIndex + 1}
                    </div>
                  );
                })}
              </div>
              {score === null && (
                <button
                  onClick={submitTest}
                  className="w-full mt-4 px-4 py-1.5 text-sm sm:text-base rounded-full shadow-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-transform duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  Submit Test
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Battleground;
