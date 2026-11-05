import { randomUUID } from 'node:crypto';

export function versaoAplicativo() {
  const versao = randomUUID();
  return {
    name: 'dayvilo-versao',
    config() {
      return { define: { __DAYVILO_VERSAO__: JSON.stringify(versao) } };
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'versao.json', source: JSON.stringify({ versao }) });
    },
  };
}
