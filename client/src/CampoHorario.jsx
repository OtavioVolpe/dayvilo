// Campo próprio para evitar o relógio nativo que pode ser cortado no celular.
// O valor continua HH:mm, preservando o contrato da API e do FormData.
export default function CampoHorario({ onChange, onInput, ...props }) {
  function alterar(evento) {
    const numeros = evento.target.value.replace(/\D/g, '').slice(0, 4);
    evento.target.value = numeros.length > 2 ? `${numeros.slice(0, 2)}:${numeros.slice(2)}` : numeros;
    onChange?.(evento);
    onInput?.(evento);
  }
  return <input {...props} type="text" inputMode="numeric" placeholder="HH:MM" maxLength={5}
    pattern="([01][0-9]|2[0-3]):[0-5][0-9]" title="Digite quatro números, como 1740 para 17:40. Use de 00:00 a 23:59."
    autoComplete="off" onChange={alterar} />;
}
