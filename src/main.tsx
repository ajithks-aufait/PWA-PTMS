import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { msalConfig } from "./auth/authConfig";
import { MsalProvider } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";
import { Provider } from "react-redux";
import store from "./store/store";

const msalInstance = new PublicClientApplication(msalConfig);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MsalProvider instance={msalInstance}>
      <Provider store={store}>
      <App />
      </Provider>
    </MsalProvider>
  </React.StrictMode>
);
