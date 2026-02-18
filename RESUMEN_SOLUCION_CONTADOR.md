# 🛠️ Resumen de Solución Backend para Contador de Tareas (App Móvil)

## Problema Detectado
- El contador de tareas en la app móvil muestra **0 pendientes** aunque el backend tiene tareas asignadas.
- Diagnóstico: El endpoint actual no entrega la información en el formato esperado o falta un endpoint específico para estadísticas.

## Estado de la Base de Datos
- 1 tarea pendiente: "aqui fue"
- 3 tareas vencidas: "taller avengers", "messi", "ESTA FUE", "cr7"
- 1 tarea calificada: "taller avengers"
- **Total que debe mostrar el contador:** 4 por atender

## Causa
- La app móvil no puede acceder a las tareas porque falta un endpoint de estadísticas o el endpoint existente no devuelve los estados correctamente.

---

## Solución Implementada

### 1. Endpoint de Listado de Tareas
- **Ruta:** `GET /api/movil/estudiantes/:id/tareas`
- **Respuesta:**
  ```json
  {
    "success": true,
    "data": [
      { "id": 1, "titulo": "aqui fue", "estado": "pendiente", "fechaVencimiento": "2026-02-15" },
      { "id": 2, "titulo": "messi", "estado": "vencida", "fechaVencimiento": "2026-02-10" },
      { "id": 3, "titulo": "ESTA FUE", "estado": "vencida", "fechaVencimiento": "2026-02-08" },
      { "id": 4, "titulo": "cr7", "estado": "vencida", "fechaVencimiento": "2026-02-09" },
      { "id": 5, "titulo": "taller avengers", "estado": "calificada", "fechaVencimiento": "2026-02-07" }
    ]
  }
  ```
- **Estados posibles:** `pendiente`, `vencida`, `calificada`, `entregada`
- **Autenticación:** Header `Authorization: Bearer {JWT_TOKEN}`

### 2. Endpoint de Estadísticas para el Contador
- **Ruta:** `GET /api/movil/estudiantes/:id/estadisticas`
- **Respuesta:**
  ```json
  {
    "success": true,
    "data": {
      "estudianteId": 1,
      "estadisticas": {
        "pendientes": 1,
        "vencidas": 3,
        "completadas": 0,
        "entregadas": 0,
        "calificadas": 1
      },
      "total": {
        "porAtender": 4,
        "completadas": 1
      }
    }
  }
  ```
- **Campo clave para el contador:** `total.porAtender`
- **Autenticación:** Header `Authorization: Bearer {JWT_TOKEN}`

### 3. Seguridad
- El backend valida que el acudiente sólo pueda ver tareas de estudiantes vinculados.

### 4. Lógica de Estado de Tarea
- Si tiene calificación → `calificada`
- Si tiene entrega → `entregada`
- Si pasó la fecha de vencimiento y no hay entrega → `vencida`
- Si no cumple lo anterior → `pendiente`

### 5. Pruebas y Documentación
- Endpoints documentados en `start/routes/movil.ts`.
- Probado con `curl` y desde la app móvil.

---

## Mensaje para el Equipo Móvil

> Ya están disponibles los endpoints para que el contador de tareas funcione correctamente:
>
> - `GET /api/movil/estudiantes/:id/tareas` → Listado de tareas con estado.
> - `GET /api/movil/estudiantes/:id/estadisticas` → Estadísticas para el contador.
>
> Usar el campo `porAtender` para mostrar el contador. Requiere autenticación con JWT.

---

## Resultado Esperado
- El contador de la app móvil muestra el número correcto de tareas por atender.
- Los estados de las tareas se reflejan correctamente en la interfaz.
- El backend valida la seguridad y entrega la información en el formato esperado.

---

**Estado:** Implementación completada y lista para pruebas finales.
