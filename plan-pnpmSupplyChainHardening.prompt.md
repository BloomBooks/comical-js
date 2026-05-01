## Plan: pnpm Supply Chain Hardening

Adapt the hardening pattern from the config-r pnpm migration, but fit it to comical-js's actual constraints. The first repo-specific prerequisite is to upgrade the build/runtime baseline off Node 16.20.2 so the repo can use the latest stable pnpm instead of being pinned to an older pnpm major for compatibility. The cleanest target is to align the build job and Volta pin with the modern Node version already used by the publish job, then migrate installs/builds to the latest stable pnpm while keeping the npm-based clean-publish step for the final npm publish.

**Steps**

1. Upgrade the repo's Node baseline first. Update the Volta pin in package.json and the build job in .github/workflows/publish.yml from Node 16.20.2 to a current supported Node version, preferably the same Node 24 already used by the publish job. Validate the existing build under that newer Node version before changing package managers so any breakage can be attributed to the runtime upgrade rather than pnpm itself.
2. After the Node baseline is raised, update package.json to replace `packageManager: yarn@1.22.19` with an exact latest-stable pnpm version and replace `volta.yarn` with the matching `volta.pnpm` pin. Preserve the existing `clean-publish` configuration that explicitly publishes via npm.
3. Add a root pnpm-workspace.yaml using the same baseline hardening knobs that were actually shipped in config-r: `minimumReleaseAge: 10080`, `blockExoticSubdeps: true`, `strictDepBuilds: true`, an explicit `allowBuilds` map, and `savePrefix: ''`. Do not add `trustPolicy` in the first pass. Because this repo uses older tooling such as webpack 4, Storybook 6, TypeScript 3.7, and husky 3, expect at least one or two install-script exceptions to be discovered during validation rather than guessed up front.
4. Generate pnpm-lock.yaml from the existing yarn.lock with `pnpm import`, then perform a fresh install under the pinned latest-stable pnpm. This keeps the migration close to the currently resolved dependency graph instead of opportunistically upgrading the old toolchain during the package-manager switch.
5. Follow the actual config-r change pattern for manifest pinning: convert dependencies and devDependencies to exact versions based on the imported lockfile and rely on `savePrefix: ''` to keep future adds exact. This repo has no peerDependencies today, so no peer-range decision is needed in this plan.
6. Update automation where Yarn is actually used in this repo. In package.json, the scripts already call local binaries directly, so broad script rewrites are probably unnecessary. In .github/workflows/publish.yml, switch the build job to the upgraded Node version, install the pinned pnpm version, change the dependency cache from Yarn to pnpm, and replace `yarn --frozen-lockfile` / `yarn build` with pnpm equivalents.
7. Keep the publish job's npm-specific behavior unless validation proves a safer replacement. The current workflow intentionally uses a modern Node plus `npm i --no-save clean-publish@4.0.1`, then invokes `clean-publish --package-manager npm -- --provenance`. That behavior should stay in scope as a deliberate exception, because it is tied to trusted publishing and to avoiding Yarn-specific registry behavior.
8. Update docs and cleanup files that are actually present here. Replace Yarn-specific README commands for both development and installation guidance, update any contributor notes to reflect the newer Node baseline plus pnpm usage, remove `yarn-error.log` from .gitignore if it is no longer needed, delete yarn.lock after validation, and remove the current .yarn cache directory. Do not plan work for `.yarnrc.yml` or `.yarn/releases`, because those files are not present in this repo.
9. Validate whether pnpm's default isolated linker works with this older webpack/Storybook stack. Only if the toolchain breaks under pnpm's default layout should the plan adopt `nodeLinker: hoisted` as an explicit compatibility exception, and that reason should be documented.
10. Add short contributor guidance so future dependency updates follow the hardened path: use the newer Node baseline and pnpm for installs, commit pnpm-lock.yaml, review any new `allowBuilds` entries carefully, and avoid changing the npm-based publish path without revalidating provenance and registry behavior.

**Relevant files**

- c:\dev\comical-js\package.json - raise the Volta Node pin, replace Yarn pinning with latest-stable pnpm pinning, preserve the npm-based clean-publish configuration, and optionally pin dependency versions exactly.
- c:\dev\comical-js\yarn.lock - source for `pnpm import`, then remove after validation.
- c:\dev\comical-js\.yarn - remove the current Yarn cache directory after pnpm is validated.
- c:\dev\comical-js\.github\workflows\publish.yml - raise the build job's Node version, switch the build job from Yarn to pnpm, and preserve the npm publish behavior.
- c:\dev\comical-js\README.md - replace Yarn-specific install and development commands.
- c:\dev\comical-js\.gitignore - remove Yarn-only ignore entries that are no longer relevant.
- new file: c:\dev\comical-js\pnpm-workspace.yaml - central location for minimumReleaseAge, blockExoticSubdeps, strictDepBuilds, allowBuilds, savePrefix, and any linker exception if one is required.
- new file: c:\dev\comical-js\pnpm-lock.yaml - committed lockfile for reproducible installs.

**Verification**

1. Validate that the repo's current build succeeds on the upgraded Node baseline before changing package managers; if it fails, fix the runtime/tooling incompatibilities before attributing anything to pnpm.
2. Confirm the repo can then use the latest stable pnpm version on that newer Node baseline.
3. Run `pnpm import` from the existing yarn.lock and confirm pnpm-lock.yaml is generated without unrelated source changes.
4. Remove node_modules, run a fresh pnpm install, and capture any `strictDepBuilds` failures so `allowBuilds` only includes the narrow exceptions this dependency graph actually needs.
5. Run the existing build path under pnpm with `pnpm build`, and run `pnpm build-storybook` as the nearest extra check for the Storybook side of the toolchain.
6. Validate .github/workflows/publish.yml conceptually after the edit: the build job should run on the newer Node version and use pnpm cache/install/build commands, while the publish job should continue to use modern Node plus npm-based clean-publish.
7. After validation succeeds, remove yarn.lock and the .yarn directory, then confirm there are no remaining Yarn references in README, package.json, workflow files, or .gitignore.

**Decisions**

- Included: Node baseline upgrade, pnpm migration, lockfile migration, 1-week minimum release age, strict dependency-build gating, exotic subdependency blocking, exact-version pinning for dependencies and devDependencies, workflow/doc cleanup, and Yarn artifact removal.
- Included with recommendation: align the build/runtime Node version with the modern version already used in the publish job, then pin the latest stable pnpm release.
- Included with repo-specific exception: keep the npm-based clean-publish release path instead of trying to force pnpm into the publish step.
- Excluded for the initial pass: trustPolicy rollout, resolutionMode changes, and replacing clean-publish.
- Not applicable here: peer dependency range policy, because this repo currently declares no peerDependencies.

**Further Considerations**

1. If Node 24 proves too aggressive for part of the legacy toolchain, the minimum acceptable floor for latest-stable pnpm should still be a supported Node version that satisfies current pnpm requirements; document whichever version is chosen and why.
2. Older packages in this dependency graph may need more install-script exceptions than the config-r repo needed; keep that allowlist narrow and version-specific.
3. If pnpm's isolated layout exposes compatibility issues in webpack 4 or Storybook 6, prefer documenting a single explicit `nodeLinker: hoisted` exception over making broader unrelated dependency changes during the migration.
