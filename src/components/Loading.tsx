export function Loading({ label = 'Загрузка…' }: { label?: string }) {
  return <div className="state-card">{label}</div>
}
