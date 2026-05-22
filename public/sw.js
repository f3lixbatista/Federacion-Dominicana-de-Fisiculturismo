// public/sw.js
self.addEventListener('push', function(event) {
    const data = event.data.json();
    
    const options = {
        body: data.body,
        icon: '/img/fdff3.jpg',
        image: data.image,      // Afiche promocional enviado desde el servidor
        badge: '/img/fdff3.jpg',
        vibrate: [200, 100, 200, 100, 400], // Patrón rítmico tipo alerta
        data: {
            url: data.url || '/'
        },
        tag: 'noticia-fdff', // Agrupa notificaciones similares
        renotify: true,      // Vibra incluso si la etiqueta es la misma
        silent: false,       // Permite sonido del sistema
        actions: [
            { action: 'ver', title: 'Ver Detalles', icon: '/img/icons/check.png' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});