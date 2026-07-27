// Flag global simples: true enquanto há uma gravação de áudio ativa em qualquer
// tela. Usado pra avisar antes de navegar pra longe e perder o áudio gravado
// até aqui (fechar aba, atualizar, ou clicar em outro item do menu).
let active = false;

export function setRecordingActive(value: boolean) {
  active = value;
}

export function isRecordingActive(): boolean {
  return active;
}

export const LEAVE_RECORDING_WARNING =
  'Gravação em andamento. Sair agora encerra e perde o áudio gravado até aqui. Continuar?';
