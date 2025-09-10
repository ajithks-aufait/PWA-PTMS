export const msalConfig = {
  auth: {
    // clientId: "b71d2039-dadc-4393-8744-e7f648d085a1",
    clientId: "4857055b-ead8-4b42-8b4b-216034dc6c29",
    // authority: "https://login.microsoftonline.com/8efa5ce2-86e4-4882-840c-f2578cdf094c",
    authority: "https://login.microsoftonline.com/aa44c5c1-5448-4e74-88d9-17838a6f9d5a",
    redirectUri: window.location.origin
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false,
  },
};

export const loginRequest = {
  // scopes: ["https://aufaitcloud.sharepoint.com/.default"],
  scopes: ["https://bectors.sharepoint.com/.default"],
};
