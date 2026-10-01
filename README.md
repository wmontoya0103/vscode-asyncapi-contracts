# AsyncAPI Contracts

Extensión de VS Code / Kiro para **leer, validar, previsualizar y editar contratos AsyncAPI 3.x** en YAML. Funciona con cualquier documento AsyncAPI (no está atada a ningún proyecto concreto): basta con que el archivo YAML empiece con `asyncapi: <versión>`.

La validación y el render usan los componentes **oficiales** de AsyncAPI (`@asyncapi/parser` y `@asyncapi/react-component`), los mismos que usan AsyncAPI Studio y la CLI oficial.

> Para la guía completa de uso, funcionalidades y resolución de problemas, consulta **[MANUAL.md](./MANUAL.md)**.

## Qué hace

- **Validación conforme al estándar**: diagnostics en el editor usando el parser oficial `@asyncapi/parser`. Valida contra el JSON Schema oficial de AsyncAPI y aplica las reglas semánticas del parser (resolución de `$ref`, tipos, campos requeridos, etc.). Se ejecuta al abrir, al guardar y mientras escribes.
- **Render oficial** (`AsyncAPI: Open Official Render`): documentación completa del contrato con el componente oficial `@asyncapi/react-component` (canales, operaciones, mensajes, payloads/schemas, ejemplos y bindings). Los assets se incluyen en la extensión y se cargan localmente, sin CDN.
- **Preview ligero** (`AsyncAPI: Preview Contract (lightweight)`): resumen rápido en panel lateral.
- **Autocompletado**: palabras clave por sección y punteros `$ref` que existen en el documento.
- **Edición asistida**: añadir canal, añadir mensaje, y navegar de un `$ref` a su definición.

## Qué NO hace

- No edita ni visualiza **OpenAPI/Swagger** (es solo AsyncAPI). Para esos usa otra extensión.
- No convierte entre versiones de AsyncAPI (2.x ↔ 3.x).
- No genera código ni SDKs a partir del contrato.
- No valida contra brokers reales ni comprueba conectividad.
- La validación requiere que el YAML sea sintácticamente parseable; sobre un YAML roto solo verás el error de sintaxis.

## Requisitos

- Node.js 18+ y npm (solo para compilar/empaquetar).
- VS Code 1.84+ o Kiro.

## Instalación

### 1. Generar el paquete (`.vsix`)

El `.vsix` **no está incluido en el repositorio** (se excluye en `.gitignore` porque se regenera). Hay que construirlo desde el código:

```bash
npm install
npm run vsix
```

Esto genera el archivo en la **raíz del proyecto**, con el nombre `<name>-<version>.vsix` tomado del `package.json`:

```
<carpeta-del-proyecto>/asyncapi-contracts-1.0.0.vsix
```

> El nombre cambia con la versión: si subes `version` en `package.json` y vuelves a empaquetar, se generará `asyncapi-contracts-<nueva-version>.vsix`.

### 2. Instalar en VS Code

**Por terminal** (el comando `code` debe apuntar a VS Code):

```bash
code --install-extension asyncapi-contracts-1.0.0.vsix --force
```

**Por interfaz:** abre **Extensions** (`Cmd+Shift+X`) → menú `···` → **Install from VSIX…** → selecciona el `.vsix`.

### 3. Instalar en Kiro

**Por terminal** (usa el CLI de Kiro; si no tienes el comando `kiro`, usa la ruta completa `"/Applications/Kiro.app/Contents/Resources/app/bin/code"`):

```bash
kiro --install-extension asyncapi-contracts-1.0.0.vsix --force
```

**Por interfaz:** abre la vista **Extensions** → menú `···` → **Install from VSIX…** → selecciona el `.vsix`.

### 4. Recargar

Tras instalar en cualquiera de los dos editores, recarga la ventana:
`Cmd+Shift+P` → **Developer: Reload Window**.

Si el render oficial no cargara tras una actualización, **cierra y reabre el editor por completo** (el webview puede quedar en caché).

Consulta **[MANUAL.md](./MANUAL.md)** para el detalle completo.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `AsyncAPI: Open Official Render` | Render completo con el componente oficial de AsyncAPI |
| `AsyncAPI: Preview Contract (lightweight)` | Resumen propio y rápido |
| `AsyncAPI: Validate Contract` | Valida y muestra un resumen |
| `AsyncAPI: Add Channel` | Inserta un canal + operación |
| `AsyncAPI: Add Message` | Inserta un mensaje + schema |
| `AsyncAPI: Go to Referenced Component` | Navega a la definición del `$ref` bajo el cursor |

## Configuración

| Ajuste | Default | Descripción |
| --- | --- | --- |
| `asyncapiContracts.validateOnSave` | `true` | Validar al guardar |
| `asyncapiContracts.validateOnType` | `true` | Validar mientras escribes (debounced) |
| `asyncapiContracts.suppressRecommendedVersionHint` | `true` | Ocultar el aviso que recomienda migrar a la última versión de AsyncAPI (`asyncapi-latest-version`) |
| `asyncapiContracts.suppressedRules` | `[]` | Lista de códigos de regla a ocultar de los diagnostics |

## Desarrollo

Scripts disponibles para trabajar en la extensión y regenerar el paquete:

| Script | Qué hace |
| --- | --- |
| `npm install` | Instala dependencias (necesario la primera vez). |
| `npm run compile` | Copia los assets del render y compila el bundle (desarrollo). |
| `npm run watch` | Recompila automáticamente al guardar cambios. |
| `npm run typecheck` | Comprueba tipos sin generar salida (`tsc --noEmit`). |
| `npm run package` | Compila el bundle minificado (para producción). |
| `npm run copy-assets` | Copia manualmente los assets del render oficial a `media/`. |
| `npm run vsix` | **Regenera el `.vsix`** instalable en la raíz del proyecto. |

Flujo típico para publicar una versión nueva:

1. Sube el número de `version` en `package.json`.
2. `npm run vsix` genera `asyncapi-contracts-<version>.vsix`.
3. Instala el nuevo `.vsix` en Kiro / VS Code (ver sección **Instalación**).

Para iterar sin empaquetar, abre el proyecto en VS Code y pulsa `F5` (abre una ventana *Extension Development Host* con la extensión cargada).

## Licencia

MIT. Usa componentes de AsyncAPI Initiative (`@asyncapi/parser`, `@asyncapi/react-component`), licencia Apache-2.0.
