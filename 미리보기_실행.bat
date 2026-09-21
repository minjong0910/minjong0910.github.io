@echo off
chcp 65001 >nul
title B3 Nav - Local Preview (localhost:8080)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0preview.ps1"
pause
