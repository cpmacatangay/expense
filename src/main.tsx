import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/app/App";
import { Providers } from "@/app/providers";
import { PlatformProvider } from "@/platform/PlatformProvider";
import "@/ui/tokens/fonts.css";
import "@/ui/tokens/tokens.css";
import "@/styles/global.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

createRoot(root).render(
  <StrictMode>
    <PlatformProvider>
      <Providers>
        <App />
      </Providers>
    </PlatformProvider>
  </StrictMode>
);
