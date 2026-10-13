@echo off
rem ASCII only. Korean lives in the .ps1 next to this file -
rem a UTF-8 .bat is mis-read by cmd.exe, and a cp949 .bat breaks
rem Korean path literals once chcp 65001 runs. See the .ps1.
pwsh -NoProfile -ExecutionPolicy Bypass -File "%~dp0빠른측정.ps1"
if errorlevel 1 pause
