import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../App";

const Atlas = () => {
  const [contentHidden, setContentHidden] = useState(false);
  const [testStarted, setTestStarted] = useState(false);
  const [isLawMode, setIsLawMode] = useState(false);
  const [chapterTest, setChapterTest] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
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
  const [reviewMode, setReviewMode] = useState(false);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [nextButtonState, setNextButtonState] = useState("white");
  const [expandedParts, setExpandedParts] = useState({ part1: true });
  const userId = useRef(Math.random().toString(36).substring(7)).current;
  const chapterTestRef = useRef(null);
  const isFetchingRef = useRef(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const API_URL = process.env.REACT_APP_API_URL || "https://trainwithme-backend.onrender.com";

  const chapterNumbers = {
    "Maps and Map Making": "Chapter 1",
    "The Universe": "Chapter 2",
    "The Earth": "Chapter 3",
    "Realms of the Earth": "Chapter 4",
    "Contours and Landforms": "Chapter 5",
    "The Indian Subcontinent – Physical": "Chapter 6",
    "The Indian Subcontinent – Political": "Chapter 7",
    "Northern India and Nepal": "Chapter 8",
    "North-Central and Eastern India": "Chapter 9",
    "North-Eastern India, Bhutan and Bangladesh": "Chapter 10",
    "Western India and Pakistan": "Chapter 11",
    "Southern India and Sri Lanka": "Chapter 12",
    "Jammu and Kashmir, Himachal Pradesh, Punjab, Haryana, Delhi and Chandigarh": "Chapter 13",
    "Rajasthan, Gujarat, Daman & Diu and Dadra & Nagar Haveli": "Chapter 14",
    "Uttar Pradesh, Uttarakhand, Bihar and Jharkhand": "Chapter 15",
    "Sikkim, West Bengal and the North-Eastern States": "Chapter 16",
    "Madhya Pradesh, Chhattisgarh and Odisha": "Chapter 17",
    "Maharashtra, Telangana, Andhra Pradesh and Goa": "Chapter 18",
    "Karnataka, Tamil Nadu, Kerala and Puducherry": "Chapter 19",
    "The Islands": "Chapter 20",
    "India – Geology, Geological Formations, Structure and Major Faults and Thrusts": "Chapter 21",
    "India – Physiography": "Chapter 22",
    "India – Temperature and Pressure": "Chapter 23",
    "India – Rainfall and Winds": "Chapter 24",
    "India – Relative Humidity, Annual Temperature and Annual Rainfall": "Chapter 25",
    "India – Monsoon, Rainfall Trends and Climatic Regions": "Chapter 26",
    "India – Natural Vegetation and Forest Cover": "Chapter 27",
    "India – Bio-geographic Zones, Wildlife and Wetlands": "Chapter 28",
    "India – Drainage Basins and East & West Flowing Rivers": "Chapter 29",
    "India – Soil and Land Use": "Chapter 30",
    "India – Irrigation and Net Irrigated Area": "Chapter 31",
    "India – Food grain Production, Livestock Population, Milk Production and Fisheries": "Chapter 32",
    "India – Food Crops": "Chapter 33",
    "India – Cash Crops": "Chapter 34",
    "India – Important Mineral Belts and Number of Reported Mines": "Chapter 35",
    "India – Production of Metallic and Non-Metallic Minerals": "Chapter 36",
    "India – Metallic Minerals": "Chapter 37",
    "India – Non-Metallic Minerals and Mineral Fuels": "Chapter 38",
    "India – Mineral Deposits": "Chapter 39",
    "India – Industrial Regions and Levels of Industrial Development": "Chapter 40",
    "India – Industries": "Chapter 41",
    "India – Power Projects and Power Consumption": "Chapter 42",
    "India – Roads and Inland Waterways": "Chapter 43",
    "India – Railways": "Chapter 44",
    "India – Air and Sea Routes": "Chapter 45",
    "India – Population": "Chapter 46",
    "India – Human Development": "Chapter 47",
    "India – Religions and Languages": "Chapter 48",
    "India – Tourism": "Chapter 49",
    "India – World Heritage Sites": "Chapter 50",
    "India – Cultural Heritage": "Chapter 51",
    "India – Environmental Concerns": "Chapter 52",
    "India – Natural Hazards": "Chapter 53",
    "Asia – Physical": "Chapter 54",
    "Asia – Political": "Chapter 55",
    "Asia – Climate, Natural Vegetation, Population and Economy": "Chapter 56",
    "SAARC Countries": "Chapter 57",
    "China, Mongolia and Taiwan": "Chapter 58",
    "Japan, North Korea and South Korea": "Chapter 59",
    "South-Eastern Asia": "Chapter 60",
    "Myanmar, Thailand, Laos, Cambodia and Vietnam": "Chapter 61",
    "West Asia": "Chapter 62",
    "Afghanistan and Pakistan": "Chapter 63",
    "Europe – Physical": "Chapter 64",
    "Europe – Political": "Chapter 65",
    "Europe – Climate, Natural Vegetation, Population and Economy": "Chapter 66",
    "British Isles": "Chapter 67",
    "France and Central Europe": "Chapter 68",
    "Eurasia": "Chapter 69",
    "Africa – Physical": "Chapter 70",
    "Africa – Political": "Chapter 71",
    "Africa – Climate, Natural Vegetation, Population and Economy": "Chapter 72",
    "Southern Africa and Madagascar": "Chapter 73",
    "North America": "Chapter 74",
    "North America – Political": "Chapter 75",
    "North America – Climate, Natural Vegetation, Population and Economy": "Chapter 76",
    "United States of America and Alaska": "Chapter 77",
    "South America – Physical": "Chapter 78",
    "South America – Political": "Chapter 79",
    "South America – Climate, Natural Vegetation, Population and Economy": "Chapter 80",
    "Brazil": "Chapter 81",
    "Oceania – Physical": "Chapter 82",
    "Oceania – Political": "Chapter 83",
    "Oceania – Climate, Natural Vegetation, Population and Economy": "Chapter 84",
    "Pacific Ocean and Central Pacific Islands": "Chapter 85",
    "Indian Ocean and Atlantic Ocean": "Chapter 86",
    "The Arctic Ocean and Antarctica": "Chapter 87",
    "World – Physical": "Chapter 88",
    "World – Political": "Chapter 89",
    "World – Climate": "Chapter 90",
    "World – Annual Rainfall and Major Ocean Currents": "Chapter 91",
    "World – Climatic Regions and Water Resources": "Chapter 92",
    "World – Major Landforms and Forest Cover": "Chapter 93",
    "World – Soil and Natural Vegetation": "Chapter 94",
    "World – Agriculture and Industrial Regions": "Chapter 95",
    "World – Minerals, Mineral Fuels, Trade and Economic Development": "Chapter 96",
    "World – Population Density, Urbanization, Religions and Languages": "Chapter 97",
    "World – Human Development": "Chapter 98",
    "World – Environmental Concerns": "Chapter 99",
    "World – Biomes at Risk": "Chapter 100",
    "World – Plate Tectonics and Natural Hazards": "Chapter 101",
    "World – Air Routes and Sea Routes": "Chapter 102",
    "World – Facts and Figures – Flag, Area, Population, Countries, Language, Monetary Unit and GDP": "Chapter 103",
    "World Statistics – Human Development and Economy": "Chapter 104",
    "World – Geographic Comparisons": "Chapter 105",
    "World – Time Zones": "Chapter 106",
    "Index": "Chapter 107"
  };

  useEffect(() => {
    return () => {
      isFetchingRef.current = false;
    };
  }, []);

  const fetchSingleMCQ = async (chapter = null, questionIndex = 0, count = 1, retryCount = 0, forceGenerate = false) => {
    const maxRetries = 2;
    const index = questionIndex;

    const chapterName = chapter && chapter !== "entire-book" && chapterNumbers[chapter]
      ? `${chapterNumbers[chapter]} ${chapter}`.trim()
      : "entire-book";
    const query = chapterName === "entire-book"
      ? `Generate ${count} MCQ from the entire Atlas Book, which covers comprehensive geographical and thematic data. Ensure the MCQ spans diverse topics across the book’s content, supplemented by internet resources and general knowledge, avoiding repetition of topics from the previous ${index} questions.`
      : `Generate ${count} MCQ from ${chapterName} of the Atlas Book, which covers comprehensive geographical and thematic data. Use the chapter content as the primary source, supplemented by internet resources and general knowledge to ensure uniqueness and depth.`;

    console.log(`fetchSingleMCQ: Requesting ${count} MCQ${count > 1 ? 's' : ''} for chapter: ${chapterName}, index: ${index}, forceGenerate: ${forceGenerate}`);

    try {
      const payload = {
        query,
        category: "Atlas",
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

  const startMCQTest = async (mode) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    setLoadingMessage("Loading MCQs");
    setContentHidden(true);
    setError(null);
    setChapterTest(null);
    chapterTestRef.current = "entire-book";
    setQuestions([]);
    setUserAnswers([]);
    setBufferedMCQs([]);
    setTestStarted(true);
    setIsLawMode(mode === "LAW");
    setIsFetchingNext(false);
    setNextButtonState("white");

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
      setReviewMode(false);
      console.log(`startMCQTest: Displayed MCQ 1, buffered 1 MCQ for entire book`);
    } else {
      setError(initialMCQs?.error || "Failed to fetch initial MCQs for entire book test.");
    }
  };

  const startChapterMCQTest = async (chapter, mode) => {
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
    setContentHidden(true);
    setError(null);
    setChapterTest(chapter);
    chapterTestRef.current = chapter;
    setSelectedChapter(chapter);
    setQuestions([]);
    setUserAnswers([]);
    setBufferedMCQs([]);
    setTestStarted(true);
    setIsLawMode(mode === "LAW");
    setIsFetchingNext(false);
    setNextButtonState("white");

    if (window.innerWidth < 1024) {
      setIsTocOpen(false);
    }

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
      setReviewMode(false);
      console.log(`startChapterMCQTest: Displayed MCQ 1, buffered 1 MCQ for ${chapter}`);
    } else {
      setError(initialMCQs?.error || `Failed to fetch initial MCQs for ${chapter}.`);
    }
  };

  const handleChapterSelect = (chapter) => {
    setSelectedChapter(chapter);
    setContentHidden(false);
    setTestStarted(false);
    setQuestions([]);
    setUserAnswers([]);
    setBufferedMCQs([]);
    setCurrentQuestionIndex(0);
    setScore(null);
    setReviewMode(false);
    setError(null);
    setIsTocOpen(false);
    setNextButtonState("white");
    console.log(`Chapter selected: ${chapter}`);
  };

  const handleOptionSelect = (option) => {
    if (isLawMode) {
      const newAnswers = [...userAnswers];
      newAnswers[currentQuestionIndex] = option;
      setUserAnswers(newAnswers);
    }
    setSelectedOption(option);
  };

  const handleNextQuestion = async () => {
    if (isFetchingNext || nextButtonState === "red") return;

    if (!isLawMode) {
      const newAnswers = [...userAnswers];
      newAnswers[currentQuestionIndex] = selectedOption;
      setUserAnswers(newAnswers);
    }

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedOption(userAnswers[currentQuestionIndex + 1]);
      setNextButtonState("white");
      console.log(`handleNextQuestion: Showing existing MCQ, index: ${currentQuestionIndex + 2}`);
      return;
    }

    if (bufferedMCQs.length > 0) {
      const nextMCQ = bufferedMCQs[0];
      setQuestions((prev) => [...prev, nextMCQ]);
      setUserAnswers((prev) => [...prev, null]);
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setBufferedMCQs([]);
      setSelectedOption(null);
      console.log(`handleNextQuestion: Displayed buffered MCQ, index: ${currentQuestionIndex + 1}`);

      setNextButtonState("red");
      setIsFetchingNext(true);

      console.log(`handleNextQuestion: Triggering generation of 1 new MCQ for index ${questions.length}`);
      const newMCQ = await fetchSingleMCQ(chapterTestRef.current, questions.length, 1, 0, true);

      if (newMCQ && !newMCQ.error) {
        setBufferedMCQs([newMCQ[0]]);
        setNextButtonState("white");
        console.log(`handleNextQuestion: Buffered new MCQ, buffer size: 1`);
      } else {
        setError(newMCQ?.error || "Failed to generate a new MCQ.");
        setNextButtonState("red");
      }

      setIsFetchingNext(false);
    } else {
      setError("No buffered MCQ available.");
      setNextButtonState("red");
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setSelectedOption(userAnswers[currentQuestionIndex - 1]);
      setNextButtonState("white");
      console.log(`handlePreviousQuestion: Showing previous MCQ, index: ${currentQuestionIndex}`);
    }
  };

  const evaluateTest = () => {
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
    setTestStarted(false);
    setBufferedMCQs([]);
    setError(null);
    setIsFetchingNext(false);
    setNextButtonState("white");
  };

  const resetTest = () => {
    setTestStarted(false);
    setIsLawMode(false);
    setChapterTest(null);
    chapterTestRef.current = null;
    setQuestions([]);
    setUserAnswers([]);
    setBufferedMCQs([]);
    setCurrentQuestionIndex(0);
    setScore(null);
    setContentHidden(false);
    setSelectedOption(null);
    setReviewMode(false);
    setCurrentReviewIndex(0);
    setError(null);
    setIsTocOpen(false);
    setNextButtonState("white");
    console.log("State reset: Questions cleared", { questions: [] });
  };

  const enterReviewMode = () => {
    setReviewMode(true);
    setCurrentReviewIndex(0);
    setNextButtonState("white");
  };

  const exitReviewMode = () => {
    setReviewMode(false);
    setCurrentReviewIndex(0);
    setNextButtonState("white");
  };

  const handlePreviousReviewQuestion = () => {
    if (currentReviewIndex > 0) {
      setCurrentReviewIndex(currentReviewIndex - 1);
    }
  };

  const handleNextReviewQuestion = () => {
    if (currentReviewIndex < questions.length - 1) {
      setCurrentReviewIndex(currentReviewIndex + 1);
    }
  };

  const togglePart = (part) => {
    setExpandedParts((prev) => ({
      ...prev,
      [part]: !prev[part],
    }));
  };

  const toggleToc = () => {
    setIsTocOpen(!isTocOpen);
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
                  <th key={index} className="px-4 py-2 border-b border-gray-600">
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
                    <td className="px-4 py-2 border-b border-gray-600">{left}</td>
                    <td className="px-4 py-2 border-b border-gray-600">{right}</td>
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
        <div className="mb-4">
          <p className="mb-1 text-ivory">{assertionLine}</p>
          <p className="mb-1 text-ivory">{reasonLine}</p>
        </div>
      );
    }

    if (isStatementBasedQuestion(questionLines)) {
      return (
        <div className="mb-4">
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
        <div className="mb-4">
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
        <div className="mb-4">
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
        <div className="mb-4">
          {questionLines.map((line, index) => (
            <p key={index} className="mb-1 text-ivory">{line}</p>
          ))}
        </div>
      );
    }

    console.error("renderQuestion: Unknown MCQ structure:", questionLines);
    return (
      <div className="mb-4">
        {questionLines.map((line, index) => (
          <p key={index} className="mb-1 text-ivory">{line}</p>
        ))}
      </div>
    );
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-900 to-black text-white font-poppins">
        <nav className="fixed top-0 left-0 w-full bg-gray-900/80 backdrop-blur-md p-4 flex justify-between items-center shadow-lg z-50">
          <div className="flex items-center gap-4">
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
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-blue-400">
              TrainWithMe
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={toggleToc}
              className="bg-gray-700 text-zinc-300 px-3 py-1 sm:px-4 sm:py-2 text-sm sm:text-base rounded-md hover:bg-gray-600 transition-colors duration-300 flex items-center gap-2"
            >
              Table of Contents
              <svg
                className={`w-4 h-4 transform transition-transform duration-300 ${isTocOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </nav>

        <div className="flex flex-col lg:flex-row w-full h-[calc(100vh-4rem)] pt-16">
          <div className="w-full lg:w-4/5 flex flex-col relative">
            {!contentHidden && (
              <div className="p-4 sm:p-6 lg:p-8 w-full bg-gray-800 rounded-lg shadow-md mx-2 sm:mx-4 mt-4">
                <div className="transition-all duration-700">
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-50 mb-4">
                    {selectedChapter
                      ? `Welcome to Your ${selectedChapter} Training Ground`
                      : "Welcome to Your Atlas Training Ground"}
                  </h2>
                  <p className="text-base sm:text-lg text-zinc-300 mb-6 leading-relaxed">
                    Welcome to <span className="font-semibold text-blue-400">TrainWithMe</span>! I’m here to help you{" "}
                    <span className="font-semibold text-blue-400">
                      {selectedChapter ? `master ${selectedChapter}` : "master the Atlas"}
                    </span>{" "}
                    for your UPSC preparation using the{" "}
                    <span className="font-semibold">Atlas Book</span>. Choose your training mode below!
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <button
                      onClick={() => (selectedChapter ? startChapterMCQTest(selectedChapter, "LAW") : startMCQTest("LAW"))}
                      className="bg-purple-600 text-gray-50 p-4 rounded-lg shadow-lg hover:bg-purple-700 transition-transform transform hover:scale-105 duration-300"
                      disabled={loading}
                    >
                      <h3 className="text-lg sm:text-xl font-semibold">LAW</h3>
                      <p className="text-sm sm:text-base">Learn Along the Way</p>
                    </button>

                    <button
                      onClick={() => (selectedChapter ? startChapterMCQTest(selectedChapter, "WIS") : startMCQTest("WIS"))}
                      className="bg-emerald-500 text-gray-50 p-4 rounded-lg shadow-lg hover:bg-emerald-600 transition-transform transform hover:scale-105 duration-300"
                      disabled={loading}
                    >
                      <h3 className="text-lg sm:text-xl font-semibold">WIS</h3>
                      <p className="text-sm sm:text-base">Where I Stand</p>
                    </button>

                    <div className="bg-gray-700 text-zinc-300 p-4 rounded-lg shadow-lg flex items-center justify-center">
                      <p className="text-sm sm:text-base">Use Table of Contents to select chapters</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {contentHidden && testStarted && (
              <>
                {loading ? (
                  <div className="p-4 sm:p-6 lg:p-8 w-full mx-2 sm:mx-4 mt-4 bg-gray-800 rounded-lg shadow-md">
                    <div className="flex justify-center items-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-400"></div>
                      <p className="ml-2 text-base sm:text-lg font-semibold text-blue-400">{loadingMessage}</p>
                    </div>
                  </div>
                ) : error ? (
                  <div className="p-4 sm:p-6 lg:p-8 w-full mx-2 sm:mx-4 mt-4 bg-gray-800 rounded-lg shadow-md">
                    <div className="p-4 bg-red-950 border border-red-700 rounded-lg">
                      <p className="text-base sm:text-lg text-red-200">{error}</p>
                      <button
                        onClick={resetTest}
                        className="mt-4 bg-purple-600 text-gray-50 px-4 py-2 rounded-full shadow-lg hover:bg-purple-700 transition-transform transform hover:scale-105 duration-300"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                ) : questions.length > 0 && questions[currentQuestionIndex] ? (
                  <div className="p-4 sm:p-6 lg:p-8 w-full mx-2 sm:mx-4 mt-4 bg-gray-800 rounded-lg shadow-md">
                    <h3 className="text-xl sm:text-2xl font-semibold text-gray-50 mb-4 drop-shadow-sm">
                      {chapterTest
                        ? `${isLawMode ? "LAW" : "WIS"} Test: ${chapterTest}`
                        : `${isLawMode ? "LAW" : "WIS"} Test: Entire Atlas Book`}
                    </h3>
                    <p className="text-base sm:text-lg text-blue-400 mb-4">Question No {currentQuestionIndex + 1}</p>
                    {questions[currentQuestionIndex].chapter && (
                      <p className="text-sm text-zinc-400 mb-2">
                        Chapter: {questions[currentQuestionIndex].chapter}
                      </p>
                    )}
                    <div className="mb-6">
                      <div className="text-base sm:text-lg font-medium text-ivory bg-gradient-to-br from-gray-800 to-blue-900 p-4 rounded-lg mb-4 shadow-inner">
                        {renderQuestion(questions[currentQuestionIndex].question, questions[currentQuestionIndex])}
                      </div>
                      <div className="space-y-3">
                        {Object.entries(questions[currentQuestionIndex].options).map(([key, option]) => {
                          const isUserAnswer = userAnswers[currentQuestionIndex] === key;
                          const isCorrectAnswer = questions[currentQuestionIndex].correctAnswer === key;
                          let className =
                            "w-full text-left p-3 rounded-lg border transition-colors duration-300 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-400 ";

                          if (isLawMode && selectedOption) {
                            if (isUserAnswer && !isCorrectAnswer) {
                              className += "bg-red-500 border-red-400 text-gray-50";
                            } else if (isCorrectAnswer) {
                              className += "bg-emerald-500 border-emerald-400 text-gray-50";
                            } else {
                              className += "bg-gray-800 border-gray-600 text-zinc-300";
                            }
                          } else {
                            className += selectedOption === key
                              ? "bg-purple-600 border-purple-400 text-gray-50"
                              : "bg-gray-800 border-gray-600 text-zinc-300 hover:bg-gray-600 hover:border-gray-500";
                          }

                          return (
                            <button
                              key={key}
                              onClick={() => handleOptionSelect(key)}
                              className={className}
                              disabled={isLawMode && selectedOption !== null}
                            >
                              <span className="font-medium">{key})</span> {option}
                              {isLawMode && selectedOption && isUserAnswer && !isCorrectAnswer && (
                                <span className="ml-2 text-red-300 font-medium text-sm sm:text-base">
                                  (Wrong Answer)
                                </span>
                              )}
                              {isLawMode && selectedOption && isCorrectAnswer && (
                                <span className="ml-2 text-emerald-300 font-medium text-sm sm:text-base">
                                  (Correct Answer)
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      {isLawMode && selectedOption && (
                        <div className="mt-4 p-4 bg-slate-900 border border-gray-600 rounded-lg">
                          <p className="text-base sm:text-lg font-medium text-zinc-200">Explanation:</p>
                          <p className="text-zinc-200 text-sm sm:text-base">
                            {questions[currentQuestionIndex].explanation}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 sm:gap-4 items-center">
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
                      {isLawMode ? (
                        <button
                          onClick={handleNextQuestion}
                          disabled={nextButtonState === "red" || isFetchingNext}
                          className={`px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base rounded-full shadow-lg transition-transform transform hover:scale-105 duration-300 ${
                            nextButtonState === "red" || isFetchingNext
                              ? "bg-red-400 text-gray-50 cursor-not-allowed"
                              : "bg-white text-black hover:bg-gray-200"
                          } focus:outline-none focus:ring-2 focus:ring-blue-400`}
                        >
                          Next
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={handleNextQuestion}
                            disabled={nextButtonState === "red" || isFetchingNext}
                            className={`px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base rounded-full shadow-lg transition-transform transform hover:scale-105 duration-300 ${
                              nextButtonState === "red" || isFetchingNext
                                ? "bg-red-400 text-gray-50 cursor-not-allowed"
                                : "bg-white text-black hover:bg-gray-200"
                            } focus:outline-none focus:ring-2 focus:ring-blue-400`}
                          >
                            Next
                          </button>
                          <button
                            onClick={evaluateTest}
                            className="bg-emerald-500 text-gray-50 px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base rounded-full shadow-lg hover:bg-emerald-600 transition-transform transform hover:scale-105 duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
                          >
                            Evaluate
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ) : testStarted && questions.length > 0 ? (
                  <div className="p-4 sm:p-6 lg:p-8 w-full mx-2 sm:mx-4 mt-4 bg-gray-800 rounded-lg shadow-md">
                    <div className="p-4 bg-red-950 border border-red-700 rounded-lg">
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
                  </div>
                ) : null}
              </>
            )}

            {score !== null && !reviewMode && (
              <div className="p-4 sm:p-6 lg:p-8 w-full mx-2 sm:mx-4 mt-4 bg-gray-800 rounded-lg shadow-md">
                <h3 className="text-xl sm:text-2xl font-semibold text-gray-50 mb-4">
                  Test Results
                </h3>
                <p className="text-base sm:text-lg text-zinc-300 mb-4">
                  You scored <span className="font-bold text-blue-400">{score}</span> out of {questions.length}!
                </p>
                <div className="flex flex-wrap gap-3 sm:gap-4">
                  <button
                    onClick={enterReviewMode}
                    className="bg-blue-600 text-gray-50 px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base rounded-full shadow-lg hover:bg-blue-700 transition-transform transform hover:scale-105 duration-300"
                  >
                    Review Answers
                  </button>
                </div>
              </div>
            )}

            {score !== null && reviewMode && (
              <div className="p-4 sm:p-6 lg:p-8 w-full mx-2 sm:mx-4 mt-4 bg-gray-800 rounded-lg shadow-md">
                <h3 className="text-xl sm:text-2xl font-semibold text-gray-50 mb-4">
                  Answers and Solutions
                </h3>
                <p className="text-base sm:text-lg text-blue-400 mb-4">Question No {currentReviewIndex + 1}</p>
                {questions[currentReviewIndex].chapter && (
                  <p className="text-sm text-zinc-400 mb-2">
                    Chapter: {questions[currentReviewIndex].chapter}
                  </p>
                )}
                <div className="mb-6">
                  <div className="text-base sm:text-lg font-medium text-ivory bg-gradient-to-br from-gray-800 to-blue-900 p-4 rounded-lg mb-4 shadow-inner">
                    {renderQuestion(questions[currentReviewIndex].question, questions[currentReviewIndex])}
                  </div>
                  <div className="space-y-3">
                    {Object.entries(questions[currentReviewIndex].options).map(([key, option]) => {
                      const isUserAnswer = userAnswers[currentReviewIndex] === key;
                      const isCorrectAnswer = questions[currentReviewIndex].correctAnswer === key;
                      let className =
                        "w-full text-left p-3 rounded-lg border transition-colors duration-300 text-sm sm:text-base ";

                      if (isUserAnswer && !isCorrectAnswer) {
                        className += "bg-red-500 border-red-400 text-gray-50";
                      } else if (isCorrectAnswer) {
                        className += "bg-emerald-500 border-emerald-400 text-gray-50";
                      } else {
                        className += "bg-gray-800 border-gray-600 text-zinc-300";
                      }

                      return (
                        <div key={key} className={className}>
                          <span className="font-medium">{key})</span> {option}
                          {isUserAnswer && !isCorrectAnswer && (
                            <span className="ml-2 text-red-300 font-medium text-sm sm:text-base">
                              (Your Answer)
                            </span>
                          )}
                          {isCorrectAnswer && (
                            <span className="ml-2 text-emerald-300 font-medium text-sm sm:text-base">
                              (Correct Answer)
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 p-4 bg-slate-900 border border-gray-600 rounded-lg">
                    <p className="text-base sm:text-lg font-medium text-zinc-200">Explanation:</p>
                    <p className="text-zinc-200 text-sm sm:text-base">
                      {questions[currentReviewIndex].explanation}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 sm:gap-4">
                  <button
                    onClick={handlePreviousReviewQuestion}
                    disabled={currentReviewIndex === 0}
                    className={`px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base rounded-full shadow-lg transition-transform transform hover:scale-105 duration-300 ${
                      currentReviewIndex === 0
                        ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                        : "bg-purple-600 text-gray-50 hover:bg-purple-700"
                    } focus:outline-none focus:ring-2 focus:ring-blue-400`}
                  >
                    Previous
                  </button>
                  <button
                    onClick={handleNextReviewQuestion}
                    disabled={currentReviewIndex === questions.length - 1}
                    className={`px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base rounded-full shadow-lg transition-transform transform hover:scale-105 duration-300 ${
                      currentReviewIndex === questions.length - 1
                        ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                        : "bg-purple-600 text-gray-50 hover:bg-purple-700"
                    } focus:outline-none focus:ring-2 focus:ring-blue-400`}
                  >
                    Next
                  </button>
                  <button
                    onClick={exitReviewMode}
                    className="bg-gray-600 text-gray-50 px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base rounded-full shadow-lg hover:bg-gray-700 transition-transform transform hover:scale-105 duration-300"
                  >
                    Back to Results
                  </button>
                </div>
              </div>
            )}
          </div>

          <div
            className={`w-full lg:w-1/5 bg-gray-900 p-4 sm:p-6 border-l border-gray-700 overflow-y-auto max-h-[calc(100vh-4rem)] fixed lg:static right-0 top-[4rem] z-10 lg:z-0 shadow-lg transition-transform duration-300 ${
              isTocOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
            }`}
          >
            <div className="flex justify-between items-center mb-4 lg:hidden">
              <h3 className="text-xl sm:text-2xl font-semibold text-gray-50">Table of Contents</h3>
              <button onClick={toggleToc} className="text-zinc-300">
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
            </div>
            <h3 className="text-xl sm:text-2xl font-semibold text-gray-50 mb-6 hidden lg:block">Table of Contents</h3>
            <ul className="space-y-3">
              <li
                className="font-bold text-gray-50 flex justify-between items-center cursor-pointer"
                onClick={() => togglePart("part1")}
              >
                <span>Atlas Topics</span>
                <svg
                  className={`w-5 h-5 transform transition-transform duration-300 ${
                    expandedParts["part1"] ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </li>
              {expandedParts["part1"] && (
                <ul className="space-y-2 pl-4">
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("Maps and Map Making")}>
                        Chapter 1: Maps and Map Making
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("Maps and Map Making", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("Maps and Map Making", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("The Universe")}>
                        Chapter 2: The Universe
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("The Universe", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("The Universe", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("The Earth")}>
                        Chapter 3: The Earth
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("The Earth", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("The Earth", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("Realms of the Earth")}>
                        Chapter 4: Realms of the Earth
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("Realms of the Earth", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("Realms of the Earth", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("Contours and Landforms")}>
                        Chapter 5: Contours and Landforms
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("Contours and Landforms", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("Contours and Landforms", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("The Indian Subcontinent – Physical")}>
                        Chapter 6: The Indian Subcontinent – Physical
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("The Indian Subcontinent – Physical", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("The Indian Subcontinent – Physical", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("The Indian Subcontinent – Political")}>
                        Chapter 7: The Indian Subcontinent – Political
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("The Indian Subcontinent – Political", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("The Indian Subcontinent – Political", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("Northern India and Nepal")}>
                        Chapter 8: Northern India and Nepal
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("Northern India and Nepal", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("Northern India and Nepal", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("North-Central and Eastern India")}>
                        Chapter 9: North-Central and Eastern India
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("North-Central and Eastern India", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("North-Central and Eastern India", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("North-Eastern India, Bhutan and Bangladesh")}>
                        Chapter 10: North-Eastern India, Bhutan and Bangladesh
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("North-Eastern India, Bhutan and Bangladesh", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("North-Eastern India, Bhutan and Bangladesh", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("Western India and Pakistan")}>
                        Chapter 11: Western India and Pakistan
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("Western India and Pakistan", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("Western India and Pakistan", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("Southern India and Sri Lanka")}>
                        Chapter 12: Southern India and Sri Lanka
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("Southern India and Sri Lanka", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("Southern India and Sri Lanka", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("Jammu and Kashmir, Himachal Pradesh, Punjab, Haryana, Delhi and Chandigarh")}>
                        Chapter 13: Jammu and Kashmir, Himachal Pradesh, Punjab, Haryana, Delhi and Chandigarh
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("Jammu and Kashmir, Himachal Pradesh, Punjab, Haryana, Delhi and Chandigarh", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("Jammu and Kashmir, Himachal Pradesh, Punjab, Haryana, Delhi and Chandigarh", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("Rajasthan, Gujarat, Daman & Diu and Dadra & Nagar Haveli")}>
                        Chapter 14: Rajasthan, Gujarat, Daman & Diu and Dadra & Nagar Haveli
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("Rajasthan, Gujarat, Daman & Diu and Dadra & Nagar Haveli", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("Rajasthan, Gujarat, Daman & Diu and Dadra & Nagar Haveli", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("Uttar Pradesh, Uttarakhand, Bihar and Jharkhand")}>
                        Chapter 15: Uttar Pradesh, Uttarakhand, Bihar and Jharkhand
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("Uttar Pradesh, Uttarakhand, Bihar and Jharkhand", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("Uttar Pradesh, Uttarakhand, Bihar and Jharkhand", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("Sikkim, West Bengal and the North-Eastern States")}>
                        Chapter 16: Sikkim, West Bengal and the North-Eastern States
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("Sikkim, West Bengal and the North-Eastern States", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("Sikkim, West Bengal and the North-Eastern States", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("Madhya Pradesh, Chhattisgarh and Odisha")}>
                        Chapter 17: Madhya Pradesh, Chhattisgarh and Odisha
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("Madhya Pradesh, Chhattisgarh and Odisha", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("Madhya Pradesh, Chhattisgarh and Odisha", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("Maharashtra, Telangana, Andhra Pradesh and Goa")}>
                        Chapter 18: Maharashtra, Telangana, Andhra Pradesh and Goa
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("Maharashtra, Telangana, Andhra Pradesh and Goa", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("Maharashtra, Telangana, Andhra Pradesh and Goa", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                                                >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("Karnataka, Tamil Nadu, Kerala and Puducherry")}>
                        Chapter 19: Karnataka, Tamil Nadu, Kerala and Puducherry
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("Karnataka, Tamil Nadu, Kerala and Puducherry", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("Karnataka, Tamil Nadu, Kerala and Puducherry", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("The Islands")}>
                        Chapter 20: The Islands
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("The Islands", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("The Islands", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("India – Geology, Geological Formations, Structure and Major Faults and Thrusts")}>
                        Chapter 21: India – Geology, Geological Formations, Structure and Major Faults and Thrusts
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("India – Geology, Geological Formations, Structure and Major Faults and Thrusts", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("India – Geology, Geological Formations, Structure and Major Faults and Thrusts", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("India – Physiography")}>
                        Chapter 22: India – Physiography
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("India – Physiography", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("India – Physiography", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("India – Temperature and Pressure")}>
                        Chapter 23: India – Temperature and Pressure
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("India – Temperature and Pressure", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("India – Temperature and Pressure", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("India – Rainfall and Winds")}>
                        Chapter 24: India – Rainfall and Winds
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("India – Rainfall and Winds", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("India – Rainfall and Winds", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("India – Relative Humidity, Annual Temperature and Annual Rainfall")}>
                        Chapter 25: India – Relative Humidity, Annual Temperature and Annual Rainfall
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("India – Relative Humidity, Annual Temperature and Annual Rainfall", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("India – Relative Humidity, Annual Temperature and Annual Rainfall", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("India – Monsoon, Rainfall Trends and Climatic Regions")}>
                        Chapter 26: India – Monsoon, Rainfall Trends and Climatic Regions
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("India – Monsoon, Rainfall Trends and Climatic Regions", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("India – Monsoon, Rainfall Trends and Climatic Regions", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("India – Natural Vegetation and Forest Cover")}>
                        Chapter 27: India – Natural Vegetation and Forest Cover
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("India – Natural Vegetation and Forest Cover", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("India – Natural Vegetation and Forest Cover", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("India – Bio-geographic Zones, Wildlife and Wetlands")}>
                        Chapter 28: India – Bio-geographic Zones, Wildlife and Wetlands
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("India – Bio-geographic Zones, Wildlife and Wetlands", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("India – Bio-geographic Zones, Wildlife and Wetlands", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("India – Drainage Basins and East & West Flowing Rivers")}>
                        Chapter 29: India – Drainage Basins and East & West Flowing Rivers
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("India – Drainage Basins and East & West Flowing Rivers", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("India – Drainage Basins and East & West Flowing Rivers", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("India – Soil and Land Use")}>
                        Chapter 30: India – Soil and Land Use
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("India – Soil and Land Use", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("India – Soil and Land Use", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("India – Irrigation and Net Irrigated Area")}>
                        Chapter 31: India – Irrigation and Net Irrigated Area
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("India – Irrigation and Net Irrigated Area", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("India – Irrigation and Net Irrigated Area", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("India – Food grain Production, Livestock Population, Milk Production and Fisheries")}>
                        Chapter 32: India – Food grain Production, Livestock Population, Milk Production and Fisheries
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("India – Food grain Production, Livestock Population, Milk Production and Fisheries", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("India – Food grain Production, Livestock Population, Milk Production and Fisheries", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("India – Food Crops")}>
                        Chapter 33: India – Food Crops
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("India – Food Crops", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("India – Food Crops", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("India – Cash Crops")}>
                        Chapter 34: India – Cash Crops
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("India – Cash Crops", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("India – Cash Crops", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("India – Important Mineral Belts and Number of Reported Mines")}>
                        Chapter 35: India – Important Mineral Belts and Number of Reported Mines
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("India – Important Mineral Belts and Number of Reported Mines", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("India – Important Mineral Belts and Number of Reported Mines", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("India – Production of Metallic and Non-Metallic Minerals")}>
                        Chapter 36: India – Production of Metallic and Non-Metallic Minerals
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("India – Production of Metallic and Non-Metallic Minerals", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("India – Production of Metallic and Non-Metallic Minerals", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("India – Metallic Minerals")}>
                        Chapter 37: India – Metallic Minerals
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("India – Metallic Minerals", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("India – Metallic Minerals", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("India – Non-Metallic Minerals and Mineral Fuels")}>
                        Chapter 38: India – Non-Metallic Minerals and Mineral Fuels
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("India – Non-Metallic Minerals and Mineral Fuels", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("India – Non-Metallic Minerals and Mineral Fuels", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("India – Mineral Deposits")}>
                        Chapter 39: India – Mineral Deposits
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("India – Mineral Deposits", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("India – Mineral Deposits", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("India – Industrial Regions and Levels of Industrial Development")}>
                        Chapter 40: India – Industrial Regions and Levels of Industrial Development
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("India – Industrial Regions and Levels of Industrial Development", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("India – Industrial Regions and Levels of Industrial Development", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("India – Industries")}>
                        Chapter 41: India – Industries
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("India – Industries", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("India – Industries", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("India – Power Projects and Power Consumption")}>
                        Chapter 42: India – Power Projects and Power Consumption
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("India – Power Projects and Power Consumption", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("India – Power Projects and Power Consumption", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("India – Roads and Inland Waterways")}>
                        Chapter 43: India – Roads and Inland Waterways
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("India – Roads and Inland Waterways", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("India – Roads and Inland Waterways", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("India – Railways")}>
                        Chapter 44: India – Railways
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("India – Railways", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("India – Railways", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("India – Air and Sea Routes")}>
                        Chapter 45: India – Air and Sea Routes
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("India – Air and Sea Routes", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("India – Air and Sea Routes", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("India – Population")}>
                        Chapter 46: India – Population
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("India – Population", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("India – Population", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("India – Human Development")}>
                        Chapter 47: India – Human Development
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("India – Human Development", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("India – Human Development", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("India – Religions and Languages")}>
                        Chapter 48: India – Religions and Languages
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("India – Religions and Languages", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("India – Religions and Languages", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("India – Tourism")}>
                        Chapter 49: India – Tourism
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("India – Tourism", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("India – Tourism", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("India – World Heritage Sites")}>
                        Chapter 50: India – World Heritage Sites
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("India – World Heritage Sites", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("India – World Heritage Sites", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("India – Cultural Heritage")}>
                        Chapter 51: India – Cultural Heritage
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("India – Cultural Heritage", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("India – Cultural Heritage", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("India – Environmental Concerns")}>
                        Chapter 52: India – Environmental Concerns
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("India – Environmental Concerns", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("India – Environmental Concerns", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("India – Natural Hazards")}>
                        Chapter 53: India – Natural Hazards
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("India – Natural Hazards", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("India – Natural Hazards", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("Asia – Physical")}>
                        Chapter 54: Asia – Physical
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("Asia – Physical", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("Asia – Physical", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("Asia – Political")}>
                        Chapter 55: Asia – Political
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("Asia – Political", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("Asia – Political", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("Asia – Climate, Natural Vegetation, Population and Economy")}>
                        Chapter 56: Asia – Climate, Natural Vegetation, Population and Economy
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("Asia – Climate, Natural Vegetation, Population and Economy", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("Asia – Climate, Natural Vegetation, Population and Economy", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("SAARC Countries")}>
                        Chapter 57: SAARC Countries
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("SAARC Countries", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("SAARC Countries", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("China, Mongolia and Taiwan")}>
                        Chapter 58: China, Mongolia and Taiwan
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("China, Mongolia and Taiwan", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("China, Mongolia and Taiwan", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("Japan, North Korea and South Korea")}>
                        Chapter 59: Japan, North Korea and South Korea
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("Japan, North Korea and South Korea", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("Japan, North Korea and South Korea", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("South-Eastern Asia")}>
                        Chapter 60: South-Eastern Asia
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("South-Eastern Asia", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("South-Eastern Asia", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("Myanmar, Thailand, Laos, Cambodia and Vietnam")}>
                        Chapter 61: Myanmar, Thailand, Laos, Cambodia and Vietnam
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("Myanmar, Thailand, Laos, Cambodia and Vietnam", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("Myanmar, Thailand, Laos, Cambodia and Vietnam", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("West Asia")}>
                        Chapter 62: West Asia
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("West Asia", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("West Asia", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("Afghanistan and Pakistan")}>
                        Chapter 63: Afghanistan and Pakistan
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("Afghanistan and Pakistan", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("Afghanistan and Pakistan", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("Europe – Physical")}>
                        Chapter 64: Europe – Physical
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("Europe – Physical", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("Europe – Physical", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("Europe – Political")}>
                        Chapter 65: Europe – Political
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("Europe – Political", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("Europe – Political", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("Europe – Climate, Natural Vegetation, Population and Economy")}>
                        Chapter 66: Europe – Climate, Natural Vegetation, Population and Economy
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("Europe – Climate, Natural Vegetation, Population and Economy", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("Europe – Climate, Natural Vegetation, Population and Economy", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("British Isles")}>
                        Chapter 67: British Isles
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("British Isles", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("British Isles", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("France and Central Europe")}>
                        Chapter 68: France and Central Europe
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("France and Central Europe", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("France and Central Europe", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("Eurasia")}>
                        Chapter 69: Eurasia
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("Eurasia", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("Eurasia", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("Africa – Physical")}>
                        Chapter 70: Africa – Physical
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("Africa – Physical", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("Africa – Physical", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("Africa – Political")}>
                        Chapter 71: Africa – Political
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("Africa – Political", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("Africa – Political", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("Africa – Climate, Natural Vegetation, Population and Economy")}>
                        Chapter 72: Africa – Climate, Natural Vegetation, Population and Economy
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("Africa – Climate, Natural Vegetation, Population and Economy", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("Africa – Climate, Natural Vegetation, Population and Economy", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("Southern Africa and Madagascar")}>
                        Chapter 73: Southern Africa and Madagascar
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("Southern Africa and Madagascar", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("Southern Africa and Madagascar", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("North America")}>
                        Chapter 74: North America
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("North America", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("North America", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("North America – Political")}>
                        Chapter 75: North America – Political
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("North America – Political", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("North America – Political", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("North America – Climate, Natural Vegetation, Population and Economy")}>
                        Chapter 76: North America – Climate, Natural Vegetation, Population and Economy
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("North America – Climate, Natural Vegetation, Population and Economy", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("North America – Climate, Natural Vegetation, Population and Economy", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("United States of America and Alaska")}>
                        Chapter 77: United States of America and Alaska
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("United States of America and Alaska", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("United States of America and Alaska", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("South America – Physical")}>
                        Chapter 78: South America – Physical
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("South America – Physical", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("South America – Physical", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("South America – Political")}>
                        Chapter 79: South America – Political
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("South America – Political", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("South America – Political", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("South America – Climate, Natural Vegetation, Population and Economy")}>
                        Chapter 80: South America – Climate, Natural Vegetation, Population and Economy
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("South America – Climate, Natural Vegetation, Population and Economy", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("South America – Climate, Natural Vegetation, Population and Economy", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("Brazil")}>
                        Chapter 81: Brazil
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("Brazil", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("Brazil", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("Oceania – Physical")}>
                        Chapter 82: Oceania – Physical
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("Oceania – Physical", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("Oceania – Physical", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("Oceania – Political")}>
                        Chapter 83: Oceania – Political
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("Oceania – Political", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("Oceania – Political", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("Oceania – Climate, Natural Vegetation, Population and Economy")}>
                        Chapter 84: Oceania – Climate, Natural Vegetation, Population and Economy
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("Oceania – Climate, Natural Vegetation, Population and Economy", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("Oceania – Climate, Natural Vegetation, Population and Economy", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("Pacific Ocean and Central Pacific Islands")}>
                        Chapter 85: Pacific Ocean and Central Pacific Islands
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("Pacific Ocean and Central Pacific Islands", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("Pacific Ocean and Central Pacific Islands", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("Indian Ocean and Atlantic Ocean")}>
                        Chapter 86: Indian Ocean and Atlantic Ocean
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("Indian Ocean and Atlantic Ocean", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("Indian Ocean and Atlantic Ocean", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("The Arctic Ocean and Antarctica")}>
                        Chapter 87: The Arctic Ocean and Antarctica
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("The Arctic Ocean and Antarctica", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("The Arctic Ocean and Antarctica", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("World – Physical")}>
                        Chapter 88: World – Physical
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("World – Physical", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("World – Physical", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("World – Political")}>
                        Chapter 89: World – Political
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("World – Political", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("World – Political", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("World – Climate")}>
                        Chapter 90: World – Climate
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("World – Climate", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("World – Climate", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("World – Annual Rainfall and Major Ocean Currents")}>
                        Chapter 91: World – Annual Rainfall and Major Ocean Currents
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("World – Annual Rainfall and Major Ocean Currents", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("World – Annual Rainfall and Major Ocean Currents", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("World – Climatic Regions and Water Resources")}>
                        Chapter 92: World – Climatic Regions and Water Resources
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("World – Climatic Regions and Water Resources", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("World – Climatic Regions and Water Resources", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("World – Major Landforms and Forest Cover")}>
                        Chapter 93: World – Major Landforms and Forest Cover
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("World – Major Landforms and Forest Cover", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("World – Major Landforms and Forest Cover", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("World – Soil and Natural Vegetation")}>
                        Chapter 94: World – Soil and Natural Vegetation
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("World – Soil and Natural Vegetation", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("World – Soil and Natural Vegetation", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("World – Agriculture and Industrial Regions")}>
                        Chapter 95: World – Agriculture and Industrial Regions
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("World – Agriculture and Industrial Regions", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("World – Agriculture and Industrial Regions", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("World – Minerals, Mineral Fuels, Trade and Economic Development")}>
                        Chapter 96: World – Minerals, Mineral Fuels, Trade and Economic Development
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("World – Minerals, Mineral Fuels, Trade and Economic Development", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("World – Minerals, Mineral Fuels, Trade and Economic Development", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("World – Population Density, Urbanization, Religions and Languages")}>
                        Chapter 97: World – Population Density, Urbanization, Religions and Languages
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("World – Population Density, Urbanization, Religions and Languages", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("World – Population Density, Urbanization, Religions and Languages", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("World – Human Development")}>
                        Chapter 98: World – Human Development
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("World – Human Development", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("World – Human Development", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("World – Environmental Concerns")}>
                        Chapter 99: World – Environmental Concerns
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("World – Environmental Concerns", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("World – Environmental Concerns", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("World – Biomes at Risk")}>
                        Chapter 100: World – Biomes at Risk
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("World – Biomes at Risk", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("World – Biomes at Risk", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("World – Plate Tectonics and Natural Hazards")}>
                        Chapter 101: World – Plate Tectonics and Natural Hazards
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("World – Plate Tectonics and Natural Hazards", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("World – Plate Tectonics and Natural Hazards", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("World – Air Routes and Sea Routes")}>
                        Chapter 102: World – Air Routes and Sea Routes
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("World – Air Routes and Sea Routes", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("World – Air Routes and Sea Routes", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("World – Facts and Figures – Flag, Area, Population, Countries, Language, Monetary Unit and GDP")}>
                        Chapter 103: World – Facts and Figures – Flag, Area, Population, Countries, Language, Monetary Unit and GDP
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("World – Facts and Figures – Flag, Area, Population, Countries, Language, Monetary Unit and GDP", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("World – Facts and Figures – Flag, Area, Population, Countries, Language, Monetary Unit and GDP", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("World Statistics – Human Development and Economy")}>
                        Chapter 104: World Statistics – Human Development and Economy
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("World Statistics – Human Development and Economy", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("World Statistics – Human Development and Economy", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("World – Geographic Comparisons")}>
                        Chapter 105: World – Geographic Comparisons
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("World – Geographic Comparisons", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("World – Geographic Comparisons", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("World – Time Zones")}>
                        Chapter 106: World – Time Zones
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("World – Time Zones", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("World – Time Zones", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-300 text-sm sm:text-base">
                    <div className="flex justify-between items-center">
                      <span onClick={() => handleChapterSelect("Index")}>
                        Chapter 107: Index
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChapterMCQTest("Index", "LAW")}
                          className="bg-purple-600 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-purple-700"
                          disabled={loading}
                        >
                          LAW
                        </button>
                        <button
                          onClick={() => startChapterMCQTest("Index", "WIS")}
                          className="bg-emerald-500 text-gray-50 px-2 py-1 rounded-md text-xs hover:bg-emerald-600"
                          disabled={loading}
                        >
                          WIS
                        </button>
                      </div>
                    </div>
                  </li>
                </ul>
              )}
            </ul>
          </div>
        </div>
        <footer className="w-full py-3 bg-gray-900 text-center text-gray-400 text-sm sm:text-base">
          <p>Powered by TrainWithMe | Your UPSC Prep Companion</p>
        </footer>
      </div>
    </>
  );
};

export default Atlas;