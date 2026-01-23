// Script para actualizar contraseña con hash compatible con AdonisJS
import pg from 'pg';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://escuela_user:zMUPjAcgXrgspof9bpxwVJMwHoX9SdBC@dpg-d5peb2n5c7fs73bkjkrg-a.oregon-postgres.render.com/escuelaparapadres',
  ssl: { rejectUnauthorized: false }
});

// Generar hash en formato AdonisJS scrypt
async function generateScryptHash(password) {
  const cost = 16384;
  const blockSize = 8;
  const parallelization = 1;
  const keyLength = 64;
  
  const salt = randomBytes(16);
  const derived = await scryptAsync(password, salt, keyLength, {
    N: cost,
    r: blockSize,
    p: parallelization,
  });
  
  // Formato AdonisJS: $scrypt$n=N,r=R,p=P$salt_base64$hash_base64
  const saltB64 = salt.toString('base64').replace(/=+$/, '');
  const hashB64 = derived.toString('base64').replace(/=+$/, '');
  
  return `$scrypt$n=${cost},r=${blockSize},p=${parallelization}$${saltB64}$${hashB64}`;
}

async function updatePassword() {
  try {
    await client.connect();
    console.log('✅ Conectado a Render PostgreSQL\n');
    
    const password = 'Acudiente123!';
    const hash = await generateScryptHash(password);
    
    console.log('Password:', password);
    console.log('New Hash:', hash);
    
    // Actualizar en la base de datos
    const result = await client.query(`
      UPDATE usuarios SET contrasena_hash = $1 WHERE id = 1
    `, [hash]);
    
    console.log('\n✅ Contraseña actualizada para usuario ID: 1');
    
    // Verificar
    const check = await client.query('SELECT id, correo, contrasena_hash FROM usuarios WHERE id = 1');
    console.log('Verificación:', check.rows[0]);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

updatePassword();
