---
name: check
description: Verificación rápida de salud del proyecto FDFF — lint, servidor local y estado del VPS. Usar antes de un deploy o cuando algo no funciona.
---

Ejecutar en paralelo estas verificaciones:

1. **Estado del repo:**
   ```
   git status
   git log --oneline -5
   ```

2. **Dependencias:**
   ```
   npm install --dry-run 2>&1 | head -5
   ```

3. **Sintaxis JS (lint rápido):**
   ```
   node --check app.js
   ```
   Si falla, indica el archivo y línea del error.

4. **Estado del VPS:**
   ```
   ssh -i ~/.ssh/claude_vps_deploy root@srv1670048.hstgr.cloud "pm2 status && df -h / | tail -1 && free -m | grep Mem"
   ```
   Reportar: estado PM2, % disco usado, RAM disponible.

Resumir el estado general: ✓ Todo OK / ⚠ Advertencias / ✗ Errores encontrados.
