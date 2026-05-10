const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient'); // Importamos el cliente que configuramos
const { checkRole } = require('../middlewares/auth'); // Importamos el protector de roles

// 1. LISTAR TODOS LOS ATLETAS
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('atletas')
            .select('*')
            .order('nombre', { ascending: true });

        if (error) throw error;

        res.render("atletas", {
            arrayAtletas: data
        });
    } catch (error) {
        console.log("Error al listar:", error.message);
        res.render("atletas", { arrayAtletas: [] });
    }
});

// 2. VISTA CREAR
router.get('/crear', (req, res) => {
    res.render('crear');
});

// 3. PROCESAR CREACIÓN
// Al crear un nuevo atleta (Afiliación Asistida)
router.post('/crear', checkRole(['admin', 'estadistico']), async (req, res) => {
    // 1. Extraemos los datos del formulario
    // Asegúrate de que los 'name' del HTML coincidan con estas variables
    const { email, password, nombre, cedula, idfdff, pasaporte, nacionalidad, fecha_nacimiento, sexo, ocupacion, calle, sector, municipio, provincia, pais, postal, celular, telfijo, instagram, gimnasio, celular_preparador, preparador, email_preparador, categoria, peso, estatura } = req.body;

    try {
        // 2. Crear el usuario en Auth (Solo si es nuevo)
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true
        });

        if (authError) throw new Error("Error en Auth: " + authError.message);

        const newUserId = authData.user.id;

        // 3. Insertar en PROFILES
        const { error: errorProfile } = await supabase
            .from('profiles')
            .insert([{ id: newUserId, nombre: nombre, role: 'atleta', cedula: cedula, email: email }]);

        if (errorProfile) throw new Error("Error en Profile: " + errorProfile.message);

        // 4. Insertar en ATLETAS (Aquí es donde estaba fallando)
        // Mapeamos los datos para que coincidan EXACTAMENTE con tus columnas de Supabase
        const { error: errorAtleta } = await supabase
            .from('atletas')
            .insert([{
                id: newUserId,
                nombre: nombre,
                cedula: cedula,
                idfdff: idfdff,
                estatus_afiliacion: 'habilitado',
                fecha_ultima_renovacion: new Date().getFullYear() + "-12-31",
                 pasaporte: pasaporte,
                 nacionalidad: nacionalidad,
                 fecha_nacimiento: fecha_nacimiento,
                 sexo: sexo,
                 ocupacion: ocupacion,
                 calle: calle,
                 sector : sector ,
                 municipio: municipio,
                 provincia: provincia,
                 pais : pais, 
                 postal : postal, 
                 celular: celular,
                 telfijo: telfijo,
                 instagram : instagram, 
                 gimnasio: gimnasio,
                 preparador: preparador,
                 celular_preparador: celular_preparador,
                 email_preparador: email_preparador,
                 categoria: categoria,
                 estatura: estatura,
                 peso: peso

               
            }]);

        if (errorAtleta) throw new Error("Error en Atletas: " + errorAtleta.message);

        // Si todo salió bien, redirigimos
        res.redirect('/inscripcion/pesaje');

    } catch (error) {
        console.error("🔥 Error detectado:", error.message);
        // Enviamos el error específico para saber qué columna falló
        res.status(500).send(`<h3>Error al procesar:</h3><p>${error.message}</p><a href='/atletas/crear'>Volver a intentar</a>`);
    }
});



// 4. VER DETALLE DE UN ATLETA
router.get('/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const { data, error } = await supabase
            .from('atletas')
            .select('*')
            .eq('id', req.params.id) // En Postgres/Supabase usamos el ID de la tabla
            .single();

        if (error || !data) throw error;

        res.render('detalle', {
            atleta: data,
            error: false
        });
    } catch (error) {
        res.render('detalle', {
            error: true,
            mensaje: "No encontrado"
        });
    }
});

// 5. ELIMINAR ATLETA
router.delete('/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const { error } = await supabase
            .from('atletas')
            .delete()
            .eq('id', id);

        if (!error) {
            res.json({ estado: true, mensaje: "Eliminado!" });
        } else {
            res.json({ estado: false, mensaje: "Fallo eliminar" });
        }
    } catch (error) {
        res.json({ estado: false, mensaje: error.message });
    }
});

// 6. EDITAR ATLETA
router.put('/:id', checkRole(['admin', 'estadistico']), async (req, res) => {
    const { id } = req.params;
    const datosRecibidos = req.body;

    // SEGURIDAD TOTAL: Borramos cualquier intento de cambiar el rol o el ID
    delete datosRecibidos.role;
    delete datosRecibidos.id;
    delete datosRecibidos.email;

    try {
        const { error } = await supabase
            .from('atletas')
            .update(datosRecibidos)
            .eq('id', id);

        if (error) throw error;

        res.json({ estado: true, mensaje: 'Atleta actualizado con éxito' });
    } catch (error) {
        console.error("Error en PUT:", error.message);
        res.status(500).json({ estado: false, mensaje: error.message });
    }
});
module.exports = router;
