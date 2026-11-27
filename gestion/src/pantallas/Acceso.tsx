import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { LETRAS_GRATIS, motivoCifNoGratis } from '../../../compartido/cif.ts'
import { AVISO_AGENDA, TIPOS_ENTIDAD } from '../../../compartido/tipos.ts'
import { api } from '../api.ts'
import { AccesoDemo, PistaCodigoDemo } from '../componentes/Demo.tsx'
import { Bien, Fallo, Qr, useAccion, useMunicipios } from '../componentes/piezas.tsx'
import { useSesion } from '../sesion.tsx'

const MIN_CLAVE = 12

function Marco({ titulo, children, ancho }: { titulo: string; children: ReactNode; ancho?: boolean }) {
  return (
    <div className="g-acceso">
      <div className={ancho ? 'g-acceso-caja ancha' : 'g-acceso-caja'}>
        <p className="g-antetitulo">Valverde Cuenta · Gestión</p>
        <h1>{titulo}</h1>
        {children}
      </div>
    </div>
  )
}

export function Entrar() {
  const { recargar } = useSesion()
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const { ocupado, error, hacer } = useAccion()

  const entrar = (correo: string, contrasena: string) =>
    void hacer(async () => {
      await api('POST', '/cuenta/entrar', { email: correo, clave: contrasena })
      setClave('')
      await recargar()
    })
  const enviar = (e: FormEvent) => {
    e.preventDefault()
    entrar(email, clave)
  }

  return (
    <Marco titulo="Entrar">
      <AccesoDemo alElegir={(correo, contrasena) => {
        setEmail(correo)
        setClave(contrasena)
        entrar(correo, contrasena)
      }} />
      <form className="g-form" onSubmit={enviar}>
        <label className="g-campo"><span>Correo</span>
          <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </label>
        <label className="g-campo"><span>Contraseña</span>
          <input type="password" autoComplete="current-password" value={clave} onChange={(e) => setClave(e.target.value)} required />
        </label>
        <Fallo>{error}</Fallo>
        <button className="g-boton g-boton-primario" disabled={ocupado}>{ocupado ? 'Entrando…' : 'Entrar'}</button>
      </form>
      <p className="g-pie"><Link to="/olvide">He olvidado mi contraseña</Link></p>
      <div className="g-separador" />
      <p className="g-suave">¿Sois una asociación, hermandad, AMPA, club o institución de Valverde o alrededores y queréis publicar vuestros eventos gratis?</p>
      <Link to="/alta" className="g-boton g-boton-suave">Dar de alta mi entidad</Link>
    </Marco>
  )
}

export function Codigo() {
  const { recargar, salir } = useSesion()
  const [codigo, setCodigo] = useState('')
  const { ocupado, error, hacer } = useAccion()
  const enviar = (e: FormEvent) => {
    e.preventDefault()
    void hacer(async () => {
      await api('POST', '/cuenta/codigo', { codigo })
      await recargar()
    }).then((ok) => !ok && setCodigo(''))
  }
  return (
    <Marco titulo="Código de verificación">
      <p className="g-suave">Abre la aplicación de autenticación del móvil y escribe el código de 6 cifras de Valverde Cuenta.</p>
      <PistaCodigoDemo />
      <form className="g-form" onSubmit={enviar}>
        <input className="g-codigo" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6}
          value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))} required autoFocus aria-label="Código de 6 cifras" />
        <Fallo>{error}</Fallo>
        <button className="g-boton g-boton-primario" disabled={ocupado || codigo.length !== 6}>Comprobar</button>
      </form>
      <p className="g-pie"><button className="g-enlace" onClick={() => void salir()}>Salir</button></p>
    </Marco>
  )
}

