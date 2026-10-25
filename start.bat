@echo off
title AI Lead Sniper - Autopilot
echo =======================================================
echo          AI LEAD SNIPER - AUTOPILOT
echo =======================================================
echo.

set PYTHONIOENCODING=utf-8

if exist "%LOCALAPPDATA%\Python\bin\python.exe" (
    "%LOCALAPPDATA%\Python\bin\python.exe" main.py
) else (
    python main.py
)

if errorlevel 1 (
    echo.
    echo Application stopped with an error.
    pause
)