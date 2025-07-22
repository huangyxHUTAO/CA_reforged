@echo off
set CORE_PATH=%CD%\..\ca
set SHELL_PATH=%CD%
cd /d %CORE_PATH%
cabuild shellBuildReleaseHotfix
cd /d %SHELL_PATH%