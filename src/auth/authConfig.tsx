export const msalConfig = {
  auth: {
    clientId: "b71d2039-dadc-4393-8744-e7f648d085a1",
    authority: "https://login.microsoftonline.com/8efa5ce2-86e4-4882-840c-f2578cdf094c",
    redirectUri: window.location.origin
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false,
  },
};

export const loginRequest = {
  scopes: ["https://aufaitcloud.sharepoint.com/.default"],
};