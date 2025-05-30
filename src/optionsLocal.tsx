import React from "react";
import { createRoot } from "react-dom/client";
import Options from "./chrome-extension/options";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Options />
  </React.StrictMode>
);
