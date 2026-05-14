import {
  ensureCommunityPluginEnabled,
  ensurePluginLink
} from "./test-vault-utils.mjs";

const linkResult = ensurePluginLink();
const enableResult = ensureCommunityPluginEnabled();

console.log(
  JSON.stringify(
    {
      link: linkResult,
      enable: enableResult
    },
    null,
    2
  )
);
