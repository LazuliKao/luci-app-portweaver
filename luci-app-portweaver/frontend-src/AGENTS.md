# AGENTS.md - PortWeaver Frontend (TypeScript)

## Overview

This is the LuCI web UI for PortWeaver, built with TypeScript and a custom JSX factory.

## Structure

The `frontend-src/` directory is organized as follows:
- `main.tsx`: Application entry point.
- `components/`: Reusable UI components.
- `modules/`: Business logic (e.g., RPC client).
- `types/`: TypeScript type definitions.
- `utils/`: Utility functions, including the JSX factory.

## Where to Look

- **UI Entry Point**: `main.tsx` (renders the main view).
- **UI Components**: `components/` (e.g., `StatusPanel.tsx`, `RuleEditor.tsx`).
- **State Management**: Handled within components; no central store.
- **API Communication**: `utils/rpc-client.ts`.
- **Custom JSX**: `utils/jsx-factory.ts`.

## Conventions

- **JSX**: Uses a custom factory (`createJsxElement`), not React. Components are classes with a `render()` method.
- **RPC Client**: `rpcClient` is a singleton for communicating with the backend via UBUS.
- **Styling**: Inline styles are used extensively.

## Anti-Patterns

- **React Hooks/Patterns**: Do not use `useState`, `useEffect`, or other React-specific features.
- **Direct DOM Manipulation**: Prefer re-rendering components over manually changing the DOM.
- **Ignoring RPC Errors**: Always attach a `.catch()` handler to `rpcClient` calls.
