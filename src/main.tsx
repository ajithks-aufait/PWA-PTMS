import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { msalConfig } from "./auth/authConfig";
import { MsalProvider } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";
import { Provider } from "react-redux";
import store, { persistor } from "./store/store";
import { PersistGate } from "redux-persist/integration/react";

const msalInstance = new PublicClientApplication(msalConfig);

// Register service worker manually without install prompts
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MsalProvider instance={msalInstance}>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
      <App />
        </PersistGate>
      </Provider>
    </MsalProvider>
  </React.StrictMode>
);
