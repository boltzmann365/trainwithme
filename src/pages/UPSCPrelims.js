import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, Profile } from "../App";

const UPSCPrelims = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [battlegroundStarted, setBattlegroundStarted] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [bufferedMCQs, setBufferedMCQs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [error, setError] = useState(null);
  const [score, setScore] = useState(null);
  const [timeLeft, setTimeLeft] = useState(60 * 60); // 60 minutes
  const [reviewMode, setReviewMode] = useState(false);
  const [rankingMode, setRankingMode] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [nextButtonState, setNextButtonState] = useState("white");
  const [isFetchingNext, setIsFetchingNext] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [fontSize, setFontSize] = useState(24); // Initial font size for dynamic adjustment
  const userId = useRef(user ? user.uid : Math.random().toString(36).substring(7)).current;
  const isFetchingRef = useRef(false);
  const timerRef = useRef(null);

  const TOTAL_QUESTIONS = 100;
  const API_URL = process.env.REACT_APP_API_URL || "https://trainwithme-backend.onrender.com";

  // Start Battleground
  const startBattleground = async () => {
    if (!user) {
      console.log("startBattleground: User not logged in, redirecting to login");
      navigate("/login", { state: { from: "/upsc-prelims" } });
      return;
    }
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    setLoadingMessage("Loading Battleground MCQs...");
    setBattlegroundStarted(true);
    setError(null);
    setQuestions([]);
    setUserAnswers([]);
    setBufferedMCQs([]);
    setCurrentQuestionIndex(0);
    setScore(null);
    setTimeLeft(60 * 60);
    setReviewMode(false);
    setRankingMode(false);
    setSelectedOption(null);
    setNextButtonState("white");
    setIsFetchingNext(false);
    setShowExplanation(false);

    const initialMCQs = await fetchSingleMCQ(0, 2, 0, false);
    setLoading(false);
    isFetchingRef.current = false;

    if (initialMCQs && !initialMCQs.error && initialMCQs.length === 2) {
      setQuestions([initialMCQs[0]]);
      setUserAnswers([null]);
      setBufferedMCQs([initialMCQs[1]]);
      console.log("startBattleground: Displayed MCQ 1, buffered 1 MCQ (cached)");
    } else {
      setError(initialMCQs?.error || "Failed to fetch initial MCQs for Battleground.");
      setNextButtonState("white");
      setIsFetchingNext(false);
    }
  };

  const SUBJECTS = [
    { path: "/polity", name: "Polity", color: "from-blue-500 to-blue-700", hoverColor: "from-blue-600 to-blue-800" },
    { path: "/history", name: "History", color: "from-purple-500 to-purple-700", hoverColor: "from-purple-600 to-purple-800" },
    { path: "/geography", name: "Geography", color: "from-green-500 to-green-700", hoverColor: "from-green-600 to-green-800" },
    { path: "/science", name: "Science", color: "from-yellow-500 to-yellow-700", hoverColor: "from-yellow-600 to-yellow-800" },
    { path: "/environment", name: "Environment", color: "from-teal-500 to-teal-700", hoverColor: "from-teal-600 to-teal-800" },
    { path: "/economy", name: "Economy", color: "from-red-500 to-red-700", hoverColor: "from-red-600 to-red-800" },
    { path: "/csat", name: "CSAT", color: "from-gray-500 to-gray-700", hoverColor: "from-gray-600 to-gray-800" },
    { path: "/current-affairs", name: "Current Affairs", color: "from-indigo-500 to-indigo-700", hoverColor: "from-indigo-600 to-indigo-800" },
    { path: "/previous-year-papers", name: "Previous Year Papers", color: "from-cyan-500 to-cyan-700", hoverColor: "from-cyan-600 to-cyan-800" },
  ];

  // Dynamic font size adjustment for question content
  useEffect(() => {
    if (battlegroundStarted || reviewMode) {
      const questionBox = document.querySelector('.question-box');
      const content = document.querySelector('.question-content');
      const questionNumber = document.querySelector('.question-number');
      const subjectText = document.querySelector('.subject-text');
      if (questionBox && content) {
        let pElementsHeight = 0;
        if (questionNumber) {
          const style = window.getComputedStyle(questionNumber);
          pElementsHeight += questionNumber.offsetHeight + parseFloat(style.marginBottom);
        }
        if (subjectText) {
          const style = window.getComputedStyle(subjectText);
          pElementsHeight += subjectText.offsetHeight + parseFloat(style.marginBottom);
        }

        const paddingHeight = 16; // 8px top + 8px bottom
        const effectiveHeight = questionBox.clientHeight - pElementsHeight - paddingHeight;

        let currentFontSize = 24;
        content.style.fontSize = `${currentFontSize}px`;
        while (content.scrollHeight > effectiveHeight && currentFontSize > 8) {
          currentFontSize -= 1;
          content.style.fontSize = `${currentFontSize}px`;
        }
        setFontSize(currentFontSize);
      }
    }
  }, [questions, currentQuestionIndex, battlegroundStarted, reviewMode]);

  // Fetch leaderboard
  const fetchLeaderboard = async () => {
    try {
      const res = await fetch(`${API_URL}/battleground/leaderboard`, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setLeaderboard(data.rankings || []);
    } catch (error) {
      console.error("fetchLeaderboard error:", error.message);
    }
  };

  // Fetch MCQs for Battleground
  const fetchSingleMCQ = async (questionIndex, count = 1, retryCount = 0, forceGenerate = false) => {
    const maxRetries = 2;
    try {
      const randomSubject = SUBJECTS.slice(1).map(s => s.name)[Math.floor(Math.random() * (SUBJECTS.length - 1))]; // Exclude Prelims Battleground
      const payload = {
        mode: "battleground",
        userId: `${userId}-${questionIndex}`,
        count,
        forceGenerate,
        category: randomSubject,
        chapter: "entire-book"
      };
      console.log(`fetchSingleMCQ: Requesting ${count} MCQ(s), index: ${questionIndex}, subject: ${randomSubject}, forceGenerate: ${forceGenerate}`);
      const res = await fetch(`${API_URL}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        console.error(`fetchSingleMCQ: HTTP error, status: ${res.status}`);
        if (res.status === 500 && retryCount < maxRetries) {
          console.log(`Retrying fetchSingleMCQ, attempt ${retryCount + 1}/${maxRetries}`);
          return await fetchSingleMCQ(questionIndex, count, retryCount + 1, forceGenerate);
        }
        return { error: `Failed to fetch MCQ: HTTP ${res.status}` };
      }

      const data = await res.json();
      if (!data || !data.answers) {
        console.error("fetchSingleMCQ: No answers in response:", data);
        return { error: "No MCQ data returned from server" };
      }

      let mcqs = [];
      if (count === 1) {
        if (!data.answers.question || !data.answers.options || !data.answers.correctAnswer || !data.answers.explanation) {
          console.error("fetchSingleMCQ: Invalid single MCQ format:", data.answers);
          return { error: "Invalid single MCQ format" };
        }
        const question = Array.isArray(data.answers.question)
          ? data.answers.question.filter(line => typeof line === "string" && line.trim())
          : typeof data.answers.question === "string"
          ? data.answers.question.split("\n").map(line => line.trim()).filter(line => line)
          : [];
        if (question.length === 0) {
          console.error("fetchSingleMCQ: Empty or invalid question:", data.answers.question);
          return { error: "Invalid question format" };
        }
        mcqs = [{
          question,
          options: data.answers.options,
          correctAnswer: data.answers.correctAnswer,
          explanation: data.answers.explanation,
          category: randomSubject,
          chapter: "entire-book"
        }];
      } else {
        if (!Array.isArray(data.answers) || data.answers.length !== count) {
          console.error("fetchSingleMCQ: Invalid multiple MCQ format or count mismatch:", data.answers);
          return { error: "Invalid multiple MCQ format" };
        }
        mcqs = data.answers.map((mcq, idx) => {
          if (!mcq || !mcq.options || !mcq.correctAnswer || !mcq.explanation) {
            console.error(`fetchSingleMCQ: Invalid MCQ at index ${idx}:`, mcq);
            return null;
          }
          const question = Array.isArray(mcq.question)
            ? mcq.question.filter(line => typeof line === "string" && line.trim())
            : typeof mcq.question === "string"
            ? mcq.question.split("\n").map(line => line.trim()).filter(line => line)
            : [];
          if (question.length === 0) {
            console.error(`fetchSingleMCQ: Empty or invalid question at index ${idx}:`, mcq.question);
            return null;
          }
          return {
            question,
            options: mcq.options,
            correctAnswer: mcq.correctAnswer,
            explanation: mcq.explanation,
            category: randomSubject,
            chapter: "entire-book"
          };
        });
        if (mcqs.includes(null)) {
          console.error("fetchSingleMCQ: One or more MCQs invalid:", mcqs);
          return { error: "One or more MCQs invalid" };
        }
      }

      console.log(`fetchSingleMCQ: Successfully fetched ${mcqs.length} MCQ(s)`);
      return mcqs;
    } catch (error) {
      console.error(`fetchSingleMCQ: Error fetching ${count} MCQ(s), index ${questionIndex}:`, error.message);
      if (retryCount < maxRetries) {
        console.log(`Retrying fetchSingleMCQ, attempt ${retryCount + 1}/${maxRetries}`);
        return await fetchSingleMCQ(questionIndex, count, retryCount + 1, forceGenerate);
      }
      return { error: `Failed to fetch MCQ: ${error.message}` };
    }
  };

  // Handle option selection
  const handleOptionSelect = (option) => {
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestionIndex] = option;
    setUserAnswers(newAnswers);
    setSelectedOption(option);
  };

  // Handle next question
  const handleNextQuestion = async () => {
    if (isFetchingNext || nextButtonState === "red") return;

    const newAnswers = [...userAnswers];
    newAnswers[currentQuestionIndex] = selectedOption;
    setUserAnswers(newAnswers);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedOption(userAnswers[currentQuestionIndex + 1]);
      setShowExplanation(false); // Ensure explanation is hidden in Battleground mode
      setNextButtonState("white"); // Ensure button is white for existing questions
      setIsFetchingNext(false);
      console.log(`handleNextQuestion: Showing existing MCQ, index: ${currentQuestionIndex + 2}`);
      return;
    }

    if (bufferedMCQs.length > 0 && questions.length < TOTAL_QUESTIONS) {
      const nextMCQ = bufferedMCQs[0];
      setQuestions((prev) => [...prev, nextMCQ]);
      setUserAnswers((prev) => [...prev, null]);
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setBufferedMCQs([]);
      setSelectedOption(null);
      setShowExplanation(false); // Ensure explanation is hidden for new question
      console.log(`handleNextQuestion: Displayed buffered MCQ, index: ${currentQuestionIndex + 2}`);

      setNextButtonState("red");
      setIsFetchingNext(true);

      const newMCQ = await fetchSingleMCQ(questions.length, 1, 0, true);
      if (newMCQ && !newMCQ.error) {
        setBufferedMCQs([newMCQ[0]]);
        setNextButtonState("white");
        console.log("handleNextQuestion: Buffered new MCQ (force-generated), buffer size: 1");
      } else {
        setError(newMCQ?.error || "Failed to generate a new MCQ.");
        setNextButtonState("white");
        setIsFetchingNext(false);
      }

      setIsFetchingNext(false);
    } else if (questions.length < TOTAL_QUESTIONS) {
      setError("No buffered MCQ available.");
      setNextButtonState("white");
      setIsFetchingNext(false);
    }
  };

  // Handle previous question
  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setSelectedOption(userAnswers[currentQuestionIndex - 1]);
      setShowExplanation(false); // Hide explanation in Battleground mode
      setNextButtonState("white"); // Ensure Next button is enabled
      setIsFetchingNext(false); // No fetch in progress
      console.log(`handlePreviousQuestion: Showing previous MCQ, index: ${currentQuestionIndex}`);
    }
  };

  // Evaluate test
  const evaluateTest = async () => {
    let newAnswers = [...userAnswers];
    if (selectedOption !== null) {
      newAnswers[currentQuestionIndex] = selectedOption;
      setUserAnswers(newAnswers);
    }

    let correctCount = 0;
    let incorrectCount = 0;
    let nonAttemptedCount = 0;

    newAnswers.forEach((answer, index) => {
      if (answer === null) {
        nonAttemptedCount++;
      } else if (answer === questions[index].correctAnswer) {
        correctCount++;
      } else {
        incorrectCount++;
      }
    });

    const totalScore = (correctCount * 2) - (incorrectCount * 0.66);
    const roundedScore = Math.round(totalScore * 100) / 100;
    setScore(roundedScore);

    setBattlegroundStarted(false);
    setTimeLeft(0);
    clearInterval(timerRef.current);
    setReviewMode(true);
    setRankingMode(false);
    setCurrentQuestionIndex(0);
    setSelectedOption(newAnswers[0]);
    setShowExplanation(true); // Show explanations in review mode

    try {
      const res = await fetch(`${API_URL}/battleground/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: user.username,
          score: roundedScore
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setLeaderboard(data.rankings || []);
    } catch (error) {
      console.error("evaluateTest: Failed to submit score:", error.message);
    }
  };

  // Reset test
  const resetTest = () => {
    setBattlegroundStarted(false);
    setQuestions([]);
    setUserAnswers([]);
    setBufferedMCQs([]);
    setCurrentQuestionIndex(0);
    setScore(null);
    setTimeLeft(60 * 60);
    setError(null);
    setReviewMode(false);
    setRankingMode(false);
    setSelectedOption(null);
    setNextButtonState("white");
    setIsFetchingNext(false);
    setShowExplanation(false);
    clearInterval(timerRef.current);
    console.log("resetTest: State reset");
  };

  // Review mode navigation
  const handlePreviousReviewQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setShowExplanation(true); // Keep explanation visible in review mode
    }
  };

  const handleNextReviewQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setShowExplanation(true); // Keep explanation visible in review mode
    }
  };

  // Format time
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Render question
  const renderQuestion = (questionLines, mcq) => {
    if (!questionLines || !Array.isArray(questionLines) || !mcq) {
      console.error("renderQuestion: Invalid questionLines or mcq", { questionLines, mcq });
      return <p className="text-red-200">Error: Question content missing</p>;
    }

    const isTableBasedQuestion = questionLines.some((line) => line.includes("    ")) && questionLines.some((line) => /^\([A-D]\)/.test(line));
    const isAssertionReasonQuestion = questionLines.some((line) => line.startsWith("Assertion (A):")) && questionLines.some((line) => line.startsWith("Reason (R):"));
    const isStatementBasedQuestion = questionLines.some((line) => /^\d+\./.test(line)) && (
      questionLines.some((line) => line.includes("Which of the statements given above is/are correct?")) ||
      questionLines.some((line) => line.includes("How many of the above statements are correct?"))
    );
    const isChronologicalOrderQuestion = questionLines.some((line) => line.includes("Arrange the following")) && questionLines.some((line) => line.includes("chronological order"));
    const isCorrectlyMatchedPairsQuestion = questionLines.some((line) => line.includes("Consider the following pairs")) && questionLines.some((line) => line.includes("Which of the pairs are correctly matched?"));
    const isDirectQuestion = !isStatementBasedQuestion && !isAssertionReasonQuestion && !isTableBasedQuestion && !isChronologicalOrderQuestion && !isCorrectlyMatchedPairsQuestion;

    if (isTableBasedQuestion) {
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

    if (isAssertionReasonQuestion) {
      const assertionLine = questionLines.find((line) => line.startsWith("Assertion (A):"));
      const reasonLine = questionLines.find((line) => line.startsWith("Reason (R):"));
      if (!assertionLine || !reasonLine) {
        console.error("renderQuestion: Assertion-Reason structure incomplete", questionLines);
        return <p className="text-red-200">Error: Incomplete Assertion-Reason question</p>;
      }
      return (
        <div className="mb-2">
          <p className="mb-1 text-ivory">{assertionLine}</p>
          <p className="mb-1 text-ivory">{reasonLine}</p>
        </div>
      );
    }

    if (isStatementBasedQuestion) {
      return (
        <div className="mb-2">
          {questionLines.map((line, index) => {
            const isIntro = index === 0;
            const isClosing = line.includes("How many of the above statements are correct?");
            return (
              <p
                key={index}
                className={`mb-1 ${isIntro || isClosing ? "text-cosmic-dark" : "text-ivory"}`}
              >
                {line}
              </p>
            );
          })}
        </div>
      );
    }

    if (isChronologicalOrderQuestion) {
      const introLine = questionLines[0];
      const closingLineIndex = questionLines.findIndex((line) => line.includes("Select the correct order")) !== -1
        ? questionLines.findIndex((line) => line.includes("Select the correct order"))
        : questionLines.length;
      const items = questionLines.slice(1, closingLineIndex);
      const closingLine = closingLineIndex < questionLines.length ? questionLines[closingLineIndex] : "Select the correct order:";

      if (items.length !== 4) {
        console.error("renderQuestion: Chronological order question does not have exactly 4 items", items);
        return <p className="text-red-200">Error: Incomplete chronological order question</p>;
      }

      return (
        <div className="mb-2">
          <p className="mb-1 text-ivory">{introLine}</p>
          {items.map((item, index) => (
            <p key={index} className="mb-1 text-ivory">{item}</p>
          ))}
          <p className="mb-1 text-ivory">{closingLine}</p>
        </div>
      );
    }

    if (isCorrectlyMatchedPairsQuestion) {
      const introLine = questionLines[0];
      const closingLineIndex = questionLines.findIndex((line) => line.includes("Which of the pairs are correctly matched?"));
      if (closingLineIndex === -1) {
        console.error("renderQuestion: Correctly matched pairs question missing closing line", questionLines);
        return <p className="text-red-200">Error: Incomplete correctly matched pairs question</p>;
      }
      const pairs = questionLines.slice(1, closingLineIndex);
      const closingLine = questionLines[closingLineIndex];

      if (pairs.length < 3) {
        console.error("renderQuestion: Correctly matched pairs question does not have enough pairs", pairs);
        return <p className="text-red-200">Error: Incomplete correctly matched pairs question</p>;
      }

      return (
        <div className="mb-2">
          <p className="mb-1 text-ivory">{introLine}</p>
          {pairs.map((pair, index) => (
            <p key={index} className="mb-1 text-ivory">{pair}</p>
          ))}
          <p className="mb-1 text-ivory">{closingLine}</p>
        </div>
      );
    }

    if (isDirectQuestion) {
      return (
        <div className="mb-2">
          {questionLines.map((line, index) => (
            <p key={index} className="mb-1 text-ivory">{line}</p>
          ))}
        </div>
      );
    }

    console.error("renderQuestion: Unknown MCQ structure:", questionLines);
    return (
      <div className="mb-2">
        {questionLines.map((line, index) => (
          <p key={index} className="mb-1 text-ivory">{line}</p>
        ))}
      </div>
    );
  };

  // Timer effect
  useEffect(() => {
    if (battlegroundStarted && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            evaluateTest();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [battlegroundStarted, timeLeft]);

  // Fetch leaderboard on mount
  useEffect(() => {
    fetchLeaderboard();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      isFetchingRef.current = false;
    };
  }, []);

  // Handle navigation
  const handleGoBack = () => {
    if (battlegroundStarted) {
      resetTest();
    } else if (score !== null) {
      resetTest();
    } else {
      navigate(-1);
    }
  };

  const handleLogin = () => {
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

  return (
    <div className="min-h-screen bg-gray-900 text-white font-poppins overflow-hidden overscroll-none">
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
          {battlegroundStarted && (
            <span className="bg-yellow-600/20 px-3 py-2 rounded-md text-yellow-400 font-semibold text-sm sm:text-lg">
              Time Left: {formatTime(timeLeft)}
            </span>
          )}
          {battlegroundStarted && !reviewMode && (
            <button
              onClick={evaluateTest}
              className="bg-emerald-500 text-gray-50 px-3 py-2 rounded-md hover:bg-emerald-600 transition-transform transform hover:scale-105 duration-300 text-xs sm:text-base line-clamp-2"
            >
              Submit Test
            </button>
          )}
          {(reviewMode || (score !== null && !battlegroundStarted && !rankingMode)) && (
            <>
              <span className="bg-blue-600/20 px-3 py-2 rounded-md text-blue-400 font-semibold text-sm sm:text-lg">
                Score: {score}/200
              </span>
              <button
                onClick={() => {
                  setRankingMode(true);
                  if (battlegroundStarted) setBattlegroundStarted(false);
                }}
                className="bg-purple-600 text-gray-50 px-3 py-2 rounded-md hover:bg-purple-700 transition-transform transform hover:scale-105 duration-300 text-xs sm:text-base line-clamp-2"
              >
                Leaderboard
              </button>
            </>
          )}
          {(!battlegroundStarted && !reviewMode && !rankingMode) && (user ? (
            <Profile />
          ) : (
            <button
              onClick={handleLogin}
              className="bg-blue-600 text-gray-50 px-3 py-2 rounded-md hover:bg-blue-700 transition-transform transform hover:scale-105 duration-300 text-xs sm:text-base"
            >
              Login
            </button>
          ))}
        </div>
      </nav>

      <div className="pt-16 pb-10 px-4 sm:px-6 lg:px-8 w-full overflow-hidden">
        {!battlegroundStarted && !reviewMode && !rankingMode && score === null && (
          <div className="h-[calc(100vh-4rem)] w-full overflow-y-auto">
            {/* Enter Prelims Battleground Button Section */}
            <div className="pt-8 pb-6 flex justify-center">
              <button
                onClick={startBattleground}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-lg shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105 text-lg sm:text-xl font-semibold"
              >
                Enter Prelims Battleground
              </button>
            </div>

            {/* Separator and Subjects Header */}
            <div className="text-center mb-6">
              <p className="text-gray-400 text-lg sm:text-xl font-medium">OR</p>
              <h3 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-50 tracking-tight">
                Choose Your Prelims Subject
              </h3>
            </div>

            {/* Subjects Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 px-2 sm:px-4 lg:px-8">
              {SUBJECTS.map((subject, index) => (
                <Link
                  key={index}
                  to={subject.path}
                  onClick={handleSubjectClick(subject.path, subject.action)}
                >
                  <div className="relative w-full h-48 sm:h-56 lg:h-64 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105 hover:shadow-2xl group cursor-pointer bg-gradient-to-br from-gray-800 to-gray-900">
                    {/* Book Spine Effect */}
                    <div className="absolute left-0 top-0 bottom-0 w-4 sm:w-6 bg-gray-800 opacity-80 rounded-l-lg shadow-lg">
                      <div className="h-full w-1 bg-gray-700 opacity-90 absolute left-0 top-0"></div>
                    </div>
                    {/* Book Cover */}
                    <div className="absolute left-4 sm:left-6 right-0 top-0 bottom-0 bg-gradient-to-br from-gray-800 to-gray-900 rounded-r-lg p-4 sm:p-6 flex flex-col justify-center items-center">
                      <span className="text-white text-center font-bold text-sm sm:text-lg lg:text-xl line-clamp-3">
                        {subject.name}
                      </span>
                    </div>
                    {/* 3D Shadow Effect */}
                    <div className="absolute inset-0 rounded-lg shadow-[inset_-2px_2px_8px_rgba(0,0,0,0.3)] group-hover:shadow-[inset_-4px_4px_12px_rgba(0,0,0,0.4)] transition-shadow duration-300"></div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {(battlegroundStarted || reviewMode) && !rankingMode && (
          <>
            {loading ? (
              <div className="flex justify-center items-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-400"></div>
                <p className="ml-2 text-base sm:text-lg font-semibold text-blue-400">{loadingMessage}</p>
              </div>
            ) : error ? (
              <div className="p-4 bg-red-950 border border-red-700 rounded-lg mx-auto max-w-2xl">
                <p className="text-base sm:text-lg text-red-200">{error}</p>
                <button
                  onClick={resetTest}
                  className="mt-4 bg-purple-600 text-gray-50 px-4 py-2 rounded-full shadow-lg hover:bg-purple-700 transition-transform transform hover:scale-105 duration-300"
                >
                  Try Again
                </button>
              </div>
            ) : questions.length > 0 && questions[currentQuestionIndex] ? (
              <>
                {/* Question Box - 50% of space between top and bottom bars */}
                <div 
                  className="fixed left-0 w-full z-60 px-3 sm:px-4 lg:px-6 question-box bg-gray-900"
                  style={{
                    top: '4rem',
                    height: 'calc((100dvh - 8rem) * 0.5)',
                  }}
                >
                  <p className="text-sm sm:text-base text-white mb-1 question-number">
                    Question {currentQuestionIndex + 1} of {battlegroundStarted ? TOTAL_QUESTIONS : questions.length}
                  </p>
                  <p className="text-xs sm:text-sm text-white/80 mb-1 subject-text">
                    Subject: {questions[currentQuestionIndex].category}
                  </p>
                  <div className="h-full font-medium text-white bg-gradient-to-br from-gray-800 to-blue-900 p-2 rounded-lg shadow-inner">
                    <div className="question-content leading-tight" style={{ fontSize: `${fontSize}px` }}>
                      {renderQuestion(questions[currentQuestionIndex].question, questions[currentQuestionIndex])}
                    </div>
                  </div>
                </div>

                {/* Gap Between Question Box and Options */}
                <div 
                  className="w-full absolute left-0 bg-gray-800 z-30"
                  style={{
                    top: 'calc(4rem + (100dvh - 8rem) * 0.5)',
                    height: '1rem',
                  }}
                />

                {/* Options Box - Takes remaining space below the gap, stopping 1rem above bottom bar */}
                <div 
                  className="absolute left-0 w-full bg-gray-900 z-20 px-8 sm:px-8 lg:px-6"
                  style={{ 
                    top: 'calc(4rem + (100dvh - 8rem) * 0.5 + 1rem)',
                    height: 'calc((100dvh - 12rem) * 0.5)',
                  }}
                >
                  <div className="bg-gray-800 rounded-lg p-2 sm:p-3 h-full">
                    <div className="flex flex-col h-full gap-0.5">
                      {Object.entries(questions[currentQuestionIndex].options).map(([key, option]) => {
                        const isUserAnswer = userAnswers[currentQuestionIndex] === key;
                        const isCorrectAnswer = questions[currentQuestionIndex].correctAnswer === key;
                        let baseClassName = `
                          w-full text-left p-1 sm:p-2 rounded-md border transition-colors duration-300 
                          ${option.length <= 50 ? "text-[18px]" : 
                            option.length <= 100 ? "text-[16px]" : 
                            option.length <= 150 ? "text-[9px]" : 
                            option.length <= 200 ? "text-[9px]" : "text-[9px]"}
                          sm:${option.length <= 50 ? "text-xl" : 
                            option.length <= 100 ? "text-xl" : 
                            option.length <= 150 ? "text-xl" : 
                            option.length <= 200 ? "text-xs" : "text-xs"}
                          flex items-center justify-start flex-1
                          focus:outline-none focus:ring-2 focus:ring-orange-400
                        `;
                        let stateClassName = "";
                        if (reviewMode || showExplanation) {
                          if (isUserAnswer && !isCorrectAnswer) {
                            stateClassName = "bg-red-600 border-red-500 text-white";
                          } else if (isCorrectAnswer) {
                            stateClassName = "bg-emerald-600 border-emerald-500 text-white";
                          } else {
                            stateClassName = "bg-gray-700 border-gray-600 text-zinc-300";
                          }
                        } else {
                          stateClassName = selectedOption === key
                            ? "bg-orange-600 border-orange-400 text-white"
                            : "bg-gray-700 border-gray-600 text-zinc-300 hover:bg-gray-600 hover:border-gray-500";
                        }

                        return (
                          <button
                            key={key}
                            onClick={() => !reviewMode && handleOptionSelect(key)}
                            className={`${baseClassName} ${stateClassName}`}
                            disabled={reviewMode}
                          >
                            <span className="font-medium mr-2">{key})</span> {option}
                            {(reviewMode || showExplanation) && isUserAnswer && !isCorrectAnswer && (
                              <span className="ml-2 text-red-300 font-medium text-[10px] sm:text-xs">(Your Answer)</span>
                            )}
                            {(reviewMode || showExplanation) && isCorrectAnswer && (
                              <span className="ml-2 text-emerald-300 font-medium text-[10px] sm:text-xs">(Correct Answer)</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {(reviewMode || showExplanation) && (
                    <div
                      className="absolute top-0 left-0 right-0 bottom-0 rounded-lg z-70"
                      onClick={() => setShowExplanation(!showExplanation)}
                    >
                      {showExplanation && (
                        <div className="absolute top-0 left-0 right-0 bg-black/80 p-2 sm:p-3 rounded-lg flex flex-col h-full">
                          <p className="text-base sm:text-lg font-medium text-zinc-200 mb-2">Explanation:</p>
                          <p
                            className={`
                              text-zinc-200 leading-relaxed
                              ${questions[currentQuestionIndex].explanation.length <= 100 ? "text-[24px]" : 
                                questions[currentQuestionIndex].explanation.length <= 200 ? "text-[18px]" : 
                                questions[currentQuestionIndex].explanation.length <= 300 ? "text-[15px]" : 
                                questions[currentQuestionIndex].explanation.length <= 400 ? "text-[14px]" : 
                                questions[currentQuestionIndex].explanation.length <= 500 ? "text-[14px]" :
                                questions[currentQuestionIndex].explanation.length <= 600 ? "text-[12px]" : "text-[12px]"}
                              sm:${questions[currentQuestionIndex].explanation.length <= 100 ? "text-6xl" : 
                                questions[currentQuestionIndex].explanation.length <= 200 ? "text-5xl" : 
                                questions[currentQuestionIndex].explanation.length <= 300 ? "text-4xl" : 
                                questions[currentQuestionIndex].explanation.length <= 400 ? "text-2xl" : "text-2xl"}
                              line-clamp-12
                            `}
                          >
                            {questions[currentQuestionIndex].explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Gap Between Options Box and Bottom Bar */}
                <div 
                  className="w-full absolute left-0 bg-gray-800 z-40"
                  style={{
                    bottom: '4rem',
                    height: '1rem',
                  }}
                />

                <div className="fixed bottom-0 left-0 w-full bg-[#1F2526]/80 backdrop-blur-md p-4 flex justify-between items-center shadow-lg z-50">
                  <button
                    onClick={reviewMode ? handlePreviousReviewQuestion : handlePreviousQuestion}
                    disabled={currentQuestionIndex === 0}
                    className={`px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base rounded-full shadow-lg transition-transform transform hover:scale-105 duration-300 ${
                      currentQuestionIndex === 0
                        ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                        : "bg-purple-600 text-gray-50 hover:bg-purple-700"
                    } focus:outline-none focus:ring-2 focus:ring-blue-400`}
                  >
                    Previous
                  </button>
                  <button
                    onClick={reviewMode ? handleNextReviewQuestion : handleNextQuestion}
                    disabled={
                      reviewMode
                        ? currentQuestionIndex === questions.length - 1
                        : nextButtonState === "red" || isFetchingNext || (currentQuestionIndex === questions.length - 1 && bufferedMCQs.length === 0)
                    }
                    className={`px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base rounded-full shadow-lg transition-transform transform hover:scale-105 duration-300 ${
                      (reviewMode && currentQuestionIndex === questions.length - 1) ||
                      (!reviewMode && (nextButtonState === "red" || isFetchingNext || (currentQuestionIndex === questions.length - 1 && bufferedMCQs.length === 0)))
                        ? "bg-red-400 text-gray-50 cursor-not-allowed"
                        : "bg-white text-black hover:bg-gray-200"
                    } focus:outline-none focus:ring-2 focus:ring-blue-400`}
                  >
                    Next
                  </button>
                </div>
              </>
            ) : (
              <div className="p-4 bg-red-950 border border-red-700 rounded-lg mx-auto max-w-2xl">
                <p className="text-base sm:text-lg text-red-200">
                  Error: Invalid question index. Please reset the test.
                </p>
                <button
                  onClick={resetTest}
                  className="mt-4 bg-purple-600 text-gray-50 px-4 py-2 rounded-full shadow-lg hover:bg-purple-700 transition-transform transform hover:scale-105 duration-300"
                >
                  Reset Test
                </button>
              </div>
            )}
          </>
        )}

        {score !== null && !battlegroundStarted && !reviewMode && !rankingMode && (
          <div className="pt-10 pb-10 px-4 sm:px-6 lg:px-8 w-full">
            <div className="bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 lg:p-8 mx-auto max-w-3xl">
              <h3 className="text-2xl sm:text-3xl font-semibold text-gray-50 mb-4 text-center">
                Prelims Battleground Results
              </h3>
              <p className="text-lg sm:text-xl text-zinc-300 mb-6 text-center">
                You scored <span className="font-bold text-blue-400">{score}</span> out of 200!
              </p>
              <div className="flex flex-wrap gap-3 sm:gap-4 justify-center">
                <button
                  onClick={() => {
                    setReviewMode(true);
                    setCurrentQuestionIndex(0);
                    setShowExplanation(true);
                  }}
                  className="bg-blue-600 text-gray-50 px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base rounded-full shadow-lg hover:bg-blue-700 transition-transform transform hover:scale-105 duration-300"
                >
                  Answers and Solutions
                </button>
              </div>
            </div>
          </div>
        )}

        {rankingMode && (
          <div className="pt-10 pb-10 px-4 sm:px-6 lg:px-8 w-full">
            <div className="bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 lg:p-8 mx-auto max-w-3xl">
              <h3 className="text-2xl sm:text-3xl font-semibold text-gray-50 mb-4 text-center">
                Leaderboard Rankings
              </h3>
              {leaderboard.length > 0 ? (
                <div className="overflow-y-auto max-h-96">
                  <table className="w-full text-left text-zinc-300">
                    <thead>
                      <tr className="border-b border-gray-600">
                        <th className="px-2 sm:px-4 py-2">Position</th>
                        <th className="px-2 sm:px-4 py-2">Username</th>
                        <th className="px-2 sm:px-4 py-2">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map((entry, index) => {
                        const position = index === 0 ? "1st" : index === 1 ? "2nd" : index === 2 ? "3rd" : `${index + 1}th`;
                        return (
                          <tr key={index} className="border-b border-gray-700">
                            <td className="px-2 sm:px-4 py-2">{position}</td>
                            <td className="px-2 sm:px-4 py-2">{entry.username}</td>
                            <td className="px-2 sm:px-4 py-2">{entry.score}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-zinc-300 text-center">No rankings available yet.</p>
              )}
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => {
                    setRankingMode(false);
                    if (score !== null) {
                      setReviewMode(true);
                      setCurrentQuestionIndex(0);
                      setShowExplanation(true);
                    }
                  }}
                  className="bg-gray-600 text-gray-50 px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base rounded-full shadow-lg hover:bg-gray-700 transition-transform transform hover:scale-105 duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UPSCPrelims;