/** Activar el doble factor: obligatorio para dirección, opcional para entidades (desde «Mi cuenta»). */
export function ActivarDobleFactor({ obligatorio, alTerminar }: { obligatorio: boolean; alTerminar: () => void }) {
  const { salir } = useSesion()
  const [alta, setAlta] = useState<{ secreto: string; uri: string } | null>(null)
  const [codigo, setCodigo] = useState('')
  const preparar = useAccion()
  const activar = useAccion()

  const confirmar = (e: FormEvent) => {
    e.preventDefault()
    void activar.hacer(async () => {
      await api('POST', '/cuenta/2fa/activar', { codigo })
      alTerminar()
    })
  }

  const contenido = (
    <>
      <p className="g-suave">
        {obligatorio
          ? 'Las cuentas de dirección pueden aprobar y retirar contenido, así que llevan una segunda llave: un código del móvil que cambia cada 30 segundos.'
          : 'Además de la contraseña, al entrar se pedirá un código del móvil. Así nadie puede entrar aunque averigüe la contraseña.'}
      </p>
      <ol className="g-pasos">
        <li>Instala en el móvil una aplicación de autenticación: Google Authenticator, Microsoft Authenticator o la que ya uses.</li>
        <li>
          {alta ? 'Escanea este código con esa aplicación:' : 'Pulsa el botón para generar tu código QR personal:'}
          {!alta && (
            <button className="g-boton g-boton-suave" disabled={preparar.ocupado}
              onClick={() => void preparar.hacer(async () => setAlta(await api('POST', '/cuenta/2fa/preparar')))}>
              Generar mi código QR
            </button>
          )}
          {alta && (
            <div className="g-alta-qr">
              <Qr texto={alta.uri} />
              <details>
                <summary>No puedo escanear</summary>
                <p>Añade una cuenta a mano con esta clave:</p>
                <code className="g-clave-2fa">{alta.secreto.match(/.{1,4}/g)!.join(' ')}</code>
              </details>
            </div>
          )}
          <Fallo>{preparar.error}</Fallo>
        </li>
        <li>
          Escribe el código de 6 cifras que aparece en la aplicación:
          <form className="g-form" onSubmit={confirmar}>
            <input className="g-codigo" inputMode="numeric" autoComplete="one-time-code" maxLength={6} disabled={!alta}
              value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))} aria-label="Código de 6 cifras" />
            <Fallo>{activar.error}</Fallo>
            <button className="g-boton g-boton-primario" disabled={!alta || codigo.length !== 6 || activar.ocupado}>Activar</button>
          </form>
        </li>
      </ol>
    </>
  )

  if (!obligatorio) return contenido
  return (
    <Marco titulo="Activa la verificación en dos pasos">
      {contenido}
      <p className="g-pie"><button className="g-enlace" onClick={() => void salir()}>Salir</button></p>
    </Marco>
  )
}

export function Olvide() {
  const [email, setEmail] = useState('')
  const [hecho, setHecho] = useState(false)
  const { ocupado, error, hacer } = useAccion()
  const enviar = (e: FormEvent) => {
    e.preventDefault()
    void hacer(async () => {
      await api('POST', '/cuenta/olvide', { email })
      setHecho(true)
    })
  }
  return (
    <Marco titulo="Recuperar la contraseña">
      {hecho ? (
        <Bien>Si hay una cuenta con ese correo, te hemos enviado un enlace para poner una contraseña nueva. Vale una hora.</Bien>
      ) : (
        <form className="g-form" onSubmit={enviar}>
          <p className="g-suave">Te mandaremos un enlace a tu correo. También sirve si no te llegó el correo de confirmación del alta.</p>
          <label className="g-campo"><span>Correo</span>
            <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </label>
          <Fallo>{error}</Fallo>
          <button className="g-boton g-boton-primario" disabled={ocupado}>Enviar enlace</button>
        </form>
      )}
      <p className="g-pie"><Link to="/">Volver a entrar</Link></p>
    </Marco>
  )
}

