# DESENVOLVIMENTO — ÁREA DO CLIENTE PARA AGENDAMENTO

Você é um engenheiro de software sênior especialista em:

- React
- Next.js
- TypeScript
- Firebase
- Material Design 3
- UX mobile-first
- sistemas de agendamento
- concorrência de dados
- testes automatizados

Sua tarefa é desenvolver a **frente do cliente de um sistema de agendamento extremamente simples**.

O cliente NÃO possui conta.

O cliente NÃO possui login.

O cliente NÃO realiza cadastro.

O único objetivo da aplicação é permitir que uma pessoa informe seus dados básicos e solicite um horário disponibilizado pelo administrador.

---

# 1. STACK OBRIGATÓRIA

Utilizar:

- Next.js;
- React;
- TypeScript;
- Firebase;
- Firestore;
- Material Design 3;
- dark theme;
- abordagem mobile-first.

Não adicionar bibliotecas desnecessárias.

---

# 2. PRINCÍPIO PRINCIPAL

O fluxo deverá ser extremamente simples.

Deverá possuir três etapas:

TELA 01

Identificação

↓

TELA 02

Escolha de profissional, data e horário

↓

TELA 03

Confirmação / sucesso

Não adicionar etapas desnecessárias.

---

# 3. NÃO EXISTE CADASTRO

É proibido criar:

- usuário;
- senha;
- login;
- conta;
- perfil;
- recuperação de senha;
- login social;
- cadastro.

O cliente deverá informar apenas:

Nome

Telefone

Esses dados serão utilizados somente para identificação do agendamento.

---

# 4. TELA 01 — IDENTIFICAÇÃO

Criar tela inicial contendo:

Título

Nome

Telefone

Botão:

"Continuar"

Campos obrigatórios:

nome

telefone

---

# 5. NOME

Regras:

- obrigatório;
- remover espaços extras;
- não aceitar apenas espaços;
- possuir tamanho mínimo razoável.

Não criar validações excessivamente restritivas.

---

# 6. TELEFONE

O telefone será o identificador principal do cliente.

Permitir telefone brasileiro.

Aplicar máscara visual.

Exemplo:

(61) 99999-9999

Antes de salvar:

normalizar.

Exemplo:

Entrada:

(61) 99999-9999

Persistência:

5561999999999

Criar função centralizada de normalização.

Não espalhar lógica de telefone pelos componentes.

---

# 7. TELA 02 — AGENDAMENTO

Após informar:

- nome;
- telefone;

o cliente deverá acessar a seleção de agendamento.

A tela deverá permitir:

1. escolher profissional;
2. escolher dia;
3. escolher horário.

---

# 8. PROFISSIONAL

Exibir somente profissionais:

ativos.

Mostrar:

Nome

CREF

Não mostrar informações administrativas.

---

# 9. CALENDÁRIO

O cliente NÃO poderá selecionar qualquer dia.

O calendário deverá disponibilizar somente dias previamente liberados pelo administrador.

Exemplo:

Se o administrador cadastrou:

15/08

16/08

20/08

somente esses dias poderão ser selecionados.

Os demais dias devem aparecer:

- bloqueados;
- desabilitados;
- sem interação.

---

# 10. HORÁRIOS

Depois que o cliente selecionar um dia:

buscar os horários disponíveis para:

profissional + data.

Exemplo:

08:00

09:00

10:00

14:00

15:00

Não mostrar horários indisponíveis como se estivessem disponíveis.

Preferencialmente nem exibir horários ocupados.

---

# 11. REGRA DE DISPONIBILIDADE

Um horário somente poderá aparecer para o cliente quando:

- foi liberado pelo administrador;
- está ativo;
- não possui agendamento CONFIRMADO;
- não possui agendamento AGUARDANDO_CONFIRMACAO.

Portanto:

AGUARDANDO_CONFIRMACAO = HORÁRIO INDISPONÍVEL

CONFIRMADO = HORÁRIO INDISPONÍVEL

CANCELADO = HORÁRIO DISPONÍVEL NOVAMENTE

---

# 12. REGRA — MESMO CLIENTE

O mesmo cliente não poderá realizar dois agendamentos para o mesmo dia.

O identificador utilizado para essa regra deverá ser:

telefoneNormalizado.

Exemplo proibido:

Telefone:

5561999999999

Agendamento:

15/08/2026 às 09:00

Novo agendamento:

15/08/2026 às 15:00

Resultado:

BLOQUEAR.

Mensagem amigável:

"Você já possui um agendamento para este dia."

Considerar como agendamento existente os status:

AGUARDANDO_CONFIRMACAO

CONFIRMADO

Não considerar:

CANCELADO.

---

# 13. REGRA — MESMO HORÁRIO

Dois clientes diferentes nunca poderão reservar o mesmo horário.

Exemplo:

João

15/08/2026

09:00

Se João conseguiu reservar:

Maria não poderá reservar:

15/08/2026

09:00

---

# 14. CONCORRÊNCIA

Este requisito é crítico.

Não confiar apenas em:

- estado React;
- botão desabilitado;
- consulta anterior;
- validação visual.

