"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import ReviewMode from "./reviewMode";
import Draggable from "react-draggable";
import { motion, AnimatePresence } from 'framer-motion';

// --- Helper Hook to scrape problem description from the page ---
const useProblemScraper = () => {
  const [problemDescription, setProblemDescription] = useState('');
  useEffect(() => {
    const selectors = [
      '.problems_problem_content__Xm_eO', // GeeksforGeeks
      'div.elfjS[data-track-load="description_content"]' // LeetCode
    ];
    const findAndSetDescription = () => {
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && element.innerText) {
          setProblemDescription(element.innerText);
          return true;
        }
      }
      return false;
    };
    if (findAndSetDescription()) return;
    const observer = new MutationObserver(() => {
      if (findAndSetDescription()) {
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return problemDescription;
};

// --- Helper Hook to get API Key from Chrome Storage ---
const useApiKey = () => {
  const [apiKey, setApiKey] = useState('');
  useEffect(() => {
    if (window.chrome && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['gemini_api_key'], (result) => {
        if (result.gemini_api_key) {
          setApiKey(result.gemini_api_key);
        }
      });
    }
  }, []);
  return apiKey;
};

// --- Helper Function to format messages for the Gemini API ---
const formatMessagesForGemini = (chatMessages, userMessage, systemPrompt) => {
  const contents = chatMessages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));
  contents.push({ role: 'user', parts: [{ text: userMessage }] });
  const fullSystemPrompt = `${systemPrompt}\n\nHere is the conversation so far. Continue the conversation.`;
  return [
    { role: 'user', parts: [{ text: fullSystemPrompt }] },
    { role: 'model', parts: [{ text: "Okay, I understand. I am ready to help with the user's request." }] },
    ...contents,
  ];
};

// --- The Main Component ---
const DSABuddyChatbox = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: 'Welcome to DSA Buddy! Ask me for a hint.' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [notification, setNotification] = useState(null); // State for notifications

  const apiKey = useApiKey();
  const problemDescription = useProblemScraper();
  const chatContentRef = useRef(null);

  // --- Effects ---
  useEffect(() => {
    if (chatContentRef.current) {
      chatContentRef.current.scrollTop = chatContentRef.current.scrollHeight;
    }
  }, [chatMessages, isLoading]);

  useEffect(() => {
    const problemSlug = window.location.pathname.split('/problems/')[1]?.split('/')[0];
    if (problemSlug && window.chrome && chrome.storage) {
      const storageKey = `chat_${problemSlug}`;
      chrome.storage.local.get([storageKey], (result) => {
        if (result[storageKey] && result[storageKey].length > 0) {
          setChatMessages(result[storageKey]);
        }
      });
    }
  }, []);
