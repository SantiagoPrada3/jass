# Script para generar todos los componentes del Sistema JASS
# Ejecutar desde la raiz del proyecto Angular

Write-Host "Iniciando generacion de componentes del Sistema JASS..." -ForegroundColor Green

# Infrastructure Module Components
Write-Host "Generando componentes de Infrastructure..." -ForegroundColor Yellow
ng generate component modules/infrastructure/components/supplies-management --standalone --skip-tests
ng generate component modules/infrastructure/components/supplies-assignment --standalone --skip-tests
ng generate component modules/infrastructure/components/supplies-transfer --standalone --skip-tests

# User Management Module Components
Write-Host "Generando componentes de User Management..." -ForegroundColor Yellow
ng generate component modules/user-management/components/users-list --standalone --skip-tests

# Inventory-Purchases Module Components
Write-Host "Generando componentes de Inventory-Purchases..." -ForegroundColor Yellow
ng generate component modules/inventory-purchases/components/inventory-dashboard --standalone --skip-tests
ng generate component modules/inventory-purchases/components/products-list --standalone --skip-tests
ng generate component modules/inventory-purchases/components/purchases-list --standalone --skip-tests
ng generate component modules/inventory-purchases/components/categories-list --standalone --skip-tests
ng generate component modules/inventory-purchases/components/suppliers-list --standalone --skip-tests
ng generate component modules/inventory-purchases/components/kardex-movements --standalone --skip-tests

# Distribution Module Components
Write-Host "Generando componentes de Distribution..." -ForegroundColor Yellow
ng generate component modules/distribution/components/routes-management --standalone --skip-tests
ng generate component modules/distribution/components/rates-management --standalone --skip-tests
ng generate component modules/distribution/components/schedules-management --standalone --skip-tests
ng generate component modules/distribution/components/programming-management --standalone --skip-tests

# Water Quality Module Components
Write-Host "Generando componentes de Water Quality..." -ForegroundColor Yellow
ng generate component modules/water-quality/components/chlorine-control --standalone --skip-tests
ng generate component modules/water-quality/components/analysis-management --standalone --skip-tests
ng generate component modules/water-quality/components/analysis-points --standalone --skip-tests

# Payments-Billing Module Components
Write-Host "Generando componentes de Payments-Billing..." -ForegroundColor Yellow
ng generate component modules/payments-billing/components/payments-admin --standalone --skip-tests
ng generate component modules/payments-billing/components/payments-client --standalone --skip-tests

# Claims-Incidents Module Components
Write-Host "Generando componentes de Claims-Incidents..." -ForegroundColor Yellow
ng generate component modules/claims-incidents/components/incident-types --standalone --skip-tests
ng generate component modules/claims-incidents/components/incidents-list --standalone --skip-tests

# Report Templates Module Components
Write-Host "Generando componentes de Report Templates..." -ForegroundColor Yellow
ng generate component modules/report-templates/components/admin-reports --standalone --skip-tests
ng generate component modules/report-templates/components/super-admin-reports --standalone --skip-tests

# Organization Management Module Components
Write-Host "Generando componentes de Organization Management..." -ForegroundColor Yellow
ng generate component modules/organization-management/components/organization-admins --standalone --skip-tests
ng generate component modules/organization-management/components/organization-branches --standalone --skip-tests
ng generate component modules/organization-management/components/system-settings --standalone --skip-tests

# Shared Components (Perfil de usuario general)
Write-Host "Generando componentes compartidos..." -ForegroundColor Yellow
ng generate component shared/components/user-profile --standalone --skip-tests

Write-Host "Generacion de componentes completada!" -ForegroundColor Green
Write-Host "Recuerda configurar las rutas en los archivos routing correspondientes." -ForegroundColor Cyan
