import { defineConfig, globalIgnores } from "eslint/config";
import next from "eslint-config-next";

export default defineConfig([
  globalIgnores(["EDU_LEVEL_HANDOFF/**", ".next/**", "node_modules/**", "public/**", "data/**", ".claude/worktrees/**"]),
  ...next,
  {
    // Match the files for which Next registers the React and React Hooks plugins.
    files: ["**/*.{js,jsx,mjs,ts,tsx,mts,cts}"],
    rules: {
      "react/no-unescaped-entities": "off",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn"
    }
  }
]);
