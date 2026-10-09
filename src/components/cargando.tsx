/** Esqueleto que se muestra al instante mientras carga una página. */
export default function Cargando({ filas = 3 }: { filas?: number }) {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Cargando">
      <div className="h-8 w-48 rounded-lg bg-slate-200" />
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} className="tarjeta space-y-3">
          <div className="h-4 w-2/3 rounded bg-slate-200" />
          <div className="h-4 w-1/3 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}
