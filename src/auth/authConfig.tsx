export const msalConfig = {
  auth: {
    clientId: "bc354eee-598a-4ad3-86ee-4e87d0dec425",
    authority: "https://login.microsoftonline.com/8efa5ce2-86e4-4882-840c-f2578cdf094c",
    redirectUri: "http://localhost:5173",
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false,
  },
};

export const loginRequest = {
  scopes: ["https://aufaitcloud.sharepoint.com/.default"],
};