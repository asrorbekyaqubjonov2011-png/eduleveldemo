import { defineConfig, globalIgnores } from "eslint/config";
import next from "eslint-config-next";

export default defineConfig([
  globalIgnores(["EDU_LEVEL_HANDOFF/**", ".next/**", "node_modules/**", "public/**", "data/**"]),
  {
    extends: [...next],
    rules: {
      // Uzbek copy uses apostrophes (o'quvchi, g'alaba) as letters; escaping them adds no safety in JSX text.
      "react/no-unescaped-entities": "off",
      // React Compiler advisories (not runtime errors). Kept visible as warnings; see TEST_REPORT.md.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn"
    }
  }
]);
