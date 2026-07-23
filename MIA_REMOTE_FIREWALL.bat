@echo off
title MIA - firewall pro Fold (port 3000)
echo.
echo Povoli pristup k MIA z Foldu pres Tailscale.
echo Klepni ANO v dialogu UAC.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\remote_setup_firewall.ps1"
pause
