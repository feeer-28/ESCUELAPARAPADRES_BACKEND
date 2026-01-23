--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_id_fkey;
ALTER TABLE IF EXISTS ONLY public.periodos DROP CONSTRAINT IF EXISTS periodos_institucion_id_fkey;
ALTER TABLE IF EXISTS ONLY public.notificaciones DROP CONSTRAINT IF EXISTS notificaciones_destinatario_id_fkey;
ALTER TABLE IF EXISTS ONLY public.notificaciones DROP CONSTRAINT IF EXISTS notificaciones_asignacion_id_fkey;
ALTER TABLE IF EXISTS ONLY public.municipios DROP CONSTRAINT IF EXISTS municipios_departamento_id_fkey;
ALTER TABLE IF EXISTS ONLY public.instituciones DROP CONSTRAINT IF EXISTS instituciones_municipio_id_fkey;
ALTER TABLE IF EXISTS ONLY public.funcionarios DROP CONSTRAINT IF EXISTS funcionarios_usuario_id_fkey;
ALTER TABLE IF EXISTS ONLY public.funcionarios DROP CONSTRAINT IF EXISTS funcionarios_rol_id_fkey;
ALTER TABLE IF EXISTS ONLY public.funcionarios DROP CONSTRAINT IF EXISTS funcionarios_institucion_id_fkey;
ALTER TABLE IF EXISTS ONLY public.estudiantes DROP CONSTRAINT IF EXISTS estudiantes_curso_id_fkey;
ALTER TABLE IF EXISTS ONLY public.estudiante_acudiente DROP CONSTRAINT IF EXISTS estudiante_acudiente_estudiante_id_fkey;
ALTER TABLE IF EXISTS ONLY public.estudiante_acudiente DROP CONSTRAINT IF EXISTS estudiante_acudiente_acudiente_id_fkey;
ALTER TABLE IF EXISTS ONLY public.entregas DROP CONSTRAINT IF EXISTS entregas_estudiante_id_fkey;
ALTER TABLE IF EXISTS ONLY public.entregas DROP CONSTRAINT IF EXISTS entregas_asignacion_id_fkey;
ALTER TABLE IF EXISTS ONLY public.entregas DROP CONSTRAINT IF EXISTS entregas_acudiente_id_fkey;
ALTER TABLE IF EXISTS ONLY public.docentes DROP CONSTRAINT IF EXISTS docentes_usuario_id_fkey;
ALTER TABLE IF EXISTS ONLY public.docentes DROP CONSTRAINT IF EXISTS docentes_institucion_id_fkey;
ALTER TABLE IF EXISTS ONLY public.docentes DROP CONSTRAINT IF EXISTS docentes_grado_asignado_fkey;
ALTER TABLE IF EXISTS ONLY public.docente_curso DROP CONSTRAINT IF EXISTS docente_curso_docente_id_fkey;
ALTER TABLE IF EXISTS ONLY public.docente_curso DROP CONSTRAINT IF EXISTS docente_curso_curso_id_fkey;
ALTER TABLE IF EXISTS ONLY public.cursos DROP CONSTRAINT IF EXISTS cursos_institucion_id_fkey;
ALTER TABLE IF EXISTS ONLY public.cursos DROP CONSTRAINT IF EXISTS cursos_grado_id_fkey;
ALTER TABLE IF EXISTS ONLY public.calificaciones DROP CONSTRAINT IF EXISTS calificaciones_periodo_id_fkey;
ALTER TABLE IF EXISTS ONLY public.calificaciones DROP CONSTRAINT IF EXISTS calificaciones_estudiante_id_fkey;
ALTER TABLE IF EXISTS ONLY public.calificaciones DROP CONSTRAINT IF EXISTS calificaciones_entrega_id_fkey;
ALTER TABLE IF EXISTS ONLY public.calificaciones DROP CONSTRAINT IF EXISTS calificaciones_calificado_por_fkey;
ALTER TABLE IF EXISTS ONLY public.calificaciones DROP CONSTRAINT IF EXISTS calificaciones_asignacion_id_fkey;
ALTER TABLE IF EXISTS ONLY public.banco_tareas DROP CONSTRAINT IF EXISTS banco_tareas_creado_por_fkey;
ALTER TABLE IF EXISTS ONLY public.banco_tareas DROP CONSTRAINT IF EXISTS banco_tareas_categoria_id_fkey;
ALTER TABLE IF EXISTS ONLY public.auditoria DROP CONSTRAINT IF EXISTS auditoria_usuario_id_fkey;
ALTER TABLE IF EXISTS ONLY public.asignaciones DROP CONSTRAINT IF EXISTS asignaciones_periodo_id_fkey;
ALTER TABLE IF EXISTS ONLY public.asignaciones DROP CONSTRAINT IF EXISTS asignaciones_docente_id_fkey;
ALTER TABLE IF EXISTS ONLY public.asignaciones DROP CONSTRAINT IF EXISTS asignaciones_curso_id_fkey;
ALTER TABLE IF EXISTS ONLY public.asignaciones DROP CONSTRAINT IF EXISTS asignaciones_categoria_id_fkey;
ALTER TABLE IF EXISTS ONLY public.asignaciones DROP CONSTRAINT IF EXISTS asignaciones_banco_tarea_id_fkey;
ALTER TABLE IF EXISTS ONLY public.asignacion_cursos DROP CONSTRAINT IF EXISTS asignacion_cursos_curso_id_fkey;
ALTER TABLE IF EXISTS ONLY public.asignacion_cursos DROP CONSTRAINT IF EXISTS asignacion_cursos_asignacion_id_fkey;
ALTER TABLE IF EXISTS ONLY public.acudientes DROP CONSTRAINT IF EXISTS acudientes_usuario_id_fkey;
DROP INDEX IF EXISTS public.idx_instituciones_nit;
DROP INDEX IF EXISTS public.idx_instituciones_municipio;
DROP INDEX IF EXISTS public.idx_instituciones_estrato;
DROP INDEX IF EXISTS public.idx_instituciones_codigo_dane;
DROP INDEX IF EXISTS public.idx_funcionarios_rol;
DROP INDEX IF EXISTS public.idx_funcionarios_institucion;
DROP INDEX IF EXISTS public.funcionarios_usuario_id_unique;
ALTER TABLE IF EXISTS ONLY public.usuarios DROP CONSTRAINT IF EXISTS usuarios_pkey;
ALTER TABLE IF EXISTS ONLY public.usuarios DROP CONSTRAINT IF EXISTS usuarios_correo_key;
ALTER TABLE IF EXISTS ONLY public.roles DROP CONSTRAINT IF EXISTS roles_pkey;
ALTER TABLE IF EXISTS ONLY public.roles DROP CONSTRAINT IF EXISTS roles_nombre_key;
ALTER TABLE IF EXISTS ONLY public.periodos DROP CONSTRAINT IF EXISTS periodos_pkey;
ALTER TABLE IF EXISTS ONLY public.notificaciones DROP CONSTRAINT IF EXISTS notificaciones_pkey;
ALTER TABLE IF EXISTS ONLY public.municipios DROP CONSTRAINT IF EXISTS municipios_pkey;
ALTER TABLE IF EXISTS ONLY public.municipios DROP CONSTRAINT IF EXISTS municipios_codigo_key;
ALTER TABLE IF EXISTS ONLY public.instituciones DROP CONSTRAINT IF EXISTS instituciones_pkey;
ALTER TABLE IF EXISTS ONLY public.instituciones DROP CONSTRAINT IF EXISTS instituciones_nit_key;
ALTER TABLE IF EXISTS ONLY public.instituciones DROP CONSTRAINT IF EXISTS instituciones_codigo_dane_key;
ALTER TABLE IF EXISTS ONLY public.grados DROP CONSTRAINT IF EXISTS grados_pkey;
ALTER TABLE IF EXISTS ONLY public.grados DROP CONSTRAINT IF EXISTS grados_nombre_key;
ALTER TABLE IF EXISTS ONLY public.funcionarios DROP CONSTRAINT IF EXISTS funcionarios_pkey;
ALTER TABLE IF EXISTS ONLY public.estudiantes DROP CONSTRAINT IF EXISTS estudiantes_pkey;
ALTER TABLE IF EXISTS ONLY public.estudiantes DROP CONSTRAINT IF EXISTS estudiantes_numero_documento_key;
ALTER TABLE IF EXISTS ONLY public.estudiante_acudiente DROP CONSTRAINT IF EXISTS estudiante_acudiente_pkey;
ALTER TABLE IF EXISTS ONLY public.entregas DROP CONSTRAINT IF EXISTS entregas_pkey;
ALTER TABLE IF EXISTS ONLY public.docentes DROP CONSTRAINT IF EXISTS docentes_pkey;
ALTER TABLE IF EXISTS ONLY public.docentes DROP CONSTRAINT IF EXISTS docentes_numero_documento_key;
ALTER TABLE IF EXISTS ONLY public.docente_curso DROP CONSTRAINT IF EXISTS docente_curso_pkey;
ALTER TABLE IF EXISTS ONLY public.departamentos DROP CONSTRAINT IF EXISTS departamentos_pkey;
ALTER TABLE IF EXISTS ONLY public.departamentos DROP CONSTRAINT IF EXISTS departamentos_nombre_key;
ALTER TABLE IF EXISTS ONLY public.departamentos DROP CONSTRAINT IF EXISTS departamentos_codigo_key;
ALTER TABLE IF EXISTS ONLY public.cursos DROP CONSTRAINT IF EXISTS cursos_pkey;
ALTER TABLE IF EXISTS ONLY public.categorias DROP CONSTRAINT IF EXISTS categorias_pkey;
ALTER TABLE IF EXISTS ONLY public.categorias DROP CONSTRAINT IF EXISTS categorias_nombre_key;
ALTER TABLE IF EXISTS ONLY public.calificaciones DROP CONSTRAINT IF EXISTS calificaciones_pkey;
ALTER TABLE IF EXISTS ONLY public.calificaciones DROP CONSTRAINT IF EXISTS calificaciones_entrega_id_key;
ALTER TABLE IF EXISTS ONLY public.banco_tareas DROP CONSTRAINT IF EXISTS banco_tareas_pkey;
ALTER TABLE IF EXISTS ONLY public.auditoria DROP CONSTRAINT IF EXISTS auditoria_pkey;
ALTER TABLE IF EXISTS ONLY public.asignaciones DROP CONSTRAINT IF EXISTS asignaciones_pkey;
ALTER TABLE IF EXISTS ONLY public.asignacion_cursos DROP CONSTRAINT IF EXISTS asignacion_cursos_pkey;
ALTER TABLE IF EXISTS ONLY public.acudientes DROP CONSTRAINT IF EXISTS acudientes_pkey;
ALTER TABLE IF EXISTS ONLY public.acudientes DROP CONSTRAINT IF EXISTS acudientes_numero_documento_key;
DROP TABLE IF EXISTS public.usuarios;
DROP TABLE IF EXISTS public.roles;
DROP TABLE IF EXISTS public.periodos;
DROP TABLE IF EXISTS public.notificaciones;
DROP TABLE IF EXISTS public.municipios;
DROP TABLE IF EXISTS public.instituciones;
DROP TABLE IF EXISTS public.grados;
DROP TABLE IF EXISTS public.funcionarios;
DROP TABLE IF EXISTS public.estudiantes;
DROP TABLE IF EXISTS public.estudiante_acudiente;
DROP TABLE IF EXISTS public.entregas;
DROP TABLE IF EXISTS public.docentes;
DROP TABLE IF EXISTS public.docente_curso;
DROP TABLE IF EXISTS public.departamentos;
DROP TABLE IF EXISTS public.cursos;
DROP TABLE IF EXISTS public.categorias;
DROP TABLE IF EXISTS public.calificaciones;
DROP TABLE IF EXISTS public.banco_tareas;
DROP TABLE IF EXISTS public.auditoria;
DROP TABLE IF EXISTS public.asignaciones;
DROP TABLE IF EXISTS public.asignacion_cursos;
DROP TABLE IF EXISTS public.acudientes;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: acudientes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.acudientes (
    id integer NOT NULL,
    nombres character varying NOT NULL,
    apellidos character varying NOT NULL,
    tipo_documento text NOT NULL,
    numero_documento character varying NOT NULL,
    telefono character varying NOT NULL,
    telefono_alternativo character varying,
    correo character varying,
    direccion character varying,
    parentesco text,
    ocupacion character varying,
    tipo_trabajo text,
    nivel_educativo text,
    aporta_economia boolean,
    horario_trabajo character varying,
    usuario_id integer NOT NULL,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    eliminado_en timestamp without time zone
);


