/**
 * Inicialização server-only do Firebase Admin SDK.
 *
 * Fonte de verdade: `docs/specs/features/agendamento-cliente/v1/tech_spec.md` (§10.1.1).
 * Lê exclusivamente as variáveis server-only `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`
 * e `FIREBASE_PRIVATE_KEY`. Nenhuma variável Firebase deste módulo usa prefixo `NEXT_PUBLIC_`
 * — este arquivo NUNCA deve ser importado por Client Components, repositories de browser
 * ou qualquer código que rode no navegador; ele usa o SDK Admin (Node-only) e credenciais
 * privadas do projeto Firebase.
 *
 * Tratamento de erro: em configuração incompleta, lança `FirebaseAdminConfigError` com
 * mensagem genérica — os valores de `FIREBASE_CLIENT_EMAIL`/`FIREBASE_PRIVATE_KEY` nunca
 * são incluídos na mensagem, em stack trace customizado ou em log.
 */

// A fronteira server-only precisa ser imposta pelo BUILD, não só por teste: a varredura
// heurística de `admin.test.ts` só enxerga import DIRETO a partir de um arquivo com
// diretiva `'use client'` — um Client Component que importe um helper sem diretiva, e esse
// helper importe este módulo, passaria despercebido. Na camada client o especificador
// `server-only` resolve para um módulo que lança, então qualquer import indevido (direto ou
// transitivo) vira ERRO DE BUILD. Ver `next/dist/docs/01-app/02-guides/data-security.md`.
import 'server-only'

import { cert, getApp, getApps, initializeApp, type App } from 'firebase-admin/app'

/**
 * Nome do app default no registry do `firebase-admin` (o mesmo default de `getApp()` /
 * `initializeApp()`). O pacote não exporta a constante, por isso ela é replicada aqui.
 */
const NOME_DO_APP_DEFAULT = '[DEFAULT]'

/** Erro de configuração do Firebase Admin. Mensagem nunca carrega valores de credencial. */
export class FirebaseAdminConfigError extends Error {
  constructor() {
    super('Configuração do Firebase Admin ausente ou inválida.')
    this.name = 'FirebaseAdminConfigError'
  }
}

let appSingleton: App | undefined

/**
 * Retorna a instância singleton do Firebase Admin App, inicializando-a na primeira
 * chamada a partir de `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` e `FIREBASE_PRIVATE_KEY`.
 * Lança `FirebaseAdminConfigError` se qualquer uma das três variáveis estiver ausente.
 */
export function getFirebaseAdminApp(): App {
  if (appSingleton) {
    return appSingleton
  }

  // Adota SOMENTE o app `[DEFAULT]`. `getApps()` devolve o registry inteiro, incluindo apps
  // NOMEADOS criados por outros módulos — `existingApps[0]` retornaria um app alheio e pularia
  // a validação das variáveis abaixo. O teste de presença é necessário porque `getApp()` lança
  // quando o registry só tem apps nomeados: aqui a ausência de default deve seguir para a
  // validação de ambiente, não virar erro do SDK.
  if (getApps().some((app) => app.name === NOME_DO_APP_DEFAULT)) {
    appSingleton = getApp()
    return appSingleton
  }

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY

  if (!projectId || !clientEmail || !privateKeyRaw) {
    throw new FirebaseAdminConfigError()
  }

  // Variáveis de ambiente costumam escapar quebras de linha do PEM como "\n" literal.
  const privateKey = privateKeyRaw.replace(/\\n/g, '\n')

  appSingleton = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    projectId,
  })

  return appSingleton
}
