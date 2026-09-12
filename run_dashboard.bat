@echo off
title WildBird Telemetry Hub - 4대 조류군 통합 대시보드
echo ========================================================
echo  WildBird Telemetry Hub - 4대 조류군 통합 GIS 대시보드
echo ========================================================
echo  웹 브라우저를 실행합니다 (http://localhost:8000)...
start "" "http://localhost:8000/index.html"
"%USERPROFILE%\anaconda3\python.exe" -m http.server 8000
pause
