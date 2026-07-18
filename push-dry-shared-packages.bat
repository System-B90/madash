@echo off
:: Finalize the dry/shared-packages session-ws commit and push to origin
:: Run this from the madash-wt-shared-pkgs directory

cd /d "%~dp0"

echo === Removing stale git index lock ===
del /f /q "C:\Users\mkupe\Code\system-b90\madash\.git\worktrees\madash-wt-shared-pkgs\index.lock"

echo === Verifying commit on dry/shared-packages ===
git -C "C:\Users\mkupe\Code\system-b90\madash" log --oneline refs/heads/dry/shared-packages | head /C:3

echo === Pushing to origin ===
git -C "C:\Users\mkupe\Code\system-b90\madash" push origin dry/shared-packages

echo === Done ===
pause