export function Restablecer() {
  const [params] = useSearchParams()
  const navegar = useNavigate()
  const [clave, setClave] = useState('')
  const [repetida, setRepetida] = useState('')
  const [hecho, setHecho] = useState(false)
  const { ocupado, error, setError, hacer } = useAccion()
  const token = params.get('t') ?? ''

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    if (clave !== repetida) return setError('Las dos contraseñas no coinciden.')
    void hacer(async () => {
      await api('POST', '/cuenta/restablecer', { token, clave })
      setHecho(true)
    })
  }

  return (
    <Marco titulo="Poner contraseña">
      {hecho ? (
        <>
          <Bien>Contraseña guardada. Ya puedes entrar.</Bien>
          <button className="g-boton g-boton-primario" onClick={() => navegar('/', { replace: true })}>Entrar</button>
        </>
      ) : (
        <form className="g-form" onSubmit={enviar}>
          <ConsejoClave />
          <label className="g-campo"><span>Contraseña nueva</span>
            <input type="password" autoComplete="new-password" minLength={MIN_CLAVE} value={clave} onChange={(e) => setClave(e.target.value)} required autoFocus />
          </label>
          <label className="g-campo"><span>Repítela</span>
            <input type="password" autoComplete="new-password" minLength={MIN_CLAVE} value={repetida} onChange={(e) => setRepetida(e.target.value)} required />
          </label>
          <Fallo>{error}</Fallo>
          <button className="g-boton g-boton-primario" disabled={ocupado || !token}>Guardar contraseña</button>
        </form>
      )}
    </Marco>
  )
}

export const ConsejoClave = () => (
  <p className="g-suave">Al menos {MIN_CLAVE} caracteres. Lo más fácil y seguro: tres o cuatro palabras que no tengan que ver entre sí, por ejemplo «tejado limón bicicleta».</p>
)

export function Verificar() {
  const [params] = useSearchParams()
  const [estado, setEstado] = useState<'listo' | 'hecho'>('listo')
  const { ocupado, error, hacer } = useAccion()
  // Se confirma con un botón y no al abrir el enlace: algunos correos abren los enlaces solos para revisarlos.
  return (
    <Marco titulo="Confirmar el correo">
      {estado === 'hecho' ? (
        <>
          <Bien>Correo confirmado. Ahora revisaremos los datos de la entidad y os avisaremos por correo. Mientras, ya podéis entrar y preparar borradores.</Bien>
          <Link to="/" className="g-boton g-boton-primario">Entrar</Link>
        </>
      ) : (
        <>
          <Fallo>{error}</Fallo>
          <button className="g-boton g-boton-primario" disabled={ocupado}
            onClick={() => void hacer(async () => {
              await api('POST', '/cuenta/verificar', { token: params.get('t') ?? '' })
              setEstado('hecho')
            })}>
            Confirmar mi correo
          </button>
        </>
      )}
    </Marco>
  )
}

