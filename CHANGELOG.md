# Changelog
# Changelog

## 1.0.0

- Extensión independiente (sacada del repositorio BIAN) y generalizada para cualquier contrato AsyncAPI.
- Nuevo publisher/ID: `wmontoya.asyncapi-contracts`.
- Manual de uso completo en `MANUAL.md`.
- Arranque robusto: comandos registrados primero, parser cargado de forma diferida, CSP del render con `unsafe-eval` para `ajv`.
- Detección por contenido (`asyncapi: <versión>`), no por modo de lenguaje.

## 0.4.0

- **Render oficial**: nuevo comando `AsyncAPI: Open Official Render` que usa el componente oficial `@asyncapi/react-component` (el mismo de AsyncAPI Studio) para mostrar la documentación completa del contrato: canales, operaciones, mensajes, payloads/schemas, ejemplos y bindings.
- El bundle standalone y los estilos del componente se empaquetan dentro de la extensión y se cargan como recursos locales del webview (sin CDN, funciona offline, con CSP y nonce).
- El preview propio anterior se mantiene como `AsyncAPI: Preview Contract (lightweight)`.

## 0.3.0

- Nuevos ajustes para silenciar diagnostics:
  - `asyncapiContracts.suppressRecommendedVersionHint` (por defecto `true`): oculta el aviso de "migra a la última versión" (`asyncapi-latest-version`).
  - `asyncapiContracts.suppressedRules`: lista de códigos de regla a ocultar.
- Los documentos abiertos se revalidan automáticamente al cambiar la configuración.

## 0.2.0

- **Validación conforme al estándar**: se reemplaza el validador estructural propio por el parser oficial `@asyncapi/parser` (el mismo motor de AsyncAPI Studio y la CLI). Ahora los diagnostics se corresponden con la especificación oficial: validación contra el JSON Schema de AsyncAPI más las reglas semánticas del parser (resolución de `$ref`, tipos, campos requeridos, versión recomendada, etc.).
- La validación pasa a ser asíncrona y descarta resultados obsoletos cuando el documento cambia durante el análisis.

## 0.1.0

- Validación estructural de contratos AsyncAPI 3.x (diagnostics).
- Autocompletado por sección y de punteros `$ref` locales.
- Preview del contrato en panel lateral.
- Comandos: Add Channel, Add Message, Go to Referenced Component, Preview, Validate.
- Go to Definition sobre `$ref`.
