# Script para generar Views adicionales del Sistema JASS
# Ejecutar desde la raiz del proyecto Angular

Write-Host "Iniciando generacion de Views adicionales del Sistema JASS..." -ForegroundColor Green

# Admin Views
Write-Host "Generando Views de ADMIN..." -ForegroundColor Yellow
ng generate component views/admin/analytics --standalone --skip-tests
ng generate component views/admin/profile-settings --standalone --skip-tests

# Super Admin Views
Write-Host "Generando Views de SUPER_ADMIN..." -ForegroundColor Yellow
ng generate component views/super-admin/global-analytics --standalone --skip-tests
ng generate component views/super-admin/system-config --standalone --skip-tests
ng generate component views/super-admin/backup-restore --standalone --skip-tests

# Client Views
Write-Host "Generando Views de CLIENT..." -ForegroundColor Yellow
ng generate component views/client/bill-history --standalone --skip-tests
ng generate component views/client/service-requests --standalone --skip-tests
ng generate component views/client/account-settings --standalone --skip-tests

Write-Host "Generacion de Views adicionales completada!" -ForegroundColor Green
Write-Host "Recuerda agregar las rutas en app.routes.ts" -ForegroundColor Cyan
