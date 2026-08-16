# DESIGN — Especificação de Design (Web)

## 1. Identificação
- **Feature/Projeto**: Agendamento do cliente sem conta
- **Frente**: web
- **Documento de Definição**: `docs/prds/features/agendamento-cliente/v1/prd.md`
- **Design System Global**: `docs/specs/design-system.md`
- **Origem do Design**: Inferido do PRD, pré-refinamento e design system real do projeto
- **Referências**: `docs/specs/features/agendamento-cliente/v1/pre-refinement.md`, `app/globals.css`, `app/page.tsx`, `app/layout.tsx`
- **Autor**: Codex
- **Data**: 2026-08-11
- **Status**: Revisão

---

## 2. Princípios Visuais da Feature

A feature usa um painel único central, mobile-first e dark-first, com uma ação principal por etapa. A interface deve parecer utilitária, rápida e confiável: pouca decoração, hierarquia clara, seleção por cards/chips e feedback contextual. O cliente deve entender visualmente que está solicitando um horário, não recebendo confirmação definitiva.

---

## 3. Design System Aplicável

### 3.1 Tokens Utilizados

| Categoria | Tokens | Origem |
|-----------|--------|--------|
| Cores | `--background`, `--foreground`, `--surface`, `--surface-muted`, `--border-subtle`, `--text-muted`, `--accent`, `--success`, `--warning`, `--danger` | `docs/specs/design-system.md`; `--background` e `--foreground` já existem em `app/globals.css` |
| Tipografia | `--font-sans`, `--font-mono` | `app/globals.css` e `app/layout.tsx` |
| Espaçamento | `space-2` a `space-8` | `docs/specs/design-system.md` |
| Raio | `radius-sm`, `radius-md` | `docs/specs/design-system.md` |

### 3.2 Componentes Reutilizados

| Componente | Origem (design system / biblioteca / path) | Uso nesta feature |
|------------|--------------------------------------------|-------------------|
| `AppShell` | `docs/specs/design-system.md` | Fundo dark-first e painel central responsivo. |
| `StepProgress` | `docs/specs/design-system.md` | Indicar a etapa atual sem pesar o fluxo. |
| `FormField` | `docs/specs/design-system.md` | Nome e telefone, com erro inline. |
| `PrimaryButton` | `docs/specs/design-system.md` | Continuar, solicitar agendamento e tentar novamente. |
| `SecondaryButton` | `docs/specs/design-system.md` | Voltar. |
| `SelectionCard` | `docs/specs/design-system.md` | Profissionais e dias disponíveis. |
| `TimeChip` | `docs/specs/design-system.md` | Horários elegíveis. |
| `InlineBanner` | `docs/specs/design-system.md` | Erros, indisponibilidade e avisos. |
| `SummaryList` | `docs/specs/design-system.md` | Revisão dos dados antes do envio. |
| `SkeletonBlock` | `docs/specs/design-system.md` | Loading contextual. |

### 3.3 Componentes e Tokens Novos

| Item | Tipo (componente/token) | Justificativa (por que o existente não atende) | Promover ao global? |
|------|--------------------------|-----------------------------------------------|---------------------|
| Tokens mínimos dark-first | token | O projeto só possuía `--background` e `--foreground`; o fluxo exige superfícies, bordas, estados e textos secundários consistentes. | Sim |
| `AppShell` | componente | Não havia shell de produto além do template inicial. | Sim |
| `StepProgress` | componente | O fluxo precisa sinalizar progresso sem criar navegação complexa. | Sim |
| `FormField` | componente | Campos com label, apoio e erro inline serão recorrentes. | Sim |
| `PrimaryButton` / `SecondaryButton` | componente | Botões precisam de área de toque e hierarquia consistente. | Sim |
| `SelectionCard` / `TimeChip` | componente | Seleção de profissional, dia e horário exige estados visuais claros. | Sim |
| `InlineBanner` | componente | Erros e vazios devem aparecer no bloco afetado. | Sim |
| `SummaryList` | componente | Revisão de dados em formato compacto. | Sim |
| `SkeletonBlock` | componente | Loading contextual com dimensões estáveis. | Sim |

