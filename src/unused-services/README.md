This folder archives frontend files that are currently not part of the live app entry flow.

Active frontend entry flow:
- `src/main.jsx`
- `src/AppRouter.js`
- `src/Login/**`
- `src/App/App.js`
- `src/App/Main/Greeting/**`
- `src/App/Header/Nav/**` for the nav pieces still rendered by `Greeting`
- `src/App/SubApps/StudyPlannner/components/**`
- `src/config/api.js`
- `src/firebase.js`

Archived here:
- legacy entrypoint code that is no longer used by Vite
- unused API helpers
- old posts/chat/friends shell components
- old header/footer/logo/search UI tied to that shell
- unused study planner wrapper files

These files were moved here to separate inactive services and sub-apps from the active frontend without deleting them.
