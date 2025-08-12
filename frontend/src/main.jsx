import React from "react";
import { Analytics } from "@vercel/analytics/next"
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
    <Analytics/>
    </React.StrictMode>
);
