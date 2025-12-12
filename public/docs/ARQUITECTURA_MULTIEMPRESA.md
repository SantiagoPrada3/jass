# Arquitectura Frontend Angular - Sistema Multiempresa JASS

## Visión General

Esta arquitectura está diseñada para soportar un sistema **multiempresa** y **multiorganización** escalable, con integración a múltiples microservicios y gestión de roles diferenciados.

## Microservicios Integrados

- **vg-ms-water-quality** - Gestión de calidad del agua
- **vg-ms-users** - Gestión de usuarios
- **vg-ms-payments-billing** - Pagos y facturación
- **vg-ms-organizations** - Gestión de organizaciones
- **vg-ms-inventory-purchases** - Inventario y compras
- **vg-ms-infrastructure** - Infraestructura
- **vg-ms-distribution** - Distribución
- **vg-ms-claims-incidents** - Reclamos e incidentes
- **vg-ms-gateway** - Gateway de enrutamiento
- **vg-ms-authentication** - Autenticación

## Roles del Sistema

- **SUPER_ADMIN** - Administrador del sistema completo (todas las empresas)
- **ADMIN** - Administrador de empresa específica
- **CLIENT** - Cliente/Usuario final

---

## Estructura de Carpetas Propuesta

```text
src/
├── app/
│   ├── app.config.ts
│   ├── app.component.ts
│   ├── app.routes.ts
│   │
│   ├── core/                          # Servicios y funcionalidades centrales
│   │   ├── auth/
│   │   │   ├── guards/
│   │   │   │   ├── auth.guard.ts
│   │   │   │   ├── role.guard.ts
│   │   │   │   └── session-timeout.guard.ts
│   │   │   ├── interceptors/
│   │   │   │   ├── auth.interceptor.ts
│   │   │   │   ├── organization.interceptor.ts
│   │   │   │   ├── error.interceptor.ts
│   │   │   │   ├── loading.interceptor.ts
│   │   │   │   ├── csrf.interceptor.ts
│   │   │   │   └── rate-limit.interceptor.ts
│   │   │   ├── services/
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── token.service.ts
│   │   │   │   ├── session.service.ts
│   │   │   │   ├── security.service.ts
│   │   │   └── models/
│   │   │       ├── auth.interface.ts
│   │   │       ├── session.interface.ts
│   │   │       └── security-event.interface.ts
│   │   │
│   │   ├── organization/
│   │   │   ├── services/
│   │   │   │   ├── organization.service.ts
│   │   │   │   ├── organization-context.service.ts
│   │   │   │   └── organization-resolver.service.ts
│   │   │   └── models/
│   │   │       ├── organization.interface.ts
│   │   │       └── organization-context.interface.ts
│   │   │
│   │   ├── state/                     # Manejo de estado global
│   │   │   ├── app-state.service.ts
│   │   │   ├── organization-state.service.ts
│   │   │   ├── user-state.service.ts
│   │   │   ├── loading-state.service.ts
│   │   │   └── security-state.service.ts
│   │   │
│   │   ├── security/                  # Servicios de seguridad
│   │   │   ├── encryption.service.ts
│   │   │   ├── xss-protection.service.ts
│   │   │   ├── csrf-protection.service.ts
│   │   │   ├── content-security.service.ts
│   │   │   ├── audit-log.service.ts
│   │   │   └── security-monitor.service.ts
│   │   │
│   │   └── utils/
│   │       ├── permissions.util.ts
│   │       ├── role.util.ts
│   │       └── organization.util.ts
│   │
│   ├── shared/                        # Componentes y servicios compartidos
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   │   ├── header/
│   │   │   │   ├── sidebar/
│   │   │   │   ├── breadcrumb/
│   │   │   │   ├── loading/
│   │   │   │   │   ├── spinner/
│   │   │   │   │   ├── skeleton/
│   │   │   │   │   ├── progress-bar/
│   │   │   │   │   └── page-loader/
│   │   │   │   ├── splash-screen/
│   │   │   │   │   ├── welcome-splash/
│   │   │   │   │   ├── organization-splash/
│   │   │   │   │   └── goodbye-splash/
│   │   │   │   ├── modals/
│   │   │   │   ├── notifications/
│   │   │   │   │   ├── toast/
│   │   │   │   │   ├── alert/
│   │   │   │   │   └── confirmation/
│   │   │   │   └── security/
│   │   │   │       ├── session-timeout/
│   │   │   │       ├── captcha/
│   │   │   │       └── security-banner/
│   │   │   ├── forms/
│   │   │   │   ├── dynamic-form/
│   │   │   │   └── form-controls/
│   │   │   └── tables/
│   │   │       ├── data-table/
│   │   │       └── pagination/
│   │   │
│   │   ├── directives/
│   │   │   ├── has-permission.directive.ts
│   │   │   ├── has-role.directive.ts
│   │   │   ├── organization-context.directive.ts
│   │   │   ├── secure-content.directive.ts
│   │   │   ├── loading-state.directive.ts
│   │   │   └── audit-track.directive.ts
│   │   │
│   │   ├── pipes/
│   │   │   ├── currency-by-org.pipe.ts
│   │   │   ├── date-by-org.pipe.ts
│   │   │   ├── permission.pipe.ts
│   │   │   ├── sanitize-html.pipe.ts
│   │   │   └── mask-sensitive.pipe.ts
│   │   │
│   │
│   ├── layouts/                       # Layouts por rol y contexto
│   │   ├── super-admin-layout/
│   │   │   ├── super-admin-layout.component.ts
│   │   │   ├── super-admin-layout.component.html
│   │   │   └── super-admin-layout.component.css
│   │   ├── admin-layout/
│   │   │   ├── admin-layout.component.ts
│   │   │   ├── admin-layout.component.html
│   │   │   └── admin-layout.component.css
│   │   ├── client-layout/
│   │   │   ├── client-layout.component.ts
│   │   │   ├── client-layout.component.html
│   │   │   └── client-layout.component.css
│   │   └── auth-layout/
│   │       ├── auth-layout.component.ts
│   │       ├── auth-layout.component.html
│   │       └── auth-layout.component.css
│   │
│   ├── modules/                       # Módulos por dominio de negocio
│   │   │
│   │   ├── authentication/            # Módulo de autenticación
│   │   │   ├── components/
│   │   │   │   ├── login/
│   │   │   │   ├── register/
│   │   │   │   ├── forgot-password/
│   │   │   │   └── role-selector/
│   │   │   ├── services/
│   │   │   │   └── auth-api.service.ts
│   │   │   ├── authentication.routes.ts
│   │   │   └── authentication.module.ts
│   │   │
│   │   ├── organization-management/   # Gestión de organizaciones
│   │   │   ├── components/
│   │   │   │   ├── organization-list/
│   │   │   │   ├── organization-detail/
│   │   │   │   ├── organization-form/
│   │   │   │   └── organization-dashboard/
│   │   │   ├── services/
│   │   │   │   └── organization-api.service.ts
│   │   │   ├── models/
│   │   │   │   └── organization.model.ts
│   │   │   ├── organization-management.routes.ts
│   │   │   └── organization-management.module.ts
│   │   │
│   │   ├── user-management/           # Gestión de usuarios
│   │   │   ├── components/
│   │   │   │   ├── user-list/
│   │   │   │   ├── user-detail/
│   │   │   │   ├── user-form/
│   │   │   │   └── role-assignment/
│   │   │   ├── services/
│   │   │   │   └── users-api.service.ts
│   │   │   ├── models/
│   │   │   │   ├── user.model.ts
│   │   │   │   └── role.model.ts
│   │   │   ├── user-management.routes.ts
│   │   │   └── user-management.module.ts
│   │   │
│   │   ├── water-quality/             # Calidad del agua
│   │   │   ├── components/
│   │   │   │   ├── quality-dashboard/
│   │   │   │   ├── quality-tests/
│   │   │   │   ├── quality-reports/
│   │   │   │   └── quality-history/
│   │   │   ├── services/
│   │   │   │   └── water-quality-api.service.ts
│   │   │   ├── models/
│   │   │   │   ├── quality-test.model.ts
│   │   │   │   └── quality-parameter.model.ts
│   │   │   ├── water-quality.routes.ts
│   │   │   └── water-quality.module.ts
│   │   │
│   │   ├── payments-billing/          # Pagos y facturación
│   │   │   ├── components/
│   │   │   │   ├── billing-dashboard/
│   │   │   │   ├── invoice-list/
│   │   │   │   ├── payment-history/
│   │   │   │   └── tariff-management/
│   │   │   ├── services/
│   │   │   │   └── payments-api.service.ts
│   │   │   ├── models/
│   │   │   │   ├── invoice.model.ts
│   │   │   │   └── payment.model.ts
│   │   │   ├── payments-billing.routes.ts
│   │   │   └── payments-billing.module.ts
│   │   │
│   │   ├── inventory-purchases/       # Inventario y compras
│   │   │   ├── components/
│   │   │   │   ├── inventory-dashboard/
│   │   │   │   ├── product-catalog/
│   │   │   │   ├── purchase-orders/
│   │   │   │   └── stock-management/
│   │   │   ├── services/
│   │   │   │   └── inventory-api.service.ts
│   │   │   ├── models/
│   │   │   │   ├── product.model.ts
│   │   │   │   └── purchase-order.model.ts
│   │   │   ├── inventory-purchases.routes.ts
│   │   │   └── inventory-purchases.module.ts
│   │   │
│   │   ├── infrastructure/            # Infraestructura
│   │   │   ├── components/
│   │   │   │   ├── infrastructure-map/
│   │   │   │   ├── asset-management/
│   │   │   │   ├── maintenance-schedule/
│   │   │   │   └── infrastructure-reports/
│   │   │   ├── services/
│   │   │   │   └── infrastructure-api.service.ts
│   │   │   ├── models/
│   │   │   │   ├── asset.model.ts
│   │   │   │   └── maintenance.model.ts
│   │   │   ├── infrastructure.routes.ts
│   │   │   └── infrastructure.module.ts
│   │   │
│   │   ├── distribution/              # Distribución
│   │   │   ├── components/
│   │   │   │   ├── distribution-network/
│   │   │   │   ├── service-connections/
│   │   │   │   ├── meter-readings/
│   │   │   │   └── distribution-reports/
│   │   │   ├── services/
│   │   │   │   └── distribution-api.service.ts
│   │   │   ├── models/
│   │   │   │   ├── connection.model.ts
│   │   │   │   └── meter-reading.model.ts
│   │   │   ├── distribution.routes.ts
│   │   │   └── distribution.module.ts
│   │   │
│   │   └── claims-incidents/          # Reclamos e incidentes
│   │       ├── components/
│   │       │   ├── claims-dashboard/
│   │       │   ├── incident-reporting/
│   │       │   ├── claims-tracking/
│   │       │   └── resolution-workflow/
│   │       ├── services/
│   │       │   └── claims-api.service.ts
│   │       ├── models/
│   │       │   ├── claim.model.ts
│   │       │   └── incident.model.ts
│   │       ├── claims-incidents.routes.ts
│   │       └── claims-incidents.module.ts
│   │
│   │   ├── report-templates/          # NUEVO: Plantillas de Reportes
│   │       ├── components/
│   │       │   ├── template-manager/
│   │       │   ├── template-editor/
│   │       │   ├── template-preview/
│   │       │   ├── template-library/
│   │       │   ├── report-generator/
│   │       │   └── custom-fields/
│   │       ├── services/
│   │       │   ├── template-api.service.ts
│   │       │   ├── report-engine.service.ts
│   │       │   └── pdf-generator.service.ts
│   │       ├── models/
│   │       │   ├── template.model.ts
│   │       │   ├── report-field.model.ts
│   │       │   └── report-output.model.ts
│   │       ├── report-templates.routes.ts
│   │       └── report-templates.module.ts
│   │
│   ├── views/                         # Vistas principales por rol
│   │   ├── super-admin/
│   │   │   ├── dashboard/
│   │   │   ├── system-management/
│   │   │   ├── global-reports/
│   │   │   └── organization-overview/
│   │   ├── admin/
│   │   │   ├── dashboard/
│   │   │   ├── organization-config/
│   │   │   ├── user-management/
│   │   │   ├── reports/
│   │   │   └── templates/              # NUEVO: Gestión de plantillas
│   │   └── client/
│   │       ├── dashboard/
│   │       ├── my-services/
│   │       ├── billing/
│   │       ├── reports/                # NUEVO: Reportes para cliente
│   │       └── support/
│   │
│   └── environments/
│       ├── environment.ts
│       ├── environment.production.ts
```

---


## Ventajas de esta Arquitectura

### ✅ **Escalabilidad**

- Módulos independientes
- Lazy loading
- Separación clara de responsabilidades

### ✅ **Multiempresa**

- Contexto de organización centralizado
- Configuración por organización
- Datos aislados por empresa

### ✅ **Mantenibilidad**

- Estructura clara y consistente
- Servicios reutilizables
- Separación de concerns

### ✅ **Flexibilidad**

- Módulos habilitables/deshabilitables
- Temas personalizables
- Permisos granulares

### ✅ **Performance**

- Lazy loading de módulos
- Interceptors optimizados
- Estado centralizado

---

## Próximos Pasos de Implementación

1. **Configurar estructura base** (core, shared, layouts)
2. **Implementar autenticación y autorización**
3. **Crear sistema de contexto de organización**
4. **Desarrollar primer módulo (user-management)**
5. **Implementar layouts responsive**
6. **Integrar primer microservicio**
7. **Crear sistema de permisos**
8. **Implementar temas por organización**

---

¿Te parece adecuada esta arquitectura? ¿Hay algún aspecto específico que te gustaría que profundice o modifique?
