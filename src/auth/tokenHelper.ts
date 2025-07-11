// tokenHelper.ts
import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig, loginRequest } from "./authConfig";

const msalInstance = new PublicClientApplication(msalConfig);
let initialized = false;

export const getAccessToken = async (): Promise<string> => {
  if (!initialized) {
    await msalInstance.initialize();
    initialized = true;
  }

  const accounts = msalInstance.getAllAccounts();
  if (accounts.length === 0) {
    await msalInstance.loginPopup(loginRequest);
  }

  const result = await msalInstance.acquireTokenSilent({
    ...loginRequest,
    account: msalInstance.getAllAccounts()[0],
  });

  return result.accessToken;
};
