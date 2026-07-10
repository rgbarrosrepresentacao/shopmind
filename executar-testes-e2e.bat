@echo off
title ShopMind - Testes E2E de Homologacao
cls
echo ============================================================
echo           ShopMind - Suite E2E de Homologacao
echo ============================================================
echo.
echo  Escolha o modo de execucao:
echo.
echo  [1] Headless (segundo plano, rapido)
echo  [2] Visual (navegador aberto)
echo  [3] Visual Lento (500ms entre acoes - ideal para gravar)
echo  [4] Visual Lento - Apenas Criticos
echo  [5] Debug (DevTools aberto)
echo  [6] UI Interativo (Playwright UI)
echo  [7] Abrir Relatorio HTML
echo  [8] Sair
echo.
set /p opcao="Digite a opcao: "

if "%opcao%"=="1" goto headless
if "%opcao%"=="2" goto headed
if "%opcao%"=="3" goto slow
if "%opcao%"=="4" goto slow_critical
if "%opcao%"=="5" goto debug
if "%opcao%"=="6" goto ui
if "%opcao%"=="7" goto report
if "%opcao%"=="8" goto fim

echo Opcao invalida!
goto fim

:headless
echo.
echo [*] Executando testes em modo headless...
call npm run test:e2e
goto resultado

:headed
echo.
echo [*] Executando testes com navegador visivel...
call npm run test:e2e:headed
goto resultado

:slow
echo.
echo [*] Executando testes em modo visual lento (500ms)...
call npm run test:e2e:slow
goto resultado

:slow_critical
echo.
echo [*] Executando apenas testes CRITICOS em modo visual lento...
call npm run test:e2e:slow:critical
goto resultado

:debug
echo.
echo [*] Executando testes em modo debug...
call npm run test:e2e:debug
goto resultado

:ui
echo.
echo [*] Abrindo Playwright UI...
call npm run test:e2e:ui
goto resultado

:report
echo.
echo [*] Abrindo relatorio HTML...
call npm run test:e2e:report
goto fim

:resultado
echo.
echo ============================================================
echo  Execucao finalizada!
echo.
echo  Relatorio: test-results\reports\summary.md
echo  Videos:    test-results\videos\
echo  Prints:    test-results\screenshots\
echo  Traces:    test-results\traces\
echo  HTML:      playwright-report\
echo ============================================================

:fim
echo.
echo  Pressione qualquer tecla para fechar...
pause > nul