--
-- Name: acudientes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.acudientes ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.acudientes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: asignacion_cursos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asignacion_cursos (
    asignacion_id integer NOT NULL,
    curso_id integer NOT NULL,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: asignaciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asignaciones (
    id integer NOT NULL,
    titulo character varying NOT NULL,
    descripcion text NOT NULL,
    frecuencia text NOT NULL,
    fecha_inicio date NOT NULL,
    fecha_vencimiento date,
    incluir_en_boletin boolean DEFAULT true NOT NULL,
    curso_id integer,
    docente_id integer NOT NULL,
    categoria_id integer,
    banco_tarea_id integer,
    periodo_id integer NOT NULL,
    institucion_id integer,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tema character varying
);


--
-- Name: asignaciones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.asignaciones ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.asignaciones_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: auditoria; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auditoria (
    id integer NOT NULL,
    usuario_id integer,
    accion text NOT NULL,
    entidad character varying NOT NULL,
    entidad_id integer NOT NULL,
    cambios_json jsonb,
    direccion_ip character varying,
    agente_usuario character varying,
    institucion_id integer,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: auditoria_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.auditoria ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.auditoria_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: banco_tareas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.banco_tareas (
    id integer NOT NULL,
    titulo character varying NOT NULL,
    descripcion text NOT NULL,
    enlace character varying,
    categoria_id integer NOT NULL,
    creado_por integer,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tema character varying,
    entregable_esperado text,
    grados_objetivo jsonb,
    es_multi_grado boolean DEFAULT false NOT NULL,
    tipo_calificacion text DEFAULT 'manual'::text NOT NULL,
    criterios_automaticos jsonb,
    veces_utilizada integer DEFAULT 0 NOT NULL
);


--
-- Name: banco_tareas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.banco_tareas ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.banco_tareas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: calificaciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calificaciones (
    id integer NOT NULL,
    entrega_id integer NOT NULL,
    estudiante_id integer NOT NULL,
    asignacion_id integer NOT NULL,
    nota numeric,
    escala text NOT NULL,
    nota_cualitativa text,
    retroalimentacion text,
    calificado_por integer NOT NULL,
    calificado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    periodo_id integer NOT NULL,
    institucion_id integer,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    es_automatica boolean DEFAULT false NOT NULL,
    CONSTRAINT calificaciones_nota_check CHECK (((nota IS NULL) OR ((nota >= 0.0) AND (nota <= 5.0))))
);


--
-- Name: calificaciones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.calificaciones ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.calificaciones_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: categorias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categorias (
    id integer NOT NULL,
    nombre character varying NOT NULL,
    descripcion text,
    color character varying,
    icono character varying
);


--
-- Name: categorias_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.categorias ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.categorias_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: cursos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cursos (
    id integer NOT NULL,
    nombre character varying NOT NULL,
    grado_id integer NOT NULL,
    jornada text NOT NULL,
    institucion_id integer NOT NULL,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: cursos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.cursos ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.cursos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: departamentos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.departamentos (
    id integer NOT NULL,
    nombre character varying NOT NULL,
    codigo character varying
);


--
-- Name: departamentos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.departamentos ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.departamentos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: docente_curso; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.docente_curso (
    docente_id integer NOT NULL,
    curso_id integer NOT NULL,
    es_director boolean DEFAULT false NOT NULL,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: docentes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.docentes (
    id integer NOT NULL,
    nombres character varying NOT NULL,
    apellidos character varying NOT NULL,
    tipo_documento text NOT NULL,
    numero_documento character varying NOT NULL,
    telefono character varying NOT NULL,
    telefono_emergencia character varying,
    persona_emergencia character varying,
    correo character varying NOT NULL,
    direccion character varying,
    es_director_grado boolean DEFAULT false NOT NULL,
    grado_asignado integer,
    area_que_orienta character varying,
    centro_interes character varying,
    institucion_id integer NOT NULL,
    usuario_id integer NOT NULL,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    eliminado_en timestamp without time zone
);


--
-- Name: docentes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.docentes ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.docentes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: entregas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entregas (
    id integer NOT NULL,
    asignacion_id integer NOT NULL,
    estudiante_id integer NOT NULL,
    acudiente_id integer NOT NULL,
    evidencia_texto text,
    archivos_url jsonb,
    fecha_entrega timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    estado text DEFAULT 'enviada'::text NOT NULL,
    institucion_id integer,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    nombre_envio character varying
);


--
-- Name: entregas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.entregas ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.entregas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: estudiante_acudiente; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estudiante_acudiente (
    estudiante_id integer NOT NULL,
    acudiente_id integer NOT NULL,
    relacion text NOT NULL,
    es_principal boolean DEFAULT false NOT NULL,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: estudiantes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estudiantes (
    id integer NOT NULL,
    nombres character varying NOT NULL,
    apellidos character varying NOT NULL,
    tipo_documento text NOT NULL,
    numero_documento character varying NOT NULL,
    fecha_nacimiento date NOT NULL,
    sexo text NOT NULL,
    grupo_sanguineo text,
    rh text,
    pais_nacimiento character varying,
    ciudad_nacimiento character varying,
    estrato smallint,
    etnia character varying,
    eps character varying,
    curso_id integer NOT NULL,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    eliminado_en timestamp without time zone,
    CONSTRAINT estudiantes_estrato_check CHECK (((estrato >= 1) AND (estrato <= 6)))
);


--
-- Name: estudiantes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.estudiantes ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.estudiantes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: funcionarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.funcionarios (
    id integer NOT NULL,
    nombre character varying(255) NOT NULL,
    apellido character varying(255) NOT NULL,
    telefono character varying(20),
    correo_institucional character varying(255),
    direccion character varying(255),
    rol_id integer NOT NULL,
    usuario_id integer NOT NULL,
    institucion_id integer,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    eliminado_en timestamp without time zone
);


--
-- Name: funcionarios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.funcionarios ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.funcionarios_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: grados; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.grados (
    id integer NOT NULL,
    nombre character varying NOT NULL,
    orden integer
);


--
-- Name: grados_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.grados ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.grados_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: instituciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.instituciones (
    id integer NOT NULL,
    nombre character varying NOT NULL,
    telefono character varying,
    correo character varying,
    direccion character varying,
    naturaleza text NOT NULL,
    municipio_id integer NOT NULL,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    eliminado_en timestamp without time zone,
    codigo_dane character varying(20),
    nit character varying(20),
    resolucion_aprobacion character varying(100),
    niveles_educativos jsonb DEFAULT '[]'::jsonb NOT NULL,
    modalidad character varying(20) DEFAULT 'presencial'::character varying,
    jornadas jsonb DEFAULT '["unica"]'::jsonb,
    telefono_principal character varying(20) DEFAULT ''::character varying NOT NULL,
    telefono_secretaria character varying(20),
    correo_institucional character varying(255) DEFAULT ''::character varying NOT NULL,
    correo_rectoria character varying(255),
    sitio_web character varying(255),
    direccion_completa text,
    barrio character varying(100),
    estrato smallint,
    coordenadas_gps character varying(50),
    capacidad_estudiantes integer,
    ano_fundacion integer,
    enfoque_pedagogico character varying(100),
    confesional boolean DEFAULT false,
    religion character varying(50),
    rector_nombre character varying(255),
    rector_documento character varying(20),
    rector_telefono character varying(20),
    rector_correo character varying(255),
    CONSTRAINT instituciones_estrato_check CHECK (((estrato >= 1) AND (estrato <= 6)))
);


--
-- Name: instituciones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.instituciones ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.instituciones_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: municipios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.municipios (
    id integer NOT NULL,
    nombre character varying NOT NULL,
    departamento_id integer NOT NULL,
    codigo character varying
);


--
-- Name: municipios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.municipios ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.municipios_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: notificaciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notificaciones (
    id integer NOT NULL,
    destinatario_id integer NOT NULL,
    tipo text NOT NULL,
    asunto character varying,
    mensaje text NOT NULL,
    estado text DEFAULT 'pendiente'::text NOT NULL,
    enviado_en timestamp without time zone,
    leido_en timestamp without time zone,
    asignacion_id integer,
    metadatos jsonb,
    institucion_id integer,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: notificaciones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.notificaciones ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.notificaciones_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: periodos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.periodos (
    id integer NOT NULL,
    nombre character varying NOT NULL,
    fecha_inicio date NOT NULL,
    fecha_fin date NOT NULL,
    institucion_id integer NOT NULL,
    esta_activo boolean DEFAULT false NOT NULL,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: periodos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.periodos ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.periodos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    nombre character varying NOT NULL,
    esta_activo boolean DEFAULT true NOT NULL
);


--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.roles ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.roles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarios (
    id integer NOT NULL,
    correo character varying NOT NULL,
    contrasena_hash text NOT NULL,
    esta_activo boolean DEFAULT true NOT NULL,
    debe_cambiar_contrasena boolean DEFAULT false NOT NULL,
    token_fcm character varying,
    ultimo_ingreso timestamp without time zone,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    eliminado_en timestamp without time zone,
    rol_id integer NOT NULL
);


--
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.usuarios ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.usuarios_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: acudientes acudientes_numero_documento_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acudientes
    ADD CONSTRAINT acudientes_numero_documento_key UNIQUE (numero_documento);


--
-- Name: acudientes acudientes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acudientes
    ADD CONSTRAINT acudientes_pkey PRIMARY KEY (id);


--
-- Name: asignacion_cursos asignacion_cursos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asignacion_cursos
    ADD CONSTRAINT asignacion_cursos_pkey PRIMARY KEY (asignacion_id, curso_id);


--
-- Name: asignaciones asignaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asignaciones
    ADD CONSTRAINT asignaciones_pkey PRIMARY KEY (id);


--
-- Name: auditoria auditoria_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auditoria
    ADD CONSTRAINT auditoria_pkey PRIMARY KEY (id);


--
-- Name: banco_tareas banco_tareas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.banco_tareas
    ADD CONSTRAINT banco_tareas_pkey PRIMARY KEY (id);


--
-- Name: calificaciones calificaciones_entrega_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calificaciones
    ADD CONSTRAINT calificaciones_entrega_id_key UNIQUE (entrega_id);


--
-- Name: calificaciones calificaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calificaciones
    ADD CONSTRAINT calificaciones_pkey PRIMARY KEY (id);


--
-- Name: categorias categorias_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT categorias_nombre_key UNIQUE (nombre);


--
-- Name: categorias categorias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT categorias_pkey PRIMARY KEY (id);


--
-- Name: cursos cursos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cursos
    ADD CONSTRAINT cursos_pkey PRIMARY KEY (id);


--
-- Name: departamentos departamentos_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departamentos
    ADD CONSTRAINT departamentos_codigo_key UNIQUE (codigo);


--
-- Name: departamentos departamentos_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departamentos
    ADD CONSTRAINT departamentos_nombre_key UNIQUE (nombre);


--
-- Name: departamentos departamentos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departamentos
    ADD CONSTRAINT departamentos_pkey PRIMARY KEY (id);


--
-- Name: docente_curso docente_curso_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.docente_curso
    ADD CONSTRAINT docente_curso_pkey PRIMARY KEY (docente_id, curso_id);


--
-- Name: docentes docentes_numero_documento_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.docentes
    ADD CONSTRAINT docentes_numero_documento_key UNIQUE (numero_documento);


--
-- Name: docentes docentes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.docentes
    ADD CONSTRAINT docentes_pkey PRIMARY KEY (id);


--
-- Name: entregas entregas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entregas
    ADD CONSTRAINT entregas_pkey PRIMARY KEY (id);


--
-- Name: estudiante_acudiente estudiante_acudiente_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estudiante_acudiente
    ADD CONSTRAINT estudiante_acudiente_pkey PRIMARY KEY (estudiante_id, acudiente_id);


--
-- Name: estudiantes estudiantes_numero_documento_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estudiantes
    ADD CONSTRAINT estudiantes_numero_documento_key UNIQUE (numero_documento);


--
-- Name: estudiantes estudiantes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estudiantes
    ADD CONSTRAINT estudiantes_pkey PRIMARY KEY (id);


--
-- Name: funcionarios funcionarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.funcionarios
    ADD CONSTRAINT funcionarios_pkey PRIMARY KEY (id);


--
-- Name: grados grados_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grados
    ADD CONSTRAINT grados_nombre_key UNIQUE (nombre);


--
-- Name: grados grados_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grados
    ADD CONSTRAINT grados_pkey PRIMARY KEY (id);


--
-- Name: instituciones instituciones_codigo_dane_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instituciones
    ADD CONSTRAINT instituciones_codigo_dane_key UNIQUE (codigo_dane);


--
-- Name: instituciones instituciones_nit_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instituciones
    ADD CONSTRAINT instituciones_nit_key UNIQUE (nit);


--
-- Name: instituciones instituciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instituciones
    ADD CONSTRAINT instituciones_pkey PRIMARY KEY (id);


--
-- Name: municipios municipios_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.municipios
    ADD CONSTRAINT municipios_codigo_key UNIQUE (codigo);


--
-- Name: municipios municipios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.municipios
    ADD CONSTRAINT municipios_pkey PRIMARY KEY (id);


--
-- Name: notificaciones notificaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificaciones
    ADD CONSTRAINT notificaciones_pkey PRIMARY KEY (id);


--
-- Name: periodos periodos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.periodos
    ADD CONSTRAINT periodos_pkey PRIMARY KEY (id);


--
-- Name: roles roles_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_nombre_key UNIQUE (nombre);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_correo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_correo_key UNIQUE (correo);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: funcionarios_usuario_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX funcionarios_usuario_id_unique ON public.funcionarios USING btree (usuario_id);


--
-- Name: idx_funcionarios_institucion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_funcionarios_institucion ON public.funcionarios USING btree (institucion_id);


--
-- Name: idx_funcionarios_rol; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_funcionarios_rol ON public.funcionarios USING btree (rol_id);


--
-- Name: idx_instituciones_codigo_dane; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_instituciones_codigo_dane ON public.instituciones USING btree (codigo_dane);


--
-- Name: idx_instituciones_estrato; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_instituciones_estrato ON public.instituciones USING btree (estrato);


--
-- Name: idx_instituciones_municipio; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_instituciones_municipio ON public.instituciones USING btree (municipio_id);


--
-- Name: idx_instituciones_nit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_instituciones_nit ON public.instituciones USING btree (nit);


--
-- Name: acudientes acudientes_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acudientes
    ADD CONSTRAINT acudientes_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id);


--
-- Name: asignacion_cursos asignacion_cursos_asignacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asignacion_cursos
    ADD CONSTRAINT asignacion_cursos_asignacion_id_fkey FOREIGN KEY (asignacion_id) REFERENCES public.asignaciones(id);


--
-- Name: asignacion_cursos asignacion_cursos_curso_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asignacion_cursos
    ADD CONSTRAINT asignacion_cursos_curso_id_fkey FOREIGN KEY (curso_id) REFERENCES public.cursos(id);


--
-- Name: asignaciones asignaciones_banco_tarea_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asignaciones
    ADD CONSTRAINT asignaciones_banco_tarea_id_fkey FOREIGN KEY (banco_tarea_id) REFERENCES public.banco_tareas(id);


--
-- Name: asignaciones asignaciones_categoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asignaciones
    ADD CONSTRAINT asignaciones_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias(id);


--
-- Name: asignaciones asignaciones_curso_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asignaciones
    ADD CONSTRAINT asignaciones_curso_id_fkey FOREIGN KEY (curso_id) REFERENCES public.cursos(id);


--
-- Name: asignaciones asignaciones_docente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asignaciones
    ADD CONSTRAINT asignaciones_docente_id_fkey FOREIGN KEY (docente_id) REFERENCES public.docentes(id);


--
-- Name: asignaciones asignaciones_periodo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asignaciones
    ADD CONSTRAINT asignaciones_periodo_id_fkey FOREIGN KEY (periodo_id) REFERENCES public.periodos(id);


--
-- Name: auditoria auditoria_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auditoria
    ADD CONSTRAINT auditoria_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id);


--
-- Name: banco_tareas banco_tareas_categoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.banco_tareas
    ADD CONSTRAINT banco_tareas_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias(id);


--
-- Name: banco_tareas banco_tareas_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.banco_tareas
    ADD CONSTRAINT banco_tareas_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.usuarios(id);


--
-- Name: calificaciones calificaciones_asignacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calificaciones
    ADD CONSTRAINT calificaciones_asignacion_id_fkey FOREIGN KEY (asignacion_id) REFERENCES public.asignaciones(id);


--
-- Name: calificaciones calificaciones_calificado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calificaciones
    ADD CONSTRAINT calificaciones_calificado_por_fkey FOREIGN KEY (calificado_por) REFERENCES public.docentes(id);


--
-- Name: calificaciones calificaciones_entrega_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calificaciones
    ADD CONSTRAINT calificaciones_entrega_id_fkey FOREIGN KEY (entrega_id) REFERENCES public.entregas(id);


--
-- Name: calificaciones calificaciones_estudiante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calificaciones
    ADD CONSTRAINT calificaciones_estudiante_id_fkey FOREIGN KEY (estudiante_id) REFERENCES public.estudiantes(id);


--
-- Name: calificaciones calificaciones_periodo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calificaciones
    ADD CONSTRAINT calificaciones_periodo_id_fkey FOREIGN KEY (periodo_id) REFERENCES public.periodos(id);


--
-- Name: cursos cursos_grado_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cursos
    ADD CONSTRAINT cursos_grado_id_fkey FOREIGN KEY (grado_id) REFERENCES public.grados(id);


--
-- Name: cursos cursos_institucion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cursos
    ADD CONSTRAINT cursos_institucion_id_fkey FOREIGN KEY (institucion_id) REFERENCES public.instituciones(id);


--
-- Name: docente_curso docente_curso_curso_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.docente_curso
    ADD CONSTRAINT docente_curso_curso_id_fkey FOREIGN KEY (curso_id) REFERENCES public.cursos(id);


--
-- Name: docente_curso docente_curso_docente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.docente_curso
    ADD CONSTRAINT docente_curso_docente_id_fkey FOREIGN KEY (docente_id) REFERENCES public.docentes(id);


--
-- Name: docentes docentes_grado_asignado_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.docentes
    ADD CONSTRAINT docentes_grado_asignado_fkey FOREIGN KEY (grado_asignado) REFERENCES public.grados(id);


--
-- Name: docentes docentes_institucion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.docentes
    ADD CONSTRAINT docentes_institucion_id_fkey FOREIGN KEY (institucion_id) REFERENCES public.instituciones(id);


--
-- Name: docentes docentes_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.docentes
    ADD CONSTRAINT docentes_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id);


--
-- Name: entregas entregas_acudiente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entregas
    ADD CONSTRAINT entregas_acudiente_id_fkey FOREIGN KEY (acudiente_id) REFERENCES public.acudientes(id);


--
-- Name: entregas entregas_asignacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entregas
    ADD CONSTRAINT entregas_asignacion_id_fkey FOREIGN KEY (asignacion_id) REFERENCES public.asignaciones(id);


--
-- Name: entregas entregas_estudiante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entregas
    ADD CONSTRAINT entregas_estudiante_id_fkey FOREIGN KEY (estudiante_id) REFERENCES public.estudiantes(id);


--
-- Name: estudiante_acudiente estudiante_acudiente_acudiente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estudiante_acudiente
    ADD CONSTRAINT estudiante_acudiente_acudiente_id_fkey FOREIGN KEY (acudiente_id) REFERENCES public.acudientes(id);


--
-- Name: estudiante_acudiente estudiante_acudiente_estudiante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estudiante_acudiente
    ADD CONSTRAINT estudiante_acudiente_estudiante_id_fkey FOREIGN KEY (estudiante_id) REFERENCES public.estudiantes(id);


--
-- Name: estudiantes estudiantes_curso_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estudiantes
    ADD CONSTRAINT estudiantes_curso_id_fkey FOREIGN KEY (curso_id) REFERENCES public.cursos(id);


--
-- Name: funcionarios funcionarios_institucion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.funcionarios
    ADD CONSTRAINT funcionarios_institucion_id_fkey FOREIGN KEY (institucion_id) REFERENCES public.instituciones(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: funcionarios funcionarios_rol_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.funcionarios
    ADD CONSTRAINT funcionarios_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: funcionarios funcionarios_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.funcionarios
    ADD CONSTRAINT funcionarios_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: instituciones instituciones_municipio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instituciones
    ADD CONSTRAINT instituciones_municipio_id_fkey FOREIGN KEY (municipio_id) REFERENCES public.municipios(id);


--
-- Name: municipios municipios_departamento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.municipios
    ADD CONSTRAINT municipios_departamento_id_fkey FOREIGN KEY (departamento_id) REFERENCES public.departamentos(id);


--
-- Name: notificaciones notificaciones_asignacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificaciones
    ADD CONSTRAINT notificaciones_asignacion_id_fkey FOREIGN KEY (asignacion_id) REFERENCES public.asignaciones(id);


--
-- Name: notificaciones notificaciones_destinatario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificaciones
    ADD CONSTRAINT notificaciones_destinatario_id_fkey FOREIGN KEY (destinatario_id) REFERENCES public.usuarios(id);


--
-- Name: periodos periodos_institucion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.periodos
    ADD CONSTRAINT periodos_institucion_id_fkey FOREIGN KEY (institucion_id) REFERENCES public.instituciones(id);


--
-- Name: usuarios usuarios_rol_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES public.roles(id);


--
-- PostgreSQL database dump complete
--

