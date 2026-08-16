# Prompt: migrar deep links de `uni_links5` para `app_links 7.1.2`

## Objetivo

Migrar a implementação atual de deep links do projeto Expert Login APP de
`uni_links5: ^0.5.4` para `app_links: 7.1.2`, preservando o comportamento
existente de navegação para aprovação de suprimentos e melhorando o tratamento
de links recebidos com o app fechado, em background e já aberto.

Siga obrigatoriamente as regras em `.codex/rules`, especialmente:

- Código e comunicação em pt-BR.
- `dart format` ao final.
- Sem `print()` em código de produção.
- Preferir `async/await` com `try/catch`.
- Verificar `mounted` antes de `setState`/navegação após operações assíncronas.
- Manter `StatefulWidget`/`setState` como padrão de estado do projeto.
- Respeitar a estrutura em `lib/app/core`, `lib/app/modules`,
  `lib/app/models` e `lib/app/repositories`.

## Estado atual encontrado

### Dependência

Arquivo: `pubspec.yaml`

```yaml
uni_links5: ^0.5.4
```

Deve ser substituída por:

```yaml
app_links: 7.1.2
```

Depois executar:

```bash
flutter pub get
```

### Uso atual no Dart

Arquivo: `lib/app/modules/home/home_page.dart`

Import atual:

```dart
import 'package:uni_links5/uni_links.dart';
```

Estado atual:

```dart
StreamSubscription<Uri?>? _sub;
```

Método atual:

```dart
void _handleIncomingLinks() async {
  if (widget.link == false) return;

  String? url = await getInitialLink();
  ...
  final Uri uri = Uri.parse(url);
  final tarefaID = uri.queryParameters['TarefaId'];
  final title = uri.queryParameters['Processo'];
  ...
}
```

Observações importantes:

- Hoje o app só chama `getInitialLink()`.
- Não existe listener ativo para links recebidos enquanto o app já está aberto
  ou voltando do background.
- A variável `_sub` existe, mas não é usada.
- A regra de negócio do deep link está acoplada à `HomePage`.
- A função `_emailAndSenhaUser()` é assíncrona, mas retorna `void`; o fluxo usa
  `Future.delayed(Duration(seconds: 3))` para esperar email/senha, o que é frágil.
- Existem vários `print()` no arquivo, inclusive no fluxo de deep link, violando
  `.codex/rules/dart-coding-standards.mdc`.

### Regra de negócio do deep link

O link esperado contém query parameters:

- `TarefaId`
- `Processo`

Exemplo de formato esperado:

```text
https://<dominio>/<path>?TarefaId=123&Processo=Mapa
```

Fluxo atual:

1. Lê o link inicial.
2. Extrai `TarefaId` e `Processo`.
3. Busca email e senha do `FlutterSecureStorage` via `OAuthToken`.
4. Consulta `DocumentosAutorizadosRepositoryImpl.listarTarefasEmberto`.
5. Usa um período amplo: data atual - 5 anos até data atual + 5 anos.
6. Se não houver tarefa válida, mostra "Tarefa já encerrada" e navega para
   `SuprimentosPorFiltroPage`.
7. Se encontrar tarefa compatível por `tarefaId` ou por categoria contendo
   `Processo`, navega para `ListaDocumentosAprovacaoPage`.
8. Define o tipo do documento conforme `tarefaCategoria`:
   - contém `Mapa` => `TiposSuprimentos.Mapa`
   - contém `Contrato` => `TiposSuprimentos.ContratoEmpreiteiro`,
     `TitulosConstantes.contratoDeSubEmpreiteiro`, `idTipoOrigemAnexo = 3`
   - contém `Pedido` => `TiposSuprimentos.PedidoDeCompras`,
     `TitulosConstantes.compras`, `idTipoOrigemAnexo = 5`

### Android

Arquivo: `android/app/src/main/AndroidManifest.xml`

Activity:

```xml
<activity
    android:exported="true"
    android:name=".MainActivity"
    android:launchMode="singleTop"
    ...>
```

