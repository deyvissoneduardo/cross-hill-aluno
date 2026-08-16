# Design System — Crosshill Aluno

> Design system global mínimo, criado de forma lazy a partir da feature `agendamento-cliente/v1`.

## 1. Princípios Globais

- Interface mobile-first, utilitária e direta.
- Tema dark-first com alto contraste e superfícies bem separadas.
- Fluxos orientados a uma ação principal por etapa.
- Estados visuais sempre contextuais: loading no lugar do conteúdo, erro no bloco afetado e vazio com orientação curta.

## 2. Tokens

| Categoria | Token | Uso |
|---|---|---|
| Cores | `--background` | Fundo base da aplicação. |
| Cores | `--foreground` | Texto principal. |
| Cores | `--surface` | Painéis, cards e blocos de conteúdo. |
| Cores | `--surface-muted` | Blocos secundários e áreas de resumo. |
| Cores | `--border-subtle` | Bordas discretas de cards, campos e divisores. |
| Cores | `--text-muted` | Texto secundário e descrições. |
| Cores | `--accent` | CTA principal, seleção ativa e foco de ação. |
| Cores | `--success` | Confirmação visual de solicitação enviada. |
| Cores | `--warning` | Avisos de aguardando confirmação e atenção. |
| Cores | `--danger` | Erros bloqueantes e mensagens críticas. |
| Tipografia | `--font-sans` | Fonte principal da interface. |
| Tipografia | `--font-mono` | Uso pontual para dados técnicos ou códigos, se necessário. |
| Espaçamento | `space-2` a `space-8` | Ritmo de layout, campos, cards e seções. |
| Raio | `radius-sm` | Campos, chips e botões pequenos. |
| Raio | `radius-md` | Painéis e cards. |

## 3. Componentes Globais

| Componente | Descrição | Uso Esperado |
|---|---|---|
| `AppShell` | Contêiner de página com fundo dark-first e painel central responsivo. | Fluxos focados de cliente. |
| `StepProgress` | Indicador discreto de etapa atual, sem transformar o fluxo em wizard pesado. | Jornadas lineares curtas. |
| `FormField` | Campo com label, apoio e erro inline. | Formulários simples. |
| `PrimaryButton` | Ação principal com área de toque confortável. | Avançar, solicitar, tentar novamente. |
| `SecondaryButton` | Ação secundária ou retorno. | Voltar e ações não destrutivas. |
| `SelectionCard` | Card selecionável com estado default, hover/focus, selecionado e desabilitado. | Profissionais, dias e opções importantes. |
| `TimeChip` | Chip selecionável compacto com estado selecionado/desabilitado. | Horários. |
| `InlineBanner` | Mensagem contextual dentro do bloco afetado. | Erros, indisponibilidade e avisos. |
| `SummaryList` | Lista de rótulo/valor com hierarquia compacta. | Revisão antes do envio. |
| `SkeletonBlock` | Placeholder de carregamento com dimensão estável. | Loading contextual por bloco. |

## 4. Padrões de Estado

| Estado | Padrão Global |
|---|---|
| Loading | Skeleton contextual no lugar do conteúdo carregado. |
| Erro | `InlineBanner` no topo do bloco afetado, com ação de recuperação quando houver. |
| Vazio | Bloco compacto com título, texto de orientação e sem ilustração pesada. |
| Sucesso | Ícone simples, título claro e texto que explicita o estado alcançado. |

## 5. Responsividade

- **Base:** 320px a 430px, com largura total e padding confortável.
- **Média:** painel centralizado com largura contida e respiro lateral.
- **Larga:** manter foco no painel; não transformar fluxos simples em dashboard.

## 6. Motion

- Transições curtas e funcionais para seleção, troca de etapa e entrada de banners.
- Motion não deve competir com a conclusão rápida do fluxo.
- Em preferência por movimento reduzido, transições devem ser removidas ou reduzidas ao mínimo perceptível.
