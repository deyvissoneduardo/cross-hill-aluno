// @vitest-environment node
import { generateKeyPairSync } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { cert, deleteApp, getApps, initializeApp } from 'firebase-admin/app'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Emula a camada de servidor do Next.js para o marcador `server-only`.
 *
 * O pacote publica dois entrypoints: `empty.js` sob a condição de export `react-server`
 * (camada de servidor — no-op) e `index.js` em qualquer outra condição, que lança no topo do
 * módulo. É essa assimetria que transforma o import indevido em erro de build no client. O
 * runner do Vitest resolve sem a condição `react-server`, então cairia no `index.js` e
 * derrubaria o arquivo inteiro — não porque `admin.ts` esteja errado, mas porque o runner não
 * é a camada de servidor. Mockar para módulo vazio reproduz exatamente o `empty.js` que o
 * Next.js usa no servidor. A prova de que a diretiva continua no lugar é a asserção literal
 * sobre o fonte de `admin.ts` mais abaixo, que este mock não pode satisfazer.
 */
vi.mock('server-only', () => ({}))

const ENV_KEYS = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'] as const

const originalEnv: Partial<Record<(typeof ENV_KEYS)[number], string>> = {}

const DIRETORIO_ATUAL = path.dirname(fileURLToPath(import.meta.url))
const ADMIN_TS_PATH = path.join(DIRETORIO_ATUAL, 'admin.ts')
const RAIZ_REPO = path.resolve(DIRETORIO_ATUAL, '..', '..')
/** Identidade do módulo admin sem extensão — alvo canônico da checagem de fronteira. */
const ADMIN_MODULE_ID = path.join(RAIZ_REPO, 'lib', 'firebase', 'admin')

const EMAIL_FAKE = 'svc@projeto-teste.iam.gserviceaccount.com'

/**
 * Esvazia o registry de apps do `firebase-admin/app`.
 *
 * `vi.resetModules()` NÃO resolve isso: ele limpa só o registry de módulos do runner do
 * Vitest (os fontes transformados pelo Vite, como `./admin`). `firebase-admin/app` vem de
 * node_modules e é externalizado — fica no cache de módulos do Node, fora do alcance do
 * reset. Ou seja, `resetModules()` zera o singleton local de `admin.ts`, mas o map de apps
 * do pacote externo sobrevive a todos os testes do arquivo. Sem esta limpeza, um teste que
 * chega a chamar `initializeApp()` faz o guard `getApps().length > 0` de `admin.ts` retornar
 * cedo nos testes seguintes — antes de ler as env vars — e a bateria anti-vazamento de
 * segredo deixa silenciosamente de exercitar o caminho de rejeição (dependência de ordem).
 *
 * Chamada no `beforeEach` (e não no `afterEach`) de propósito: `afterEach` pressupõe que o
 * teste anterior terminou de forma ordeira. Crash, timeout ou rejeição não tratada deixam o
 * registry sujo e a contaminação volta, agora de forma intermitente. No `beforeEach` cada
 * teste garante o próprio pré-estado limpo, independente de como o anterior morreu.
 */
async function limparRegistryDoFirebaseAdmin() {
  for (const app of getApps()) {
    await deleteApp(app)
  }
}

function clearFirebaseEnv() {
  for (const key of ENV_KEYS) {
    delete process.env[key]
  }
}

/** Chave RSA gerada localmente só para este teste — não é credencial real de nenhum projeto Firebase. */
function gerarChavePrivadaFake(): string {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
  return privateKey.export({ type: 'pkcs1', format: 'pem' }).toString()
}

/**
 * Extrai uma linha do corpo base64 do PEM (sem cabeçalho/rodapé e sem quebra de linha).
 * Esse fragmento sobrevive a re-serializações (JSON, escape de `\n`, `.replace`), então
 * detecta vazamento mesmo que a chave seja reformatada antes de entrar na mensagem/stack.
 */
