---
name: deploy
description: Despliega la app FDFF al VPS de producción via git push + PM2 restart. Usar cuando el usuario quiera deployar cambios al servidor.
---

Sigue estos pasos en orden:

1. Correr `git status` para ver archivos modificados sin commitear
2. Si hay cambios sin commitear, preguntar al usuario si quiere commitearlos antes del deploy o si ya están commiteados
3. Correr `git push origin master`
4. Conectar al VPS y ejecutar el deploy:
   ```
   ssh -i ~/.ssh/claude_vps_deploy root@srv1670048.hstgr.cloud "cd /var/www/fdffrd && git pull && npm install --production --silent && pm2 restart fdffrd && pm2 status"
   ```
5. Verificar que `fdffrd` aparezca con status `online` en pm2 status
6. Si hay error, correr `pm2 logs fdffrd --lines 30` para diagnóstico
7. Reportar: URL del commit deployado y estado final de PM2

La app corre en https://fdffrd.com