Dois clientes podem selecionar o mesmo horário simultaneamente.

Portanto a criação do agendamento deverá utilizar operação atômica no Firebase.

Fluxo obrigatório:

Cliente seleciona horário

↓

Clica em confirmar

↓

Iniciar transação

↓

Validar se o horário continua disponível

↓

Validar se o telefone já possui agendamento naquele dia

↓

Criar agendamento

↓

Bloquear horário

↓

Finalizar transação

Caso alguma regra falhe:

não criar agendamento.

---

# 15. STATUS INICIAL

Todo novo agendamento deverá ser criado com:

AGUARDANDO_CONFIRMACAO

Nunca criar diretamente como:

CONFIRMADO.

Somente administrador poderá confirmar.

---

# 16. MODELO DO AGENDAMENTO

Exemplo conceitual:

{
"id": "...",
"nomeCliente": "João Silva",
"telefone": "(61) 99999-9999",
"telefoneNormalizado": "5561999999999",
"profissionalId": "...",
"data": "2026-08-15",
"horario": "09:00",
"status": "AGUARDANDO_CONFIRMACAO",
"criadoEm": "..."
}

---

# 17. CONFIRMAÇÃO ANTES DE SALVAR

Antes da criação definitiva:

mostrar resumo.

Exemplo:

Nome:
João Silva

Profissional:
Maria Silva

Data:
15/08/2026

Horário:
09:00

Botões:

Voltar

Confirmar agendamento

O usuário deverá verificar os dados antes de confirmar.

---

# 18. TELA 03 — SUCESSO

Depois da criação do agendamento:

mostrar tela de sucesso.

Essa tela deve deixar claro que:

o horário foi solicitado, mas ainda aguarda confirmação administrativa.

Não utilizar linguagem que indique confirmação definitiva.

Exemplo:

"Agendamento solicitado!"

"Seu horário foi reservado e está aguardando confirmação."

---

# 19. TEXTOS CONFIGURÁVEIS

Os textos da tela de sucesso deverão ser carregados do Firebase.

O administrador poderá configurar:

- título;
- descrição;
- regras;
- dicas;
- avisos.

Portanto:

NÃO deixar esses textos fixos dentro da aplicação.

Caso configuração não exista:

utilizar fallback seguro definido pelo projeto.

---

# 20. REGRAS, DICAS E AVISOS

A tela final poderá apresentar seções como:

Regras

Dicas

Avisos importantes

Exemplo:

REGRAS

- Compareça no horário marcado.
- Em caso de atraso, entre em contato.

DICAS

- Chegue alguns minutos antes.
- Utilize roupa adequada.

AVISO

"Seu agendamento somente será considerado confirmado após aprovação."

Os conteúdos reais devem vir do Firebase.

---

# 21. CORES PERSONALIZÁVEIS

As cores utilizadas pelo cliente deverão ser carregadas das configurações definidas pelo administrador.

Exemplo:

configuracoes/aparencia

corPrimaria

corSecundaria

corDestaque

Essas configurações deverão alimentar o tema da aplicação.

Não espalhar valores de cores pelos componentes.

Criar ThemeProvider ou estrutura equivalente.

---

# 22. DARK THEME

O tema da aplicação deverá ser predominantemente escuro.

Seguir Material Design 3.

Priorizar:

- legibilidade;
- acessibilidade;
- contraste;
- hierarquia;
- simplicidade;
- áreas de toque grandes;
- cards;
- espaçamentos consistentes.

O usuário deve conseguir realizar todo o fluxo facilmente utilizando apenas uma mão no celular.

---

# 23. MOBILE-FIRST

Desenvolver primeiro para celular.

Garantir bom funcionamento em:

320px

375px

390px

430px

Depois adaptar para:

tablet

desktop

Não desenvolver desktop primeiro para depois tentar adaptar.

---

# 24. CALENDÁRIO MOBILE

O calendário deverá possuir boa experiência mobile.

Dias disponíveis:

claramente identificados.

Dias indisponíveis:

visualmente desabilitados.

Dia selecionado:

claramente destacado.

Não depender somente de cor para indicar estado.

---

# 25. HORÁRIOS MOBILE

Horários deverão aparecer preferencialmente como:

chips

cards pequenos

botões selecionáveis

Exemplo:

08:00 09:00

10:00 11:00

14:00 15:00

O horário selecionado deve possuir estado visual inequívoco.

---

# 26. ESTADO ENTRE TELAS

As informações:

nome

telefone

profissional

data

horário

devem permanecer durante o fluxo.

Não salvar agendamento incompleto no Firebase.

Persistir somente depois da confirmação final.

---

# 27. REFRESH DE DISPONIBILIDADE

A disponibilidade deverá ser considerada dinâmica.

Um horário pode ficar indisponível enquanto o cliente está com a tela aberta.

Antes de confirmar:

validar novamente.

Nunca assumir que um horário continua disponível apenas porque estava disponível alguns segundos antes.

---

# 28. FIREBASE

O cliente deverá possuir acesso somente ao mínimo necessário.

Pode:

