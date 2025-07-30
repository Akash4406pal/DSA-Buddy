"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Spinner } from 'react-bootstrap'; // Using a spinner for a better saving indicator

const DSABuddyPopup = () => {
  const [apiKey, setApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false); // State to handle the saving process
  const [status, setStatus] = useState({ message: '', type: '', show: false });
  const [showKey, setShowKey] = useState(false);
  const inputType = showKey ? 'text' : 'password';

  // Fetch the key from storage when the component mounts
  useEffect(() => {
    // UPDATED: Looking for 'gemini_api_key' to match the chatbox component
    if (chrome && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(["gemini_api_key"], (result) => {
        if (result && result.gemini_api_key) {
          setApiKey(result.gemini_api_key);
        }
      });
    }
  }, []);

  const handleSaveKey = () => {
    if (!apiKey.trim()) {
      setStatus({ message: 'Please enter a valid API key.', type: 'danger', show: true });
      return;
    }

    // Set saving state to true to update the UI immediately
    setIsSaving(true);
    setStatus({ message: '', type: '', show: false }); // Hide previous status messages

    // UPDATED: Saving the key as 'gemini_api_key'
    chrome.storage.local.set({ 'gemini_api_key': apiKey }, () => {
      // This callback runs after the key has been successfully saved
      setIsSaving(false);
      setStatus({ message: 'API Key saved successfully!', type: 'success', show: true });

      // Hide the success message after a few seconds
      setTimeout(() => {
        setStatus(prev => ({ ...prev, show: false }));
      }, 2500);
    });
  };

  return (
    <div className="d-flex justify-content-center align-items-center min-vh-100 bg-light text-dark font-monospace px-3">
      <motion.div
        className="card shadow-lg border-0 p-4"
        style={{
          maxWidth: '350px',
          minWidth: '300px',
          width: '100%',
          borderRadius: '20px',
          backdropFilter: 'blur(12px)',
          background: 'linear-gradient(to top right, #ffffffee, #f1f5f9dd)',
        }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        {/* UPDATED: Title to match the chatbox component */}
        <h4 className="text-center mb-3 fw-bold">
          DSA Buddy <span role="img">🔥</span>
        </h4>
        <p className="text-center text-muted mb-4" style={{ fontSize: '0.85rem' }}>
          Get your free Google Gemini key to unlock AI hints.
        </p>

        {/* UPDATED: Label and link for Google Gemini */}
        <label htmlFor="apiKey" className="form-label fw-semibold text-muted">
        Google Gemini API Key
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="ms-1 text-decoration-none text-primary fw-normal"
            style={{ fontSize: '0.70rem' }}
          >
            (Get your key)
          </a>
        </label>

        <div className="position-relative mb-3">
          <input
            type={inputType}
            id="apiKey"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="form-control pe-5"
            placeholder="Your Google AI Studio API Key"
            disabled={isSaving}
            onKeyDown={(e) => e.key === "Enter" && handleSaveKey()}
          />
          <button
            type="button"
            className="btn btn-sm position-absolute top-50 end-0 translate-middle-y me-2 text-secondary"
            onClick={() => setShowKey(!showKey)}
            title="Show/Hide"
            style={{ background: 'none', border: 'none' }}
            disabled={isSaving}
          >
            {showKey ? '🙈' : '👁️'}
          </button>
        </div>

        {/* UPDATED: Button shows a spinner and "Saving..." text when busy */}
        <button
          className="btn btn-primary w-100 fw-semibold mb-2 d-flex align-items-center justify-content-center"
          onClick={handleSaveKey}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
                className="me-2"
              />
              Saving...
            </>
          ) : (
            'Save Key'
          )}
        </button>

        <AnimatePresence>
          {status.show && (
            <motion.div
              className={`alert alert-${status.type} text-center py-2 px-3 mt-2 mb-0`}
              role="alert"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3 }}
              style={{ fontSize: '0.85rem' }}
            >
              {status.message}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default DSABuddyPopup;