Intent filters existentes:

```xml
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data
        android:scheme="https"
        android:host="suporte.expertsystem.com.br"
    />
</intent-filter>

<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data
        android:scheme="https"
        android:host="expertloginapp.web.app"
    />
</intent-filter>

<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data
        android:scheme="https"
        android:host="suporte.expertsystem.com.br"
        android:pathPrefix="/suprimentos"
    />
</intent-filter>

<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data
        android:scheme="https"
        android:host="expertloginapp.web.app"
        android:pathPrefix="/"
    />
</intent-filter>
```

Domínios Android que o app escuta:

- `https://suporte.expertsystem.com.br`
- `https://suporte.expertsystem.com.br/suprimentos...`
- `https://expertloginapp.web.app`
- `https://expertloginapp.web.app/...`

Para `app_links`, adicionar dentro da activity:

```xml
<meta-data
    android:name="flutter_deeplinking_enabled"
    android:value="false" />
```

Justificativa: a documentação do `app_links` informa que, a partir do Flutter
3.24, é necessário desabilitar explicitamente o deep linking padrão do Flutter
quando o plugin assume esse controle.

Também revisar se os filtros duplicados podem ser consolidados sem alterar o
comportamento. Se houver dúvida, preservar os filtros atuais e apenas adicionar
o `meta-data`.

### iOS

Arquivos:

- `ios/Runner/Runner.entitlements`
- `ios/Runner/RunnerDebug.entitlements`
- `ios/Runner/RunnerRelease.entitlements`

Domínios configurados:

```xml
<string>applinks:expertloginapp.web.app</string>
<string>applinks:soccer-7898e.web.app</string>
```

Ponto de atenção:

- Android escuta `suporte.expertsystem.com.br` e `expertloginapp.web.app`.
- iOS escuta `expertloginapp.web.app` e `soccer-7898e.web.app`.
- Existe divergência entre Android e iOS. Antes de remover ou adicionar domínio,
  confirmar a origem real dos links de produção.
- Se `suporte.expertsystem.com.br` também deve abrir no iOS, adicionar
  `applinks:suporte.expertsystem.com.br` nos três entitlements e garantir que o
  domínio possua arquivo AASA válido.

## Referências técnicas verificadas

- Repositório `app_links`: `https://github.com/llfbandit/app_links`
- Documentação Android do plugin:
  `https://github.com/llfbandit/app_links/blob/main/doc/README_android.md`
- O plugin recomenda instanciar `AppLinks` cedo para capturar o primeiro link em
  cold start.
- O fluxo recomendado é assinar `appLinks.uriLinkStream`, que emite o link
  inicial e links posteriores.

Exemplo base:

```dart
final appLinks = AppLinks();

final sub = appLinks.uriLinkStream.listen((uri) {
  // navegar/tratar link
});
```

## Ordem de importância da migração

### 1. Substituir dependência e imports

1. Remover `uni_links5` do `pubspec.yaml`.
2. Adicionar `app_links: 7.1.2`.
3. Executar `flutter pub get`.
4. Substituir:

```dart
import 'package:uni_links5/uni_links.dart';
```

por:

```dart
import 'package:app_links/app_links.dart';
```

### 2. Implementar listener único de deep link

Na `HomePageState`, adicionar:

```dart
late final AppLinks _appLinks;
StreamSubscription<Uri>? _sub;
```

Inicializar em `initState`:

```dart
_appLinks = AppLinks();
_handleIncomingLinks();
```

Refatorar `_handleIncomingLinks` para assinar `uriLinkStream`:

```dart
void _handleIncomingLinks() {
  if (widget.link == false) return;

  _sub = _appLinks.uriLinkStream.listen(
    _handleDeepLink,
    onError: (Object error, StackTrace stackTrace) {
      log('Erro ao receber deep link', error: error, stackTrace: stackTrace);
    },
  );
}
```

Criar um método separado:

```dart
Future<void> _handleDeepLink(Uri uri) async {
  ...
}
```

