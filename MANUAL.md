# Manual de uso — AsyncAPI Contracts

Guía completa de la extensión: qué hace, qué no hace, cómo se usa cada funcionalidad, cómo se instala y cómo resolver problemas.

---

## 1. Introducción

**AsyncAPI Contracts** es una extensión para VS Code y Kiro que te ayuda a trabajar con contratos **AsyncAPI 3.x** escritos en YAML. Cubre el ciclo completo: leer, validar, visualizar y editar.

Se apoya en los componentes **oficiales** de la AsyncAPI Initiative:

- [`@asyncapi/parser`](https://github.com/asyncapi/parser-js) — para la validación (el mismo motor de AsyncAPI Studio y la CLI).
- [`@asyncapi/react-component`](https://github.com/asyncapi/asyncapi-react) — para el render de documentación.

No está atada a ningún proyecto ni dominio: funciona con cualquier archivo AsyncAPI.

---

## 2. ¿Cuándo se activa?

La extensión considera que un archivo es un contrato AsyncAPI cuando:

- El archivo es tratado como YAML (o texto plano / `.yaml` / `.yml`), **y**
- Su contenido empieza con una línea `asyncapi: <versión>` (p. ej. `asyncapi: 3.0.0`).

La detección se basa en el **contenido**, no en el modo de lenguaje del editor. Esto es a propósito: algunos `.yaml` grandes se abren como "texto plano", y aun así la extensión los reconoce.

Si abres un archivo que no cumple esto (por ejemplo un OpenAPI, que empieza con `openapi:`), los comandos avisarán con "Open an AsyncAPI contract first".

---

## 3. Qué hace (funcionalidades)

### 3.1 Validación conforme al estándar

Muestra errores y avisos directamente en el editor (subrayados) y en el panel **Problems** (`Cmd+Shift+M` / `Ctrl+Shift+M`).

- Usa `@asyncapi/parser`, así que valida contra el JSON Schema oficial de AsyncAPI **y** aplica las reglas semánticas del parser: resolución de `$ref`, tipos de propiedades, campos obligatorios, versión recomendada, etc.
- Se ejecuta automáticamente:
  - al abrir un contrato,
  - al guardar (configurable),
  - mientras escribes, con un pequeño retardo (configurable).
- Cada diagnostic lleva un **código de regla** entre paréntesis (p. ej. `invalid-ref`, `asyncapi-document-resolved`). Ese código sirve para silenciar reglas concretas (ver §6).

Comando manual: **`AsyncAPI: Validate Contract`** — valida el archivo activo y muestra un resumen (nº de errores/avisos).

### 3.2 Render oficial

Comando: **`AsyncAPI: Open Official Render`**

Abre un panel lateral con la documentación completa del contrato, con el mismo aspecto que AsyncAPI Studio:

- Información general (título, versión, descripción).
- Canales (`channels`) y sus mensajes.
- Operaciones (`operations`) agrupadas.
- Mensajes, con sus **payloads/schemas**, ejemplos y bindings.
- Barra lateral de navegación.

Detalles:

- El render se **actualiza solo** cuando editas el YAML (con un pequeño retardo), así que puedes dejarlo abierto mientras trabajas.
- Los assets del componente (JS + CSS) se **empaquetan dentro de la extensión** y se cargan localmente. No se descarga nada de internet: funciona offline.

### 3.3 Preview ligero

Comando: **`AsyncAPI: Preview Contract (lightweight)`**

Un resumen propio y rápido, sin cargar el render completo:

- Cabecera con metadatos y conteos (canales, mensajes, schemas).
- Lista de canales con el número de mensajes de cada uno.
- Operaciones separadas en `send` y `receive`.

Útil para una vista general veloz. También se actualiza al editar.

### 3.4 Autocompletado

Mientras escribes, la extensión sugiere:

- **Palabras clave por sección**: según dónde esté el cursor (`root`, `info`, `channels`, `operations`, `components`), ofrece las claves válidas de esa sección, con snippets.
- **Punteros `$ref`**: al escribir después de `$ref:`, lista los componentes que **realmente existen** en el documento (mensajes, schemas, canales), con el formato de puntero correcto (incluyendo el escape `~1` para `/`).

### 3.5 Edición asistida

- **`AsyncAPI: Add Channel`** — pide un nombre y una acción (`send`/`receive`) e inserta el esqueleto de un canal más su operación asociada, con los `$ref` correctos.
- **`AsyncAPI: Add Message`** — pide un nombre e inserta un mensaje reutilizable bajo `components.messages` más su schema bajo `components.schemas`.
- **`AsyncAPI: Go to Referenced Component`** — con el cursor sobre un `$ref`, salta a la definición a la que apunta. También funciona con **Go to Definition** nativo (`F12`).

---

## 4. Qué NO hace (límites)

- **No** trabaja con OpenAPI/Swagger. Es exclusivamente AsyncAPI. Un archivo que empieza con `openapi:` no se activa.
- **No** convierte entre versiones (por ejemplo AsyncAPI 2.x ↔ 3.x). Soporta leer/validar/renderizar lo que el parser oficial soporte, pero no migra el documento.
- **No** genera código, SDKs ni stubs a partir del contrato.
- **No** se conecta a brokers (Kafka, AMQP, MQTT…), no publica ni consume mensajes, no comprueba conectividad.
- **No** valida bindings contra una infraestructura real; solo valida la estructura del documento.
- La validación necesita que el YAML sea **parseable**. Si el YAML tiene un error de sintaxis, verás ese error primero; el resto de validaciones se ejecutan una vez el documento es válido sintácticamente.
- El render muestra lo que el componente oficial sabe representar; `$ref` externos (a otros archivos o URLs) dependen de que el parser pueda resolverlos.

---

## 5. Instalación

### Requisitos

- Node.js 18+ y npm (solo para compilar/empaquetar; no para usar la extensión ya instalada).
- VS Code 1.84+ o Kiro.

### Compilar e instalar desde el código

Desde la carpeta de la extensión:

```bash
# 1. Instalar dependencias
npm install

# 2. (opcional) Comprobar tipos
npm run typecheck

# 3. Empaquetar el .vsix (copia los assets del render y compila)
npm run vsix
```

Esto genera `asyncapi-contracts-1.0.0.vsix`.

Instalarlo:

```bash
# VS Code
code --install-extension asyncapi-contracts-1.0.0.vsix

# Kiro (si 'code' no está en el PATH, usa el CLI del bundle de Kiro):
/Applications/Kiro.app/Contents/Resources/app/bin/code --install-extension asyncapi-contracts-1.0.0.vsix
```

O desde la UI: **Extensions → … (menú) → Install from VSIX…**

### Importante tras instalar o actualizar

Las extensiones instaladas por línea de comandos **no se activan en ventanas ya abiertas** hasta recargar:

1. `Cmd+Shift+P` → **"Developer: Reload Window"**.
2. Si tras recargar sigues viendo comportamiento viejo (un webview cacheado, por ejemplo), **cierra el editor por completo y vuelve a abrirlo**.

---

## 6. Configuración

Ajustes disponibles (Settings → busca "AsyncAPI", o edita `settings.json`):

| Ajuste | Default | Descripción |
| --- | --- | --- |
| `asyncapiContracts.validateOnSave` | `true` | Valida al guardar el archivo. |
| `asyncapiContracts.validateOnType` | `true` | Valida mientras escribes (con retardo). |
| `asyncapiContracts.suppressRecommendedVersionHint` | `true` | Oculta el aviso informativo que recomienda migrar a la última versión de AsyncAPI (regla `asyncapi-latest-version`). |
| `asyncapiContracts.suppressedRules` | `[]` | Lista de códigos de regla a ocultar de los diagnostics. |

### Cómo silenciar una regla concreta

1. Mira el panel **Problems**: cada diagnostic muestra su código entre paréntesis (p. ej. `asyncapi-latest-version`).
2. Añádelo a `settings.json`:

```json
{
  "asyncapiContracts.suppressedRules": ["asyncapi-latest-version"]
}
```

Los documentos abiertos se **revalidan al instante** al cambiar la configuración.

---

## 7. Resolución de problemas

**Al escribir "AsyncAPI" en la paleta no aparece ningún comando.**
La extensión no se activó o la ventana no se recargó. Ejecuta "Developer: Reload Window". Si persiste, cierra y reabre el editor. Verifica que está instalada: `code --list-extensions | grep asyncapi`.

**Popup "command '...' not found" al ejecutar un comando.**
La extensión falló al activarse (versión cacheada o error de arranque). Recarga la ventana; si no basta, cierra y reabre el editor por completo.

**El render muestra "Could not render." con un error.**
Lee el texto del recuadro: ahora es específico. Para ver el detalle técnico abre `Cmd+Shift+P` → "Developer: Open Webview Developer Tools" → pestaña **Console**. Si ves un `EvalError`/`unsafe-eval`, suele indicar que el editor está sirviendo una versión antigua cacheada: cierra y reabre el editor del todo.

**Los comandos no aparecen en un `.yaml` que sí es AsyncAPI.**
Confirma que el archivo empieza con `asyncapi: <versión>` en las primeras líneas (sin indentación). La detección se basa en eso.

**Cambié la extensión y los cambios no se reflejan.**
Reinstala el `.vsix` con `--force`, recarga la ventana y, si hace falta, reinicia el editor. Los webviews pueden quedar cacheados hasta un reinicio completo.

---

## 8. Estructura del proyecto

```
asyncapi-contracts/
├─ src/
│  ├─ extension.ts        Punto de entrada: activación, comandos, ciclo de vida
│  ├─ validator.ts        Validación con @asyncapi/parser (carga diferida)
│  ├─ officialRender.ts   Webview del render oficial (@asyncapi/react-component)
│  ├─ preview.ts          Preview ligero propio
│  ├─ completion.ts       Autocompletado (keywords y $ref)
│  ├─ editing.ts          Add Channel / Add Message / Go to Definition
│  └─ asyncapiDocument.ts Utilidades de parseo YAML y resolución de $ref
├─ scripts/
│  └─ copy-assets.mjs     Copia el bundle del render a media/ antes de empaquetar
├─ media/                 (generado) assets del render oficial
├─ dist/                  (generado) bundle de la extensión
├─ package.json           Manifiesto, comandos, configuración, scripts
├─ README.md              Resumen
└─ MANUAL.md              Este documento
```

### Scripts npm

| Script | Qué hace |
| --- | --- |
| `npm run compile` | Copia assets y compila el bundle (desarrollo). |
| `npm run package` | Igual que compile pero minificado. |
| `npm run typecheck` | Comprueba tipos sin emitir. |
| `npm run vsix` | Empaqueta el `.vsix` instalable. |
| `npm run copy-assets` | Copia manualmente los assets del render a `media/`. |

---

## 9. Créditos y licencia

- Extensión: licencia MIT.
- Componentes de la [AsyncAPI Initiative](https://www.asyncapi.com/): `@asyncapi/parser` y `@asyncapi/react-component`, licencia Apache-2.0.
