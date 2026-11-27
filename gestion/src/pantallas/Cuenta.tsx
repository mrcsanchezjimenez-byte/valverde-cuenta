import { useState, type FormEvent } from 'react'
import { api } from '../api.ts'
import { Bien, Fallo, useAccion } from '../componentes/piezas.tsx'
import { useSesion } from '../sesion.tsx'
import { ActivarDobleFactor, ConsejoClave } from './Acceso.tsx'

function CambiarClave() {
  const [f, setF] = useState({ actual: '', nueva: '', repetida: '' })
  const [hecho, setHecho] = useState(false)
  const { ocupado, error, setError, hacer } = useAccion()
  const enviar = (e: FormEvent) => {
    e.preventDefault()
    if (f.nueva !== f.repetida) return setError('Las dos contraseñas nuevas no coinciden.')
    void hacer(async () => {
      await api('POST', '/cuenta/clave', { actual: f.actual, nueva: f.nueva })
      setF({ actual: '', nueva: '', repetida: '' })
      setHecho(true)
    })
  }
  return (
    <form className="g-caja g-form" onSubmit={enviar}>
      <h2>Cambiar la contraseña</h2>
      <ConsejoClave />
      <label className="g-campo"><span>Contraseña actual</span>
        <input type="password" autoComplete="current-password" value={f.actual} onChange={(e) => setF({ ...f, actual: e.target.value })} required />
      </label>
      <div className="g-dos">
        <label className="g-campo"><span>Nueva</span>
          <input type="password" autoComplete="new-password" minLength={12} value={f.nueva} onChange={(e) => setF({ ...f, nueva: e.target.value })} required />
        </label>
        <label className="g-campo"><span>Repítela</span>
          <input type="password" autoComplete="new-password" minLength={12} value={f.repetida} onChange={(e) => setF({ ...f, repetida: e.target.value })} required />
        </label>
      </div>
      <Fallo>{error}</Fallo>
      <Bien>{hecho ? 'Contraseña cambiada. Se han cerrado las demás sesiones abiertas.' : ''}</Bien>
      <button className="g-boton g-boton-suave" disabled={ocupado}>Cambiar</button>
    </form>
  )
}

function QuitarDobleFactor({ alTerminar }: { alTerminar: () => void }) {
  const [f, setF] = useState({ clave: '', codigo: '' })
  const { ocupado, error, hacer } = useAccion()
  return (
    <form className="g-form" onSubmit={(e) => {
      e.preventDefault()
      void hacer(async () => {
        await api('POST', '/cuenta/2fa/quitar', f)
        alTerminar()
      })
    }}>
      <div className="g-dos">
        <label className="g-campo"><span>Contraseña</span><input type="password" value={f.clave} onChange={(e) => setF({ ...f, clave: e.target.value })} required /></label>
        <label className="g-campo"><span>Código actual</span><input inputMode="numeric" maxLength={6} value={f.codigo} onChange={(e) => setF({ ...f, codigo: e.target.value.replace(/\D/g, '') })} required /></label>
      </div>
      <Fallo>{error}</Fallo>
      <button className="g-boton g-boton-peligro" disabled={ocupado}>Quitar la verificación en dos pasos</button>
    </form>
  )
}

export function MiCuenta() {
  const { usuario, recargar, salir } = useSesion()
  const [activando, setActivando] = useState(false)
  if (!usuario) return null
  return (
    <section className="g-pagina">
      <header className="g-cabecera">
        <div><p className="g-antetitulo">{usuario.entidadNombre ?? 'Dirección'}</p><h1>Mi cuenta</h1></div>
        <button className="g-boton g-boton-suave" onClick={() => void salir()}>Salir</button>
      </header>
      <dl className="g-ficha">
        <dt>Nombre</dt><dd>{usuario.nombre}</dd>
        <dt>Correo</dt><dd>{usuario.email}</dd>
      </dl>
      <CambiarClave />
      <div className="g-caja">
        <h2>Verificación en dos pasos</h2>
        {usuario.totpActivo ? (
          <>
            <Bien>Activada: al entrar se pide un código del móvil.</Bien>
            {usuario.rol === 'entidad' && (
              <details><summary>Quitarla</summary><QuitarDobleFactor alTerminar={() => void recargar()} /></details>
            )}
            {usuario.rol === 'direccion' && (
              <p className="g-suave">Si pierdes el móvil, la verificación se puede reiniciar desde la consola del servidor (mira docs/gestion.md).</p>
            )}
          </>
        ) : activando ? (
          <ActivarDobleFactor obligatorio={false} alTerminar={() => {
            setActivando(false)
            void recargar()
          }} />
        ) : (
          <>
            <p className="g-suave">Recomendada: además de la contraseña, al entrar se pedirá un código del móvil.</p>
            <button className="g-boton g-boton-suave" onClick={() => setActivando(true)}>Activarla</button>
          </>
        )}
      </div>
    </section>
  )
}
