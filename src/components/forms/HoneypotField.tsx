// Campo-isca contra bot de spam nos formulários públicos (sem conta, sem
// captcha): visualmente escondido e fora da ordem de tab, então uma pessoa
// nunca preenche — só um bot que preenche todo input do form. Se vier
// preenchido, o chamador finge sucesso e não grava nada (sem dar pista ao bot).
export default function HoneypotField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
      <label htmlFor="website">Não preencha este campo</label>
      <input
        id="website"
        name="website"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}
