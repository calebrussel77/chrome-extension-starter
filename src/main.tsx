import React from "react";
import { createRoot } from "react-dom/client";
import Popup from "./chrome-extension/popup";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);
