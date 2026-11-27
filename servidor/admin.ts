/**
 * Tareas de administración desde la consola del servidor. Lo que es delicado (crear cuentas de
 * dirección, quitar un doble factor perdido) se hace aquí y no desde el panel web, a propósito:
 * hace falta acceso a la máquina.
 *
 *   npm run admin -- crear-direccion correo@ejemplo.es "Nombre Apellido"
 *   npm run admin -- enlace-clave correo@ejemplo.es
 *   npm run admin -- quitar-2fa correo@ejemplo.es
 *   npm run admin -- desactivar correo@ejemplo.es
 *   npm run admin -- activar correo@ejemplo.es
 *   npm run admin -- copia
 */
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { bd, ejecutar, iniciarBd, uno } from './bd.ts'
import { config } from './config.ts'
import { anotar } from './registro.ts'
import { enlacePonerClave } from './rutas/cuenta.ts'

mkdirSync(config.datos, { recursive: true })
iniciarBd(join(config.datos, 'valverde.db'))

const [orden, ...args] = process.argv.slice(2)

function usuario(email: string | undefined) {
  if (!email) salir('Falta el correo.')
  const u = uno<{ id: number; rol: string; nombre: string }>('SELECT id, rol, nombre FROM usuarios WHERE email = ?', email!.trim().toLowerCase())
  if (!u) salir(`No hay ninguna cuenta con el correo ${email}.`)
  return u!
}

function salir(mensaje: string): never {
  console.error(mensaje)
  process.exit(1)
}

switch (orden) {
  case 'crear-direccion': {
    const [email, nombre] = args
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !nombre) {
      salir('Uso: npm run admin -- crear-direccion correo@ejemplo.es "Nombre Apellido"')
    }
    if (uno('SELECT 1 FROM usuarios WHERE email = ?', email.toLowerCase())) salir('Ya existe una cuenta con ese correo.')
    const r = ejecutar("INSERT INTO usuarios (email, nombre, rol) VALUES (?, ?, 'direccion')", email.toLowerCase(), nombre)
    const id = Number(r.lastInsertRowid)
    anotar(null, null, 'direccion_creada', `usuario:${id}`, email)
    console.log(`\nCuenta de dirección creada para ${nombre}.`)
    console.log('Que abra este enlace (vale 24 horas) para poner su contraseña y activar el doble factor:\n')
    console.log(enlacePonerClave(id), '\n')
    break
  }
  case 'enlace-clave': {
    const u = usuario(args[0])
    anotar(null, null, 'enlace_clave_consola', `usuario:${u.id}`)
    console.log(`\nEnlace para que ${u.nombre} ponga una contraseña nueva (vale 24 horas):\n\n${enlacePonerClave(u.id)}\n`)
    break
  }
  case 'quitar-2fa': {
    const u = usuario(args[0])
    ejecutar('UPDATE usuarios SET totp_activo = 0, totp_secreto = NULL, totp_ultimo_paso = 0 WHERE id = ?', u.id)
    ejecutar('DELETE FROM sesiones WHERE usuario_id = ?', u.id)
    anotar(null, null, '2fa_quitado_consola', `usuario:${u.id}`)
    console.log(`Doble factor quitado a ${u.nombre}. ${u.rol === 'direccion' ? 'Tendrá que activarlo de nuevo al entrar.' : ''}`)
    break
  }
  case 'desactivar':
  case 'activar': {
    const u = usuario(args[0])
    ejecutar('UPDATE usuarios SET activo = ? WHERE id = ?', orden === 'activar' ? 1 : 0, u.id)
    if (orden === 'desactivar') ejecutar('DELETE FROM sesiones WHERE usuario_id = ?', u.id)
    anotar(null, null, `cuenta_${orden === 'activar' ? 'activada' : 'desactivada'}_consola`, `usuario:${u.id}`)
    console.log(`Cuenta de ${u.nombre} ${orden === 'activar' ? 'activada' : 'desactivada'}.`)
    break
  }
  case 'copia': {
    const carpeta = join(config.datos, 'copias')
    mkdirSync(carpeta, { recursive: true })
    const destino = join(carpeta, `valverde-${new Date().toISOString().replace(/[:.]/g, '-')}.db`)
    bd().prepare('VACUUM INTO ?').run(destino)
    console.log(`Copia guardada en ${destino}`)
    break
  }
  default:
    console.log('Órdenes: crear-direccion, enlace-clave, quitar-2fa, desactivar, activar, copia. Mira servidor/admin.ts.')
}
