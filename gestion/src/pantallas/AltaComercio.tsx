import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { documentoComercioValido } from '../../../compartido/cif.ts'
import { CATEGORIAS_COMERCIO } from '../../../compartido/tipos.ts'
import { api } from '../api.ts'
import { Bien, Fallo, useAccion, useMunicipios } from '../componentes/piezas.tsx'
import { ConsejoClave } from './Acceso.tsx'

/** Alta de un comercio en la guía: la ficha básica es gratis; lo revisa dirección. */
export function AltaComercio() {
  const municipios = useMunicipios()
  const [f, setF] = useState({
    nombre: '', categoria: '', nif: '', direccion: '', municipioId: 0, telefono: '', personaContacto: '', email: '', clave: '', repetida: '',
    aceptaCondiciones: false,
  })
  const [hecho, setHecho] = useState(false)
  const { ocupado, error, setError, hacer } = useAccion()
  const poner = (c: Partial<typeof f>) => setF({ ...f, ...c })
  const nifMal = f.nif.replace(/[\s.-]/g, '').length >= 9 && !documentoComercioValido(f.nif)

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    if (f.clave !== f.repetida) return setError('Las dos contraseñas no coinciden.')
    const { repetida: _, ...datos } = f
    void hacer(async () => {
      await api('POST', '/cuenta/alta-comercio', datos)
      setHecho(true)
    })
  }

  return (
    <div className="g-acceso">
      <div className="g-acceso-caja ancha">
        <p className="g-antetitulo">Valverde Cuenta · Comercios</p>
        <h1>Tu comercio en la guía</h1>
        {hecho ? (
          <>
            <Bien>Te hemos enviado un correo a {f.email}. Confirma el enlace y revisaremos los datos para publicar tu ficha.</Bien>
            <Link to="/" className="g-boton g-boton-suave">Volver</Link>
          </>
        ) : (
          <>
            <p className="g-suave">
              La <b>ficha básica es gratis</b>: nombre, dirección y mapa, teléfono y horario. Si quieres más visibilidad (fotos, ofertas,
              salir destacado), tenemos planes sencillos y sin permanencia.
            </p>
            <form className="g-form" onSubmit={enviar}>
              <fieldset>
                <legend>El comercio</legend>
                <label className="g-campo"><span>Nombre</span><input value={f.nombre} required minLength={2} maxLength={90} onChange={(e) => poner({ nombre: e.target.value })} /></label>
                <div className="g-dos">
                  <label className="g-campo"><span>Categoría</span>
                    <select value={f.categoria} required onChange={(e) => poner({ categoria: e.target.value })}>
                      <option value="">Elige…</option>
                      {CATEGORIAS_COMERCIO.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.nombre}</option>)}
                    </select>
                  </label>
                  <label className="g-campo"><span>CIF, DNI o NIE</span>
                    <input value={f.nif} required maxLength={12} onChange={(e) => poner({ nif: e.target.value })} />
                    {nifMal && <small className="g-aviso-campo">Revisa el número: no parece válido.</small>}
                  </label>
                </div>
                <div className="g-dos">
                  <label className="g-campo"><span>Dirección</span><input value={f.direccion} required minLength={3} maxLength={120} onChange={(e) => poner({ direccion: e.target.value })} /></label>
                  <label className="g-campo"><span>Municipio</span>
                    <select value={f.municipioId} required onChange={(e) => poner({ municipioId: Number(e.target.value) })}>
                      <option value={0} disabled>Elige…</option>
                      {municipios.datos?.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                    </select>
                  </label>
                </div>
              </fieldset>
              <fieldset>
                <legend>Quién lo lleva</legend>
                <div className="g-dos">
                  <label className="g-campo"><span>Nombre y apellidos</span><input autoComplete="name" value={f.personaContacto} required minLength={3} onChange={(e) => poner({ personaContacto: e.target.value })} /></label>
                  <label className="g-campo"><span>Teléfono</span><input type="tel" autoComplete="tel" value={f.telefono} required onChange={(e) => poner({ telefono: e.target.value })} /></label>
                </div>
                <label className="g-campo"><span>Correo</span><input type="email" autoComplete="email" value={f.email} required onChange={(e) => poner({ email: e.target.value })} /></label>
                <ConsejoClave />
                <div className="g-dos">
                  <label className="g-campo"><span>Contraseña</span><input type="password" autoComplete="new-password" minLength={12} value={f.clave} required onChange={(e) => poner({ clave: e.target.value })} /></label>
                  <label className="g-campo"><span>Repítela</span><input type="password" autoComplete="new-password" minLength={12} value={f.repetida} required onChange={(e) => poner({ repetida: e.target.value })} /></label>
                </div>
              </fieldset>
              <label className="g-casilla">
                <input type="checkbox" checked={f.aceptaCondiciones} required onChange={(e) => poner({ aceptaCondiciones: e.target.checked })} />
                <span>
                  Declaro que llevo este comercio y acepto las normas de la guía: datos reales, ofertas con fecha de fin y nada de publicidad engañosa.
                  Los datos de contacto se usan solo para gestionar la cuenta.
                </span>
              </label>
              <Fallo>{error}</Fallo>
              <button className="g-boton g-boton-primario" disabled={ocupado}>Pedir el alta</button>
            </form>
          </>
        )}
        <p className="g-pie"><Link to="/">Ya tengo cuenta</Link></p>
      </div>
    </div>
  )
}
