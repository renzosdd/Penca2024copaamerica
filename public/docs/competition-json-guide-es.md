# Guía para importar competiciones mediante JSON

Esta guía explica cómo preparar y cargar un archivo JSON con el fixture de una competencia en el panel de administración de la penca.

## Flujo general

1. Descargá uno de los ejemplos disponibles en el panel de administración (`Ejemplo genérico` o `Copa Mundial 2026`).
2. Actualizá los datos con tu competencia (equipos, horarios, sedes, etc.).
3. Desde el panel de administración hacé clic en **Importar competencia** y seleccioná tu archivo JSON.
4. Revisá el resumen (cantidad de partidos, grupos, horarios) y confirmá la importación.
5. Una vez cargada la competencia, podés editar manualmente cada partido (equipos, horario, sede y resultado) desde el mismo panel.

> ⚠️ A partir de ahora no es posible crear competencias ni partidos desde formularios manuales. Todo fixture debe importarse mediante JSON.

## Estructura del archivo JSON

El archivo debe contener un objeto con tres secciones:

```json
{
  "competition": { ... },
  "metadata": { ... },
  "matches": [ ... ]
}
```

### `competition`

Campos recomendados:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `name` | `string` | **Obligatorio.** Nombre interno de la competencia (ej. "Copa Demo 2024"). |
| `tournament` | `string` | Nombre comercial o largo del torneo. |
| `country` | `string` | País o países anfitriones. |
| `groupsCount` | `number` | Cantidad de grupos de la fase de grupos. |
| `integrantsPerGroup` | `number` | Equipos por grupo. |
| `qualifiersPerGroup` | `number` | Clasificados por grupo. |
| `apiSeason` | `number` | Temporada o año (opcional). |
| `modes` | `array` | Lista de modos presentes (`"fase_de_grupos"`, `"eliminatorias"`, etc.). |

> Los valores numéricos se detectan automáticamente. Si no los definís, el sistema intentará inferirlos a partir de los partidos.

### `metadata`

Sección libre para documentar el fixture. Los campos más utilizados son:

- `expectedMatches`: número total de partidos esperados (se usa para validar que no falte ninguno).
- `description`: notas adicionales.
- `timeFormat`: recordatorio sobre la convención horaria.

### `matches`

Cada elemento del arreglo representa un partido. Campos soportados:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | `string` | Identificador legible del partido (opcional). |
| `stage` | `string` | Nombre de la etapa ("Fase de grupos", "Cuartos de final", etc.). |
| `group` | `string` | Grupo al que pertenece. Usá el prefijo `Grupo` para las fases de grupos. |
| `team1` / `team2` | `string` | **Obligatorio.** Nombres de los equipos. |
| `kickoff` | `string` | Fecha y hora en formato ISO 8601 con zona horaria (ej. `2024-07-01T14:00:00-03:00`). |
| `originalKickoff` | `object` | Información tal como la entrega la organización: `{ "date", "time", "timezone" }`. |
| `venue` | `object` | Ubicación opcional `{ "country", "city", "stadium" }`. |
| `order` | `number` | Orden sugerido del partido (si falta, se calcula automáticamente). |
| `result1` / `result2` | `number` | Marcadores finales (se pueden dejar en blanco y completarlos luego). |

#### Horarios y zonas horarias

- El campo `kickoff` determina la hora oficial usando un huso horario explícito. Ejemplo: `2026-06-11T19:00:00-05:00`.
- `originalKickoff` es opcional y sirve para guardar la hora local comunicada por la organización (`timezone` debe ser un identificador IANA, ej. `America/Mexico_City`).
- La app mostrará automáticamente la hora convertida al huso horario local de cada usuario.

Si no incluís `kickoff`, el sistema intentará inferirlo asumiendo que la hora original está expresada en UTC (`Z`). Para evitar ambigüedades, siempre incluí el offset.

#### Sedes

El bloque `venue` es opcional pero recomendado. Permite mostrar el país, la ciudad y el estadio donde se disputa el encuentro.

```json
{
  "venue": {
    "country": "Estados Unidos",
    "city": "Nueva York",
    "stadium": "MetLife Stadium"
  }
}
```

## Edición posterior desde el panel

Una vez importado el fixture podés editar:

- Equipos (`team1`, `team2`).
- Horarios (`kickoff`, `originalDate`, `originalTime`, `originalTimezone`).
- Datos de sede (`venue`).
- Resultados (`result1`, `result2`).

Las ediciones actualizan los datos en la base y recalculan las llaves eliminatorias cuando corresponde.

## Recomendaciones

- Utilizá UTF-8 sin BOM y terminación `.json`.
- Validá el formato con herramientas como [jsonlint.com](https://jsonlint.com/).
- Mantené identificadores consistentes (por ejemplo, `Ganador Grupo A`) para facilitar la lectura.
- Descargá periódicamente un respaldo del fixture desde la base o guardá tus archivos fuente en control de versiones.

## Archivos disponibles

- `competition-fixture-example.json`: ejemplo pequeño con grupos y eliminatorias.
- `worldcup2026-fixture.json`: fixture completo de la Copa Mundial de la FIFA 2026.
- `guia-json-competencias.md`: este documento.

¡Listo! Con estos pasos cualquier administrador puede preparar un fixture rico en información, importarlo en segundos y mantenerlo actualizado.