function extrairFragmentoBase64(pem: string): string {
  const linha = pem
    .split('\n')
    .map((valor) => valor.trim())
    .find((valor) => valor.length >= 32 && !valor.startsWith('-----'))
  if (!linha) throw new Error('fixture inválida: PEM fake sem corpo base64')
  return linha
}

const CHAVE_PRIVADA_FAKE = gerarChavePrivadaFake()
const FRAGMENTO_CHAVE_PRIVADA_FAKE = extrairFragmentoBase64(CHAVE_PRIVADA_FAKE)

/**
 * `[descrição, env parcial injetada, segredos que ESTÃO no ambiente e não podem vazar]`.
 * A terceira coluna existe para que a asserção anti-vazamento só rode sobre valores
 * realmente presentes — asserção sobre segredo ausente seria vácua.
 */
type CasoDeRejeicao = [
  descricao: string,
  envParcial: Partial<Record<(typeof ENV_KEYS)[number], string>>,
  segredosPresentes: string[],
]

const CASOS_DE_REJEICAO: CasoDeRejeicao[] = [
  ['todas as variáveis ausentes', {}, []],
  ['apenas FIREBASE_PROJECT_ID presente', { FIREBASE_PROJECT_ID: 'projeto-teste' }, ['projeto-teste']],
  [
    'FIREBASE_PROJECT_ID e FIREBASE_CLIENT_EMAIL presentes',
    { FIREBASE_PROJECT_ID: 'projeto-teste', FIREBASE_CLIENT_EMAIL: EMAIL_FAKE },
    ['projeto-teste', EMAIL_FAKE],
  ],
  [
    'FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY presentes, FIREBASE_PROJECT_ID ausente',
    { FIREBASE_CLIENT_EMAIL: EMAIL_FAKE, FIREBASE_PRIVATE_KEY: CHAVE_PRIVADA_FAKE },
    [EMAIL_FAKE, CHAVE_PRIVADA_FAKE, FRAGMENTO_CHAVE_PRIVADA_FAKE],
  ],
]

/** Primeira instrução real do fonte — consome comentários de linha e de bloco intercalados. */
function primeiraInstrucao(fonte: string): string {
  let restante = fonte.trimStart()
  while (restante.startsWith('//') || restante.startsWith('/*')) {
    if (restante.startsWith('//')) {
      const fimDaLinha = restante.indexOf('\n')
      if (fimDaLinha === -1) return ''
      restante = restante.slice(fimDaLinha + 1).trimStart()
    } else {
      const fimDoBloco = restante.indexOf('*/')
      if (fimDoBloco === -1) return ''
      restante = restante.slice(fimDoBloco + 2).trimStart()
    }
  }
  return restante.split('\n')[0].trim()
}

/** Verdadeiro quando a primeira instrução do arquivo (ignorando comentários) é a diretiva `'use client'`. */
function temDiretivaUseClient(fonte: string): boolean {
  return /^['"]use client['"];?$/.test(primeiraInstrucao(fonte))
}

/** Coleta os especificadores de `from '...'`, `import('...')`, `require('...')` e `import '...'`. */
function extrairEspecificadoresDeImport(fonte: string): string[] {
  const padrao =
    /\bfrom\s*['"]([^'"]+)['"]|\b(?:import|require)\s*\(\s*['"]([^'"]+)['"]\s*\)|\bimport\s+['"]([^'"]+)['"]/g
  const especificadores: string[] = []
  for (const match of fonte.matchAll(padrao)) {
    const especificador = match[1] ?? match[2] ?? match[3]
    if (especificador) especificadores.push(especificador)
  }
  return especificadores
}

/** Resolve o especificador (relativo, alias `@/`/`~/` ou nu) e diz se ele aponta para `lib/firebase/admin`. */
function especificadorApontaParaAdmin(arquivo: string, especificador: string): boolean {
  let alvo: string
  if (especificador.startsWith('.')) {
    alvo = path.resolve(path.dirname(arquivo), especificador)
  } else if (especificador.startsWith('@/') || especificador.startsWith('~/')) {
    alvo = path.resolve(RAIZ_REPO, especificador.slice(2))
  } else {
    return especificador.replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/, '').endsWith('lib/firebase/admin')
  }
  return alvo.replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/, '') === ADMIN_MODULE_ID
}

