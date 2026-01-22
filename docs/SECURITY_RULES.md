# ZaintzaBus - Reglas de Seguridad Firestore

## C) Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ============================================
    // FUNCIONES HELPER
    // ============================================
    
    // Verificar autenticación
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Obtener claims del usuario
    function getClaims() {
      return request.auth.token;
    }
    
    // Verificar rol específico
    function hasRole(role) {
      return getClaims().rol == role;
    }
    
    // Verificar si es DFG (acceso global lectura)
    function isDFG() {
      return getClaims().dfg == true || hasRole('dfg');
    }
    
    // Verificar si pertenece al tenant
    function belongsToTenant(tenantId) {
      return getClaims().tenantId == tenantId;
    }
    
    // Verificar acceso al tenant (propio o DFG)
    function canAccessTenant(tenantId) {
      return isDFG() || belongsToTenant(tenantId);
    }
    
    // Roles con permiso de escritura en incidencias
    function canWriteIncidencias() {
      return hasRole('operador') || hasRole('jefe_mant') || 
             hasRole('tecnico') || hasRole('soporte_sw');
    }
    
    // Roles con permiso de gestión
    function isManager() {
      return hasRole('jefe_mant') || hasRole('operador');
    }
    
    // Solo jefe de mantenimiento puede hacer ciertas operaciones
    function isJefeMant() {
      return hasRole('jefe_mant');
    }
    
    // Validar que campos de auditoría no se manipulan
    function auditFieldsValid() {
      return request.resource.data.updatedAt == request.time &&
             (!('createdAt' in request.resource.data.diff(resource.data).affectedKeys()));
    }
    
    // Validar transición de estados válida
    function validEstadoTransition(oldEstado, newEstado) {
      let validTransitions = {
        'nueva': ['en_analisis', 'cerrada'],
        'en_analisis': ['en_intervencion', 'nueva'],
        'en_intervencion': ['resuelta', 'en_analisis'],
        'resuelta': ['cerrada', 'reabierta'],
        'cerrada': ['reabierta'],
        'reabierta': ['en_analisis']
      };
      return newEstado in validTransitions[oldEstado];
    }
    
    // ============================================
    // USUARIOS
    // ============================================
    match /usuarios/{userId} {
      // Lectura: usuario propio, jefes del mismo tenant, o DFG
      allow read: if isAuthenticated() && (
        request.auth.uid == userId ||
        (isManager() && resource.data.tenantId == getClaims().tenantId) ||
        isDFG()
      );
      
      // Crear: solo jefe_mant o DFG
      allow create: if isAuthenticated() && (isJefeMant() || isDFG());
      
      // Actualizar: usuario propio (campos limitados) o jefe_mant/DFG
      allow update: if isAuthenticated() && (
        (request.auth.uid == userId && 
         request.resource.data.diff(resource.data).affectedKeys()
           .hasOnly(['telefono', 'updatedAt'])) ||
        isJefeMant() ||
        isDFG()
      );
      
      // Eliminar: solo DFG (soft delete preferido)
      allow delete: if isDFG();
    }
    
    // ============================================
    // TENANTS
    // ============================================
    match /tenants/{tenantId} {
      allow read: if isAuthenticated() && canAccessTenant(tenantId);
      allow write: if isDFG();
    }
    
    // ============================================
    // ACTIVOS (dentro de tenant)
    // ============================================
    match /tenants/{tenantId}/activos/{activoId} {
      allow read: if isAuthenticated() && canAccessTenant(tenantId);
      
      allow create: if isAuthenticated() && 
                       belongsToTenant(tenantId) && 
                       isManager();
      
      allow update: if isAuthenticated() && 
                       belongsToTenant(tenantId) && 
                       (isManager() || hasRole('tecnico')) &&
                       auditFieldsValid();
      
      allow delete: if isAuthenticated() && 
                       belongsToTenant(tenantId) && 
                       isJefeMant();
    }
    
    // ============================================
    // INVENTARIO
    // ============================================
    match /tenants/{tenantId}/inventario/{itemId} {
      allow read: if isAuthenticated() && canAccessTenant(tenantId);
      
      allow create: if isAuthenticated() && 
                       belongsToTenant(tenantId) && 
                       isManager();
      
      allow update: if isAuthenticated() && 
                       belongsToTenant(tenantId) && 
                       (isManager() || hasRole('tecnico')) &&
                       auditFieldsValid();
      
      allow delete: if false; // Nunca eliminar, solo marcar como baja
      
      // Subcolección de movimientos
      match /movimientos/{movId} {
        allow read: if isAuthenticated() && canAccessTenant(tenantId);
        
        allow create: if isAuthenticated() && 
                         belongsToTenant(tenantId) && 
                         (isManager() || hasRole('tecnico'));
        
        allow update, delete: if false; // Inmutables
      }
    }
    
    // ============================================
    // INCIDENCIAS
    // ============================================
    match /tenants/{tenantId}/incidencias/{incidenciaId} {
      allow read: if isAuthenticated() && canAccessTenant(tenantId);
      
      // Crear: operador, jefe_mant, soporte_sw, tecnico
      allow create: if isAuthenticated() && 
                       belongsToTenant(tenantId) && 
                       canWriteIncidencias() &&
                       request.resource.data.estado == 'nueva' &&
                       request.resource.data.tenantId == tenantId &&
                       request.resource.data.createdAt == request.time;
      
      // Actualizar: validar transición de estado y campos de auditoría
      allow update: if isAuthenticated() && 
                       belongsToTenant(tenantId) && 
                       canWriteIncidencias() &&
                       auditFieldsValid() &&
                       (resource.data.estado == request.resource.data.estado ||
                        validEstadoTransition(resource.data.estado, request.resource.data.estado));
      
      // Solo cerrar: jefe_mant
      // Reabrir: requiere ser jefe_mant o DFG
      
      allow delete: if false; // Nunca eliminar incidencias
    }
    
    // ============================================
    // PREVENTIVOS
    // ============================================
    match /tenants/{tenantId}/preventivos/{prevId} {
      allow read: if isAuthenticated() && canAccessTenant(tenantId);
      
      allow create, update: if isAuthenticated() && 
                               belongsToTenant(tenantId) && 
                               isJefeMant();
      
      allow delete: if false;
      
      // Ejecuciones de preventivo
      match /ejecuciones/{ejId} {
        allow read: if isAuthenticated() && canAccessTenant(tenantId);
        
        allow create: if isAuthenticated() && 
                         belongsToTenant(tenantId) && 
                         (isManager() || hasRole('tecnico'));
        
        allow update: if isAuthenticated() && 
                         belongsToTenant(tenantId) && 
                         (isManager() || hasRole('tecnico')) &&
                         auditFieldsValid();
        
        allow delete: if false;
      }
    }
    
    // ============================================
    // SLA CONFIG
    // ============================================
    match /sla_config/{tenantId} {
      allow read: if isAuthenticated() && canAccessTenant(tenantId);
      allow write: if isDFG() || (isJefeMant() && belongsToTenant(tenantId));
    }
    
    // ============================================
    // SLA METRICS (calculadas por Cloud Functions)
    // ============================================
    match /tenants/{tenantId}/sla_metrics/{metricId} {
      allow read: if isAuthenticated() && canAccessTenant(tenantId);
      allow write: if false; // Solo Cloud Functions
    }
    
    // ============================================
    // AUDITORÍA (solo lectura, escritura por Functions)
    // ============================================
    match /auditoria/{logId} {
      // DFG lee todo, otros solo de su tenant
      allow read: if isAuthenticated() && 
                    (isDFG() || resource.data.tenantId == getClaims().tenantId);
      
      // Solo Cloud Functions escriben (ningún cliente)
      allow write: if false;
    }
  }
}
```

## Ejemplos de Custom Claims

### Usuario DFG (acceso global)
```json
{
  "rol": "dfg",
  "tenantId": "dfg",
  "dfg": true
}
```

### Jefe de Mantenimiento
```json
{
  "rol": "jefe_mant",
  "tenantId": "lurraldebus"
}
```

### Técnico de Campo
```json
{
  "rol": "tecnico",
  "tenantId": "lurraldebus"
}
```

### Operador
```json
{
  "rol": "operador",
  "tenantId": "lurraldebus"
}
```

### Soporte SW
```json
{
  "rol": "soporte_sw",
  "tenantId": "lurraldebus"
}
```

## Cloud Function para Asignar Claims

```typescript
// functions/src/auth/setCustomClaims.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const setUserClaims = functions.https.onCall(async (data, context) => {
  // Solo admin puede asignar claims
  if (!context.auth?.token.dfg && context.auth?.token.rol !== 'jefe_mant') {
    throw new functions.https.HttpsError('permission-denied', 'Sin permisos');
  }
  
  const { userId, rol, tenantId, dfg } = data;
  
  const claims: Record<string, any> = {
    rol,
    tenantId,
  };
  
  if (dfg) {
    claims.dfg = true;
  }
  
  await admin.auth().setCustomUserClaims(userId, claims);
  
  // Log de auditoría
  await admin.firestore().collection('auditoria').add({
    entidad: 'usuario',
    entidadId: userId,
    accion: 'actualizar',
    usuarioId: context.auth.uid,
    usuarioEmail: context.auth.token.email,
    usuarioRol: context.auth.token.rol,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    tenantId: context.auth.token.tenantId,
    cambios: [
      { campo: 'customClaims', valorAnterior: null, valorNuevo: claims }
    ]
  });
  
  return { success: true };
});
```