Motivo: `app_links` usa `Uri` diretamente, reduzindo parse manual e permitindo
tratar link inicial e links futuros em um fluxo único.

### 3. Preservar a regra de negócio com validação dos parâmetros

Dentro de `_handleDeepLink(Uri uri)`:

1. Ler `TarefaId` e `Processo`.
2. Validar ausência ou formato inválido antes de consultar repositório.
3. Usar `int.tryParse(tarefaId)` em vez de `int.parse`.
4. Se parâmetros inválidos, mostrar mensagem genérica e encerrar fluxo sem
   crash.

Exemplo:

```dart
final tarefaId = int.tryParse(uri.queryParameters['TarefaId'] ?? '');
final title = uri.queryParameters['Processo'];

if (tarefaId == null || title == null || title.isEmpty) {
  _message.showMessageInfo(
    context: context,
    text: 'Link inválido para abertura de tarefa',
  );
  return;
}
```

### 4. Corrigir leitura assíncrona de email/senha

Substituir `_emailAndSenhaUser()` por método que retorna os valores:

```dart
Future<({String email, String senha})?> _getEmailAndSenhaUser() async {
  final email = await _authToken.readStorage(
    ChavesFlutterSecureStorage.EmailUsuarioLogin,
  );
  final senha = await _authToken.readStorage(
    ChavesFlutterSecureStorage.SenhaUsuarioLogin,
  );

  if (email == null || senha == null) return null;

  return (email: email, senha: senha);
}
```

No fluxo:

```dart
final credentials = await _getEmailAndSenhaUser();
if (credentials == null) {
  _message.showMessageError(
    context: context,
    text: 'Não foi possível carregar os dados do usuário.',
  );
  return;
}
```

Remover o `Future.delayed(Duration(seconds: 3))`.

### 5. Evitar crash quando a lista de documentos estiver vazia

O código atual acessa `documentos[0]` sem validar se a lista está vazia.
Adicionar guarda:

```dart
if (documentos.isEmpty) {
  _message.showMessageInfo(context: context, text: 'Tarefa já encerrada');
  _navigateToSuprimentosPorFiltro(periodoDe, periodoAte);
  return;
}
```

Também corrigir a checagem inválida:

```dart
if (documentos.contains('Tarefa já encerrada')) { ... }
```

`documentos` é uma lista de `TarefasEmAbertoResponse`, então comparar com
`String` não funciona. Usar campos do model, por exemplo `descricao`, se essa
for a fonte real da mensagem.

### 6. Extrair navegação repetida para métodos privados

Criar helpers dentro da `HomePageState`:

```dart
void _navigateToSuprimentosPorFiltro(String periodoDe, String periodoAte) { ... }

void _navigateToListaDocumentos({
  required String title,
}) { ... }
```

Manter os métodos privados na própria `HomePageState` nesta migração para
reduzir risco. Só criar service/helper em `core` se a lógica for reutilizada em
outra tela.

### 7. Ajustar `setState`, `mounted` e loading

Antes e depois das operações assíncronas:

```dart
if (!mounted) return;
setState(() => _isLoading = true);
```

Ao finalizar:

```dart
if (!mounted) return;
setState(() => _isLoading = false);
```

Usar `try/catch/finally` para garantir que `_isLoading` volte para `false`
também em caso de erro.

### 8. Remover `print()` do fluxo tocado

Remover `print()` adicionados para debug no fluxo de deep link. Se precisar
registrar erro técnico, usar `log()` sem expor email, senha, token ou dados
sensíveis.

### 9. Atualizar AndroidManifest

Adicionar dentro de `.MainActivity`:

```xml
<meta-data
    android:name="flutter_deeplinking_enabled"
    android:value="false" />
```

Preservar `android:launchMode="singleTop"`.

Não remover hosts ou path prefixes sem confirmação funcional.

### 10. Revisar entitlements iOS

Manter os domínios existentes. Documentar a divergência:

- Android: `suporte.expertsystem.com.br`, `expertloginapp.web.app`
- iOS: `expertloginapp.web.app`, `soccer-7898e.web.app`

