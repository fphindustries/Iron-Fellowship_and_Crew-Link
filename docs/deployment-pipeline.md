# Crew Link deployment pipeline

This repository now supports branch-based Firebase deployments for Crew Link only:

- pushes to `dev` deploy to the `crew-link-dev` Firebase project
- pushes to `prod` deploy to the `crew-link-prod` Firebase project

That means the operational flow should be:

1. merge feature branches into `dev`
2. let GitHub Actions deploy `crew-link-dev`
3. merge `dev` into `prod`
4. let GitHub Actions deploy `crew-link-prod`

Use branch protection in GitHub if you want deployments to happen only after pull request merges rather than any direct push.

## Repository changes

- [deploy-crew-link-dev.yml](/c:/Repos/Iron-Fellowship_and_Crew-Link/.github/workflows/deploy-crew-link-dev.yml) deploys Hosting, Firestore rules/indexes, Storage rules, and Functions to the dev Firebase project on every push to `dev`
- [deploy-crew-link-prod.yml](/c:/Repos/Iron-Fellowship_and_Crew-Link/.github/workflows/deploy-crew-link-prod.yml) does the same for `prod`

The frontend does not need new variable names for dev vs prod. The workflows inject the same `VITE_CREW_LINK_*` variables with different values per GitHub environment.

## GitHub setup

Create two GitHub Environments in the repository:

- `crew-link-dev`
- `crew-link-prod`

Add these environment secrets to both environments:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_SERVICE_ACCOUNT`
- `VITE_CREW_LINK_FIREBASE_APIKEY`
- `VITE_CREW_LINK_FIREBASE_AUTHDOMAIN`
- `VITE_CREW_LINK_FIREBASE_PROJECTID`
- `VITE_CREW_LINK_FIREBASE_STORAGEBUCKET`
- `VITE_CREW_LINK_FIREBASE_MESSAGINGSENDERID`
- `VITE_CREW_LINK_FIREBASE_APPID`
- `VITE_POSTHOG_KEY`
- `VITE_POSTHOG_HOST`

Recommended GitHub branch rules:

- create a persistent `dev` branch if it does not already exist
- protect `dev` and `prod`
- require pull requests for changes to `dev` and `prod`
- optionally require the relevant deployment workflow to pass before merge completion

## Firebase setup

Confirm these Firebase projects exist and are the intended targets:

- `.firebaserc` alias `crew-link-dev` -> `crew-link-dev`
- `.firebaserc` alias `crew-link-prod` -> `starforged-crew-link`

For each Firebase project:

1. create a service account key with permission to deploy Hosting, Firestore, Storage, and Functions
2. store the full JSON key in the matching GitHub environment as `FIREBASE_SERVICE_ACCOUNT`
3. ensure Firebase Functions is enabled and the project is on a plan that supports the functions you deploy
4. create the Functions secret `OPENAI_API_KEY`

You can set the functions secret with the Firebase CLI:

```bash
firebase functions:secrets:set OPENAI_API_KEY --project crew-link-dev
firebase functions:secrets:set OPENAI_API_KEY --project starforged-crew-link
```

## Notes

- The workflows deploy `functions` because the Crew Link app calls Firebase callable functions for AI and homebrew flows
- The current pull request preview workflows are still present; they are separate from the branch deployment pipeline
- If you want to stop deploying Firestore, Storage, or Functions, remove those targets from the `firebase deploy --only ...` argument in the workflow files
