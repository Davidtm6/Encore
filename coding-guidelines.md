# Encore coding guidelines

Encore follows existing, published style guides. We do not write our own rules; the configuration files listed below only select a guide's options or turn on its checks.

| Language | Where it is used in Encore | Guideline we follow | Enforced by |
| --- | --- | --- | --- |
| TypeScript and TSX | React app (`src/`) and Vercel functions (`api/`) | [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html), plus the [Rules of React](https://react.dev/reference/rules) and [Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks) | `tsc --strict`, ESLint with `typescript-eslint` (recommended + stylistic presets) and `eslint-plugin-react-hooks`, Prettier |
| SQL (PostgreSQL, PL/pgSQL) | Supabase migrations, row-level security policies, ranking functions, pgTAP tests (`supabase/`) | [SQL Style Guide by Simon Holywell](https://www.sqlstyle.guide/) | SQLFluff (`dialect = postgres`) |
| Python | Ranking prototype and its tests (`prototype/`) | [PEP 8](https://peps.python.org/pep-0008/) | Ruff (`ruff check` and `ruff format`) |
| CSS | Component styles in the React app | [Google HTML/CSS Style Guide](https://google.github.io/styleguide/htmlcssguide.html) (CSS sections) | Prettier, Stylelint (`stylelint-config-standard`) |

## Why these guides

- **TypeScript: Google.** It is a complete, maintained guide written for TypeScript rather than adapted from JavaScript, and it requires the explicit types and named exports that keep our feature modules' public interfaces small. Most of its formatting rules are delegated to an automatic formatter, which matches our plan to use Prettier. The React rules are the official ones; the hooks plugin checks them mechanically, which matters because our controllers are hooks.
- **SQL: sqlstyle.guide.** It is the most widely cited general SQL guide and SQLFluff can check it. Our correctness and privacy depend on migrations and policies, so they get the same review and lint gates as application code. Supabase does not publish a SQL style guide of its own.
- **Python: PEP 8.** It is the standard for Python. Python is used only for the ranking prototype, so the one standard guide is enough.
- **CSS: Google.** It pairs with the TypeScript guide and its rules are checkable by Stylelint.

## How we enforce them

1. **Editor:** each tool's config file is committed at the repository root (`eslint.config.js`, `.prettierrc`, `.stylelintrc.json`, `.sqlfluff`, and Ruff settings in `pyproject.toml`), so formatters and linters run with identical settings in every editor.
2. **Continuous integration:** a GitHub Actions workflow runs `tsc --noEmit`, `eslint`, `prettier --check`, `stylelint`, `sqlfluff lint supabase/`, `ruff check`, and `ruff format --check` on every pull request. A failing check blocks merging into `main`.
3. **Review:** `main` is protected and every pull request needs one approving review. Reviewers check the parts tools cannot, such as naming, module boundaries, and comments, against the linked guide, and cite the guide's section when requesting a change.
4. **Exceptions:** a rule may be disabled only on a single line with a comment explaining why (for example `// eslint-disable-next-line <rule> -- reason`). File-wide or repository-wide disables need agreement in the pull request.

The linter configuration and the CI workflow are added together with the React app scaffold (see the project schedule in the living document). That pull request also brings the existing files into compliance: Ruff currently reports two findings in `prototype/test_ranking.py` and one formatting change in `prototype/ranking.py`, and SQLFluff reports indentation and spacing changes in the draft migration, and will also ask for uppercase keywords once the guide's capitalisation rule is enabled.
