# Atlas API contracts

## Browser → `/api/analyze`

### Screening and question generation

```json
{
  "stage": "screen",
  "idea": "...",
  "language": "es"
}
```

### Final report

```json
{
  "stage": "report",
  "idea": "...",
  "answers": [],
  "language": "es"
}
```

## Proxy → analysis engine

`api/analyze.js` translates the browser-facing `stage` field into the engine-facing `mode` field. The browser must not depend directly on the remote engine contract.
