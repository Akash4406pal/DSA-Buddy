// review.jsx
"use client";
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown'; // Run: npm install react-markdown
import '../components/index.css'
// Helper function to create the detailed mentor prompt
const createMentorPrompt = (problemDescription, userCode) => {
  return `You are a senior software engineer and an expert DSA mentor. Your tone is encouraging, constructive, and helpful. You are reviewing a solution submitted by a student.

The original problem was:
---
${problemDescription || "No problem description was found. Please review the code based on common DSA patterns."}
---

Here is the student's solution:
---
${userCode}
---

Please provide a structured code review. Address the student directly and follow these exact steps:

1.  **Overall Feedback:** Start with a brief, encouraging summary of the solution.
2.  **Time Complexity:** Analyze the time complexity (e.g., $O(N)$, $O(N \\log N)$). Clearly explain *why* their code results in this complexity by pointing to the specific loops or operations.
3.  **Space Complexity:** Analyze the space complexity (e.g., $O(1)$, $O(N)$). Explain what data structures or variables are contributing to the memory usage.
4.  **Missed Edge Cases:** Identify any critical edge cases the solution might fail on. For example: empty arrays, arrays with one element, duplicate values, or very large numbers.
5.  **Alternative Approaches:** Suggest one better or different approach. Briefly explain its logic and compare its time/space complexity trade-offs with the user's solution.`;
};


const ReviewMode = ({ apiKey, problemDescription, onBack }) => {
  const [userCode, setUserCode] = useState('');
  const [reviewResult, setReviewResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGetReview = async () => {
    if (!userCode.trim()) {
      setError("Please paste your code before submitting.");
      return;
    }
    if (!apiKey) {
      setError("Gemini API key is not set.");
      return;
    }

    setIsLoading(true);
    setReviewResult('');
    setError('');

    const mentorPrompt = createMentorPrompt(problemDescription, userCode);

    try {
      const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
      const requestBody = {
        contents: [{ parts: [{ text: mentorPrompt }] }]
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

      setReviewResult(assistantReply);

    } catch (err) {
      console.error("❌ Error fetching review from Gemini API:", err);
      setError(`⚠️ Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // review.jsx

// ... (keep everything else the same)

  const styles = {
    container: { padding: '5px', display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#fafafa' },
    
    // ✅ CHANGED: Removed fixed height to allow for flexible layout
    textarea: { 
      width: '100%',
      backgroundColor:"#3B3B3B",
      color:"#9CA3AF", 
      minHeight: '150px', 
      flexShrink: 0, 
      border: '1px solid #ccc', 
      borderRadius: '8px', 
      padding: '5px', 
      fontFamily: `'Fira Code', monospace`, 
      fontSize: '14px', 
      resize: 'vertical' 
    },
    
    submitButton: { backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '20px', padding: '10px 16px', cursor: 'pointer', fontWeight: 500, marginTop: '12px', alignSelf: 'center' },
    
    // ✅ CHANGED: Added flexGrow to make it fill remaining space
    resultArea: {
      flexGrow: 1, // This makes the div expand
      minHeight: 0, // Important for flex-grow in some browsers
      marginTop: '10px',
      padding: '10px',
      color: '#D1D5DB',
      fontFamily: `'Fira Code', monospace`,
      fontSize: '16px',
      lineHeight: '1.6',
      borderRadius: '10px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
      border: '1px solid #4B5563',
      overflowY: 'auto',
      backdropFilter: 'blur(4px)',
      backgroundColor: 'rgba(46,46,46,0.9)',
    },

    errorText: { color: 'red', marginTop: '10px', textAlign: 'center' },
    loadingText: { textAlign: 'center', color: '#666', fontStyle: 'italic', marginTop: '20px' }
  };

// ... (rest of the component)

  return (
    <div style={styles.container}>
      <textarea
        spellCheck={false}
        tabIndex={0}
        style={styles.textarea}
        value={userCode}
        onChange={(e) => setUserCode(e.target.value)}
        placeholder="Paste your complete code solution here..."
      />
      <button onClick={handleGetReview} disabled={isLoading} style={styles.submitButton}>
        {isLoading ? 'Getting Review...' : 'Submit for Review'}
      </button>

      {error && <p style={styles.errorText}>{error}</p>}
      
      {isLoading && !reviewResult && <p style={styles.loadingText}>Analyzing your code...</p>}
      
      {reviewResult && (
        <div className="result-scroll" style={styles.resultArea}>
          <h2 style={{textAlign:'center', 
           background: 'linear-gradient(to right, rgb(175, 82, 222), rgb(0, 122, 255))',
           WebkitBackgroundClip: 'text',
           WebkitTextFillColor: 'transparent',
           fontWeight: 'bold',
          fontSize: '18px'}}
          >
          Code Review Result
          </h2>
  <ReactMarkdown
            children={reviewResult}
            components={{
              // This custom component adds a "Copy" button to every <pre> tag
              pre: ({ node, ...props }) => {
                const [copyText, setCopyText] = useState('Copy');

                const handleCopy = () => {
                  const codeNode = node.children[0]; // The <code> element
                  if (codeNode && codeNode.children) {
                    const codeString = codeNode.children[0].value;
                    navigator.clipboard.writeText(codeString);
                    setCopyText('Copied!');
                    setTimeout(() => setCopyText('Copy'), 2000); // Reset after 2 seconds
                  }
                };

                return (
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={handleCopy}
                      style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        zIndex: 1,
                        background: 'rgba(96, 107, 121, 0.8)',
                        color: 'white',
                        border: '1px solid #4B5563',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      {copyText}
                    </button>
                    <pre {...props} style={{ backgroundColor: '#1F1F1F', padding: '16px', paddingTop: '40px', borderRadius: '8px', overflowX: 'auto' }}>
                      {props.children}
                    </pre>
                  </div>
                );
              },
              // You can keep other custom styles
              h1: ({ node, ...props }) => <h1 style={{ fontSize: '20px', marginBottom: '10px' }} {...props} />,
              h2: ({ node, ...props }) => <h2 style={{ fontSize: '18px', marginBottom: '10px' }} {...props} />,
              strong: ({ node, ...props }) => <strong style={{ color: '#FBBF24' }} {...props} />,
              p: ({ node, ...props }) => <p style={{ marginBottom: '10px' }} {...props} />
            }}
          />
          {/* ✅ END: Updated ReactMarkdown component */}
        </div>
      )}
    </div>
  );
};

export default ReviewMode;