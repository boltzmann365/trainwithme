import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../App";

const DishaIasPreviousYearPaper = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [testStarted, setTestStarted] = useState(false);
  const [isLawMode, setIsLawMode] = useState(true); // Default to LAW mode
  const [chapterTest, setChapterTest] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState([]);
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [error, setError] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [bufferedMCQs, setBufferedMCQs] = useState([]);
  const [isFetchingNext, setIsFetchingNext] = useState(false);
  const [nextButtonState, setNextButtonState] = useState("white");
  const [expandedParts, setExpandedParts] = useState({
    part1: true,
  });
  const [showExplanation, setShowExplanation] = useState(false); // State for toggling explanation visibility
  const userId = useRef(Math.random().toString(36).substring(7)).current;
  const chapterTestRef = useRef(null);
  const isFetchingRef = useRef(false);

  // Add state for dynamic font size
  const [fontSize, setFontSize] = useState(24); // Initial font size in pixels

  // Add useEffect to adjust font size dynamically
  useEffect(() => {
    const questionBox = document.querySelector('.question-box');
    const content = document.querySelector('.question-content');
    const questionNumber = document.querySelector('.question-number');
    const chapterText = document.querySelector('.chapter-text');
    if (questionBox && content) {
      // Calculate the height taken by the <p> elements (question number and chapter)
      let pElementsHeight = 0;
      if (questionNumber) {
        const style = window.getComputedStyle(questionNumber);
        pElementsHeight += questionNumber.offsetHeight + parseFloat(style.marginBottom);
      }
      if (chapterText) {
        const style = window.getComputedStyle(chapterText);
        pElementsHeight += chapterText.offsetHeight + parseFloat(style.marginBottom);
      }

      // Account for padding of the inner div (p-2 = 8px top + 8px bottom = 16px)
      const paddingHeight = 16; // 8px top + 8px bottom

      // Calculate the effective height available for the content
      const effectiveHeight = questionBox.clientHeight - pElementsHeight - paddingHeight;

      // Adjust font size until content fits within the effective height
      let currentFontSize = 24; // Start with max font size
      content.style.fontSize = `${currentFontSize}px`;
      while (content.scrollHeight > effectiveHeight && currentFontSize > 8) {
        currentFontSize -= 1;
        content.style.fontSize = `${currentFontSize}px`;
      }
      setFontSize(currentFontSize);
    }
  }, [questions, currentQuestionIndex]); // Re-run when questions or currentQuestionIndex changes

  const API_URL = process.env.REACT_APP_API_URL || "https://trainwithme-backend.onrender.com";

  const chapterNumbers = {
    History: "Chapter 1",
    Geography: "Chapter 2",
    Polity: "Chapter 3",
    Economy: "Chapter 4",
    Environment: "Chapter 5",
    Science: "Chapter 6",
  };

  useEffect(() => {
    return () => {
      isFetchingRef.current = false;
    };
  }, []);

  // Ensure Next button state is correct after initial fetch
  useEffect(() => {
    if (questions.length > 0 && currentQuestionIndex === 0) {
      setNextButtonState("white");
      setIsFetchingNext(false);
      console.log(`useEffect: Reset Next button state - questions: ${questions.length}, bufferedMCQs: ${bufferedMCQs.length}, nextButtonState: ${nextButtonState}, isFetchingNext: ${isFetchingNext}`);
    }
  }, [questions, currentQuestionIndex]);

  const fetchSingleMCQ = async (chapter = null, questionIndex = 0, count = 1, retryCount = 0, forceGenerate = false) => {
    const maxRetries = 2;
    const index = questionIndex;

    const chapterName = chapter && chapter !== "entire-book" && chapterNumbers[chapter]
      ? `${chapterNumbers[chapter]} ${chapter}`.trim()
      : "entire-book";
    const query = chapterName === "entire-book"
      ? `Generate ${count} MCQ from the entire Disha Publication’s UPSC Prelims Previous Year Papers, covering diverse topics comprehensively. Ensure the MCQ spans various themes (e.g., history, polity, science), supplemented by internet resources and general knowledge, avoiding repetition of topics from the previous ${index} questions.`
      : `Generate ${count} MCQ from ${chapterName} of the Disha Publication’s UPSC Prelims Previous Year Papers. Use the previous year papers as the primary source, supplemented by internet resources and general knowledge to ensure uniqueness and depth.`;

    console.log(`fetchSingleMCQ: Requesting ${count} MCQ${count > 1 ? 's' : ''} for chapter: ${chapterName}, index: ${index}, forceGenerate: ${forceGenerate}`);

    try {
      const payload = {
        query,
        category: "PreviousYearPapers",
        userId: userId + `-${index}`,
        count,
        forceGenerate,
        chapter: chapterName
      };
      console.log(`fetchSingleMCQ: Sending payload with chapter: ${payload.chapter}`);
      const res = await fetch(`${API_URL}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.error(`fetchSingleMCQ: HTTP error, status: ${res.status}, statusText: ${res.statusText}`);
        if (res.status === 500 && retryCount < maxRetries) {
          console.log(`Retrying fetchSingleMCQ, attempt ${retryCount + 1}/${maxRetries}`);
          return await fetchSingleMCQ(chapter, questionIndex, count, retryCount + 1, forceGenerate);
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
          leftItems: null,
          rightItems: null,
          options: data.answers.options,
          correctAnswer: data.answers.correctAnswer,
          explanation: data.answers.explanation,
          chapter: chapterName
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
            leftItems: null,
            rightItems: null,
            options: mcq.options,
            correctAnswer: mcq.correctAnswer,
            explanation: mcq.explanation,
            chapter: chapterName
          };
        });
        if (mcqs.includes(null)) {
          console.error("fetchSingleMCQ: One or more MCQs invalid:", mcqs);
          return { error: "One or more MCQs invalid" };
        }
      }

      console.log(`fetchSingleMCQ: Successfully fetched ${mcqs.length} MCQ${mcqs.length > 1 ? 's' : ''}`);
      return mcqs;
    } catch (error) {
      console.error(
        `fetchSingleMCQ: Error fetching ${count} MCQ${count > 1 ? 's' : ''} for chapter ${chapterName}, index ${index}:`,
        error.message
      );
      if (retryCount < maxRetries) {
        console.log(`Retrying fetchSingleMCQ, attempt ${retryCount + 1}/${maxRetries}`);
        return await fetchSingleMCQ(chapter, questionIndex, count, retryCount + 1, forceGenerate);
      }
      return { error: `Failed to fetch MCQ: ${error.message}` };
    }
  };

  const startMCQTest = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    setLoadingMessage("Loading MCQs");
    setError(null);
    setChapterTest(null);
    chapterTestRef.current = "entire-book";
    setQuestions([]);
    setUserAnswers([]);
    setBufferedMCQs([]);
    setTestStarted(true);
    setIsFetchingNext(false);
    setNextButtonState("white");
    setShowExplanation(false); // Reset explanation visibility

    const initialMCQs = await fetchSingleMCQ("entire-book", 0, 2, 0, false);
    setLoading(false);
    isFetchingRef.current = false;

    if (initialMCQs && !initialMCQs.error && initialMCQs.length === 2) {
      setQuestions([initialMCQs[0]]);
      setUserAnswers([null]);
      setBufferedMCQs([initialMCQs[1]]);
      setCurrentQuestionIndex(0);
      setScore(null);
      setSelectedOption(null);
      setNextButtonState("white"); // Ensure button starts white
      setIsFetchingNext(false); // Ensure fetching state is false
      console.log(`startMCQTest: Displayed MCQ 1, buffered 1 MCQ for entire book`);
      console.log(`Initial state - questions: ${questions.length}, bufferedMCQs: ${bufferedMCQs.length}, nextButtonState: ${nextButtonState}, isFetchingNext: ${isFetchingNext}`);
    } else {
      setError(initialMCQs?.error || "Failed to fetch initial MCQs for entire book test.");
      setNextButtonState("white"); // Reset to white to allow retry
      setIsFetchingNext(false);
    }
  };

  const startChapterMCQTest = async (chapter) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (!chapter || !chapterNumbers[chapter]) {
      setError("Invalid chapter selected. Please choose a valid chapter.");
      console.error(`startChapterMCQTest: Invalid chapter: ${chapter}`);
      isFetchingRef.current = false;
      return;
    }
    setLoading(true);
    setLoadingMessage("Loading MCQs");
    setError(null);
    setChapterTest(chapter);
    chapterTestRef.current = chapter;
    setQuestions([]);
    setUserAnswers([]);
    setBufferedMCQs([]);
    setTestStarted(true);
    setIsFetchingNext(false);
    setNextButtonState("white");
    setShowExplanation(false); // Reset explanation visibility

    console.log(`startChapterMCQTest: Fetching MCQs for chapter: ${chapter}`);
    const initialMCQs = await fetchSingleMCQ(chapter, 0, 2, 0, false);
    setLoading(false);
    isFetchingRef.current = false;

    if (initialMCQs && !initialMCQs.error && initialMCQs.length === 2) {
      setQuestions([initialMCQs[0]]);
      setUserAnswers([null]);
      setBufferedMCQs([initialMCQs[1]]);
      setCurrentQuestionIndex(0);
      setScore(null);
      setSelectedOption(null);
      setNextButtonState("white"); // Ensure button starts white
      setIsFetchingNext(false); // Ensure fetching state is false
      console.log(`startChapterMCQTest: Displayed MCQ 1, buffered 1 MCQ for ${chapter}`);
      console.log(`Initial state - questions: ${questions.length}, bufferedMCQs: ${bufferedMCQs.length}, nextButtonState: ${nextButtonState}, isFetchingNext: ${isFetchingNext}`);
    } else {
      setError(initialMCQs?.error || `Failed to fetch initial MCQs for ${chapter}.`);
      setNextButtonState("white"); // Reset to white to allow retry
      setIsFetchingNext(false);
    }
  };

  const handleOptionSelect = (option) => {
    if (isLawMode) {
      const newAnswers = [...userAnswers];
      newAnswers[currentQuestionIndex] = option;
      setUserAnswers(newAnswers);
      setShowExplanation(true); // Show explanation immediately on option select
    }
    setSelectedOption(option);
  };

  const handleNextQuestion = async () => {
    if (isFetchingNext || nextButtonState === "red") {
      console.log(`handleNextQuestion: Blocked - isFetchingNext: ${isFetchingNext}, nextButtonState: ${nextButtonState}`);
      return;
    }

    if (!isLawMode && score === null) {
      const newAnswers = [...userAnswers];
      newAnswers[currentQuestionIndex] = selectedOption;
      setUserAnswers(newAnswers);
    }

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedOption(userAnswers[currentQuestionIndex + 1]);
      setShowExplanation(score !== null); // Show explanation if test is submitted
      setNextButtonState("white");
      console.log(`handleNextQuestion: Showing existing MCQ, index: ${currentQuestionIndex + 2}, questions.length: ${questions.length}, bufferedMCQs.length: ${bufferedMCQs.length}`);
      return;
    }

    // In review mode, stop at the last submitted question
    if (score !== null) {
      console.log(`handleNextQuestion: In review mode, reached last submitted question - currentQuestionIndex: ${currentQuestionIndex}, questions.length: ${questions.length}`);
      return;
    }

    // In test mode, fetch new questions if available
    if (bufferedMCQs.length > 0) {
      const nextMCQ = bufferedMCQs[0];
      setQuestions((prev) => [...prev, nextMCQ]);
      setUserAnswers((prev) => [...prev, null]);
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setBufferedMCQs([]);
      setSelectedOption(null);
      setShowExplanation(false); // Reset explanation visibility
      console.log(`handleNextQuestion: Displayed buffered MCQ, index: ${currentQuestionIndex + 1}, questions.length: ${questions.length}, bufferedMCQs.length: ${bufferedMCQs.length}`);

      setNextButtonState("red");
      setIsFetchingNext(true);

      console.log(`handleNextQuestion: Triggering generation of 1 new MCQ for index ${questions.length}`);
      const newMCQ = await fetchSingleMCQ(chapterTestRef.current, questions.length, 1, 0, true);

      if (newMCQ && !newMCQ.error) {
        setBufferedMCQs([newMCQ[0]]);
        setNextButtonState("white");
        setIsFetchingNext(false);
        console.log(`handleNextQuestion: Buffered new MCQ, buffer size: 1, nextButtonState: ${nextButtonState}, isFetchingNext: ${isFetchingNext}`);
      } else {
        setError(newMCQ?.error || "Failed to generate a new MCQ.");
        setNextButtonState("white"); // Reset to white to allow retry
        setIsFetchingNext(false);
      }
    } else {
      setError("No buffered MCQ available.");
      setNextButtonState("white"); // Reset to white to allow retry
      setIsFetchingNext(false);
      console.log(`handleNextQuestion: No buffered MCQ available, nextButtonState: ${nextButtonState}, isFetchingNext: ${isFetchingNext}`);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setSelectedOption(userAnswers[currentQuestionIndex - 1]);
      setShowExplanation(score !== null); // Show explanation if test is submitted
      setNextButtonState("white");
      console.log(`handlePreviousQuestion: Showing previous MCQ, index: ${currentQuestionIndex}`);
    }
  };

  const submitTest = () => {
    let newAnswers = [...userAnswers];
    if (selectedOption !== null) {
      newAnswers[currentQuestionIndex] = selectedOption;
      setUserAnswers(newAnswers);
    }

    let correctCount = 0;
    newAnswers.forEach((answer, index) => {
      if (answer === questions[index].correctAnswer) {
        correctCount++;
      }
    });
    setScore(correctCount);
    setCurrentQuestionIndex(0); // Reset to first question
    setSelectedOption(newAnswers[0]); // Set selected option for first question
    setShowExplanation(true); // Show explanation immediately after submitting
    setBufferedMCQs([]); // Clear buffered MCQs to prevent fetching new questions in review mode
    setNextButtonState("white"); // Reset button state for review mode
    setIsFetchingNext(false); // Ensure no fetching in review mode
  };

  const resetTest = () => {
    setTestStarted(false);
    setChapterTest(null);
    chapterTestRef.current = null;
    setQuestions([]);
    setUserAnswers([]);
    setBufferedMCQs([]);
    setCurrentQuestionIndex(0);
    setScore(null);
    setSelectedOption(null);
    setError(null);
    setIsFetchingNext(false);
    setNextButtonState("white");
    setShowExplanation(false); // Reset explanation visibility
    console.log("State reset: Questions cleared", { questions: [] });
  };

  const togglePart = (part) => {
    setExpandedParts((prev) => ({
      ...prev,
      [part]: !prev[part],
    }));
  };

  const toggleMode = () => {
    if (testStarted) return;
    setIsLawMode((prev) => !prev);
    console.log(`Mode toggled to: ${!isLawMode ? "LAW" : "WIS"}`);
  };

  const handleGoBack = () => {
    if (testStarted) {
      console.log("Exiting test mode");
      resetTest();
    } else {
      console.log("Navigating back to previous page");
      navigate(-1);
    }
  };

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
      console.error("renderQuestion: Invalid questionLines or mcq", { questionLines, mcq });
      return <p className="text-red-200">Error: Question content missing</p>;
    }

    console.log("renderQuestion: Processing questionLines:", questionLines);

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
                  <th key={index} className="px-2 sm:px-4 py-1 sm:py-2 border-b border-gray-600">
                    {header}
                  </th>
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

    if (isStatementBasedQuestion(questionLines)) {
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

    if (isChronologicalOrderQuestion(questionLines)) {
      const introLine = questionLines[0];
      const closingLineIndex = questionLines.findIndex(line => line.includes("Select the correct order")) !== -1
        ? questionLines.findIndex(line => line.includes("Select the correct order"))
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

    if (isCorrectlyMatchedPairsQuestion(questionLines)) {
      const introLine = questionLines[0];
      const closingLineIndex = questionLines.findIndex(line => line.includes("Which of the pairs are correctly matched?"));
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

    if (isDirectQuestion(questionLines)) {
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
        <div className="flex items-center justify-end gap-1">
          {score !== null ? (
            <div className="text-xs sm:text-xl font-semibold text-gray-50">
              Score: {score}/{questions.length}
            </div>
          ) : !testStarted ? (
            <>
              <button
                onClick={toggleMode}
                className={`px-4 py-3 rounded-md text-gray-50 transition-transform transform hover:scale-105 duration-300 text-xs sm:text-base line-clamp-2 ${
                  isLawMode
                    ? "bg-purple-600 hover:bg-purple-700"
                    : "bg-emerald-500 hover:bg-emerald-600"
                }`}
                disabled={testStarted}
              >
                {isLawMode ? "LAW Mode IS ON" : "WIS Mode IS ON"}
              </button>
            </>
          ) : !isLawMode ? (
            <button
              onClick={submitTest}
              className="bg-emerald-500 text-gray-50 px-3 py-3 rounded-md hover:bg-emerald-600 transition-transform transform hover:scale-105 duration-300 text-xs sm:text-base line-clamp-2"
            >
              Submit Test
            </button>
          ) : null}
        </div>
      </nav>

      <div className="pt-16 pb-10 px-4 sm:px-6 lg:px-8 w-full overflow-hidden">
        {!testStarted ? (
          <div className="h-[calc(100vh-4rem)] w-full overflow-y-auto">
            {/* Entire Book Test Button Section */}
            <div className="pt-8 pb-6 flex justify-center">
              <button
                onClick={startMCQTest}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-lg shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105 text-lg sm:text-xl font-semibold"
              >
                Start Entire Book Test
              </button>
            </div>

            {/* Separator and Popular Topics Header */}
            <div className="text-center mb-6">
              <p className="text-gray-400 text-lg sm:text-xl font-medium">OR</p>
              <h3 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-50 tracking-tight">
                Choose from Popular Topics
              </h3>
            </div>

            {/* Popular Topics Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 px-2 sm:px-4 lg:px-8">
              {Object.keys(chapterNumbers).map((chapter, index) => (
                <div
                  key={index}
                  className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-300"
                  onClick={() => startChapterMCQTest(chapter)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg sm:text-xl font-semibold text-blue-300 hover:text-blue-200 line-clamp-2">
                      {chapterNumbers[chapter]}: {chapter}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
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
                    top: '4rem', // top bar height
                    height: 'calc((100dvh - 8rem) * 0.5)', // 50% of remaining height (top+bottom bar = 8rem)
                  }}
                >
                  <p className="text-sm sm:text-base text-white mb-1 question-number">Question {currentQuestionIndex + 1}</p>
                  {questions[currentQuestionIndex].chapter && (
                    <p className="text-xs sm:text-sm text-white/80 mb-1 chapter-text">
                      Chapter: {questions[currentQuestionIndex].chapter}
                    </p>
                  )}
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
                    height: '1rem', // Strict 1rem gap
                  }}
                />

                {/* Options Box - Takes remaining space below the gap, stopping 1rem above bottom bar */}
                <div 
                  className="absolute left-0 w-full bg-gray-900 z-20 px-8 sm:px-8 lg:px-6"
                  style={{ 
                    top: 'calc(4rem + (100dvh - 8rem) * 0.5 + 1rem)', // 1rem gap below question box
                    height: 'calc((100dvh - 12rem) * 0.5)', // adjusted to leave 1rem gap above bottom bar
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
                        if ((isLawMode && selectedOption) || (!isLawMode && score !== null)) {
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
                            onClick={() => handleOptionSelect(key)}
                            className={`${baseClassName} ${stateClassName}`}
                            disabled={(isLawMode && selectedOption !== null) || (!isLawMode && score !== null)}
                          >
                            <span className="font-medium mr-2">{key})</span> {option}
                            {(isLawMode || (!isLawMode && score !== null)) && selectedOption && isUserAnswer && !isCorrectAnswer && (
                              <span className="ml-2 text-red-300 font-medium text-[10px] sm:text-xs">(Wrong Answer)</span>
                            )}
                            {(isLawMode || (!isLawMode && score !== null)) && selectedOption && isCorrectAnswer && (
                              <span className="ml-2 text-emerald-300 font-medium text-[10px] sm:text-xs">(Correct Answer)</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {(isLawMode && selectedOption) || (!isLawMode && score !== null) ? (
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
                  ) : null}
                </div>

                {/* Gap Between Options Box and Bottom Bar */}
                <div 
                  className="w-full absolute left-0 bg-gray-800 z-40"
                  style={{
                    bottom: '4rem', // bottom bar height
                    height: '1rem', // Strict 1rem gap
                  }}
                />

                {(isLawMode || !isLawMode) && (
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
                    <button
                      onClick={handleNextQuestion}
                      disabled={nextButtonState === "red" || isFetchingNext || (currentQuestionIndex === questions.length - 1 && (score !== null || bufferedMCQs.length === 0))}
                      className={`px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base rounded-full shadow-lg transition-transform transform hover:scale-105 duration-300 ${
                        nextButtonState === "red" || isFetchingNext || (currentQuestionIndex === questions.length - 1 && (score !== null || bufferedMCQs.length === 0))
                          ? "bg-red-400 text-gray-50 cursor-not-allowed"
                          : "bg-white text-black hover:bg-gray-200"
                      } focus:outline-none focus:ring-2 focus:ring-blue-400`}
                    >
                      Next
                      {console.log(`Next button - currentQuestionIndex: ${currentQuestionIndex}, questions.length: ${questions.length}, bufferedMCQs.length: ${bufferedMCQs.length}, nextButtonState: ${nextButtonState}, isFetchingNext: ${isFetchingNext}`)}
                    </button>
                  </div>
                )}
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
          </>
        )}
      </div>
    </div>
  );
};

export default DishaIasPreviousYearPaper;