const problemSlug = window.location.pathname.split('/problems/')[1]?.split('/')[0];
  useEffect(() => {
    if (chatMessages.length > 1) {
      if (problemSlug && window.chrome && chrome.storage) {
        const storageKey = `chat_${problemSlug}`;
        chrome.storage.local.set({ [storageKey]: chatMessages });
      }
    }
  }, [chatMessages]);

  // Effect to clear notification after a delay
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4000); // Hide after 4 seconds
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const systemPrompt = useMemo(() => {
    return `You are DSA Buddy, a helpful assistant. The user is solving a coding problem. Here's the full problem:\n\n${problemDescription || "Missing problem description"}\n\nYour task is to provide concise hints, clarifications, or nudges. Do not give away the full solution coaded unless the user once upload a full funstional code related to the problem and if the user ask for full code answer them with a instruction of atleast uploading the code at least once.`;
  }, [problemDescription]);

  // --- Handlers ---
  const handleSendMessage = async () => {
    const trimmedMessage = inputMessage.trim();
    if (!apiKey) {
      setNotification("API key not set. Please add it in the extension Popup.");
      return;
    }
    if (!trimmedMessage || isLoading) return;

    const newUserMessage = { role: "user", content: trimmedMessage };
    setChatMessages(prev => [...prev, newUserMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // ✅ FIXED: Corrected the model name in the API URL
      const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: formatMessagesForGemini(chatMessages, trimmedMessage, systemPrompt),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      const assistantReply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!assistantReply) {
        throw new Error("Received an empty response from the assistant.");
      }
      setChatMessages(prev => [...prev, { role: "assistant", content: assistantReply }]);
    } catch (error) {
      console.error("❌ Error fetching from Google Gemini API:", error);
      setNotification(`⚠️ Error: ${error.message}`); // Show notification on error
    } finally {
      setIsLoading(false);
    }
  };
  const handleClearChat = () => {
    setChatMessages([{ role: 'assistant', content: 'Welcome to DSA Buddy! Ask me for a hint.' }]);
    setInputMessage('');
    setNotification("Chat cleared.");
    const storageKey = `chat_${problemSlug}`;
    chrome.storage.local.set({ [storageKey]: null });
    if (chatContentRef.current) {
      chatContentRef.current.scrollTop = 0; // Reset scroll position
    } 
  };

  const styles = {
    toggleButton: { position: "fixed", bottom: "45px", right: "20px", backgroundColor: "#007bff", color: "white", padding: "10px 15px", border: "none", borderRadius: "50px", cursor: "pointer", fontSize: "16px", zIndex: 9999, boxShadow: "0 4px 8px rgba(0,0,0,0.2)", },
    chatboxContainer: { position: "fixed", bottom: "85px", right: "20px", width: "380px", height: "550px", backgroundColor: "#fff", border: "1px solid #e0e0e0", borderRadius: "12px", boxShadow: "0 5px 15px rgba(0,0,0,0.2)", zIndex: 10000, display: "flex", flexDirection: "column", fontFamily: "sans-serif", overflow: 'hidden' },
    chatboxHeader: { padding: "12px 16px", cursor: 'move', backgroundColor: "#f5f5f5", borderBottom: "1px solid #e0e0e0", display: "flex", justifyContent: "space-between", alignItems: "center" },
    headerTitle: { margin: 0, color: "#333", fontWeight: "bold", fontSize: "16px" },
    closeButton: { background: "none", border: "none", fontSize: "1.5em", cursor: "pointer", color: "#666" },
    chatContent: { flexGrow: 1, padding: "16px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px", backgroundColor: "#fafafa", scrollbarWidth: 'none', msOverflowStyle: 'none' },
    headerButtonContainer: { display: 'flex', alignItems: 'center', gap: '8px' },
    reviewButton: { background: 'linear-gradient(to right, rgb(175, 82, 222), rgb(0, 122, 255))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 'bold', border: 'none', padding: '4px 10px', marginRight: '10px', borderRadius: '12px', fontSize: '16px', cursor: 'pointer', transition: 'transform 0.2s ease' },
    message: { padding: '10px 14px', borderRadius: '18px', maxWidth: '85%', whiteSpace: 'pre-wrap', wordWrap: 'break-word' },
    userMessage: { alignSelf: 'flex-end', backgroundColor: '#007bff', color: 'white', borderBottomRightRadius: '4px' },
    assistantMessage: { alignSelf: 'flex-start', backgroundColor: '#e9e9eb', color: '#2c2c2e', borderBottomLeftRadius: '4px' },
    loadingMessage: { alignSelf: 'flex-start', color: '#666', fontStyle: 'italic' },
    inputArea: { padding: "5px", borderTop: "1px solid #e0e0e0", display: "flex", gap: "8px", backgroundColor: "#f5f5f5" },
    inputField: { flexGrow: 1, padding: "10px", border: "1px solid #ddd", borderRadius: "20px", fontSize: "14px" },
    sendButton: { padding: "10px 16px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "20px", cursor: "pointer", fontWeight: 500 },
    notification: { position: 'absolute', bottom: '80px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'rgba(86, 84, 199, 0.95)', color: 'white', padding: '10px 20px', borderRadius: '25px', fontSize: '15px', fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.2)', zIndex: 10001 }
  };

  return (
    <>
      <style>{`.chat-content-container::-webkit-scrollbar { display: none; }`}</style>
      <button onClick={() => setIsOpen(!isOpen)} style={styles.toggleButton}>💬 DSA Buddy</button>

      {isOpen && (
        <Draggable handle=".dsa-buddy-header" bounds="parent">
          <div style={styles.chatboxContainer}>
            <AnimatePresence>
              {notification && (
                <motion.div style={styles.notification} initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
                  {notification}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="dsa-buddy-header" style={styles.chatboxHeader}>
              <h3 style={styles.headerTitle}>DSA Buddy</h3>
              <div style={styles.headerButtonContainer}>
                <button
                  onClick={() => setIsReviewMode(!isReviewMode)}
                  style={{ ...styles.reviewButton, transform: hovered ? 'scale(1.05)' : 'scale(1)' }}
                  onMouseEnter={() => setHovered(true)}
                  onMouseLeave={() => setHovered(false)}
                >
                  {isReviewMode ? "Chat with AI" : "Review Code"}
                </button>
                <button onClick={() => setIsOpen(false)} style={styles.closeButton}>&times;</button>
              </div>
            </div>

            {isReviewMode ? (
              <ReviewMode apiKey={apiKey} problemDescription={problemDescription} />
            ) : (
              <>
                <div className="chat-content-container" style={styles.chatContent} ref={chatContentRef}>
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} style={{ ...styles.message, ...(msg.role === 'user' ? styles.userMessage : styles.assistantMessage) }}>
                      {msg.content}
                    </div>
                  ))}
                  {isLoading && <div style={{ ...styles.message, ...styles.loadingMessage }}><span>Thinking...</span></div>}
                </div>
                <div style={styles.inputArea}>
                  <input type="text" placeholder="Ask for a hint..." value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSendMessage()} disabled={isLoading} style={styles.inputField} />
                  <button onClick={handleSendMessage} disabled={!inputMessage.trim() || isLoading} style={{ ...styles.sendButton, cursor: isLoading ? 'not-allowed' : 'pointer' }}>Send</button>
                  <button onClick={handleClearChat} disabled={isLoading} style={{ ...styles.sendButton, backgroundColor: '#f44336' }}>Clear Chat</button>
                </div>
              </>
            )}
          </div>
        </Draggable>
      )}
    </>
  );
};

export default DSABuddyChatbox;