-- Crear tablas en orden de dependencias

-- 1. Roles
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR NOT NULL UNIQUE,
    esta_activo BOOLEAN DEFAULT true NOT NULL
);

-- 2. Usuarios  
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    correo VARCHAR NOT NULL UNIQUE,
    contrasena_hash TEXT NOT NULL,
    esta_activo BOOLEAN DEFAULT true NOT NULL,
    debe_cambiar_contrasena BOOLEAN DEFAULT false NOT NULL,
    token_fcm VARCHAR,
    ultimo_ingreso TIMESTAMP,
    rol_id INTEGER NOT NULL REFERENCES roles(id),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    eliminado_en TIMESTAMP
);

-- 3. Departamentos
CREATE TABLE IF NOT EXISTS departamentos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR NOT NULL UNIQUE,
    codigo VARCHAR UNIQUE
);

-- 4. Municipios
CREATE TABLE IF NOT EXISTS municipios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR NOT NULL,
    departamento_id INTEGER NOT NULL REFERENCES departamentos(id),
    codigo VARCHAR UNIQUE
);

-- 5. Instituciones
CREATE TABLE IF NOT EXISTS instituciones (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR NOT NULL,
    naturaleza TEXT NOT NULL,
    municipio_id INTEGER NOT NULL REFERENCES municipios(id),
    telefono_principal VARCHAR DEFAULT '' NOT NULL,
    correo_institucional VARCHAR DEFAULT '' NOT NULL,
    niveles_educativos JSONB DEFAULT '[]' NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    eliminado_en TIMESTAMP
);

-- 6. Grados
CREATE TABLE IF NOT EXISTS grados (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR NOT NULL UNIQUE,
    orden INTEGER
);

-- 7. Periodos
CREATE TABLE IF NOT EXISTS periodos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    institucion_id INTEGER NOT NULL REFERENCES instituciones(id),
    esta_activo BOOLEAN DEFAULT false NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 8. Cursos
CREATE TABLE IF NOT EXISTS cursos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR NOT NULL,
    grado_id INTEGER NOT NULL REFERENCES grados(id),
    jornada TEXT NOT NULL,
    institucion_id INTEGER NOT NULL REFERENCES instituciones(id),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 9. Acudientes
CREATE TABLE IF NOT EXISTS acudientes (
    id SERIAL PRIMARY KEY,
    nombres VARCHAR NOT NULL,
    apellidos VARCHAR NOT NULL,
    tipo_documento TEXT NOT NULL,
    numero_documento VARCHAR NOT NULL UNIQUE,
    telefono VARCHAR NOT NULL,
    telefono_alternativo VARCHAR,
    correo VARCHAR,
    direccion VARCHAR,
    parentesco TEXT,
    ocupacion VARCHAR,
    tipo_trabajo TEXT,
    nivel_educativo TEXT,
    aporta_economia BOOLEAN,
    horario_trabajo VARCHAR,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    eliminado_en TIMESTAMP
);

-- 10. Estudiantes
CREATE TABLE IF NOT EXISTS estudiantes (
    id SERIAL PRIMARY KEY,
    nombres VARCHAR NOT NULL,
    apellidos VARCHAR NOT NULL,
    tipo_documento TEXT NOT NULL,
    numero_documento VARCHAR NOT NULL UNIQUE,
    fecha_nacimiento DATE NOT NULL,
    sexo TEXT NOT NULL,
    grupo_sanguineo TEXT,
    rh TEXT,
    pais_nacimiento VARCHAR,
    ciudad_nacimiento VARCHAR,
    estrato SMALLINT CHECK (estrato >= 1 AND estrato <= 6),
    etnia VARCHAR,
    eps VARCHAR,
    curso_id INTEGER NOT NULL REFERENCES cursos(id),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    eliminado_en TIMESTAMP
);

-- 11. Estudiante-Acudiente (relación)
CREATE TABLE IF NOT EXISTS estudiante_acudiente (
    estudiante_id INTEGER NOT NULL REFERENCES estudiantes(id),
    acudiente_id INTEGER NOT NULL REFERENCES acudientes(id),
    relacion TEXT NOT NULL,
    es_principal BOOLEAN DEFAULT false NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (estudiante_id, acudiente_id)
);

-- 12. Docentes
CREATE TABLE IF NOT EXISTS docentes (
    id SERIAL PRIMARY KEY,
    nombres VARCHAR NOT NULL,
    apellidos VARCHAR NOT NULL,
    tipo_documento TEXT NOT NULL,
    numero_documento VARCHAR NOT NULL UNIQUE,
    telefono VARCHAR NOT NULL,
    telefono_emergencia VARCHAR,
    persona_emergencia VARCHAR,
    correo VARCHAR NOT NULL,
    direccion VARCHAR,
    es_director_grado BOOLEAN DEFAULT false NOT NULL,
    grado_asignado INTEGER REFERENCES grados(id),
    area_que_orienta VARCHAR,
    centro_interes VARCHAR,
    institucion_id INTEGER NOT NULL REFERENCES instituciones(id),
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    eliminado_en TIMESTAMP
);

