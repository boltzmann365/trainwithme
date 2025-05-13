import React, { useState } from "react";

const ChatComponent = () => {
    const [query, setQuery] = useState("");
    const [chatHistory, setChatHistory] = useState([]); // ✅ Stores chat history
    const [loading, setLoading] = useState(false);

    const askAI = async () => {
        if (!query.trim()) return;

        setLoading(true);
        const userMessage = { role: "user", content: query };
        setChatHistory((prev) => [...prev, userMessage]); // ✅ Add user message to chat

        try {
            const res = await fetch("http://localhost:5000/ask", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query, category: "Polity" })
            });

            if (!res.ok) {
                throw new Error("Failed to fetch AI response.");
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let aiResponse = "";

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                aiResponse += chunk;
                setChatHistory((prev) => [...prev.slice(0, -1), { ...prev[prev.length - 1], content: aiResponse }]);
            }

            setChatHistory((prev) => [...prev, { role: "assistant", content: aiResponse }]); // ✅ Add AI response to chat
        } catch (error) {
            console.error("❌ Error fetching AI response:", error);
            setChatHistory((prev) => [...prev, { role: "assistant", content: "⚠️ AI failed to respond." }]);
        }

        setQuery("");
        setLoading(false);
    };

    return (
        <div className="chat-container">
            <div className="chat-history">
                {chatHistory.map((msg, index) => (
                    <div key={index} className={`chat-message ${msg.role}`}>
                        <strong>{msg.role === "user" ? "You" : "AI"}:</strong> {msg.content}
                    </div>
                ))}
            </div>
            <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask something..."
                className="query-box"
            />
            <button onClick={askAI} disabled={loading} className="ask-button">
                {loading ? "Thinking..." : "Ask AI"}
            </button>
        </div>
    );
};

export default ChatComponent;
