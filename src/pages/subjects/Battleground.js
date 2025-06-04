import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../App";

const Battleground = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showInstructionsPopup, setShowInstructionsPopup] = useState(true);
  const [isAgreeButtonDisabled, setIsAgreeButtonDisabled] = useState(false);
  const [testStarted, setTestStarted] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState([]);
  const [questionStatuses, setQuestionStatuses] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [error, setError] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(null);
  const [showScorePopup, setShowScorePopup] = useState(false);
  const [isScoreMinimized, setIsScoreMinimized] = useState(false);
  const [filter, setFilter] = useState("all");
  const [showModeSidebar, setShowModeSidebar] = useState(false);
  const [fontSize, setFontSize] = useState(24);
  const [maxQuestionReached, setMaxQuestionReached] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [showLeaderboardPopup, setShowLeaderboardPopup] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60 * 60);
  const [timerActive, setTimerActive] = useState(false);
  const [totalQuestions, setTotalQuestions] = useState(100); // Make TOTAL_QUESTIONS dynamic

  const [scoreDetails, setScoreDetails] = useState({
    totalQuestions: 0,
    attempted: 0,
    correct: 0,
    wrong: 0,
    unattempted: 0,
    totalScore: 0,
    percentage: 0,
  });

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";
  const DESIRED_QUESTIONS = 100; // Desired number of questions
  const PRELIMS_CUTOFF = 50;

  const getUserId = () => {
    if (user?.email) {
      const emailLower = user.email.toLowerCase();
      return emailLower.endsWith('@gmail.com')
        ? emailLower.split('@')[0]
        : emailLower;
    }
    const storedUserId = localStorage.getItem('trainWithMeUserId');
    if (storedUserId) return storedUserId;
    const newUserId = Math.random().toString(36).substring(7);
    localStorage.setItem('trainWithMeUserId', newUserId);
    return newUserId;
  };

  const userId = useRef(getUserId()).current;

  console.log("Battleground: Rendered - showInstructionsPopup:", showInstructionsPopup, "testStarted:", testStarted, "user:", user);

  // Timer logic
  useEffect(() => {
    let timer;
    if (timerActive && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
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

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Navigate back to /upsc-prelims when "Go Back" is clicked
  const handleGoBack = () => {
    console.log("Battleground: handleGoBack - Navigating to /upsc-prelims");
    navigate("/upsc-prelims");
  };

  // Fetch MCQs until we have the desired number of valid questions
  const fetchUserMCQs = async () => {
    setLoading(true);
    setLoadingMessage("Loading Prelims Battleground MCQs...");
    setError(null);

    try {
      console.log("Battleground: fetchUserMCQs - Fetching MCQs with userId:", userId);
      if (!userId) {
        throw new Error("userId is undefined or empty");
      }

      const subjects = [
        "Polity", "TamilnaduHistory", "Spectrum", "ArtAndCulture",
        "FundamentalGeography", "IndianGeography", "Science",
        "Environment", "Economy", "CurrentAffairs", "PreviousYearPapers"
      ];
      let allMCQs = [];
      let remainingQuestions = DESIRED_QUESTIONS;
      const questionsPerSubject = Math.floor(DESIRED_QUESTIONS / subjects.length);
      const extraQuestions = DESIRED_QUESTIONS % subjects.length;

      // Track subjects that successfully provided MCQs and unfilled quotas
      const subjectResults = [];
      let totalUnfilledQuota = 0;

      // Initial fetch for each subject
      for (let i = 0; i < subjects.length && remainingQuestions > 0; i++) {
        const subject = subjects[i];
        const baseCount = questionsPerSubject + (i < extraQuestions ? 1 : 0);
        let requestedCount = baseCount;
        let subjectMCQs = [];

        try {
          while (subjectMCQs.length < baseCount && requestedCount <= 50) { // Cap to avoid infinite loops
            console.log(`Battleground: fetchUserMCQs - Fetching ${requestedCount} MCQs for subject: ${subject}`);

            const response = await fetch(`${API_URL}/user/get-book-mcqs`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId, book: subject, requestedCount }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              console.warn(`Battleground: fetchUserMCQs - Failed to fetch MCQs for ${subject}:`, errorData);
              break; // Skip this subject and continue with the next
            }

            const data = await response.json();
            console.log(`Battleground: fetchUserMCQs - Received ${data.mcqs?.length || 0} MCQs for ${subject}:`, data.mcqs);
            if (!data.mcqs || data.mcqs.length === 0) {
              console.warn(`Battleground: fetchUserMCQs - No new MCQs available for ${subject}`);
              break;
            }

            const transformedMCQs = data.mcqs
              .filter(mcq => {
                if (!mcq.mcq || !mcq.mcq.question || !mcq.mcq.options || !mcq.mcq.correctAnswer || !mcq.mcq.explanation) {
                  console.warn(`Battleground: fetchUserMCQs - Invalid MCQ found in ${subject} and skipped:`, mcq);
                  return false;
                }
                return true;
              })
              .map(mcq => ({
                question: Array.isArray(mcq.mcq.question) ? mcq.mcq.question : mcq.mcq.question.split("\n").filter(line => line.trim()),
                options: mcq.mcq.options,
                correctAnswer: mcq.mcq.correctAnswer,
                explanation: mcq.mcq.explanation,
                category: subject,
                id: mcq._id
              }));

            console.log(`Battleground: fetchUserMCQs - Transformed ${transformedMCQs.length} valid MCQs for ${subject} (out of ${data.mcqs.length} fetched)`);
            subjectMCQs.push(...transformedMCQs);

            if (subjectMCQs.length < baseCount) {
              requestedCount += 5; // Fetch 5 more MCQs
              console.log(`Battleground: fetchUserMCQs - Need ${baseCount - subjectMCQs.length} more valid MCQs for ${subject}, increasing request to ${requestedCount}`);
            }
          }

          const fetchedCount = Math.min(baseCount, subjectMCQs.length);
          if (fetchedCount < baseCount) {
            const unfilled = baseCount - fetchedCount;
            console.warn(`Battleground: fetchUserMCQs - Could only fetch ${fetchedCount} valid MCQs for ${subject} (needed ${baseCount}), unfilled quota: ${unfilled}`);
            totalUnfilledQuota += unfilled;
          }

          allMCQs.push(...subjectMCQs.slice(0, baseCount));
          remainingQuestions -= fetchedCount;

          // Track the subject and how many MCQs it provided
          subjectResults.push({ subject, fetchedCount, mcqs: subjectMCQs.slice(0, baseCount) });
        } catch (err) {
          console.warn(`Battleground: fetchUserMCQs - Skipping subject ${subject} due to error:`, err.message);
          totalUnfilledQuota += baseCount;
          remainingQuestions -= baseCount;
          subjectResults.push({ subject, fetchedCount: 0, mcqs: [] });
        }
      }

      console.log(`Battleground: fetchUserMCQs - Initial fetch completed. Total MCQs: ${allMCQs.length}, Unfilled quota: ${totalUnfilledQuota}`);

      // Redistribute unfilled quota to subjects that provided MCQs
      if (totalUnfilledQuota > 0) {
        const successfulSubjects = subjectResults.filter(result => result.fetchedCount > 0).map(result => result.subject);
        console.log(`Battleground: fetchUserMCQs - Successful subjects for redistribution:`, successfulSubjects);

        if (successfulSubjects.length > 0) {
          const extraPerSubject = Math.floor(totalUnfilledQuota / successfulSubjects.length);
          const extraRemainder = totalUnfilledQuota % successfulSubjects.length;

          for (let i = 0; i < successfulSubjects.length; i++) {
            const subject = successfulSubjects[i];
            const additionalCount = extraPerSubject + (i < extraRemainder ? 1 : 0);
            if (additionalCount <= 0) continue;

            try {
              let requestedCount = additionalCount;
              let additionalMCQs = [];
              console.log(`Battleground: fetchUserMCQs - Redistributing: Fetching ${requestedCount} additional MCQs for ${subject}`);

              while (additionalMCQs.length < additionalCount && requestedCount <= 50) {
                const response = await fetch(`${API_URL}/user/get-book-mcqs`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ userId, book: subject, requestedCount }),
                });

                if (!response.ok) {
                  const errorData = await response.json();
                  console.warn(`Battleground: fetchUserMCQs - Failed to fetch additional MCQs for ${subject}:`, errorData);
                  break;
                }

                const data = await response.json();
                console.log(`Battleground: fetchUserMCQs - Received ${data.mcqs?.length || 0} additional MCQs for ${subject}:`, data.mcqs);
                if (!data.mcqs || data.mcqs.length === 0) {
                  console.warn(`Battleground: fetchUserMCQs - No more MCQs available for ${subject}`);
                  break;
                }

                const transformedMCQs = data.mcqs
                  .filter(mcq => {
                    // Avoid duplicates by checking if the MCQ ID is already in allMCQs
                    if (allMCQs.some(existing => existing.id === mcq._id)) {
                      return false;
                    }
                    if (!mcq.mcq || !mcq.mcq.question || !mcq.mcq.options || !mcq.mcq.correctAnswer || !mcq.mcq.explanation) {
                      console.warn(`Battleground: fetchUserMCQs - Invalid additional MCQ found in ${subject} and skipped:`, mcq);
                      return false;
                    }
                    return true;
                  })
                  .map(mcq => ({
                    question: Array.isArray(mcq.mcq.question) ? mcq.mcq.question : mcq.mcq.question.split("\n").filter(line => line.trim()),
                    options: mcq.mcq.options,
                    correctAnswer: mcq.mcq.correctAnswer,
                    explanation: mcq.mcq.explanation,
                    category: subject,
                    id: mcq._id
                  }));

                console.log(`Battleground: fetchUserMCQs - Transformed ${transformedMCQs.length} additional valid MCQs for ${subject}`);
                additionalMCQs.push(...transformedMCQs);

                if (additionalMCQs.length < additionalCount) {
                  requestedCount += 5;
                  console.log(`Battleground: fetchUserMCQs - Need ${additionalCount - additionalMCQs.length} more valid MCQs for ${subject}, increasing request to ${requestedCount}`);
                }
              }

              const addedCount = Math.min(additionalCount, additionalMCQs.length);
              allMCQs.push(...additionalMCQs.slice(0, additionalCount));
              console.log(`Battleground: fetchUserMCQs - Added ${addedCount} additional MCQs for ${subject}`);
              totalUnfilledQuota -= addedCount;
            } catch (err) {
              console.warn(`Battleground: fetchUserMCQs - Failed to fetch additional MCQs for ${subject} during redistribution:`, err.message);
            }
          }
        }
      }

      console.log(`Battleground: fetchUserMCQs - After redistribution, total MCQs fetched: ${allMCQs.length}, remaining unfilled quota: ${totalUnfilledQuota}`);

      // If we didn't get any MCQs, throw an error
      if (allMCQs.length === 0) {
        throw new Error("No MCQs available for any subject. Please try again later.");
      }

      // Adjust TOTAL_QUESTIONS based on fetched MCQs
      setTotalQuestions(allMCQs.length);
      console.log(`Battleground: fetchUserMCQs - Adjusted total questions to ${allMCQs.length}`);

      // Shuffle MCQs
      for (let i = allMCQs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allMCQs[i], allMCQs[j]] = [allMCQs[j], allMCQs[i]];
      }

      const finalMCQs = allMCQs.slice(0, totalQuestions);

      setQuestions(finalMCQs);
      setUserAnswers(new Array(finalMCQs.length).fill(null));
      setQuestionStatuses(new Array(finalMCQs.length).fill("unattempted"));
      setCurrentQuestionIndex(0);
      setScore(null);
      setSelectedOption(null);
      setShowExplanation(false);
      setShowScorePopup(false);
      setShowLeaderboardPopup(false);
      setIsScoreMinimized(false);
      setTestStarted(true);
      setShowInstructionsPopup(false);
      setTimeLeft(60 * 60);
      setTimerActive(true);
      console.log(`Battleground: fetchUserMCQs - Loaded ${finalMCQs.length} MCQs for user ${userId}`);
    } catch (err) {
      let errorMessage = "Failed to load MCQs. Please try again later.";
      if (err.message.includes("Failed to fetch")) {
        errorMessage = "Unable to connect to the server. Please ensure the backend server is running and try again.";
      }
      setError(errorMessage);
      setTestStarted(false);
      setShowInstructionsPopup(true);
      setIsAgreeButtonDisabled(false);
      console.error("Battleground: fetchUserMCQs error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // Start the battleground test when "I Agree" is clicked
  const startBattleground = () => {
    console.log("Battleground: startBattleground - Starting test");
    if (!user) {
      console.log("Battleground: User not logged in, redirecting to login");
      navigate("/login", { state: { from: "/battleground" } });
      return;
    }
    setIsAgreeButtonDisabled(true);
    setShowInstructionsPopup(false);
    setLoading(true);
    setLoadingMessage("Loading MCQs...");
    fetchUserMCQs();
  };

  // Fetch leaderboard data
  const fetchLeaderboard = async () => {
    console.log("Battleground: fetchLeaderboard - Fetching leaderboard...");
    try {
      const res = await fetch(`${API_URL}/battleground/leaderboard`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setLeaderboard(data.rankings || []);
      console.log("Battleground: fetchLeaderboard - Successfully fetched leaderboard:", data.rankings);
    } catch (error) {
      console.error("Battleground: fetchLeaderboard error:", error.message);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  // Dynamic font size adjustment for question content
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
    if (currentQuestionIndex >= totalQuestions - 1) return;

    // Mark the current question as unattempted if no option is selected
    if (selectedOption === null) {
      const newStatuses = [...questionStatuses];
      newStatuses[currentQuestionIndex] = "unattempted";
      setQuestionStatuses(newStatuses);
    }

    const nextIndex = currentQuestionIndex + 1;
    setCurrentQuestionIndex(nextIndex);
    setSelectedOption(userAnswers[nextIndex]);
    setShowExplanation(false);
    if (nextIndex > maxQuestionReached) {
      setMaxQuestionReached(nextIndex);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      // Mark the current question as unattempted if no option is selected
      if (selectedOption === null) {
        const newStatuses = [...questionStatuses];
        newStatuses[currentQuestionIndex] = "unattempted";
        setQuestionStatuses(newStatuses);
      }

      const prevIndex = currentQuestionIndex - 1;
      setCurrentQuestionIndex(prevIndex);
      setSelectedOption(userAnswers[prevIndex]);
      setShowExplanation(false);
    }
  };

  const submitTest = () => {
    let newAnswers = [...userAnswers];
    if (selectedOption !== null) {
      newAnswers[currentQuestionIndex] = selectedOption;
      setUserAnswers(newAnswers);
    }

    let correctCount = 0;
    let wrongCount = 0;
    let attempted = 0;
    const newStatuses = [...questionStatuses];

    newAnswers.forEach((answer, index) => {
      if (answer !== null) {
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

    const unattempted = totalQuestions - attempted;
    const totalScore = (correctCount * 2) - (wrongCount * 0.66);
    const percentage = (totalScore / (totalQuestions * 2)) * 100; // Adjust denominator based on total questions

    setScore(totalScore);
    setCurrentQuestionIndex(0);
    setSelectedOption(newAnswers[0]);
    setShowExplanation(false);
    setShowScorePopup(true);
    setTimerActive(false);

    setScoreDetails({
      totalQuestions,
      attempted,
      correct: correctCount,
      wrong: wrongCount,
      unattempted,
      totalScore: totalScore.toFixed(2),
      percentage: percentage.toFixed(2),
    });

    const seenMcqIds = questions.map(q => q.id);
    fetch(`${API_URL}/user/mark-mcqs-seen`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, mcqIds: seenMcqIds }),
    })
      .then(res => {
        if (!res.ok) {
          console.error("Battleground: Failed to mark MCQs as seen:", res.status);
        } else {
          console.log("Battleground: MCQs marked as seen for user:", userId);
        }
      })
      .catch(err => console.error("Battleground: Error marking MCQs as seen:", err));

    // Submit score to backend and refresh leaderboard
    fetch(`${API_URL}/battleground/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: user.username,
        score: totalScore
      }),
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        console.log("Battleground: Score submitted, leaderboard updated:", data.rankings);
        setLeaderboard(data.rankings || []);
      })
      .catch(error => {
        console.error("Battleground: Failed to submit score:", error.message);
      });
  };

  const resetTest = () => {
    setTestStarted(false);
    setShowInstructionsPopup(true);
    setQuestions([]);
    setUserAnswers([]);
    setQuestionStatuses([]);
    setCurrentQuestionIndex(0);
    setScore(null);
    setSelectedOption(null);
    setShowExplanation(false);
    setShowScorePopup(false);
    setShowLeaderboardPopup(false);
    setIsScoreMinimized(false);
    setFilter("all");
    setShowModeSidebar(false);
    setMaxQuestionReached(0);
    setScoreDetails({
      totalQuestions: 0,
      attempted: 0,
      correct: 0,
      wrong: 0,
      unattempted: 0,
      totalScore: 0,
      percentage: 0,
    });
    setLoading(true);
    setLoadingMessage("Loading MCQs...");
    setTimeLeft(60 * 60);
    setTimerActive(false);
    fetchUserMCQs();
    console.log("Battleground: State reset: Test reset");
  };

  const handleFilterChange = (newFilter) => {
    console.log("Battleground: handleFilterChange - New filter:", newFilter);
    const filteredIndices = Array.from({ length: totalQuestions })
      .map((_, i) => i)
      .filter(i => filter === "all" || questionStatuses[i] === newFilter);

    console.log(`Battleground: Filtered indices for ${newFilter}:`, filteredIndices);
    setFilter(newFilter);
    if (newFilter === "wrong") {
      const firstWrongIndex = questionStatuses.findIndex(status => status === "wrong");
      console.log("Battleground: First wrong index:", firstWrongIndex);
      if (firstWrongIndex !== -1) {
        setCurrentQuestionIndex(firstWrongIndex);
        setSelectedOption(userAnswers[firstWrongIndex]);
        setShowExplanation(false);
      }
    }
  };

  // Question rendering functions (same as Laxmikanth.js)
  const isTableBasedQuestion = (questionLines) => {
    return (
      questionLines &&
      questionLines.some((line) => line.includes("    ")) &&
      questionLines.some((line) => /^\([A-D]\)/.test(line))
    );
  };

  const isAssertionReasonQuestion = (questionLines) => {
    return (
      questionLines &&
      questionLines.some((line) => line.startsWith("Assertion (A):")) &&
      questionLines.some((line) => line.startsWith("Reason (R):"))
    );
  };

  const isStatementBasedQuestion = (questionLines) => {
    return (
      questionLines &&
      questionLines.some((line) => /^\d+\./.test(line)) &&
      (questionLines.some((line) => line.includes("Which of the statements given above is/are correct?")) ||
       questionLines.some((line) => line.includes("How many of the above statements are correct?")))
    );
  };

  const isChronologicalOrderQuestion = (questionLines) => {
    return (
      questionLines &&
      questionLines.some((line) => line.includes("Arrange the following")) &&
      questionLines.some((line) => line.includes("chronological order"))
    );
  };

  const isCorrectlyMatchedPairsQuestion = (questionLines) => {
    return (
      questionLines &&
      questionLines.some((line) => line.includes("Consider the following pairs")) &&
      questionLines.some((line) => line.includes("Which of the pairs are correctly matched?"))
    );
  };

  const isDirectQuestion = (questionLines) => {
    return (
      questionLines &&
      !isStatementBasedQuestion(questionLines) &&
      !isAssertionReasonQuestion(questionLines) &&
      !isTableBasedQuestion(questionLines) &&
      !isChronologicalOrderQuestion(questionLines) &&
      !isCorrectlyMatchedPairsQuestion(questionLines)
    );
  };

  const renderQuestion = (questionLines, mcq) => {
    if (!questionLines || !Array.isArray(questionLines) || !mcq) {
      console.error("Battleground: renderQuestion - Invalid questionLines or mcq", { questionLines, mcq });
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
        console.error("Battleground: renderQuestion - Assertion-Reason structure incomplete", questionLines);
        return <p className="text-red-200">Error: Incomplete Assertion-Reason question</p>;
      }
      return (
        <div className="mb-2">
          <p className="mb-1 text-ivory">{assertionLine}</p>
          <p className="mb-1 text-ivory">{reasonLine}</p>
        </div>
      );
    }

    if (isStatementBasedQuestion(questionLines)) {
      return (
        <div className="mb-2">
          {questionLines.map((line, index) => {
            const isIntro = index === 0;
            const isClosing = line.includes("How many of the above statements are correct?");
            return (
              <p key={index} className={`mb-1 ${isIntro || isClosing ? "text-cosmic-dark" : "text-ivory"}`}>
                {line}
              </p>
            );
          })}
        </div>
      );
    }

    if (isChronologicalOrderQuestion(questionLines)) {
      const introLine = questionLines[0];
      const closingLineIndex = questionLines.findIndex(line => line.includes("Select the correct order")) !== -1
        ? questionLines.findIndex(line => line.includes("Select the correct order"))
        : questionLines.length;
      const items = questionLines.slice(1, closingLineIndex);
      const closingLine = closingLineIndex < questionLines.length ? questionLines[closingLineIndex] : "Select the correct order:";

      if (items.length !== 4) {
        console.error("Battleground: renderQuestion - Chronological order question does not have exactly 4 items", items);
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

    if (isCorrectlyMatchedPairsQuestion(questionLines)) {
      const introLine = questionLines[0];
      const closingLineIndex = questionLines.findIndex(line => line.includes("Which of the pairs are correctly matched?"));
      if (closingLineIndex === -1) {
        console.error("Battleground: renderQuestion - Correctly matched pairs question missing closing line", questionLines);
        return <p className="text-red-200">Error: Incomplete correctly matched pairs question</p>;
      }
      const pairs = questionLines.slice(1, closingLineIndex);
      const closingLine = questionLines[closingLineIndex];

      if (pairs.length < 3) {
        console.error("Battleground: renderQuestion - Correctly matched pairs question does not have enough pairs", pairs);
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

    if (isDirectQuestion(questionLines)) {
      return (
        <div className="mb-2">
          {questionLines.map((line, index) => (
            <p key={index} className="mb-1 text-ivory">{line}</p>
          ))}
        </div>
      );
    }

    console.error("Battleground: renderQuestion - Unknown MCQ structure:", questionLines);
    return (
      <div className="mb-2">
        {questionLines.map((line, index) => (
          <p key={index} className="mb-1 text-ivory">{line}</p>
        ))}
      </div>
    );
  };

  // Calculate lastActiveIndex for sidebar coloring
  const lastAttemptedIndex = userAnswers.slice().reverse().findIndex(ans => ans !== null);
  const lastActiveIndex = lastAttemptedIndex === -1 ? -1 : userAnswers.length - 1 - lastAttemptedIndex;

  return (
    <div className="min-h-screen bg-gray-900 text-white font-poppins overflow-hidden overscroll-none">
      {/* Navigation Bar with Timer */}
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
        <div className="flex items-center justify-center flex-1">
          {testStarted && (
            <div className="text-sm sm:text-base font-semibold text-white">
              Time Left: {formatTime(timeLeft)}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-1">
          {testStarted && (
            <button
              onClick={() => setShowModeSidebar(!showModeSidebar)}
              className="bg-blue-600 text-white p-1 rounded-md hover:bg-blue-700 transition-transform transform hover:scale-105 duration-300"
            >
              <svg
                className={`w-6 h-6 transform ${showModeSidebar ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
        </div>
      </nav>

      {/* Instructions Popup */}
      {showInstructionsPopup && (
        <div className="fixed top-16 left-0 right-0 bottom-0 z-[1000] flex items-center justify-center bg-black/50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-2xl max-w-md w-full">
            <h2 className="text-2xl sm:text-3xl font-bold text-blue-400 mb-6 drop-shadow-lg">Prelims Battleground Instructions</h2>
            <div className="text-white space-y-2 mb-6">
              <p>The test consists of <span className="font-bold">{totalQuestions} questions</span>.</p>
              <p>Time duration: <span className="font-bold">60 minutes</span>.</p>
              <p>Each correct answer carries <span className="font-bold">2 marks</span>.</p>
              <p>Each wrong answer deducts <span className="font-bold">0.66 marks</span>.</p>
              <p>Total marks: <span className="font-bold">{totalQuestions * 2}</span>.</p>
              <p>Questions will be from all subjects except CSAT.</p>
            </div>
            <div className="flex justify-between gap-4">
              <button
                onClick={startBattleground}
                disabled={isAgreeButtonDisabled}
                className={`w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white px-4 py-2 rounded-lg shadow-xl hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 transition-all duration-500 transform hover:scale-105 text-base sm:text-lg font-bold ${
                  isAgreeButtonDisabled ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                I Agree
              </button>
              <button
                onClick={() => {
                  console.log("Battleground: Cancel clicked - Navigating back to /upsc-prelims");
                  navigate("/upsc-prelims");
                }}
                className="w-full bg-gray-600 text-gray-50 px-4 py-2 rounded-lg shadow-lg hover:bg-gray-700 transition-all duration-300 transform hover:scale-105 text-base sm:text-lg font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Spinner */}
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

      {/* Main Content */}
      {testStarted && !loading && (
        <div className="pt-16 pb-10 px-4 sm:px-6 lg:px-8 w-full overflow-hidden">
          {error ? (
            <div className="p-4 bg-red-950 border border-red-700 rounded-lg mx-auto max-w-2xl">
              <p className="text-base sm:text-lg text-red-200">{error}</p>
              <button
                onClick={resetTest}
                className="mt-4 bg-purple-600 text-gray-50 px-4 py-2 rounded-full shadow-lg hover:bg-purple-700 transition-transform transform hover:scale-105 duration-300"
              >
                Try Again
              </button>
            </div>
          ) : questions.length > 0 && currentQuestionIndex < questions.length ? ( // Updated condition
            <>
              {/* Horizontal Strip for Filtered Questions */}
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
                            setCurrentQuestionIndex(actualIndex);
                            setSelectedOption(userAnswers[actualIndex]);
                            setShowExplanation(false);
                          }}
                        >
                          {actualIndex + 1}
                        </div>
                      );
                    });
                  })()}
                </div>
              )}

              {/* Question Box */}
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

              {/* Options Box */}
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
                    <div className="absolute top-0 left-0 right-0 bg-black/80 p-2 sm:p-3 rounded-lg flex flex-col h-full">
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

              {/* Bottom Navigation Bar */}
              <div className="fixed bottom-0 left-0 w-full bg-[#1F2526]/80 backdrop-blur-md p-4 flex justify-between items-center shadow-lg z-50">
                <button
                  onClick={handlePreviousQuestion}
                  disabled={currentQuestionIndex === 0}
                  className={`px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base rounded-full shadow-lg transition-transform transform hover:scale-105 duration-300 ${
                    currentQuestionIndex === 0
                      ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                      : "bg-purple-600 text-gray-50 hover:bg-purple-700"
                  } focus:outline-none focus:ring-2 focus:ring-blue-400`}
                >
                  Previous
                </button>
                {score !== null && (
                  <button
                    onClick={() => {
                      setShowScorePopup(true);
                      setIsScoreMinimized(false);
                    }}
                    className="px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base rounded-full shadow-lg transition-transform transform hover:scale-105 duration-300 bg-blue-600 text-gray-50 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    Score
                  </button>
                )}
                {currentQuestionIndex === totalQuestions - 1 ? (
                  <button
                    onClick={submitTest}
                    className="px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base rounded-full shadow-lg transition-transform transform hover:scale-105 duration-300 bg-emerald-500 text-gray-50 hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    Submit Test
                  </button>
                ) : (
                  <button
                    onClick={handleNextQuestion}
                    disabled={currentQuestionIndex >= totalQuestions - 1 || score !== null}
                    className={`px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base rounded-full shadow-lg transition-transform transform hover:scale-105 duration-300 ${
                      currentQuestionIndex >= totalQuestions - 1 || score !== null
                        ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                        : "bg-white text-black hover:bg-gray-200"
                    } focus:outline-none focus:ring-2 focus:ring-blue-400`}
                  >
                    Next
                  </button>
                )}
              </div>
            </>
          ) : testStarted && questions.length > 0 ? (
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
          ) : null}
        </div>
      )}

      {/* Score Popup */}
      {showScorePopup && (
        <div className="fixed top-16 left-0 right-0 bottom-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-xl sm:text-2xl font-bold text-blue-400 mb-4">Test Results</h2>
            <div className="text-white space-y-2">
              <p>Total Number of Questions: {scoreDetails.totalQuestions}</p>
              <p>Number of Questions Attempted: {scoreDetails.attempted}</p>
              <p>Number of Correct Answers: {scoreDetails.correct}</p>
              <p>Number of Wrong Answers: {scoreDetails.wrong}</p>
              <p>Number of Unattempted Questions: {scoreDetails.unattempted}</p>
              <p>Total Score: {scoreDetails.totalScore} / {totalQuestions * 2}</p>
              <p>Percentage: {scoreDetails.percentage}%</p>
              <p className={scoreDetails.percentage >= PRELIMS_CUTOFF ? "text-green-400" : "text-red-400"}>
                {scoreDetails.percentage >= PRELIMS_CUTOFF
                  ? `Above prelims cutoff percentage by ${(scoreDetails.percentage - PRELIMS_CUTOFF).toFixed(2)}%`
                  : `Below prelims cutoff percentage by ${(PRELIMS_CUTOFF - scoreDetails.percentage).toFixed(2)}%`}
              </p>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  setShowScorePopup(false);
                  setShowLeaderboardPopup(false);
                  setIsScoreMinimized(true);
                }}
                className="bg-gray-600 text-gray-50 px-4 py-2 rounded-md hover:bg-gray-700 transition-transform transform hover:scale-105 duration-300"
              >
                Hide
              </button>
              <button
                onClick={resetTest}
                className="bg-purple-600 text-gray-50 px-4 py-2 rounded-md hover:bg-purple-700 transition-transform transform hover:scale-105 duration-300"
              >
                New Test
              </button>
              <button
                onClick={() => {
                  setShowScorePopup(false);
                  setShowLeaderboardPopup(true);
                }}
                className="bg-blue-600 text-gray-50 px-4 py-2 rounded-md hover:bg-blue-700 transition-transform transform hover:scale-105 duration-300"
              >
                Leaderboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Popup */}
      {showLeaderboardPopup && (
        <div className="fixed top-16 left-0 right-0 bottom-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 lg:p-8 mx-auto max-w-3xl w-full">
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
                  setShowLeaderboardPopup(false);
                  setShowScorePopup(true);
                }}
                className="bg-gray-600 text-gray-50 px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base rounded-full shadow-lg hover:bg-gray-700 transition-transform transform hover:scale-105 duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar with Question Circles */}
      {testStarted && (
        <div
          className="fixed top-16 right-0 h-[calc(100vh-4rem)] w-64 bg-gray-800 shadow-2xl z-[9999] transition-all duration-300 ease-in-out"
          style={{ right: showModeSidebar ? "0" : "-256px" }}
        >
          <div className="p-4 h-full flex flex-col relative">
            {/* Score Button */}
            {isScoreMinimized && (
              <button
                onClick={() => {
                  setIsScoreMinimized(false);
                  setShowScorePopup(true);
                }}
                className="bg-blue-600 text-gray-50 px-3 py-2 rounded-md hover:bg-blue-700 transition-transform transform hover:scale-105 duration-300 text-sm sm:text-base mb-4"
              >
                Score
              </button>
            )}
            {/* Filter Dropdown */}
            <div className="mb-4 z-10">
              <label className="block text-xs sm:text-sm font-semibold text-blue-300 mb-1" htmlFor="sidebar-filter-select">
                Filter
              </label>
              <select
                id="sidebar-filter-select"
                value={filter}
                onChange={(e) => handleFilterChange(e.target.value)}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="all">All Questions</option>
                <option value="correct">Right Questions</option>
                <option value="wrong">Wrong Questions</option>
                <option value="unattempted">Unattempted Questions</option>
              </select>
            </div>

            {/* Question Circles and Submit Test Button */}
            <div className="flex-1 overflow-y-auto">
              <h3 className={`text-base sm:text-lg font-semibold text-white mb-2 p-2 rounded-lg ${filter === "wrong" ? "bg-red-500" : "bg-gray-700"}`}>
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
                    ? userAnswers[actualIndex] !== null
                      ? "bg-blue-500"
                      : "bg-white"
                    : "bg-gray-500";

                  return (
                    <div
                      key={actualIndex}
                      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full ${colorClass} flex items-center justify-center text-gray-900 text-sm sm:text-base font-semibold shadow-md transition-colors duration-300 cursor-pointer`}
                      onClick={() => {
                        setCurrentQuestionIndex(actualIndex);
                        setSelectedOption(userAnswers[actualIndex]);
                        setShowExplanation(false);
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
                  className="w-full mt-4 px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base rounded-full shadow-lg transition-transform transform hover:scale-105 duration-300 bg-emerald-500 text-gray-50 hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
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