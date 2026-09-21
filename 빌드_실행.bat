@echo off
chcp 65001 >nul
title B3 Nav - Build
pwsh -NoProfile -ExecutionPolicy Bypass -File "%~dp0빌드.ps1"
pause
