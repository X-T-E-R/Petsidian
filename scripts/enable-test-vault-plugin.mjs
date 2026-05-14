import { ensureCommunityPluginEnabled } from "./test-vault-utils.mjs";

const result = ensureCommunityPluginEnabled();
console.log(JSON.stringify(result, null, 2));
