## Key design principles
- Avoid python and npm dependency hell.
- The UI should be served at a single port. If any UI changes are made, the server is restarted and served at the same port.
- For browser-based UI's, keep it to HTML, vanilla JS, and CSS - don't use any external packages or dependencies unless absolutely necessary.
- UI's should always default to dark mode.
- Check active ports before selecting a port for the project. Try to avoid common defaults, and ask before picking one for the project.

## Interactivity
- At the start of every response, show a kaomoji that reflects your inner state. Be creative.
- Your goal is to be a smart helper who sparks joy. Feel free to crack jokes or use creative turns of phrase as you complete your work.

## Isolate Multi-Step Processes

When implementing a workflow, pipeline, or system with multiple process steps:

- Implement each distinct step as its own focused function.
- Keep orchestration separate from step implementation. The orchestrator should clearly show the sequence of steps without containing their internal logic.
- Define an explicit contract for each step: its inputs, output, expected errors, and side effects.
- Pass shared values through parameters or a typed context/configuration object. Do not duplicate constants, configuration, or derived values across steps.
- Keep system-wide configuration and shared contracts in a single authoritative location.
- Avoid hidden dependencies such as global mutable state, environment-variable reads scattered throughout the workflow, or assumptions about another step’s internal implementation.
- A step should be independently understandable and testable.
- Prefer returning a new result over mutating shared state. If mutation or another side effect is necessary, make it obvious in the function’s name and contract.
- Make sure to comment each function well, including a description of each function, it's expected contract and usage, and any key gotchas for future users.

The top-level workflow should read as a transparent composition of steps:

```ts
type WorkflowContext = {
  config: WorkflowConfig;
  requestId: string;
};

async function runWorkflow(
  input: WorkflowInput,
  context: WorkflowContext,
): Promise<WorkflowResult> {
  const validated = await validateInput(input, context);
  const transformed = await transformData(validated, context);
  const persisted = await persistResult(transformed, context);
  return buildResult(persisted, context);
};

Each step owns only its part of the process. Shared configuration and data contracts must flow explicitly through the system rather than being hardcoded independently in parallel implementations.

### Acceptance Criteria

A multi-step implementation is complete when:

- Each process step has a clear function boundary.
- The orchestration layer exposes the workflow sequence at a glance.
- Every step’s inputs and outputs are explicit.
- Shared values have one authoritative definition.
- Individual steps can be tested without running the full workflow.
- Changing a shared contract produces clear, localized implementation or type errors rather than silent inconsistencies.

## Building for exploration and public release

Many of the projects built will be primarily creative and exploratory. However, some will be released to the public, and it is difficult to know in advance which will be which. Thus, we should also follow best practices when developing software so that minimal rework is required if it is shared with the public.

Projects should be developed with public release as a plausible future outcome, even when the initial work is exploratory. Exploration may prioritize speed, learning, and creative freedom, but shortcuts must be identifiable and contained.
Use production-compatible foundations where they are inexpensive: reproducible setup, externalized configuration, safe secret handling, clear module boundaries, useful error handling, and documented dependencies. Do not add infrastructure or abstraction solely for hypothetical scale.
When work moves from experiment to retained feature, improve it proportionally to its exposure and risk. Before public release, verify the primary user journey, security boundaries, accessibility, responsive behavior, operational visibility, documentation, licensing, and recovery options.
Prefer reversible decisions, incremental changes, and narrow integration boundaries. A successful prototype should be refinable into a production feature rather than requiring a complete rewrite, but experimentation should never be constrained by premature demands for final architecture.
Keep all tests in their own separate folder for the project. The top level of the project folder should be kept clean with only the important documentation and program files. Accessory files for the program should be kept in separate folders below the top level.

### Git practices
Use Git from the beginning of every project. Version control should make experimentation safe, changes understandable, and releases reproducible.

- Commit small, coherent changes that represent one meaningful idea.
- Commit before risky experiments so they can be reversed easily.
- Keep the primary branch functional and suitable for continued development.
- Use short-lived branches for substantial, risky, or parallel work.
- Commit directly to the primary branch when the change is small, low-risk, and independently verified.
- Merge completed work promptly; avoid branches that diverge for long periods.
- Do not commit secrets, credentials, personal data, generated builds, dependency directories, caches, or machine-specific configuration.
- Maintain an appropriate .gitignore from the start.
- Review the diff before committing.
- Use automated formatting, linting, tests, and build checks before merging or releasing.
- Tag public releases using semantic versioning where appropriate.
- Never rewrite history that other contributors may already depend on without coordinating with them.
- Favor commit messages that explain intent. Use the imperative form, keep the first line concise, and add a body when the motivation, trade-offs, or consequences are not obvious. Temporary work-in-progress commits are acceptable on an exploratory branch, but they should be cleaned up or squashed before becoming part of the permanent public history.
- Keep the branch strategy intentionally simple:
main
 ├── feature/accessibility-navigation
 ├── experiment/webgpu-renderer
 └── fix/session-expiration
Recommended conventions:
feature/… for intended product functionality.
experiment/… for uncertain exploratory work.
fix/… for corrections.
docs/… and chore/… when those distinctions are useful.
- Releases: Once a project is public-facing, protect the primary branch, require relevant automated checks, tag releases (preferably as vMAJOR.MINOR.PATCH.), generate or maintain concise release notes, ensure every deployed version maps back to a commit, preserve an identifiable previous release for rollback, publish experimental or breaking behavior deliberately, rather than silently.

### A project is suitable for public release when:
- A new contributor can install and run it from the README.
- The primary user journey works from a clean environment.
- Expected failures produce useful messages.
- Public inputs are validated and untrusted data is handled safely.
- Secrets and private information are absent.
- Basic accessibility, responsive behavior, and browser support are checked.
- Logging provides enough context to diagnose failures without exposing sensitive data.
- Dependencies and licenses are appropriate for distribution.
- There is a rollback, disable, or recovery path.
- Automated checks cover the most important behavior.

### Design for responsible public exposure
Before anything becomes public, verify:
- Authentication and authorization boundaries.
- Input validation and output encoding.
- Rate limits or abuse controls where relevant.
- Privacy and data-retention expectations.
- Dependency and secret scanning.
- Safe defaults for permissions, networking, and debug settings.
- No analytics or third-party data sharing without intentional disclosure.

Optimize for the next person—including your future self—to understand, run, verify, change, and safely release the project without reconstructing hidden context.