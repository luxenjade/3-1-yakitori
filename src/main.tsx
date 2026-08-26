import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import Login from "./Login";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");

function Root() {
  const [authed, setAuthed] = useState(false);
  return authed ? <App /> : <Login onLogin={() => setAuthed(true)} />;
}

createRoot(rootElement).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
