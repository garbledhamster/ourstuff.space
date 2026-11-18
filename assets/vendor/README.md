# Dashboard dependencies

The dashboard serves these pinned browser assets from the same origin so local setup can start offline.

| Asset | Source |
| --- | --- |
| `floating-ui/dom.js` | `@floating-ui/dom@1.7.5`, ESM distribution |
| `floating-ui/core.js` | `@floating-ui/core@1.7.4`, ESM distribution |
| `floating-ui/utils.js`, `floating-ui/utils-dom.js` | `@floating-ui/utils@0.2.10`, ESM distribution |
| `fullcalendar-6.1.20.min.js` | `fullcalendar@6.1.20`, minified browser bundle |
| `iconify-icon-3.0.0.min.js` | `iconify-icon@3.0.0`, minified browser bundle |
| `tabler-dashboard.js` | Default dashboard icons from `@iconify-json/tabler@1.2.46` (Tabler Icons 3.52.0) |

Floating UI uses relative imports. The Tabler collection contains the icons referenced by dashboard code and seed data, plus the parent of any selected alias. [License texts](licenses/)
