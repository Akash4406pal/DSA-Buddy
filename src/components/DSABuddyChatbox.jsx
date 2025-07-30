"use client";
import React, { useState, useEffect, useRef } from "react";
import ReviewMode from "./reviewMode";
import Draggable from "react-draggable";


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
          console.log(`✅ Problem description found with selector: ${selector}`);
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
          console.log('✅ Gemini API Key loaded from storage.');
          setApiKey(result.gemini_api_key);
        } else {
          console.warn('❌ No Gemini API Key found in storage!');
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

  contents.push({
    role: 'user',
    parts: [{ text: userMessage }],
  });

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

  
  const apiKey = useApiKey();
  const problemDescription = useProblemScraper();
  const chatContentRef = useRef(null);

  // Effect to auto-scroll to the bottom of the chat on new messages
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
          console.log(`✅ Loaded chat history for ${problemSlug}`);
          setChatMessages(result[storageKey]);
        }
      });
    }
  }, []); 
   useEffect(() => {
    // Don't save the initial default message. Only save after a conversation has started.
    if (chatMessages.length > 1) {
      const problemSlug = window.location.pathname.split('/problems/')[1]?.split('/')[0];
      if (problemSlug && window.chrome && chrome.storage) {
        const storageKey = `chat_${problemSlug}`;
        console.log(`💾 Saving chat history for ${problemSlug}`);
        // This is your code snippet, integrated here:
        chrome.storage.local.set({ [storageKey]: chatMessages });
      }
    }
  }, [chatMessages]);

  const handleSendMessage = async () => {
    const trimmedMessage = inputMessage.trim();
    if (!trimmedMessage || isLoading || !apiKey) {
      if (!apiKey) alert("Google Gemini API key is not set! Please set it in the extension's popup page.");
      return;
    }

    const newUserMessage = { role: "user", content: trimmedMessage };
    setChatMessages(prev => [...prev, newUserMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
      const systemPrompt = `You are DSA Buddy, a helpful assistant. The user is solving a coding problem. Here's the full problem:\n\n${problemDescription || "Missing problem description"}\n\nYour task is to provide concise hints, clarifications, or nudges. Do not give away the full solution unless the user explicitly asks for it.`;

      const requestBody = {
        contents: formatMessagesForGemini(
          chatMessages, 
          trimmedMessage, 
          systemPrompt
        ),
      };

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      const assistantReply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      
      if (!assistantReply) {
        throw new Error("Received an empty or invalid response from the assistant.");
      }
      
      setChatMessages(prev => [...prev, { role: "assistant", content: assistantReply }]);

    } catch (error) {
      console.error("❌ Error fetching from Google Gemini API:", error);
      const errorMessage = { role: "assistant", content: `⚠️ Error: ${error.message}` };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Using style objects for better readability
  const styles = {
    toggleButton: {
      position: "fixed", bottom: "45px", right: "20px", backgroundColor: "#007bff", color: "white", padding: "10px 15px", border: "none", borderRadius: "50px", cursor: "pointer", fontSize: "16px", zIndex: 9999, boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
    },
    chatboxContainer: {
      position: "fixed", bottom: "85px", right: "20px", width: "350px", height: "500px", backgroundColor: "#fff", border: "1px solid #e0e0e0", borderRadius: "12px", boxShadow: "0 5px 15px rgba(0,0,0,0.2)", zIndex: 10000, display: "flex", flexDirection: "column", fontFamily: "sans-serif",
    },
    chatboxHeader: {
      padding: "12px 16px", backgroundColor: "#f5f5f5", borderBottom: "1px solid #e0e0e0", display: "flex", justifyContent: "space-between", alignItems: "center",
    },
    headerTitle: { margin: 0, color: "#333",fontWeight: "bold" , fontSize: "16px"},
    closeButton: { background: "none", border: "none", fontSize: "1.5em", cursor: "pointer", color: "#666" },
    chatContent: {
      flexGrow: 1, padding: "16px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px", backgroundColor: "#fafafa",
      // ✅ ADDED for smooth scrolling
      scrollBehavior: 'smooth',
      // ✅ ADDED for hiding the scrollbar in Firefox
      scrollbarWidth: 'none',
      // ✅ ADDED for hiding the scrollbar in IE/Edge
      msOverflowStyle: 'none',
    },
    headerButtonContainer: { // New style to group header buttons
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    reviewButton: { // New style for the review button
  background: 'linear-gradient(to right, rgb(175, 82, 222), rgb(0, 122, 255))',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  fontWeight: 'bold',
  border: 'none',
  padding: '4px 10px',
  marginRight: '10px',
  borderRadius: '12px',
  fontSize: '16px',
  cursor: 'pointer',
  transition: 'background 0.3s ease, transform 0.2s ease',
  transform: hovered ? 'scale(1.05)' : 'scale(1)',
},

    message: {
      padding: '10px 14px', borderRadius: '18px', maxWidth: '85%', whiteSpace: 'pre-wrap', wordWrap: 'break-word',
    },
    userMessage: {
      alignSelf: 'flex-end', backgroundColor: '#007bff', color: 'white', borderBottomRightRadius: '4px',
    },
    assistantMessage: {
      alignSelf: 'flex-start', backgroundColor: '#e9e9eb', color: '#2c2c2e', borderBottomLeftRadius: '4px',
    },
    loadingMessage: {
      alignSelf: 'flex-start', color: '#666', fontStyle: 'italic',
    },
    inputArea: {
      padding: "12px", borderTop: "1px solid #e0e0e0", display: "flex", gap: "8px", backgroundColor: "#f5f5f5",
    },
    inputField: {
      flexGrow: 1, padding: "10px", border: "1px solid #ddd", borderRadius: "20px", fontSize: "14px",
    },
    sendButton: {
      padding: "10px 16px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "20px", cursor: "pointer", fontWeight: 500,
    }
  };

  return (
    <>
      {/* ✅ ADDED: Special style tag to hide the scrollbar in Chrome, Safari, etc. */}
      <style>
        {`
          .chat-content-container::-webkit-scrollbar {
            display: none;
          }
        `}
      </style>

      <button onClick={() => setIsOpen(!isOpen)} style={styles.toggleButton}>
        💬 DSA Buddy
      </button>

      {isOpen && (
  <Draggable handle=".dsa-buddy-header">
    <div style={styles.chatboxContainer}>
      {/* ✅ Add this class for draggable handle */}
      <div className="dsa-buddy-header" style={styles.chatboxHeader}>
        <h3 style={styles.headerTitle}>DSA Buddy</h3>
        <div style={styles.headerButtonContainer}>
          {!isReviewMode ? (
            <button
              onClick={() => setIsReviewMode(true)}
              style={styles.reviewButton}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
            >
              Review Code
            </button>
          ) : (
            <button
              onClick={() => setIsReviewMode(false)}
              style={styles.reviewButton}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
            >
              Chat with AI
            </button>
          )}
          <button
            onClick={() => setIsOpen(false)}
            style={styles.closeButton}
          >
            &times;
          </button>
        </div>
      </div>

      {/* Main Content */}
      {isReviewMode ? (
        <ReviewMode
          apiKey={apiKey}
          problemDescription={problemDescription}
          onBack={() => setIsReviewMode(false)}
        />
      ) : (
        <>
          <div
            className="chat-content-container"
            style={styles.chatContent}
            ref={chatContentRef}
          >
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  ...styles.message,
                  ...(msg.role === 'user' ? styles.userMessage : styles.assistantMessage),
                }}
              >
                {msg.content}
              </div>
            ))}
            {isLoading && (
              <div style={{ ...styles.message, ...styles.loadingMessage }}>
                <span>Thinking...</span>
              </div>
            )}
          </div>

          <div style={styles.inputArea}>
            <input
              type="text"
              placeholder="Ask for a hint..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              disabled={isLoading}
              style={styles.inputField}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              style={{
                ...styles.sendButton,
                cursor: isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              Send
            </button>
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