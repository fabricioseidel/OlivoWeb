# Mercado Pago MCP Server

El repo incluye `.mcp.json` en la raíz con el servidor MCP oficial de Mercado Pago
(`https://mcp.mercadopago.com/mcp`, transporte HTTP remoto). Cualquier cliente que lea
configuración MCP de proyecto (Claude Code, Cursor, etc.) lo detecta automáticamente.

## Autenticación

El servidor se autentica con el mismo access token que ya usa la app:

```bash
export MERCADOPAGO_ACCESS_TOKEN="APP_USR-..."
```

`.mcp.json` expande esa variable en la cabecera `Authorization: Bearer ...`, así que el
token nunca queda escrito en el repo. La variable ya está declarada en `.env.example`.

- Token de **prueba** (`TEST-...`): trabaja contra la cuenta sandbox.
- Token de **producción** (`APP_USR-...`): opera sobre pagos reales. Usar con cuidado.

## Activación

1. Definir `MERCADOPAGO_ACCESS_TOKEN` en el entorno donde corre el cliente MCP
   (no basta con tenerlo en `.env.local`: debe estar exportado en la shell).
2. Reiniciar el cliente. En Claude Code, aprobar el servidor cuando pregunte por
   la configuración MCP del proyecto.
3. Verificar con `/mcp` que `mercadopago` aparezca como `connected`.

## Qué permite

Consultar la documentación y las APIs de Mercado Pago (pagos, preferencias,
suscripciones, reportes) desde el asistente, sin salir del repo. Es complementario a la
integración de la app: el checkout y el webhook siguen usando el SDK en
`src/server/payments.service.ts` y `src/app/api/payments/webhook/route.ts`.

## Notas

- Si el servidor responde 401, el token está vencido o corresponde a otra aplicación.
- El diagnóstico interno de la integración vive en
  `/api/admin/mercadopago/diagnostico` y es independiente del MCP.