Se o link oficial for `suporte.expertsystem.com.br`, atualizar os três
entitlements e validar o AASA no domínio.

## Critérios de aceite

- `pubspec.yaml` usa `app_links: 7.1.2` e não usa mais `uni_links5`.
- Nenhum arquivo importa `package:uni_links5/uni_links.dart`.
- `HomePage` recebe links via `AppLinks().uriLinkStream`.
- Link inicial com app fechado continua funcionando.
- Link recebido com app em background funciona.
- Link recebido com app já aberto funciona.
- A subscription é cancelada em `dispose`.
- Não há `Future.delayed` usado para aguardar email/senha.
- `TarefaId` inválido não causa crash.
- Lista vazia de documentos não causa crash.
- Loading é encerrado em sucesso e erro.
- Não há `print()` novo no fluxo migrado.
- `dart format` executado nos arquivos alterados.
- `flutter analyze` executado e sem novos erros.

## Plano de testes completo

Execute os testes em duas fases:

1. **Antes da migração**, para registrar o comportamento atual com `uni_links5`
   e identificar falhas já existentes.
2. **Depois da migração**, para comprovar que `app_links: 7.1.2` preservou o
   comportamento esperado e corrigiu os pontos frágeis do fluxo.

### 1. Testes de linha de base antes da migração

Antes de alterar código, executar e registrar resultado:

```bash
flutter pub get
flutter analyze
flutter test
```

Registrar também:

- Versão do Flutter com `flutter --version`.
- Plataforma testada: Android físico, Android emulator, iPhone físico,
  iOS simulator.
- Link usado em cada teste.
- Estado do app: fechado, background, foreground.
- Resultado observado: abriu app, navegou corretamente, mostrou erro, travou,
  ficou em loading ou ignorou link.

Validar manualmente o comportamento atual com `uni_links5`:

- App fechado + link válido.
- App em background + link válido.
- App aberto + link válido.
- Link sem `TarefaId`.
- Link com `TarefaId` inválido.
- Link sem `Processo`.
- Link com `Processo` desconhecido.
- Link de cada domínio configurado no Android.
- Link de cada domínio configurado no iOS.

Importante: se algum cenário já falhar antes da migração, registrar como falha
pré-existente. A migração não deve mascarar regressões nem assumir que tudo
funcionava antes.

### 2. Testes estáticos obrigatórios depois da migração

Executar:

```bash
flutter pub get
dart format lib/app/modules/home/home_page.dart
flutter analyze
flutter test
```

Validar com busca textual:

```bash
rg -n "uni_links5|uni_links|getInitialLink|getInitialUri|getLinksStream|getUriLinksStream" .
rg -n "package:app_links/app_links.dart|AppLinks|uriLinkStream" lib
rg -n "flutter_deeplinking_enabled" android/app/src/main/AndroidManifest.xml
```

Resultado esperado:

- Nenhuma referência restante a `uni_links5`.
- Nenhum uso restante de `getInitialLink()`.
- `app_links: 7.1.2` presente no `pubspec.yaml`.
- `package:app_links/app_links.dart` importado onde necessário.
- `AppLinks().uriLinkStream` usado para receber link inicial e links
  posteriores.
- `flutter_deeplinking_enabled=false` presente na `MainActivity`.
- `flutter analyze` sem novos erros.
- `flutter test` sem novas falhas.

### 3. Testes unitários recomendados

Se a migração extrair a lógica para métodos/helpers testáveis, criar testes em
`test/unit/` para os seguintes cenários:

#### Parsing e validação do link

- Deve aceitar link com `TarefaId` numérico e `Processo` preenchido.
- Deve rejeitar link sem `TarefaId`.
- Deve rejeitar link com `TarefaId` vazio.
- Deve rejeitar link com `TarefaId` não numérico.
- Deve rejeitar link sem `Processo`.
- Deve rejeitar link com `Processo` vazio.
- Deve preservar caracteres especiais ou acentos em `Processo`, caso venham
  codificados na URL.