export function AltaEntidad() {
  const municipios = useMunicipios()
  const [f, setF] = useState({
    nombre: '', tipo: '', cif: '', municipioId: 0, personaContacto: '', telefono: '', web: '', email: '', clave: '', repetida: '',
    aceptaCondiciones: false,
  })
  const [hecho, setHecho] = useState(false)
  const { ocupado, error, setError, hacer } = useAccion()
  const poner = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF({ ...f, [k]: v })

  const cifLimpio = f.cif.toUpperCase().replace(/[\s.-]/g, '')
  const avisoCif = cifLimpio.length === 9 ? motivoCifNoGratis(cifLimpio) : null
  const tipoCif = cifLimpio.length === 9 && !avisoCif ? LETRAS_GRATIS[cifLimpio[0]] : null

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    if (f.clave !== f.repetida) return setError('Las dos contraseñas no coinciden.')
    if (avisoCif) return setError(avisoCif)
    const { repetida: _, ...datos } = f
    void hacer(async () => {
      await api('POST', '/cuenta/alta', datos)
      setHecho(true)
    })
  }

  if (hecho) {
    return (
      <Marco titulo="¡Casi está!">
        <Bien>Os hemos enviado un correo a {f.email}. Abrid el enlace para confirmarlo; después revisaremos los datos de la entidad.</Bien>
        <p className="g-suave">Si no llega en unos minutos, mirad en la carpeta de correo no deseado.</p>
        <Link to="/" className="g-boton g-boton-suave">Volver</Link>
      </Marco>
    )
  }

  return (
    <Marco titulo="Alta de entidad" ancho>
      <p className="g-suave">
        Publicar en la agenda es <b>gratis</b> para asociaciones, hermandades, AMPAs, clubes, peñas, fundaciones e instituciones públicas.
        Revisamos cada alta y cada evento antes de publicarlo. Empresas y comercios tienen sus propios planes para anunciarse.
      </p>
      <form className="g-form" onSubmit={enviar}>
        <fieldset>
          <legend>La entidad</legend>
          <label className="g-campo"><span>Nombre de la entidad</span>
            <input value={f.nombre} onChange={(e) => poner('nombre', e.target.value)} required minLength={3} maxLength={120} />
          </label>
          <div className="g-dos">
            <label className="g-campo"><span>Tipo</span>
              <select value={f.tipo} onChange={(e) => poner('tipo', e.target.value)} required>
                <option value="">Elige…</option>
                {TIPOS_ENTIDAD.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </label>
            <label className="g-campo"><span>CIF</span>
              <input value={f.cif} onChange={(e) => poner('cif', e.target.value)} required maxLength={12} placeholder="G21000000" />
              {avisoCif && <small className="g-aviso-campo">{avisoCif}</small>}
              {tipoCif && <small className="g-ok-campo">✓ {tipoCif}</small>}
            </label>
          </div>
          <div className="g-dos">
            <label className="g-campo"><span>Municipio</span>
              <select value={f.municipioId} onChange={(e) => poner('municipioId', Number(e.target.value))} required>
                <option value={0} disabled>Elige…</option>
                {municipios.datos?.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
            </label>
            <label className="g-campo"><span>Web o red social (opcional)</span>
              <input type="url" value={f.web} onChange={(e) => poner('web', e.target.value)} placeholder="https://" maxLength={300} />
            </label>
          </div>
        </fieldset>
        <fieldset>
          <legend>Persona de contacto</legend>
          <p className="g-suave">Será quien gestione la cuenta. Sus datos no se publican.</p>
          <div className="g-dos">
            <label className="g-campo"><span>Nombre y apellidos</span>
              <input autoComplete="name" value={f.personaContacto} onChange={(e) => poner('personaContacto', e.target.value)} required minLength={3} />
            </label>
            <label className="g-campo"><span>Teléfono</span>
              <input type="tel" autoComplete="tel" value={f.telefono} onChange={(e) => poner('telefono', e.target.value)} required />
            </label>
          </div>
          <label className="g-campo"><span>Correo</span>
            <input type="email" autoComplete="email" value={f.email} onChange={(e) => poner('email', e.target.value)} required />
          </label>
          <ConsejoClave />
          <div className="g-dos">
            <label className="g-campo"><span>Contraseña</span>
              <input type="password" autoComplete="new-password" minLength={MIN_CLAVE} value={f.clave} onChange={(e) => poner('clave', e.target.value)} required />
            </label>
            <label className="g-campo"><span>Repítela</span>
              <input type="password" autoComplete="new-password" minLength={MIN_CLAVE} value={f.repetida} onChange={(e) => poner('repetida', e.target.value)} required />
            </label>
          </div>
        </fieldset>
        <label className="g-casilla">
          <input type="checkbox" checked={f.aceptaCondiciones} onChange={(e) => poner('aceptaCondiciones', e.target.checked)} required />
          <span>
            Declaro que represento a esta entidad, que no tiene ánimo de lucro o es pública, y acepto las normas de la agenda:
            no se publica propaganda política ni sindical, ni publicidad de empresas o comercios.
            {' '}{AVISO_AGENDA.entidad}
            {' '}Los datos de contacto se usan solo para gestionar la cuenta.
          </span>
        </label>
        <Fallo>{error}</Fallo>
        <button className="g-boton g-boton-primario" disabled={ocupado}>Pedir el alta</button>
      </form>
      <p className="g-pie"><Link to="/">Ya tengo cuenta</Link></p>
    </Marco>
  )
}
