---
name: logs
description: Ver logs de producción del servidor FDFF (PM2). Útil para diagnosticar errores en vivo.
---

Conectar al VPS y obtener los logs recientes:

```
ssh -i ~/.ssh/claude_vps_deploy root@srv1670048.hstgr.cloud "pm2 logs fdffrd --lines 80 --nostream"
```

Analizar la salida buscando:
- `Error:` / `TypeError:` / `ReferenceError:` — errores de código
- `UnhandledPromiseRejection` — promesas sin catch
- `Cannot read properties of null` — datos nulos inesperados
- Cualquier stack trace

Si el usuario pide logs en tiempo real, indicarle que use directamente:
```
ssh -i ~/.ssh/claude_vps_deploy root@srv1670048.hstgr.cloud "pm2 logs fdffrd"
```
(Ctrl+C para salir)

Reportar los errores encontrados con el archivo y línea si aparece en el stack trace.