-- 13. Docente-Curso
CREATE TABLE IF NOT EXISTS docente_curso (
    docente_id INTEGER NOT NULL REFERENCES docentes(id),
    curso_id INTEGER NOT NULL REFERENCES cursos(id),
    es_director BOOLEAN DEFAULT false NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (docente_id, curso_id)
);

-- 14. Categorías
CREATE TABLE IF NOT EXISTS categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR NOT NULL UNIQUE,
    descripcion TEXT,
    color VARCHAR,
    icono VARCHAR
);

-- 15. Banco de Tareas
CREATE TABLE IF NOT EXISTS banco_tareas (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR NOT NULL,
    descripcion TEXT NOT NULL,
    enlace VARCHAR,
    categoria_id INTEGER NOT NULL REFERENCES categorias(id),
    creado_por INTEGER REFERENCES usuarios(id),
    tema VARCHAR,
    entregable_esperado TEXT,
    grados_objetivo JSONB,
    es_multi_grado BOOLEAN DEFAULT false NOT NULL,
    tipo_calificacion TEXT DEFAULT 'manual' NOT NULL,
    criterios_automaticos JSONB,
    veces_utilizada INTEGER DEFAULT 0 NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 16. Asignaciones
CREATE TABLE IF NOT EXISTS asignaciones (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR NOT NULL,
    descripcion TEXT NOT NULL,
    frecuencia TEXT NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_vencimiento DATE,
    incluir_en_boletin BOOLEAN DEFAULT true NOT NULL,
    curso_id INTEGER REFERENCES cursos(id),
    docente_id INTEGER NOT NULL REFERENCES docentes(id),
    categoria_id INTEGER REFERENCES categorias(id),
    banco_tarea_id INTEGER REFERENCES banco_tareas(id),
    periodo_id INTEGER NOT NULL REFERENCES periodos(id),
    institucion_id INTEGER REFERENCES instituciones(id),
    tema VARCHAR,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 17. Asignación-Cursos
CREATE TABLE IF NOT EXISTS asignacion_cursos (
    asignacion_id INTEGER NOT NULL REFERENCES asignaciones(id),
    curso_id INTEGER NOT NULL REFERENCES cursos(id),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (asignacion_id, curso_id)
);

-- 18. Entregas
CREATE TABLE IF NOT EXISTS entregas (
    id SERIAL PRIMARY KEY,
    asignacion_id INTEGER NOT NULL REFERENCES asignaciones(id),
    estudiante_id INTEGER NOT NULL REFERENCES estudiantes(id),
    acudiente_id INTEGER NOT NULL REFERENCES acudientes(id),
    evidencia_texto TEXT,
    archivos_url JSONB,
    fecha_entrega TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    estado TEXT DEFAULT 'enviada' NOT NULL,
    institucion_id INTEGER REFERENCES instituciones(id),
    nombre_envio VARCHAR,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 19. Calificaciones
CREATE TABLE IF NOT EXISTS calificaciones (
    id SERIAL PRIMARY KEY,
    entrega_id INTEGER NOT NULL UNIQUE REFERENCES entregas(id),
    estudiante_id INTEGER NOT NULL REFERENCES estudiantes(id),
    asignacion_id INTEGER NOT NULL REFERENCES asignaciones(id),
    nota NUMERIC CHECK (nota IS NULL OR (nota >= 0.0 AND nota <= 5.0)),
    escala TEXT NOT NULL,
    nota_cualitativa TEXT,
    retroalimentacion TEXT,
    calificado_por INTEGER NOT NULL REFERENCES docentes(id),
    calificado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    periodo_id INTEGER NOT NULL REFERENCES periodos(id),
    institucion_id INTEGER REFERENCES instituciones(id),
    es_automatica BOOLEAN DEFAULT false NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 20. Notificaciones
CREATE TABLE IF NOT EXISTS notificaciones (
    id SERIAL PRIMARY KEY,
    destinatario_id INTEGER NOT NULL REFERENCES usuarios(id),
    tipo TEXT NOT NULL,
    asunto VARCHAR,
    mensaje TEXT NOT NULL,
    estado TEXT DEFAULT 'pendiente' NOT NULL,
    enviado_en TIMESTAMP,
    leido_en TIMESTAMP,
    asignacion_id INTEGER REFERENCES asignaciones(id),
    metadatos JSONB,
    institucion_id INTEGER REFERENCES instituciones(id),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 21. Auditoría
CREATE TABLE IF NOT EXISTS auditoria (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id),
    accion TEXT NOT NULL,
    entidad VARCHAR NOT NULL,
    entidad_id INTEGER NOT NULL,
    cambios_json JSONB,
    direccion_ip VARCHAR,
    agente_usuario VARCHAR,
    institucion_id INTEGER REFERENCES instituciones(id),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 22. Funcionarios
CREATE TABLE IF NOT EXISTS funcionarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    apellido VARCHAR(255) NOT NULL,
    telefono VARCHAR(20),
    correo_institucional VARCHAR(255),
    direccion VARCHAR(255),
    rol_id INTEGER NOT NULL REFERENCES roles(id),
    usuario_id INTEGER NOT NULL UNIQUE REFERENCES usuarios(id),
    institucion_id INTEGER REFERENCES instituciones(id),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    eliminado_en TIMESTAMP
);
