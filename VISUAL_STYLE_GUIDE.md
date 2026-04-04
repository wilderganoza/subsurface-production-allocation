# Guía de Estilos Visuales - Subsurface Production Allocation

## Índice
1. [Sistema de Colores](#sistema-de-colores)
2. [Tipografía](#tipografía)
3. [Espaciado y Layout](#espaciado-y-layout)
4. [Bordes y Sombras](#bordes-y-sombras)
5. [Componentes UI](#componentes-ui)
6. [Gráficos y Visualizaciones](#gráficos-y-visualizaciones)
7. [Animaciones y Transiciones](#animaciones-y-transiciones)
8. [Estados Interactivos](#estados-interactivos)

---

## Sistema de Colores

### Variables CSS Base
La aplicación utiliza un sistema de variables CSS que permite cambiar entre tema claro y oscuro.

#### Colores Invariables (Ambos Temas)
```css
--radius: 8px;
--color-primary: #4a7cff;
--color-primary-hover: #3a6aee;
--color-success: #34d399;
--color-warning: #fbbf24;
--color-danger: #f87171;
```

#### Colores de Gráficos (Paleta de 8 colores)
```css
--color-chart-1: #4a7cff;  /* Azul primario */
--color-chart-2: #34d399;  /* Verde */
--color-chart-3: #fbbf24;  /* Amarillo */
--color-chart-4: #f87171;  /* Rojo */
--color-chart-5: #a78bfa;  /* Púrpura */
--color-chart-6: #f472b6;  /* Rosa */
--color-chart-7: #38bdf8;  /* Cyan */
--color-chart-8: #fb923c;  /* Naranja */
```

### Tema Oscuro (Dark Mode)
```css
[data-theme="dark"] {
  --color-bg: #0f1117;              /* Fondo principal */
  --color-surface: #1a1d27;         /* Superficies (cards, modales) */
  --color-surface-hover: #232733;   /* Hover en superficies */
  --color-border: #2a2e3a;          /* Bordes */
  --color-border-focus: #4a7cff;    /* Bordes en focus */
  --color-text: #e4e6ed;            /* Texto principal */
  --color-text-muted: #8b8fa3;      /* Texto secundario/muted */
  --shadow: 0 2px 8px rgba(0,0,0,0.3);
  --color-chart-line: #ffffff;      /* Líneas en gráficos */
  --color-chart-axis: #8b8fa3;      /* Ejes de gráficos */
  --color-tooltip-bg: #1a1d27;      /* Fondo de tooltips */
  --color-tooltip-border: #2a2e3a;  /* Borde de tooltips */
}
```

### Tema Claro (Light Mode)
```css
[data-theme="light"] {
  --color-bg: #f5f7fa;              /* Fondo principal */
  --color-surface: #ffffff;         /* Superficies (cards, modales) */
  --color-surface-hover: #f0f2f5;   /* Hover en superficies */
  --color-border: #e1e4e8;          /* Bordes */
  --color-border-focus: #4a7cff;    /* Bordes en focus */
  --color-text: #1a1d27;            /* Texto principal */
  --color-text-muted: #6b7280;      /* Texto secundario/muted */
  --shadow: 0 2px 8px rgba(0,0,0,0.08);
  --color-chart-line: #1a1d27;      /* Líneas en gráficos */
  --color-chart-axis: #6b7280;      /* Ejes de gráficos */
  --color-tooltip-bg: #ffffff;      /* Fondo de tooltips */
  --color-tooltip-border: #e1e4e8;  /* Borde de tooltips */
}
```

### Colores Semánticos con Opacidad

#### Success (Verde)
- Fondo: `rgba(52, 211, 153, 0.1)`
- Borde: `rgba(52, 211, 153, 0.3)`
- Texto: `var(--color-success)` (#34d399)
- Badge: `rgba(52, 211, 153, 0.15)`

#### Warning (Amarillo)
- Fondo: `rgba(251, 191, 36, 0.1)`
- Borde: `rgba(251, 191, 36, 0.3)`
- Texto: `var(--color-warning)` (#fbbf24)
- Badge: `rgba(251, 191, 36, 0.15)`

#### Danger (Rojo)
- Fondo: `rgba(248, 113, 113, 0.1)`
- Borde: `rgba(248, 113, 113, 0.3)`
- Texto: `var(--color-danger)` (#f87171)
- Badge: `rgba(248, 113, 113, 0.15)`

#### Primary (Azul)
- Fondo: `rgba(74, 124, 255, 0.12)` (activo)
- Hover: `rgba(74, 124, 255, 0.08)`
- Badge: `rgba(74, 124, 255, 0.15)`

#### Muted (Gris)
- Badge: `rgba(139, 143, 163, 0.15)`

#### Purple (Púrpura)
- Badge: `rgba(167, 139, 250, 0.15)`
- Texto: `#a78bfa`

---

## Tipografía

### Familia de Fuentes
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

**Nota importante**: La fuente Inter debe estar cargada en el proyecto. Si no está disponible, el sistema usará las fuentes del sistema en el orden especificado.

**Características de Inter:**
- Fuente sans-serif moderna y legible
- Optimizada para interfaces de usuario
- Excelente legibilidad en tamaños pequeños
- Soporta múltiples pesos (400, 500, 600, 700)
- Disponible en Google Fonts o como archivo local

### Jerarquía de Tamaños

#### Títulos
- **H1 (Página principal)**: 22px, font-weight: 700, line-height: 1.2
- **H2 (Secciones)**: 20px, font-weight: 700, line-height: 1.3
- **H3 (Subsecciones)**: 16px, font-weight: 600, line-height: 1.4
- **H4 (Componentes)**: 14-15px, font-weight: 600, line-height: 1.4

#### Header
- **Título principal**: 18px, font-weight: 700, letter-spacing: -0.3px, line-height: 1.2
- **Nombre de usuario**: 13px, font-weight: 500, line-height: 1.2
- **Rol de usuario**: 12px, color: muted, line-height: 1.2
- **Avatar**: 14px, font-weight: 500

#### Sidebar
- **Labels de módulos**: 14px, font-weight: 500 (normal), 600 (activo)

#### Texto de Cuerpo
- **Normal**: 14px, line-height: 1.6
- **Pequeño**: 13px, line-height: 1.5
- **Muy pequeño**: 12px, line-height: 1.4
- **Micro**: 11px, line-height: 1.3

#### Botones
- **Normal**: 14px, font-weight: 500-600, line-height: 1
- **Pequeño**: 12px, font-weight: 500, line-height: 1
- **Grande (Run)**: 15px, font-weight: 600, line-height: 1
- **Login**: 15px, font-weight: 600, line-height: 1

#### Formularios
- **Labels**: 13px, font-weight: 500, color: muted
- **Inputs**: 14px, line-height: 1.4
- **Placeholders**: 14px, color: muted
- **Error messages**: 13px, color: danger

#### Tablas
- **Headers**: 11px, font-weight: 600, text-transform: uppercase, letter-spacing: 0.5px
- **Celdas**: 13px, line-height: 1.4
- **Wells table headers**: 11px, font-weight: 600
- **Wells table cells**: 12-13px

#### Modales
- **Título**: 18px, font-weight: 600
- **Cuerpo**: 14px, line-height: 1.6
- **Botones**: 14px, font-weight: 500-600

#### Status Messages
- **Texto**: 13px, line-height: 1.4

#### Badges
- **Well status**: 11px, font-weight: 600
- **General badges**: 11-12px, font-weight: 500-600

#### File Uploader
- **Título**: 16px, font-weight: 600
- **Descripción**: 13px, color: muted
- **Nombre de archivo**: 14px, font-weight: 500

#### Gráficos
- **Ejes (ticks)**: 11px
- **Legend**: 12px
- **Tooltips**: 13px
- **Labels**: 12-13px

### Altura de Línea (Line Height)
- **Base (body text)**: 1.6
- **Títulos H1**: 1.2
- **Títulos H2-H3**: 1.3-1.4
- **Botones/UI**: 1
- **Header título**: 1.2
- **User info**: 1.2
- **Inputs**: 1.4
- **Tablas**: 1.4
- **Modales**: 1.6
- **Status messages**: 1.4

### Letter Spacing
- **Headers de tabla**: 0.5px
- **Títulos principales (H1, Header)**: -0.3px
- **Normal**: 0 (default)
- **Uppercase text**: 0.5px

### Font Weights Utilizados
- **400**: Normal (no usado explícitamente, es el default)
- **500**: Medium - Labels, botones normales, texto de usuario
- **600**: Semibold - Subtítulos, headers de tabla, botones activos, badges
- **700**: Bold - Títulos principales (H1, H2, Header title)

---

## Espaciado y Layout

### Sistema de Espaciado
La aplicación usa un sistema de espaciado consistente basado en múltiplos de 4px:

#### Espaciado Interno (Padding)
- **Micro**: 4px
- **Pequeño**: 8px
- **Mediano**: 12px
- **Normal**: 16px
- **Grande**: 20px
- **Extra grande**: 24px
- **XXL**: 40px

#### Espaciado Externo (Margin)
- **Entre elementos pequeños**: 4px
- **Entre elementos relacionados**: 8px
- **Entre grupos**: 16px
- **Entre secciones**: 20-24px

#### Gaps en Flexbox
- **Muy ajustado**: 2px
- **Ajustado**: 4px
- **Pequeño**: 6px
- **Normal**: 8px
- **Mediano**: 10-12px
- **Grande**: 16px
- **Extra grande**: 18px

### Layout Principal

#### Sidebar
```css
width: 200px;
min-width: 200px;
height: 100vh;
position: sticky;
top: 0;
```

#### Header
```css
padding: 12px 24px;
border-bottom: 1px solid var(--color-border);
```

#### Contenido Principal
```css
padding: 24px;
flex: 1;
overflow-y: auto;
```

---

## Bordes y Sombras

### Radio de Bordes
- **Estándar**: `var(--radius)` = 8px
- **Pequeño**: 4px
- **Mediano**: 6px
- **Grande**: 12px
- **Circular**: 50% o 999px (badges)
- **Tooltip**: 20px

### Grosor de Bordes
- **Estándar**: 1px
- **Dashed (upload)**: 2px dashed
- **Focus/Active**: 2px

### Sombras

#### Tema Oscuro
```css
--shadow: 0 2px 8px rgba(0,0,0,0.3);
```
- **Modal**: `0 20px 40px rgba(15, 23, 42, 0.35)`
- **Card**: `0 4px 24px rgba(0, 0, 0, 0.4)`

#### Tema Claro
```css
--shadow: 0 2px 8px rgba(0,0,0,0.08);
```
- **Modal**: `0 20px 40px rgba(15, 23, 42, 0.15)` (ajustado)
- **Card**: `0 4px 24px rgba(0, 0, 0, 0.1)` (ajustado)

---

## Componentes UI

### Botones

#### Botón Estándar
```css
.btn {
  padding: 8px 18px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 14px;
  transition: all 0.15s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.btn:hover {
  background: var(--color-surface-hover);
}
```

#### Botón Primario
```css
.btn-primary {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}
.btn-primary:hover {
  background: var(--color-primary-hover);
}
```

#### Botón Peligro
```css
.btn-danger {
  border-color: var(--color-danger);
  color: var(--color-danger);
}
.btn-danger:hover {
  background: rgba(248,113,113,0.1);
}
```

#### Botón Pequeño
```css
.btn-sm {
  padding: 4px 10px;
  font-size: 12px;
}
```

#### Botón Grande (Run)
```css
.btn-run {
  padding: 10px 28px;
  font-size: 15px;
  font-weight: 600;
}
```

#### Botón Deshabilitado
```css
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

### Inputs y Formularios

#### Input Estándar
```css
.input {
  padding: 8px 12px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  color: var(--color-text);
}
.input:focus {
  outline: none;
  border-color: var(--color-border-focus);
}
```

#### Form Group
```css
.form-group {
  margin-bottom: 16px;
}
.form-group label {
  display: block;
  font-size: 13px;
  color: var(--color-text-muted);
  margin-bottom: 4px;
  font-weight: 500;
}
```

#### Select
```css
.form-group select {
  width: 100%;
  padding: 8px 12px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  color: var(--color-text);
}
```

### Tablas

#### Tabla de Datos
```css
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.data-table th,
.data-table td {
  padding: 8px 12px;
  border-bottom: 1px solid var(--color-border);
  text-align: left;
}
.data-table th {
  background: var(--color-surface);
  color: var(--color-text-muted);
  font-weight: 600;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.5px;
  position: sticky;
  top: 0;
}
.data-table tr:hover td {
  background: var(--color-surface-hover);
}
```

#### Tabla de Wells
```css
.wells-table th,
.wells-table td {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
  text-align: center;
}
.wells-table thead {
  background: rgba(148, 163, 184, 0.08);
}
```

### Modales

#### Estructura
```css
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 24px;
}

.modal {
  background: var(--color-surface);
  border-radius: 12px;
  border: 1px solid var(--color-border);
  width: 100%;
  max-width: 460px;
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.35);
}

.modal-header,
.modal-footer {
  padding: 16px 20px;
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 600;
}

.modal-body {
  padding: 0 20px 20px;
}

.modal-footer {
  border-top: 1px solid var(--color-border);
  justify-content: flex-end;
}
```

### Tabs

#### Tab Bar
```css
.tab-bar {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 0;
  margin-bottom: 16px;
}

.tab-btn {
  padding: 8px 16px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--color-text-muted);
  font-size: 13px;
  font-weight: 500;
  transition: all 0.15s;
}

.tab-btn:hover {
  color: var(--color-text);
}

.tab-btn.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}
```

#### Results Tab Bar (Variante)
```css
.results-tab-bar {
  display: flex;
  gap: 0;
  border-bottom: 2px solid var(--color-border);
  margin-bottom: 20px;
}

.results-tab-bar .tab-btn {
  padding: 10px 20px;
  margin-bottom: -2px;
  white-space: nowrap;
}

.results-tab-bar .tab-btn:hover {
  background: rgba(255,255,255,0.03);
}

.results-tab-bar .tab-btn.active {
  font-weight: 600;
}
```

### Badges de Estado

#### Well Status
```css
.well-status {
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 999px;
  font-weight: 600;
  display: inline-block;
}

.well-status.new {
  background: rgba(139, 143, 163, 0.15);
  color: var(--color-text-muted);
}

.well-status.prod {
  background: rgba(74, 124, 255, 0.15);
  color: var(--color-primary);
}

.well-status.props {
  background: rgba(251, 191, 36, 0.15);
  color: var(--color-warning);
}

.well-status.events {
  background: rgba(167, 139, 250, 0.15);
  color: #a78bfa;
}

.well-status.allocated {
  background: rgba(52, 211, 153, 0.15);
  color: var(--color-success);
}
```

### File Uploader

#### Área de Upload
```css
.file-uploader {
  border: 2px dashed var(--color-border);
  border-radius: 12px;
  padding: 40px 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background: transparent;
}

.file-uploader:hover {
  border-color: var(--color-primary);
  background: rgba(74, 124, 255, 0.04);
}

.file-uploader.dragging {
  border-color: var(--color-primary);
  background: rgba(74, 124, 255, 0.08);
  box-shadow: 0 0 0 4px rgba(74, 124, 255, 0.1);
}

.file-uploader.has-file {
  border-color: var(--color-success);
  background: rgba(52, 211, 153, 0.04);
}
```

#### Elementos Internos
```css
.file-uploader-icon {
  font-size: 48px;
  line-height: 1;
  margin-bottom: 4px;
}

.file-uploader-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
}

.file-uploader-formats {
  font-size: 13px;
  color: var(--color-text-muted);
}

.file-uploader-filename {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-success);
  background: rgba(52, 211, 153, 0.1);
  padding: 4px 14px;
  border-radius: 20px;
}
```

### Sidebar

#### Estructura y Dimensiones
```css
.sidebar {
  position: fixed;
  left: 0;
  top: 56px;              /* Debajo del header */
  bottom: 0;
  width: 200px;
  min-width: 200px;
  z-index: 40;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  transition: transform 0.3s ease;
}

.sidebar.hidden {
  transform: translateX(-100%);
}
```

#### Navegación
```css
.sidebar-modules {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 12px 8px;
  gap: 2px;
  overflow-y: auto;
}
```

#### Botones de Módulo
```css
.module-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: none;
  border: none;
  border-radius: 6px;
  color: var(--color-text-muted);
  font-size: 14px;
  font-weight: 500;
  transition: all 0.12s;
  cursor: pointer;
  text-align: left;
}

.module-btn:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
}

.module-btn.active {
  background: rgba(74, 124, 255, 0.12);
  color: var(--color-primary);
  font-weight: 600;
}
```

#### Iconos SVG (Heroicons Style)
```css
.module-icon {
  width: 22px;
  text-align: center;
  flex-shrink: 0;
}

/* SVG dentro del icono */
.module-icon svg {
  width: 18px;
  height: 18px;
  stroke: currentColor;
  fill: none;
}
```

**Especificaciones de Iconos SVG:**
- Tamaño: 18x18 píxeles
- ViewBox: 0 0 24 24
- Stroke: currentColor (hereda color del botón)
- StrokeWidth: 2
- StrokeLinecap: round
- StrokeLinejoin: round
- Fill: none (outline style)

**Iconos por Módulo:**
```jsx
// Wells - Database icon
<svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
</svg>

// Production - Chart Bar icon
<svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
</svg>

// Events - Calendar icon
<svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
</svg>

// Allocation - Chart Pie icon
<svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
    d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
    d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
</svg>

// Users - Users icon
<svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
</svg>
```

### Step Indicator

```css
.step-indicator {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
}

.step-indicator .step {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: var(--color-border);
  transition: background 0.2s;
}

.step-indicator .step.active {
  background: var(--color-primary);
}

.step-indicator .step.done {
  background: var(--color-success);
}
```

### Spinner (Loading)

```css
.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

### Status Messages

```css
.module-status {
  padding: 10px 14px;
  border-radius: var(--radius);
  font-size: 13px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.module-status.success {
  background: rgba(52, 211, 153, 0.1);
  border: 1px solid rgba(52, 211, 153, 0.3);
  color: var(--color-success);
}

.module-status.error {
  background: rgba(248, 113, 113, 0.1);
  border: 1px solid rgba(248, 113, 113, 0.3);
  color: var(--color-danger);
}

.module-status.warning {
  background: rgba(251, 191, 36, 0.1);
  border: 1px solid rgba(251, 191, 36, 0.3);
  color: var(--color-warning);
}
```

---

## Gráficos y Visualizaciones

### Recharts Configuration

#### Ejes (XAxis, YAxis)
```javascript
<XAxis 
  dataKey="date" 
  tick={{ fontSize: 11, fill: chartAxisColor }}
  tickFormatter={v => v.slice(5)}
/>
<YAxis 
  tick={{ fontSize: 11, fill: chartAxisColor }} 
/>
```

#### Tooltip
```javascript
<Tooltip
  contentStyle={{ 
    background: tooltipBg, 
    border: `1px solid ${tooltipBorder}`, 
    borderRadius: 8, 
    fontSize: 13 
  }}
  labelStyle={{ color: textColor }}
/>
```

#### Legend
```javascript
<Legend wrapperStyle={{ fontSize: 12 }} />
```

#### Reference Lines (Líneas de Intervención)
```javascript
<ReferenceLine
  x={date}
  stroke={chartLineColor}
  strokeDasharray="4 4"
  strokeOpacity={0.5}
/>
```

#### Area Chart
```javascript
<Area
  type="monotone"
  dataKey={dataKey}
  stackId="period-0"
  stroke={color}
  fill={color}
  fillOpacity={0.6}
  connectNulls={false}
/>
```

#### Line Chart
```javascript
<Line
  type="monotone"
  dataKey="_total"
  stroke={chartLineColor}
  strokeWidth={1.5}
  strokeDasharray="5 5"
  dot={false}
/>
```

#### Decline Curve (Dashed)
```javascript
<Line
  type="monotone"
  dataKey={key}
  stroke={color}
  strokeWidth={2.5}
  strokeDasharray="8 4"
  dot={false}
/>
```

### Chart Container
```javascript
<ResponsiveContainer width="100%" height={400}>
  {/* Chart content */}
</ResponsiveContainer>
```

### Custom Legend
```javascript
<span 
  className="recharts-legend-icon"
  style={{ 
    display: 'inline-block', 
    width: 12, 
    height: 12, 
    backgroundColor: color, 
    borderRadius: 2 
  }}
/>
<span 
  className="recharts-legend-item-text" 
  style={{ color: 'var(--color-text)' }}
>
  {label}
</span>
```

---

## Animaciones y Transiciones

### Duración Estándar
```css
transition: all 0.15s;
```

### Transiciones Específicas

#### Botones y Elementos Interactivos
```css
transition: all 0.15s;
```

#### Hover en Superficies
```css
transition: all 0.12s;
```

#### Step Indicator
```css
transition: background 0.2s;
```

#### File Uploader
```css
transition: all 0.2s;
```

#### Spinner
```css
animation: spin 0.8s linear infinite;
```

### Timing Functions
- **Default**: ease (implícito)
- **Linear**: usado en spinner
- **Ease-in-out**: para transiciones suaves

---

## Estados Interactivos

### Hover States

#### Botones
```css
.btn:hover {
  background: var(--color-surface-hover);
}
```

#### Botón Primario
```css
.btn-primary:hover {
  background: var(--color-primary-hover);
}
```

#### Botón Danger
```css
.btn-danger:hover {
  background: rgba(248,113,113,0.1);
}
```

#### Filas de Tabla
```css
.data-table tr:hover td {
  background: var(--color-surface-hover);
}

.well-row:hover {
  background: rgba(74, 124, 255, 0.08);
}
```

#### Módulos en Sidebar
```css
.module-btn:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
}
```

#### File Uploader
```css
.file-uploader:hover {
  border-color: var(--color-primary);
  background: rgba(74, 124, 255, 0.04);
}
```

#### Tabs
```css
.tab-btn:hover {
  color: var(--color-text);
}

.results-tab-bar .tab-btn:hover {
  background: rgba(255,255,255,0.03);
}
```

### Focus States

#### Inputs
```css
.input:focus {
  outline: none;
  border-color: var(--color-border-focus);
}
```

#### Selects
```css
.form-group select:focus {
  outline: none;
  border-color: var(--color-border-focus);
}
```

### Active States

#### Módulos
```css
.module-btn.active {
  background: rgba(74, 124, 255, 0.12);
  color: var(--color-primary);
  font-weight: 600;
}
```

#### Tabs
```css
.tab-btn.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}
```

#### Wells Row
```css
.well-row.active {
  background: rgba(74, 124, 255, 0.12);
}
```

#### Step Indicator
```css
.step-indicator .step.active {
  background: var(--color-primary);
}

.step-indicator .step.done {
  background: var(--color-success);
}
```

### Disabled States

#### Botones
```css
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

### Dragging State

#### File Uploader
```css
.file-uploader.dragging {
  border-color: var(--color-primary);
  background: rgba(74, 124, 255, 0.08);
  box-shadow: 0 0 0 4px rgba(74, 124, 255, 0.1);
}
```

---

## Scrollbar Personalizado

```css
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: var(--color-bg);
}

::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 3px;
}
```

---

## Login Page

### Card de Login
```css
.login-card {
  width: 100%;
  max-width: 400px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 40px 36px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
}
```

### Header de Login
```css
.login-header h1 {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 4px;
}

.login-header p {
  font-size: 13px;
  color: var(--color-text-muted);
}
```

### Campos de Login
```css
.login-field input {
  padding: 10px 14px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  color: var(--color-text);
  font-size: 14px;
  transition: border-color 0.15s;
}

.login-field input:focus {
  outline: none;
  border-color: var(--color-primary);
}
```

### Botón de Login
```css
.login-btn {
  padding: 12px;
  background: var(--color-primary);
  border: none;
  border-radius: var(--radius);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
  margin-top: 4px;
}

.login-btn:hover {
  background: var(--color-primary-hover);
}

.login-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

### Error de Login
```css
.login-error {
  padding: 10px 14px;
  background: rgba(248, 113, 113, 0.1);
  border: 1px solid rgba(248, 113, 113, 0.3);
  border-radius: var(--radius);
  color: var(--color-danger);
  font-size: 13px;
  text-align: center;
}
```

---

## Layout Principal de la Aplicación

### Estructura HTML/React

```jsx
function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  return (
    <div className="app-layout">
      <Header onToggleSidebar={toggleSidebar} />
      <Sidebar isOpen={sidebarOpen} />
      <main 
        className="app-main" 
        style={{ 
          marginLeft: sidebarOpen ? '200px' : '0', 
          marginTop: '56px' 
        }}
      >
        {/* Contenido de la página */}
      </main>
    </div>
  );
}
```

### CSS del Layout

```css
.app-layout {
  min-height: 100vh;
  width: 100%;
  background: var(--color-bg);
}

.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
  transition: margin-left 0.3s ease;
  padding: 24px;
}

.app-loading {
  min-height: 100vh;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

### Jerarquía de Z-Index

- **Header**: 50 (fijo en la parte superior)
- **Sidebar**: 40 (fijo debajo del header)
- **Modal backdrop**: 50 (mismo nivel que header)
- **Tooltips**: default de Recharts
- **Contenido principal**: 1 (default)

### Dimensiones Clave

- **Header height**: 56px (fijo)
- **Sidebar width**: 200px (cuando está abierto)
- **Sidebar top**: 56px (debajo del header)
- **Main content margin-top**: 56px (para compensar header fijo)
- **Main content margin-left**: 200px (cuando sidebar abierto), 0px (cuando cerrado)
- **Main content padding**: 24px

### Transiciones

- **Sidebar toggle**: 0.3s ease (transform)
- **Main content margin**: 0.3s ease (margin-left)
- **Sincronización**: Ambas transiciones tienen la misma duración para movimiento fluido

### Comportamiento Responsive

**Desktop (por defecto):**
- Sidebar visible por defecto
- Header fijo en la parte superior
- Contenido principal con margin-left de 200px

**Mobile (recomendado para implementación futura):**
- Sidebar oculto por defecto
- Sidebar como overlay con backdrop
- Contenido principal sin margin-left
- Header con hamburger menu siempre visible

---

## Notas de Implementación

### Variables CSS Dinámicas
Para obtener valores de variables CSS en JavaScript (para gráficos):
```javascript
const chartLineColor = getComputedStyle(document.documentElement)
  .getPropertyValue('--color-chart-line').trim();
```

### Cambio de Tema
El tema se controla mediante el atributo `data-theme` en el elemento `html`:
```javascript
document.documentElement.setAttribute('data-theme', 'light'); // o 'dark'
```

### Persistencia del Tema
El tema se guarda en `localStorage`:
```javascript
localStorage.setItem('theme', 'light');
const theme = localStorage.getItem('theme') || 'dark';
```

### Z-Index Hierarchy
- **Modal backdrop**: 50
- **Tooltips**: (default de Recharts)
- **Sticky headers**: (default position: sticky)

### Responsive Considerations
- La aplicación está diseñada principalmente para desktop
- Usa `min-width` y `max-width` para contenedores
- Los gráficos usan `ResponsiveContainer` de Recharts
- Padding de 24px en móviles puede reducirse si es necesario

---

## Checklist de Implementación

Para replicar estos estilos en otra aplicación:

- [ ] Configurar variables CSS en `:root` y `[data-theme]`
- [ ] Implementar sistema de cambio de tema con localStorage
- [ ] Configurar familia de fuentes Inter
- [ ] Crear componentes base: botones, inputs, tablas
- [ ] Implementar sistema de colores semánticos con opacidad
- [ ] Configurar Recharts con colores dinámicos
- [ ] Implementar scrollbar personalizado
- [ ] Crear componentes de layout: sidebar, header
- [ ] Implementar sistema de tabs
- [ ] Crear componentes de status y badges
- [ ] Configurar transiciones y animaciones
- [ ] Implementar file uploader con estados
- [ ] Crear modales con backdrop
- [ ] Implementar step indicator
- [ ] Configurar estados hover/focus/active/disabled

---

**Versión**: 1.0  
**Última actualización**: Abril 2026  
**Aplicación**: Subsurface Production Allocation
