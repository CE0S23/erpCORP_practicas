/**
 * ERP Backend — Express Server (Node.js 22)
 * Práctica 3 — Credenciales hardcodeadas + validación completa de registro
 * Endpoints: POST /api/login, POST /api/register, GET /api/health
 */

import express from 'express';
import { randomUUID } from 'node:crypto';

const app = express();
const PORT = 3000;

// ─── Middlewares ────────────────────────────────────────────────────────────
app.use(express.json());

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:4200');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});

// ─── Credenciales HARDCODEADAS (Práctica 3) ─────────────────────────────────
/**
 * Contraseñas con al menos 10 caracteres + símbolo especial
 * Símbolos permitidos: ! @ # $ % ^ & * ( ) - _ = + [ ] { } ; ' : " , . < > ? /
 *
 * @typedef {{ id: string; username: string; name: string; email: string; password: string; role: 'admin'|'user' }} UserRecord
 * @type {UserRecord[]}
 */
const usersDB = [
    {
        id: '1',
        username: 'admin_erp',
        name: 'Admin ERP',
        email: 'admin@erp.com',
        password: 'Admin@Secure1',   // ≥10 chars, mayúscula, número, símbolo @
        role: 'admin',
    },
    {
        id: '2',
        username: 'cesar_ramirez',
        name: 'César Ramírez',
        email: 'cesar@erp.com',
        password: 'Cesar@Secure1',   // ≥10 chars, mayúscula, número, símbolo @
        role: 'user',
    },
];

// ─── Helper para respuestas ──────────────────────────────────────────────────
function buildResponse(success, message, data) {
    return { success, message, ...(data !== undefined && { data }) };
}

// ─── Validador de contraseña fuerte ─────────────────────────────────────────
/**
 * Reglas:
 *  - Mínimo 10 caracteres
 *  - Al menos una mayúscula
 *  - Al menos un número
 *  - Al menos un símbolo especial: !@#$%^&*()-_=+[]{};':",./<>?
 */
function validatePassword(password) {
    if (password.length < 10) return 'La contraseña debe tener al menos 10 caracteres.';
    if (!/[A-Z]/.test(password)) return 'La contraseña debe contener al menos una mayúscula.';
    if (!/[0-9]/.test(password)) return 'La contraseña debe contener al menos un número.';
    if (!/[!@#$%^&*()\-_=+\[\]{};':",./<>?]/.test(password))
        return 'La contraseña debe contener al menos un símbolo especial (!@#$%^&*).';
    return null;
}

/** Validar que la persona sea mayor de edad (>= 18 años) */
function validateAdult(birthdate) {
    if (!birthdate) return 'La fecha de nacimiento es obligatoria.';
    const birth = new Date(birthdate);
    const today = new Date();
    const age = today.getFullYear() - birth.getFullYear()
        - (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0);
    if (age < 18) return 'Debes ser mayor de 18 años para registrarte.';
    return null;
}

/** Validar teléfono: solo números, entre 7 y 15 dígitos */
function validatePhone(phone) {
    if (!phone) return 'El número de teléfono es obligatorio.';
    if (!/^\d+$/.test(phone)) return 'El teléfono solo debe contener números.';
    if (phone.length < 7 || phone.length > 15) return 'El teléfono debe tener entre 7 y 15 dígitos.';
    return null;
}

// ─── POST /api/login ─────────────────────────────────────────────────────────
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json(buildResponse(false, 'Email y contraseña son obligatorios.'));
    }

    const found = usersDB.find(
        (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );

    if (!found) {
        return res.status(401).json(buildResponse(false, 'Credenciales incorrectas.'));
    }

    const { password: _omit, ...safeUser } = found;
    return res.status(200).json(buildResponse(true, 'Login exitoso.', safeUser));
});

// ─── POST /api/register ──────────────────────────────────────────────────────
app.post('/api/register', (req, res) => {
    const { username, name, email, password, phone, birthdate, address } = req.body;

    // Campos obligatorios
    if (!username || !name || !email || !password || !phone || !birthdate || !address) {
        return res.status(400).json(buildResponse(false, 'Todos los campos son obligatorios.'));
    }

    // Validaciones
    const pwError = validatePassword(password);
    if (pwError) return res.status(400).json(buildResponse(false, pwError));

    const ageError = validateAdult(birthdate);
    if (ageError) return res.status(400).json(buildResponse(false, ageError));

    const phoneError = validatePhone(phone);
    if (phoneError) return res.status(400).json(buildResponse(false, phoneError));

    if (address.trim().length < 10) {
        return res.status(400).json(buildResponse(false, 'La dirección es muy corta.'));
    }

    // Email único
    const emailExists = usersDB.some((u) => u.email.toLowerCase() === email.toLowerCase());
    if (emailExists) {
        return res.status(409).json(buildResponse(false, 'Ya existe una cuenta con ese correo.'));
    }

    /** @type {UserRecord} */
    const newUser = {
        id: randomUUID(),
        username: username.trim(),
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password,
        phone: phone.trim(),
        birthdate,
        address: address.trim(),
        role: 'user',
    };

    usersDB.push(newUser);
    const { password: _omit, ...safeUser } = newUser;

    return res.status(201).json(buildResponse(true, 'Cuenta creada exitosamente.', safeUser));
});

// ─── GET /api/health ─────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), users: usersDB.length });
});

// ─── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n🚀 ERP API Server — Práctica 3`);
    console.log(`   http://localhost:${PORT}`);
    console.log(`\n📌 Endpoints:`);
    console.log(`   POST /api/login    — Autenticar usuario`);
    console.log(`   POST /api/register — Registrar usuario`);
    console.log(`   GET  /api/health   — Estado del servidor\n`);
    console.log('🔑 Credenciales hardcodeadas:');
    usersDB.forEach((u) =>
        console.log(`   · [${u.role.toUpperCase()}] ${u.email} / ${u.password}`)
    );
    console.log('');
});