- listar profissionais ativos;
- consultar datas disponíveis;
- consultar horários disponíveis;
- consultar configuração visual pública;
- consultar textos públicos;
- criar agendamento respeitando regras.

Não pode:

- listar todos os agendamentos;
- alterar agendamentos;
- confirmar agendamentos;
- cancelar agendamentos administrativos;
- criar profissionais;
- editar profissionais;
- criar disponibilidade;
- editar disponibilidade;
- alterar configurações.

---

# 29. PRIVACIDADE

Não expor dados de outros clientes.

O frontend nunca deverá receber:

- nome de outros clientes;
- telefone de outros clientes;
- lista completa de agendamentos.

Para disponibilidade, o cliente precisa saber apenas:

DISPONÍVEL

ou

INDISPONÍVEL.

Nunca retornar:

"09:00 está reservado por João."

---

# 30. ARQUITETURA

Estrutura sugerida:

src/
app/
components/
features/
identificacao/
profissionais/
calendario/
horarios/
agendamento/
sucesso/
services/
firebase/
repositories/
providers/
models/
validators/
hooks/
utils/
types/

Separar claramente:

UI

regra de negócio

acesso a dados

validações.

---

# 31. COMPONENTES

Componentes React não devem conhecer detalhes de implementação do Firebase.

Exemplo errado:

ComponenteCalendario
↓
getDocs(...)
collection(...)
firebase...

Exemplo correto:

ComponenteCalendario
↓
DisponibilidadeRepository
↓
Firebase

---

# 32. LOADING

Toda operação assíncrona deverá possuir estado de loading.

Exemplos:

Carregando profissionais...

Carregando agenda...

Confirmando agendamento...

Evitar múltiplos cliques durante processamento.

---

# 33. ERROS

Criar mensagens claras.

Exemplos:

"Esse horário acabou de ser reservado por outra pessoa. Escolha outro horário."

"Você já possui um agendamento neste dia."

"Não foi possível concluir seu agendamento. Tente novamente."

"Não existem horários disponíveis nesta data."

Não mostrar stack trace ou erro técnico ao cliente.

---

# 34. TESTES OBRIGATÓRIOS

Criar testes para:

TELA 01

- nome obrigatório;
- telefone obrigatório;
- telefone normalizado;
- avanço do fluxo.

CALENDÁRIO

- mostrar somente datas liberadas;
- bloquear datas indisponíveis.

HORÁRIOS

- mostrar somente horários disponíveis;
- bloquear horários aguardando confirmação;
- bloquear horários confirmados.

AGENDAMENTO

- criação com status AGUARDANDO_CONFIRMACAO;
- impedir dois clientes no mesmo horário;
- impedir mesmo telefone duas vezes no mesmo dia;
- permitir novo agendamento após cancelamento;
- tratar concorrência.

SUCESSO

- carregar configurações;
- carregar textos;
- apresentar resumo correto.

---

# 35. REGRAS ABSOLUTAS

É PROIBIDO:

- criar cadastro;
- criar login;
- criar senha;
- criar perfil do cliente;
- permitir dois agendamentos no mesmo horário;
- permitir dois agendamentos do mesmo telefone no mesmo dia;
- mostrar horários AGUARDANDO_CONFIRMACAO;
- mostrar horários CONFIRMADOS;
- expor informações de outros clientes;
- deixar regra crítica somente no frontend;
- salvar agendamento incompleto;
- considerar AGUARDANDO_CONFIRMACAO como horário livre;
- colocar acesso Firebase diretamente em componentes;
- duplicar regras.

---

# 36. FLUXO FINAL

O fluxo esperado deve ser exatamente:

INÍCIO

↓

Nome

Telefone

↓

Continuar

↓

Escolher profissional

↓

Escolher data disponível

↓

Escolher horário disponível

↓

Revisar informações

↓

Confirmar

↓

Transação Firebase

↓

Validar horário

↓

Validar telefone + data

↓

Criar AGUARDANDO_CONFIRMACAO

↓

Bloquear horário

↓

Tela de sucesso

↓

Exibir regras, dicas e avisos.

---

# 37. CRITÉRIO DE ACEITE

A frente cliente estará concluída quando:

1. não existir cadastro;
2. não existir login;
3. cliente informar somente nome e telefone;
4. somente profissionais ativos aparecerem;
5. somente datas liberadas aparecerem;
6. somente horários disponíveis aparecerem;
7. horário aguardando confirmação desaparecer da disponibilidade;
8. horário confirmado permanecer indisponível;
9. horário cancelado voltar a ficar disponível;
10. mesmo telefone não conseguir dois agendamentos no mesmo dia;
11. duas pessoas não conseguirem reservar o mesmo horário;
12. concorrência estiver protegida no Firebase;
13. agendamento nascer como AGUARDANDO_CONFIRMACAO;
14. cores serem carregadas das configurações;
15. textos de sucesso serem carregados das configurações;
16. toda interface ser mobile-first;
17. interface utilizar dark theme;
18. interface seguir Material Design 3;
19. nenhuma informação de outro cliente ficar exposta.

Não criar funcionalidades fora deste escopo.