---

## 4. Mapa Visual de Telas

### 4.1 Identificação

- **Rota**: entrada do fluxo de agendamento.
- **Propósito visual**: coletar nome e telefone sem sugerir cadastro.
- **Layout**: `AppShell` ocupa a tela toda. No painel central, topo com `StepProgress`, título "Solicite seu horário", texto curto informando que a solicitação aguarda confirmação, dois `FormField` grandes e `PrimaryButton` no fim do painel. Em telas pequenas, o CTA permanece visível após os campos, sem rodapé fixo invasivo.
- **Componentes**: `AppShell`, `StepProgress`, `FormField`, `PrimaryButton`, `InlineBanner`.

```
[ progresso 1/4 ]
Solicite seu horário
Seu pedido será analisado antes da confirmação.

[ Nome             ]
[ Telefone         ]

[ Continuar        ]
```

### 4.2 Escolha de Agendamento

- **Rota**: etapa de seleção.
- **Propósito visual**: permitir escolher profissional, dia e horário em ordem progressiva.
- **Layout**: painel central com `StepProgress`, título "Escolha seu horário" e três blocos empilhados. O bloco de profissionais usa `SelectionCard`; o calendário mostra somente dias liberados como cards/chips de data; horários usam `TimeChip` em grade de duas ou três colunas conforme largura. Blocos posteriores ficam visualmente neutros até a escolha anterior existir.
- **Componentes**: `AppShell`, `StepProgress`, `SelectionCard`, `TimeChip`, `InlineBanner`, `SkeletonBlock`, `PrimaryButton`, `SecondaryButton`.

```
[ progresso 2/4 ]
Escolha seu horário

Profissional
[ Maria Silva | CREF ... ]
[ João Souza  | CREF ... ]

Dia
[ 15/08 ] [ 16/08 ] [ 20/08 ]

Horário
[ 08:00 ] [ 09:00 ]
[ 10:00 ] [ 14:00 ]

[ Voltar ] [ Continuar ]
```

### 4.3 Revisão

- **Rota**: etapa anterior ao envio definitivo.
- **Propósito visual**: dar segurança para o cliente conferir antes de solicitar.
- **Layout**: painel central com `StepProgress`, título "Revise sua solicitação", `SummaryList` com nome, telefone, profissional, data e horário. Um `InlineBanner` com tom de aviso reforça "A confirmação será feita pelo administrador". Ações no final: `SecondaryButton` para voltar e `PrimaryButton` para solicitar.
- **Componentes**: `AppShell`, `StepProgress`, `SummaryList`, `InlineBanner`, `PrimaryButton`, `SecondaryButton`.

```
[ progresso 3/4 ]
Revise sua solicitação

Nome          João Silva
Telefone      (61) 99999-9999
Profissional  Maria Silva
Data          15/08/2026
Horário       09:00

[!] Aguarde a confirmação administrativa.

[ Voltar ] [ Solicitar agendamento ]
```

### 4.4 Sucesso

- **Rota**: conclusão do fluxo.
- **Propósito visual**: confirmar envio da solicitação sem prometer confirmação final.
- **Layout**: painel central com ícone simples de sucesso/pendência, título configurável, descrição configurável e seções opcionais de regras, dicas e avisos em blocos simples. Se textos configuráveis não existirem, usar fallback visual seguro com linguagem de aguardando confirmação.
- **Componentes**: `AppShell`, `InlineBanner`, `SummaryList`, `SkeletonBlock`.

```
[ ícone ]
Agendamento solicitado!
Seu horário está aguardando confirmação.

Regras
- ...

Dicas
- ...

Avisos importantes
- ...
```

### 4.5 Estados de Indisponibilidade

- **Rota**: estados internos da etapa de escolha.
- **Propósito visual**: explicar indisponibilidade sem criar uma nova jornada.
- **Layout**: `InlineBanner` ou bloco vazio compacto dentro da seção afetada. Não usar página separada, modal bloqueante ou ilustração grande.
- **Componentes**: `InlineBanner`, `PrimaryButton` quando houver ação de recuperação.

