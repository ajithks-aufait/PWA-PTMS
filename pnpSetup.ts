
// pnpSetup.ts
import { spfi } from "@pnp/sp";
import { SPFx } from "@pnp/sp/presets/all";

export const getSP = () => {
  return spfi("https://aufaitcloud.sharepoint.com/sites/Mrs_Bectors_PTMS");
};
