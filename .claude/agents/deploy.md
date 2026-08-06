---
name: deploy
description: Despliega la app FDFF al VPS de producción via git push + PM2 restart. Usar cuando el usuario quiera deployar cambios al servidor.
---

Sigue estos pasos en orden:

1. Correr `git status` para ver archivos modificados sin commitear
2. Si hay cambios sin commitear, preguntar al usuario si quiere commitearlos antes del deploy o si ya están commiteados
3. Correr `git push origin master`
4. Conectar al VPS y ejecutar el deploy. El login SSH sigue siendo root, pero desde 2026-08-06 el proceso de la app corre bajo el usuario del sistema `fdffrd` (no root) y el gestor de paquetes es `pnpm` (no npm) — ver `[[migracion_pnpm_usuario_no_root]]` en memoria para el porqué:
   ```
   ssh -i ~/.ssh/claude_vps_deploy root@srv1670048.hstgr.cloud "su - fdffrd -c 'cd /var/www/fdffrd && git pull && pnpm install --prod && pm2 restart fdffrd && pm2 status'"
   ```
5. Verificar que `fdffrd` aparezca con status `online` en pm2 status, con `user: fdffrd` (NUNCA root)
6. Si hay error, correr `ssh -i ~/.ssh/claude_vps_deploy root@srv1670048.hstgr.cloud "su - fdffrd -c 'pm2 logs fdffrd --lines 30 --nostream'"` para diagnóstico
7. Reportar: URL del commit deployado y estado final de PM2

La app corre en https://fdffrd.com (proxy nginx a `127.0.0.1:3002` — ojo, existe un `fdffrd.conf` viejo/no usado en `/etc/nginx/sites-enabled` que sirve archivos estáticos por error de config; el que manda es `fdffrd.com`, no lo toques sin verificar cuál gana).
