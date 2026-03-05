import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/root";
import "./styles.css";

// biome-ignore lint/style/noNonNullAssertion: init
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
