/**
 * ERP Backend — Express Server (Node.js 22)
 * Endpoints: POST /api/login, POST /api/register
 * Base de datos simulada en memoria
 */

import express from 'express';
import { randomUUID } from 'node:crypto';

const app = express();
const PORT = 3000;

// ─── Middlewares ────────────────────────────────────────────────────────────
app.use(express.json());

// CORS simple para desarrollo local
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:4200');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});

// ─── Base de datos en memoria ────────────────────────────────────────────────
/**
 * @typedef {{ id: string; name: string; email: string; password: string; role: 'admin' | 'user' }} UserRecord
 * @type {UserRecord[]}
 */
const usersDB = [
    {
        id: '1',
        name: 'Admin ERP',
        email: 'admin@erp.com',
        password: 'admin123',
        role: 'admin',
    },
    {
        id: '2',
        name: 'César Ramírez',
        email: 'cesar@erp.com',
        password: 'cesar123',
        role: 'user',
    },
];

// ─── Helper para respuestas ──────────────────────────────────────────────────
/**
 * @param {boolean} success
 * @param {string} message
 * @param {unknown} [data]
 */
function buildResponse(success, message, data) {
    return { success, message, ...(data !== undefined && { data }) };
}

// ─── Endpoint: POST /api/login ───────────────────────────────────────────────
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res
            .status(400)
            .json(buildResponse(false, 'Email y contraseña son obligatorios.'));
    }

    const found = usersDB.find(
        (u) => u.email === email && u.password === password
    );

    if (!found) {
        return res
            .status(401)
            .json(buildResponse(false, 'Credenciales incorrectas.'));
    }

    // Nunca devolver el password
    const { password: _omit, ...safeUser } = found;

    return res
        .status(200)
        .json(buildResponse(true, 'Login exitoso.', safeUser));
});

// ─── Endpoint: POST /api/register ───────────────────────────────────────────
app.post('/api/register', (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res
            .status(400)
            .json(buildResponse(false, 'Nombre, email y contraseña son obligatorios.'));
    }

    if (password.length < 8) {
        return res
            .status(400)
            .json(buildResponse(false, 'La contraseña debe tener al menos 8 caracteres.'));
    }

    const emailExists = usersDB.some((u) => u.email === email);
    if (emailExists) {
        return res
            .status(409)
            .json(buildResponse(false, 'Ya existe una cuenta con ese email.'));
    }

    /** @type {UserRecord} */
    const newUser = {
        id: randomUUID(),
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password,
        role: 'user',
    };

    usersDB.push(newUser);

    const { password: _omit, ...safeUser } = newUser;

    return res
        .status(201)
        .json(buildResponse(true, 'Cuenta creada exitosamente.', safeUser));
});

// ─── Health check ────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), users: usersDB.length });
});

// ─── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n🚀 ERP API Server corriendo en http://localhost:${PORT}`);
    console.log(`   POST /api/login    - Autenticar usuario`);
    console.log(`   POST /api/register - Registrar usuario`);
    console.log(`   GET  /api/health   - Estado del servidor\n`);
    console.log('📦 Usuarios de prueba cargados:');
    usersDB.forEach((u) => console.log(`   · ${u.email} / ${u.password} [${u.role}]`));
});
