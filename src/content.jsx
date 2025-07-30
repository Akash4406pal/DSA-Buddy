// ✅ content.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import DSABuddyChatbox from "./components/DSABuddyChatbox";

console.log("DSA Buddy Content Script Loaded!");

const container = document.createElement("div");
container.id = "dsa-buddy-root";
document.body.appendChild(container);

const root = createRoot(container);
root.render(<DSABuddyChatbox />);