- Deve tratar query parameters em qualquer ordem.
- Deve ignorar query parameters extras sem falhar.
- Deve tratar URL com path `/suprimentos`.
- Deve tratar URL com path `/`.
- Deve tratar URL com trailing slash.
- Deve tratar URL com parâmetros percent-encoded.

Exemplos de entradas:

```text
https://suporte.expertsystem.com.br/suprimentos?TarefaId=123&Processo=Mapa
https://expertloginapp.web.app/?Processo=Pedido&TarefaId=456
https://expertloginapp.web.app/suprimentos?TarefaId=abc&Processo=Mapa
https://expertloginapp.web.app/suprimentos?TarefaId=123
https://expertloginapp.web.app/suprimentos?Processo=Mapa
```

#### Seleção do tipo de documento

Testar a regra que mapeia `tarefaCategoria`:

- Categoria contendo `Mapa` deve usar `TiposSuprimentos.Mapa`.
- Categoria contendo `Contrato` deve usar
  `TiposSuprimentos.ContratoEmpreiteiro`, contexto
  `TitulosConstantes.contratoDeSubEmpreiteiro` e `idTipoOrigemAnexo = 3`.
- Categoria contendo `Pedido` deve usar `TiposSuprimentos.PedidoDeCompras`,
  contexto `TitulosConstantes.compras` e `idTipoOrigemAnexo = 5`.
- Categoria desconhecida não deve causar crash.
- Categoria nula ou vazia não deve causar crash.

#### Seleção da tarefa

Testar lista de `TarefasEmAbertoResponse`:

- Deve selecionar tarefa por `tarefaId` igual ao `TarefaId` do link.
- Deve selecionar tarefa por categoria contendo `Processo`.
- Deve priorizar comportamento atual se houver mais de uma tarefa compatível.
- Lista vazia deve retornar estado de tarefa encerrada/ausente.
- Item com `tarefaId == 0` deve retornar erro com `descricao`, se disponível.
- Item com campos nulos não deve causar crash.

#### Credenciais

Testar fluxo de leitura de credenciais, se extraído:

- Email e senha presentes retornam sucesso.
- Email ausente retorna erro controlado.
- Senha ausente retorna erro controlado.
- Email/senha ausentes não chamam o repository.

### 4. Testes widget recomendados

Criar ou ajustar testes em `test/widget/` se a lógica continuar na `HomePage`.
Usar mocks/fakes para `IOAuthToken`, repository de documentos e mensageria
sempre que a estrutura permitir.

Cenários:

- Ao receber link válido, deve exibir loading durante consulta.
- Ao concluir consulta com tarefa válida, deve navegar para
  `ListaDocumentosAprovacaoPage`.
- Ao concluir consulta sem tarefa, deve navegar para
  `SuprimentosPorFiltroPage`.
- Link inválido deve mostrar mensagem e não navegar.
- Erro no repository deve remover loading e mostrar erro genérico.
- Widget descartado durante operação assíncrona não deve chamar `setState`.
- `dispose()` deve cancelar a subscription de deep link.

Se `AppLinks` dificultar teste direto, isolar a assinatura em uma interface ou
helper injetável para permitir emitir `Uri` em testes sem depender do plugin.
Seguir o padrão do projeto: interfaces quando fizer sentido e GetIt se a
dependência virar serviço compartilhado.

### 5. Testes de integração recomendados

Criar testes em `integration_test/` apenas se houver ambiente e credenciais
controladas. Não usar credenciais reais em repositório.

Cenários:

- Abrir app sem deep link e garantir que `HomePage` funciona normalmente.
- Abrir app via deep link válido e garantir navegação para aprovação.
- Enviar segundo deep link com app aberto e garantir que ele é processado.
- Enviar deep link inválido e garantir que o app não fecha nem trava.
- Simular retorno do app do background com deep link.

Quando o backend real for necessário, preferir ambiente de homologação com
usuário de teste e tarefas controladas.

