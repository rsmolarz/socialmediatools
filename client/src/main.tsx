import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./styles/mobile.css";
import { pwaManager } from "./utils/pwa-manager";

pwaManager.registerServiceWorker();

createRoot(document.getElementById("root")!).render(<App />);