---

## 5. Estados Visuais por Tela

| Tela / Componente | Loading | Sucesso | Erro | Vazio |
|-------------------|---------|---------|------|-------|
| Identificação | N/A — não há carregamento inicial obrigatório. | Campos válidos mantêm borda neutra; CTA habilitado. | Erro inline sob o campo afetado e borda em `--danger`; se houver erro geral, `InlineBanner` acima do CTA. | N/A — tela sempre tem formulário. |
| Escolha — profissionais | 3 `SkeletonBlock` em formato de card. | Profissional selecionado com borda `--accent`, fundo `--surface-muted` e marcador visual textual "Selecionado". | `InlineBanner`: "Não foi possível carregar os profissionais." Ação: "Tentar novamente". | Bloco compacto: "Nenhum profissional disponível no momento." Sem CTA adicional. |
| Escolha — dias | Skeleton de calendário compacto com 7 células. | Dia selecionado com borda `--accent`, contraste forte e texto "Selecionado" acessível. | `InlineBanner`: "Não foi possível carregar as datas disponíveis." Ação: "Tentar novamente". | Bloco compacto: "Não há datas disponíveis para este profissional." |
| Escolha — horários | 8 chips skeleton em grade. | Horário selecionado com preenchimento `--accent` e texto de alto contraste. | `InlineBanner`: "Não foi possível carregar os horários." Ação: "Tentar novamente". | Bloco compacto: "Não há horários disponíveis nesta data." |
| Revisão | N/A — dados já foram escolhidos no fluxo. | Resumo completo e CTA "Solicitar agendamento" habilitado. | `InlineBanner`: "Não foi possível concluir sua solicitação. Tente novamente." Ação: "Tentar novamente". | N/A — revisão só existe com seleção completa. |
| Sucesso | Skeleton de título, descrição e 3 blocos de texto configurável. | Ícone simples, título e descrição deixam claro que aguarda confirmação. | Se textos configuráveis falharem, usar fallback seguro sem bloquear a tela. | Se regras/dicas/avisos vierem vazios, ocultar as seções vazias e manter título/descrição. |
| Indisponibilidade | N/A — estado aparece após carregamento. | N/A — não representa sucesso. | Banner contextual se a indisponibilidade vier de falha. | Bloco com título curto, orientação e sem ilustração pesada. |

### 5.1 Mensagens e Ações de Recuperação

| Cenário | Mensagem exibida (literal) | Ação oferecida |
|---------|----------------------------|----------------|
| Nome ausente | "Informe seu nome para continuar." | Corrigir campo |
| Telefone ausente | "Informe seu telefone para continuar." | Corrigir campo |
| Profissionais indisponíveis | "Nenhum profissional disponível no momento." | N/A |
| Falha ao carregar profissionais | "Não foi possível carregar os profissionais." | Tentar novamente |
| Datas vazias | "Não há datas disponíveis para este profissional." | Escolher outro profissional |
| Horários vazios | "Não há horários disponíveis nesta data." | Escolher outra data |
| Duplicidade diária por telefone | "Você já possui um agendamento para este dia." | Voltar |
| Falha no envio | "Não foi possível concluir sua solicitação. Tente novamente." | Tentar novamente |
| Sucesso fallback | "Agendamento solicitado!" / "Seu horário está aguardando confirmação administrativa." | N/A |

---

## 6. Responsividade

- **Abordagem**: mobile-first.
- **Breakpoints**: usar os breakpoints do Tailwind disponíveis no projeto (`sm`, `md`, `lg`) sem redefinir valores no design.

| Faixa (usar nomes do projeto) | O que muda no layout |
|-------------------------------|----------------------|
| Base / celular | Painel ocupa largura total com padding confortável; blocos empilhados; horários em 2 colunas quando couber. |
| `sm` | Painel central ganha largura máxima; horários podem ir para 3 colunas; botões ficam lado a lado quando houver espaço. |
| `md` | Painel permanece centralizado; conteúdo não vira dashboard; calendário e horários ganham mais respiro. |
| `lg` | Layout continua focado no painel central, com fundo de página visível e largura contida. |