### 6. Testes manuais Android

Antes dos testes:

```bash
flutter clean
flutter pub get
flutter run
```

Verificar o package instalado:

```bash
adb shell pm list packages | rg "expertsystem"
```

Testar com app fechado:

```bash
adb shell am start -a android.intent.action.VIEW \
  -d "https://suporte.expertsystem.com.br/suprimentos?TarefaId=123&Processo=Mapa" \
  com.expertsystem.expertsystem
```

Testar com app em background:

1. Abrir o app normalmente.
2. Enviar o app para background.
3. Executar:

```bash
adb shell am start -a android.intent.action.VIEW \
  -d "https://suporte.expertsystem.com.br/suprimentos?TarefaId=123&Processo=Contrato" \
  com.expertsystem.expertsystem
```

Testar com app já aberto em foreground:

```bash
adb shell am start -a android.intent.action.VIEW \
  -d "https://expertloginapp.web.app/suprimentos?TarefaId=123&Processo=Pedido" \
  com.expertsystem.expertsystem
```

Testar todos os hosts Android:

```bash
adb shell am start -a android.intent.action.VIEW \
  -d "https://suporte.expertsystem.com.br?TarefaId=123&Processo=Mapa" \
  com.expertsystem.expertsystem

adb shell am start -a android.intent.action.VIEW \
  -d "https://suporte.expertsystem.com.br/suprimentos?TarefaId=123&Processo=Mapa" \
  com.expertsystem.expertsystem

adb shell am start -a android.intent.action.VIEW \
  -d "https://expertloginapp.web.app?TarefaId=123&Processo=Mapa" \
  com.expertsystem.expertsystem

adb shell am start -a android.intent.action.VIEW \
  -d "https://expertloginapp.web.app/suprimentos?TarefaId=123&Processo=Mapa" \
  com.expertsystem.expertsystem
```

Testar links inválidos:

```bash
adb shell am start -a android.intent.action.VIEW \
  -d "https://expertloginapp.web.app/suprimentos?TarefaId=abc" \
  com.expertsystem.expertsystem

adb shell am start -a android.intent.action.VIEW \
  -d "https://expertloginapp.web.app/suprimentos?Processo=Mapa" \
  com.expertsystem.expertsystem

adb shell am start -a android.intent.action.VIEW \
  -d "https://expertloginapp.web.app/suprimentos?TarefaId=123" \
  com.expertsystem.expertsystem
```

Testar tarefa inexistente ou encerrada:

```bash
adb shell am start -a android.intent.action.VIEW \
  -d "https://expertloginapp.web.app/suprimentos?TarefaId=999999999&Processo=Mapa" \
  com.expertsystem.expertsystem
```

Validar associação Android App Links:

```bash
adb shell pm get-app-links com.expertsystem.expertsystem
adb shell dumpsys package com.expertsystem.expertsystem | rg -n "suporte.expertsystem.com.br|expertloginapp.web.app|autoVerify"
```

Em Android 13 ou superior, conferir manualmente em:

```text
Configurações > Apps > Expert System > Abrir por padrão
```

Resultado esperado: os domínios configurados aparecem como suportados/ativados.

### 7. Testes manuais iOS

No simulador:

```bash
xcrun simctl openurl booted \
  "https://expertloginapp.web.app/suprimentos?TarefaId=123&Processo=Mapa"
```

Testar app já aberto:

```bash
xcrun simctl openurl booted \
  "https://expertloginapp.web.app/suprimentos?TarefaId=123&Processo=Pedido"
```

Testar link inválido:

```bash
xcrun simctl openurl booted \
  "https://expertloginapp.web.app/suprimentos?TarefaId=abc&Processo=Mapa"

xcrun simctl openurl booted \
  "https://expertloginapp.web.app/suprimentos?TarefaId=123"

xcrun simctl openurl booted \
  "https://expertloginapp.web.app/suprimentos?Processo=Mapa"
```

Se `suporte.expertsystem.com.br` for habilitado no iOS:

