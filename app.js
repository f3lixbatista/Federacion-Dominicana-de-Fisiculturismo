// const {frutas, dinero} = require('./Frutas')

// const cowsay = require("cowsay");

// console.log(cowsay.say({
//     text : "I'm a mooooodule",
//     e : "oO",
//     T : "U "
// }));


// frutas.forEach(item => {
//     console.count(item)
// })

// console.log(dinero)

// const http = require('http');
// const server = http.createServer((req, res) => {
//     res.end('Estoy respondiendo a tu solicitud v.3')
// })

// const puerto = 3000;
// server.listen(puerto, () => {
//     console.log('Escuchando solicitudes')
// })

// const { Console } = require('console');
// const express = require('express');
// const app = express();

// const port = 3000;

// app.set('view engine', 'ejs');
// app.set('views', __dirname + '/vistas');



// app.use(express.static(__dirname + "/publica"));

// app.get('/', (req, res) => {
//         res.render("index", {titulo : "Mi respuesta desde express"})
// })


    //  app.get('/servicios', (req, res) => {
    //     res.render("servicios", {tituloServicios: "Pagina de Mis Servicios"})
    // })

// app.use(express.static(__dirname + "/public"))

// app.get('/', (req, res) => {
//     res.send('Mi respuesta desde express')
// })



// app.get('/servicios1', (req, res) => {
//     res.render("servicios1", {tituloSevicios : "Mensaje dinamico"})
// })




// app.listen(puerto, () => {
//     console.log('Servidor a su servicio en el puerto', puerto)
// })

// app.use((req, res) => {
//     res.status(404).render("404", {
//         titulo: "404",
//         descripcion: "No existe este sitio"
//     })
// })


// const http = require("http");

// const server = http.createServer((req, res) => {
//   console.log("respuesta del servidor...");
//   res.end("klk gran Pariguayo, maca chicle");
// });

// const puerto = 3000;

// server.listen(puerto, () => {
//   console.log("Escuchando...");
// });

// app.listen(port, () => {
//   console.log("Servidor a su servicio en el puerto", port);
// });


const express = require('express');

const bodyParser = require('body-parser');
// const { Conexion } = require("./db");
const app = express();


app.use(bodyParser.urlencoded({ extended: false }))
// parse application/json
app.use(bodyParser.json())

require('dotenv').config()

const port = process.env.PORT || 3000;

//conexion a base de datos
const mongoose = require('mongoose');

const uri = `mongodb+srv://${process.env.USER}:${process.env.PASSWORD}@cluster0.o3dkeqw.mongodb.net/${process.env.NOMBD}?retryWrites=true&w=majority`

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })

.then(() => console.log('conectado a mongodb')) 
.catch(e => console.log(e))
    
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.use(express.static(__dirname + "/public"));


// rutas web
app.use('/', require('./router/rutasBat'));
// ruta categorias
app.use('/categorias', require('./router/Categoria'));
// ruta atletas
app.use('/atletas', require('./router/Atletas'));

app.use(express.urlencoded({extended: true}));

app.use((req, res, next) => {
    res.status(404).render("404", {
        titulo: "404",
        descripcion: "No existe este sitio Web"
    })
})

// app.listen(PORT, () => {
//     console.log(`Our app is running on port ${ PORT }`);
// });
app.listen(port, () => {
  console.log('Servidor a su servicio en el puerto', port)
})