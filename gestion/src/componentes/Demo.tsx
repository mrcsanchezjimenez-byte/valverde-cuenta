import { CUENTAS_DEMO, reiniciarAlmacen } from '../../../demo/almacen.ts'
import { MODO_DEMO } from '../api.ts'

/** Dirección de la app en la demostración (está una carpeta por encima del panel). */
export const URL_APP_DEMO = import.meta.env.VITE_URL_APP ?? '../'

/** Franja fija que recuerda que todo es de mentira y permite empezar de cero. */
export function FranjaDemo() {
  if (!MODO_DEMO) return null
  return (
    <div className="g-franja-demo" role="note">
      <span><b>Demostración.</b> Datos ficticios que solo se guardan en este navegador.</span>
      <a href={URL_APP_DEMO}>Ver la app</a>
      <button className="g-enlace" onClick={() => {
        if (confirm('¿Volver a los datos del principio? Se pierde lo que hayas cambiado.')) {
          reiniciarAlmacen()
          location.hash = '#/'
          location.reload()
        }
      }}>Empezar de cero</button>
    </div>
  )
}

/** En la pantalla de entrada: botones para entrar sin escribir nada. */
export function AccesoDemo({ alElegir }: { alElegir: (email: string, clave: string) => void }) {
  if (!MODO_DEMO) return null
  return (
    <div className="g-caja g-acceso-demo">
      <p><b>Demostración.</b> Entra con una de estas cuentas ficticias:</p>
      <button type="button" className="g-boton g-boton-primario" onClick={() => alElegir(CUENTAS_DEMO.direccion.email, CUENTAS_DEMO.direccion.clave)}>
        Entrar como dirección
      </button>
      <button type="button" className="g-boton g-boton-suave" onClick={() => alElegir(CUENTAS_DEMO.entidad.email, CUENTAS_DEMO.entidad.clave)}>
        Entrar como asociación (Peña El Boto)
      </button>
      <p className="g-suave">
        Contraseña de las dos: <code>{CUENTAS_DEMO.direccion.clave}</code>. Código del móvil para dirección: <code>{CUENTAS_DEMO.direccion.codigo}</code>.
      </p>
    </div>
  )
}

export const PistaCodigoDemo = () =>
  MODO_DEMO ? <p className="g-aviso">En la demostración el código es siempre <b>{CUENTAS_DEMO.direccion.codigo}</b>.</p> : null
