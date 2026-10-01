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

## Instalación rápida

```bash
npm install
npm run vsix
code --install-extension asyncapi-contracts-1.0.0.vsix
```

Luego recarga la ventana del editor. Consulta **[MANUAL.md](./MANUAL.md)** para el detalle completo.

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

## Licencia

MIT. Usa componentes de AsyncAPI Initiative (`@asyncapi/parser`, `@asyncapi/react-component`), licencia Apache-2.0.
