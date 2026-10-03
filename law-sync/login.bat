@echo off
cd /d "%~dp0.."
py -3 law-sync/check.py --login
pause
