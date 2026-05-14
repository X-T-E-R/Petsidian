import { ensurePluginLink } from "./test-vault-utils.mjs";

const result = ensurePluginLink();
console.log(JSON.stringify(result, null, 2));