---

## 7. Tema e Modo Escuro

- **Tema**: herda o tema do projeto e o design system global mínimo. A feature é dark-first, com superfícies separadas por contraste, borda sutil e hierarquia de texto.
- **Dark mode**: suportado pelo projeto via variáveis globais e classes dark existentes. Esta feature deve priorizar o estado escuro; light mode pode existir como fallback do projeto, mas não é a experiência principal.
- **Cores configuráveis**: fora da v1, conforme PRD.

---

## 8. Interações e Motion

| Interação | Comportamento visual | Duração/Easing (se relevante) |
|-----------|----------------------|-------------------------------|
| Selecionar profissional/dia/horário | Card/chip muda borda, fundo e marcador textual de seleção. | Curta, sem chamar atenção. |
| Avançar etapa | Conteúdo do painel troca mantendo a mesma posição estrutural. | Curta; respeitar reduced motion. |
| Erro inline | Mensagem aparece abaixo do campo ou no banner do bloco. | Entrada curta; sem deslocamento excessivo. |
| Envio da solicitação | CTA mostra estado de processamento e evita repetição visual da ação. | Até concluir ou falhar. |
| Sucesso | Ícone e título aparecem juntos, sem animação longa. | Opcional e mínima. |

---

## 9. Acessibilidade Visual

- **Contraste**: texto principal usa `--foreground` sobre `--background`/`--surface`; texto secundário usa `--text-muted` apenas em tamanhos legíveis; estados `--danger`, `--warning` e `--success` não dependem apenas de cor.
- **Foco visível**: componentes interativos exibem anel ou borda de foco com `--accent`, além de mudança de superfície quando aplicável.
- **Alvos de clique**: botões, cards e chips devem ter área mínima confortável para toque; horários não podem ficar densos demais em 320px.
- **Reduced motion**: transições de etapa, seleção e banners devem ser removidas ou reduzidas ao mínimo quando a preferência de movimento reduzido estiver ativa.

---

## 10. Assets Necessários

| Asset | Tipo (ícone/ilustração/imagem/fonte) | Origem (biblioteca do projeto / a produzir / link) |
|-------|---------------------------------------|---------------------------------------------------|
| Ícone de solicitação enviada/aguardando confirmação | ícone | A produzir com biblioteca de ícones definida na tech spec ou forma simples inline. |
| Ícones auxiliares de aviso/erro/sucesso | ícone | A produzir com biblioteca de ícones definida na tech spec ou forma simples inline. |
| Ilustrações | ilustração | N/A — não usar ilustração pesada nesta v1. |
| Fonte | fonte | Fonte já configurada no projeto. |

---

## 11. Observações e Pontos em Aberto

- **Candidatos a ADR (tag `ui`)**: nenhum; os padrões globais criados são mínimos e derivados da necessidade imediata da feature.
- **Dependências de produto**: nenhuma pendente para o design; cores configuráveis permanecem fora da v1.
- **Deixado para a tech spec**: origem dos dados exibidos, regras de elegibilidade, confirmação administrativa, gestão de processamento, biblioteca final de ícones e detalhes de implementação dos componentes.

---

## 12. Checklist Final

- [x] Toda tela do PRD/Intent tem entrada no Mapa Visual (seção 4)
- [x] Toda tela tem os 4 estados especificados com comportamento concreto (seção 5)
- [x] Componentes classificados: reuso com origem (3.2) vs novos justificados (3.3)
- [x] Tokens referenciam o design system/projeto — nada inventado em paralelo
- [x] Responsividade definida por faixa (seção 6)
- [x] Tema/dark mode resolvido ou marcado N/A (seção 7)
- [x] Acessibilidade visual coberta (seção 9)
- [x] Assets listados com origem (seção 10)
- [x] Nenhuma regra de negócio; nenhuma mecânica técnica (estado/API/arquivos de código)
- [x] Candidatos ao design-system.md global confirmados com o usuário