```bash
xcrun simctl openurl booted \
  "https://suporte.expertsystem.com.br/suprimentos?TarefaId=123&Processo=Mapa"
```

Testar também os domínios configurados nos entitlements:

```bash
xcrun simctl openurl booted \
  "https://expertloginapp.web.app/suprimentos?TarefaId=123&Processo=Mapa"

xcrun simctl openurl booted \
  "https://soccer-7898e.web.app/suprimentos?TarefaId=123&Processo=Mapa"
```

No iOS físico, validar Universal Links tocando em links reais enviados por
Notas, Mail ou Safari. Universal Links podem se comportar diferente no
simulador quando o arquivo AASA/domínio não está corretamente publicado.

### 8. Testes de arquivos de associação dos domínios

Validar Android `assetlinks.json` para cada host com `android:autoVerify`:

```bash
curl -i https://suporte.expertsystem.com.br/.well-known/assetlinks.json
curl -i https://expertloginapp.web.app/.well-known/assetlinks.json
```

Resultado esperado:

- HTTP 200.
- `Content-Type` compatível com JSON.
- JSON válido.
- Package `com.expertsystem.expertsystem` presente.
- SHA-256 do certificado correto para debug/release conforme ambiente testado.

Validar iOS AASA para cada domínio dos entitlements:

```bash
curl -i https://expertloginapp.web.app/.well-known/apple-app-site-association
curl -i https://soccer-7898e.web.app/.well-known/apple-app-site-association
```

Se `suporte.expertsystem.com.br` for adicionado ao iOS:

```bash
curl -i https://suporte.expertsystem.com.br/.well-known/apple-app-site-association
```

Resultado esperado:

- HTTP 200.
- Sem redirect.
- Conteúdo JSON válido.
- App ID correto, incluindo Team ID Apple e bundle id.
- Paths incluem o caminho usado pelo link, por exemplo `/suprimentos/*` ou `*`.

### 9. Testes de regressão funcional

Depois da migração, validar que funcionalidades adjacentes da `HomePage`
continuam funcionando:

- Abertura normal do app sem deep link.
- Bottom navigation: Menu, Favoritos, Notificações e Perfil.
- Contador de notificações.
- Abertura por push notification com app fechado.
- Abertura por push notification com app em background.
- Registro de token Firebase em Android.
- Registro de token Firebase em iOS.
- Verificação de versão com `new_version_plus`.
- Retorno para HomePage por fluxos que usam `HomePage(link: false,
  executar: false)`.

### 10. Testes de falhas e resiliência

Validar que o app não trava e não fica preso em loading quando:

- Não há internet.
- API de documentos retorna erro.
- API de documentos retorna lista vazia.
- API de documentos retorna item com `tarefaId == 0`.
- Storage não possui email.
- Storage não possui senha.
- Usuário não está autenticado.
- Link é recebido duas vezes em sequência.
- Dois links diferentes são recebidos com intervalo curto.
- Usuário sai da `HomePage` durante o carregamento.
- `uriLinkStream` emite erro.

### 11. Evidências esperadas antes do aceite

Anexar ou registrar no PR:

- Resultado de `flutter analyze`.
- Resultado de `flutter test`.
- Evidência dos testes Android com app fechado, background e foreground.
- Evidência dos testes iOS com app fechado, background e foreground, quando
  disponível.
- Links testados.
- Domínios validados com `assetlinks.json` e AASA.
- Falhas pré-existentes identificadas antes da migração.
- Confirmação de que nenhum dado sensível foi logado.

## Observações de segurança

- Não logar email, senha, token Firebase ou respostas completas de API.
- Não mover email/senha para `SharedPreferences`; manter uso do storage seguro
  já existente.
- Mensagens ao usuário devem ser genéricas e não expor detalhes internos.

## Resultado esperado da implementação

A migração deve trocar apenas a infraestrutura de recebimento dos links e
corrigir fragilidades diretamente relacionadas ao fluxo. A navegação funcional
de suprimentos deve continuar igual para o usuário final.