/** Lista recursivamente os fontes `.ts`/`.tsx` de um diretório do repositório. */
function listarFontes(diretorio: string): string[] {
  const arquivos: string[] = []
  for (const entrada of readdirSync(diretorio, { withFileTypes: true })) {
    const completo = path.join(diretorio, entrada.name)
    if (entrada.isDirectory()) {
      if (entrada.name === 'node_modules' || entrada.name.startsWith('.')) continue
      arquivos.push(...listarFontes(completo))
    } else if (/\.tsx?$/.test(entrada.name)) {
      arquivos.push(completo)
    }
  }
  return arquivos
}

describe('getFirebaseAdminApp', () => {
  beforeEach(async () => {
    await limparRegistryDoFirebaseAdmin()
    for (const key of ENV_KEYS) {
      originalEnv[key] = process.env[key]
    }
    clearFirebaseEnv()
    vi.resetModules()
  })

  afterEach(() => {
    clearFirebaseEnv()
    for (const key of ENV_KEYS) {
      const original = originalEnv[key]
      if (original !== undefined) process.env[key] = original
    }
    vi.resetModules()
  })

  it.each(CASOS_DE_REJEICAO)(
    'CT-028: rejeita inicialização com configuração incompleta (%s) sem serializar segredo presente no ambiente',
    async (_descricao, envParcial, segredosPresentes) => {
      Object.assign(process.env, envParcial)

      const { getFirebaseAdminApp, FirebaseAdminConfigError } = await import('./admin')

      let erroCapturado: unknown
      try {
        getFirebaseAdminApp()
      } catch (erro) {
        erroCapturado = erro
      }

      expect(erroCapturado).toBeInstanceOf(FirebaseAdminConfigError)
      const erro = erroCapturado as Error

      // Superfície completa que pode escapar para log/telemetria/handler de erro.
      const superficieDoErro = [
        erro.message,
        erro.stack ?? '',
        JSON.stringify(erro, Object.getOwnPropertyNames(erro)),
      ].join('\n')

      // Anti-vazamento ANTES da igualdade de mensagem: uma regressão que interpole a
      // credencial deve falhar AQUI (diagnóstico de segurança), não na comparação da mensagem.
      for (const segredo of segredosPresentes) {
        expect(superficieDoErro).not.toContain(segredo)
      }

      expect(erro.message).toBe('Configuração do Firebase Admin ausente ou inválida.')
    }
  )

  it('CT-028: inicializa normalmente quando as três variáveis FIREBASE_* estão presentes', async () => {
    process.env.FIREBASE_PROJECT_ID = 'projeto-teste'
    process.env.FIREBASE_CLIENT_EMAIL = EMAIL_FAKE
    process.env.FIREBASE_PRIVATE_KEY = gerarChavePrivadaFake()

    const { getFirebaseAdminApp } = await import('./admin')

    const app = getFirebaseAdminApp()

    expect(app.options.projectId).toBe('projeto-teste')
  })

  it("CT-028: admin.ts declara `import 'server-only'` como primeira instrução", () => {
    // Guarda de BUILD da fronteira server-only: a varredura de `'use client'` mais abaixo só
    // enxerga import direto; o marcador cobre também o import transitivo (Client Component →
    // helper sem diretiva → admin). Precisa ser a PRIMEIRA instrução para que a resolução
    // client falhe antes de qualquer avaliação do módulo de credenciais.
    const source = readFileSync(ADMIN_TS_PATH, 'utf-8')

    expect(primeiraInstrucao(source)).toBe("import 'server-only'")
  })

  it('CT-028: app NOMEADO pré-existente no registry não é adotado nem pula a validação das FIREBASE_*', async () => {
    initializeApp(
      {
        credential: cert({
          projectId: 'projeto-alheio',
          clientEmail: EMAIL_FAKE,
          privateKey: gerarChavePrivadaFake(),
        }),
        projectId: 'projeto-alheio',
      },
      'app-de-outro-modulo'
    )

    // Precondição: o registry NÃO tem app default — só o app nomeado de outro módulo.
    expect(getApps().map((app) => app.name)).toEqual(['app-de-outro-modulo'])

    const { getFirebaseAdminApp, FirebaseAdminConfigError } = await import('./admin')

    // Ambiente vazio (beforeEach): a única coisa capaz de evitar o erro seria adotar o app
    // alheio — comportamento do antigo `existingApps[0]`, que pulava a validação de ambiente.
    expect(() => getFirebaseAdminApp()).toThrow(FirebaseAdminConfigError)
  })

  it('CT-028: app [DEFAULT] pré-existente no registry é adotado como singleton', async () => {
    const appDefault = initializeApp({
      credential: cert({
        projectId: 'projeto-default-preexistente',
        clientEmail: EMAIL_FAKE,
        privateKey: gerarChavePrivadaFake(),
      }),
      projectId: 'projeto-default-preexistente',
    })

    expect(appDefault.name).toBe('[DEFAULT]')

    const { getFirebaseAdminApp } = await import('./admin')

    expect(getFirebaseAdminApp()).toBe(appDefault)
  })

  it('CT-028: nenhuma variável NEXT_PUBLIC_FIREBASE_* é lida pelo módulo admin.ts', () => {
    const source = readFileSync(ADMIN_TS_PATH, 'utf-8')

    expect(source).not.toMatch(/NEXT_PUBLIC_FIREBASE/)
  })

  it('CT-028: nenhum módulo client-side ("use client") de app/ ou lib/ importa lib/firebase/admin', () => {
    const fontes = [
      ...listarFontes(path.join(RAIZ_REPO, 'app')),
      ...listarFontes(path.join(RAIZ_REPO, 'lib')),
    ]

    // Guarda de cobertura: prova que a varredura enxerga os fontes das duas árvores.
    expect(fontes).toContain(ADMIN_TS_PATH)
    expect(fontes).toContain(path.join(RAIZ_REPO, 'app', 'agendamento', 'validation', 'cliente.ts'))

    const violacoes = fontes
      .filter((arquivo) => {
        const fonte = readFileSync(arquivo, 'utf-8')
        if (!temDiretivaUseClient(fonte)) return false
        return extrairEspecificadoresDeImport(fonte).some((especificador) =>
          especificadorApontaParaAdmin(arquivo, especificador)
        )
      })
      .map((arquivo) => path.relative(RAIZ_REPO, arquivo))

    expect(violacoes).toEqual([])
  })

  it('CT-028: a detecção de fronteira client-side reconhece diretiva e import do admin', () => {
    const componenteClient = "// topo\n/* bloco */\n'use client'\n\nimport { getFirebaseAdminApp } from '@/lib/firebase/admin'\n"
    const arquivoClientFicticio = path.join(RAIZ_REPO, 'app', 'agendamento', 'componente.tsx')

    expect(temDiretivaUseClient(componenteClient)).toBe(true)
    expect(temDiretivaUseClient("import 'x'\n'use client'\n")).toBe(false)
    expect(temDiretivaUseClient(readFileSync(ADMIN_TS_PATH, 'utf-8'))).toBe(false)

    expect(extrairEspecificadoresDeImport(componenteClient)).toEqual(['@/lib/firebase/admin'])

    expect(especificadorApontaParaAdmin(arquivoClientFicticio, '@/lib/firebase/admin')).toBe(true)
    expect(especificadorApontaParaAdmin(arquivoClientFicticio, '../../lib/firebase/admin')).toBe(true)
    expect(especificadorApontaParaAdmin(ADMIN_TS_PATH, './admin')).toBe(true)
    expect(especificadorApontaParaAdmin(arquivoClientFicticio, '@/lib/firebase/client')).toBe(false)
  })
})
