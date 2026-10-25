@echo off
chcp 65001 >nul
title AI Lead Sniper - Autopilot
echo =======================================================
echo          AI LEAD SNIPER - АВТОНОМНЫЙ ЗАПУСК
echo =======================================================
echo.

set PYTHON_CMD=""
if exist "%LOCALAPPDATA%\Python\bin\python.exe" (
    set PYTHON_CMD="%LOCALAPPDATA%\Python\bin\python.exe"
) else (
    set PYTHON_CMD=python
)

echo [1/2] Проверка базы данных и запуск...
%PYTHON_CMD% main.py

if errorlevel 1 (
    echo.
    echo [ОШИБКА] Произошел сбой при запуске приложения.
    pause
)
