@echo off
title ViralClip AI - Windows Desktop Launcher
cd /d "%~dp0"

if exist "dist\ViralClipAI\ViralClipAI.exe" (
    echo Starting ViralClip AI Desktop Application...
    start "" "dist\ViralClipAI\ViralClipAI.exe"
) else (
    echo Starting ViralClip AI via Python runtime...
    python desktop_app.py
)
exit
