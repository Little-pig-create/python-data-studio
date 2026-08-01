# Native CPython Runtime

This directory is the reproducible input for the Tauri desktop runtime. The
build script creates `dist/python-runtime`, a self-contained Python virtual
environment with the locked data-science dependencies and a manifest.

The artifact contains the CPython executable, DLLs, standard library and
locked packages. It is not a virtual environment and does not reference the
builder's Python path. The application never installs packages on first
launch. Build this runtime before `npm run desktop:build`:

```powershell
npm run build:native-runtime
```
