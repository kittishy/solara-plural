# Gerando um APK que recebe notificações

A APK gerada anteriormente (por uma IA via wrapper genérico) é um **WebView simples**: ela não declara a permissão `POST_NOTIFICATIONS` no `AndroidManifest.xml` e não tem ponte nativa para o FCM. Por isso o Android nem oferece a opção de habilitar notificações nas configurações do app — e o Web Push nunca chega.

Para o APK receber notificações é preciso gerar uma **TWA** (Trusted Web Activity). Caminho mais simples: **PWABuilder.com**.

## Passo a passo (~10 min)

1. Acesse https://www.pwabuilder.com
2. Cole `https://solara-plural.vercel.app` e clique **Start**
3. PWABuilder vai analisar o manifest e o service worker. Deve aparecer score alto. Clique **Package For Stores**
4. Clique **Android → Generate Package**
5. Em **Package settings**:
   - **Package ID**: ex. `com.solara.plural` (anote, vai precisar)
   - **App name**: Solara
   - **Launcher name**: Solara
   - **Display mode**: `Standalone`
   - **Notification delegation**: ✅ ON (essencial)
   - **Signing key**: deixa o PWABuilder gerar uma nova
6. Clique **Download**. Você vai receber um `.zip` com:
   - `app-release-signed.apk` — o APK para distribuir
   - `app-release-bundle.aab` — bundle para a Play Store
   - `signing-key.keystore` + `signing-key-info.txt` — **guarda esses dois com vida**, são teus para sempre. Sem eles você não consegue atualizar o app na Play Store.
   - `assetlinks.json` — instruções abaixo

## Configurar Digital Asset Links

A TWA só roda em modo fullscreen (sem barra do Chrome, com notificações) se o site confirmar que confia naquele APK. Isso é feito via `/.well-known/assetlinks.json`, que a rota dinâmica em [app/api/well-known/assetlinks/route.ts](../app/api/well-known/assetlinks/route.ts) já serve. Só falta preencher dois env vars na Vercel:

1. Abre o arquivo `signing-key-info.txt` que veio no zip do PWABuilder
2. Procura a linha com `SHA-256` — vai parecer com `AB:CD:EF:12:...:34` (95 caracteres com `:`)
3. Na Vercel:
   ```bash
   vercel env add TWA_PACKAGE_NAME production
   # cola: com.solara.plural  (o Package ID que você escolheu)

   vercel env add TWA_SHA256_FINGERPRINTS production
   # cola: AB:CD:EF:12:...:34  (sem espaço, sem newline no final)
   ```
   ⚠️ **Cuidado com newlines no final** — esse foi o bug que quebrou o VAPID. Cola direto sem dar Enter extra.
4. Redeploy: `vercel --prod` (ou faz um commit qualquer pra disparar auto-deploy)
5. Verifica que está servindo: abre `https://solara-plural.vercel.app/.well-known/assetlinks.json` no navegador. Deve mostrar o JSON com o fingerprint.

## Instalar e testar

1. Manda o `.apk` para o celular (Drive, Telegram, etc.)
2. Instala — Android vai pedir permissão pra instalar de fontes desconhecidas. Permite.
3. Abre o app. **Quando abrir pela primeira vez, Android 13+ vai pedir permissão de notificação** (porque o PWABuilder declara `POST_NOTIFICATIONS` no manifest). Aceita.
4. No app, vai em Configurações → Notificações → Ativar push
5. Pra testar: faz uma mudança de front numa conta amiga e a tua deve receber o banner.

## Se a TWA cair pra Chrome Custom Tab

Se ao abrir o app aparecer a barra do Chrome no topo, significa que o `assetlinks.json` não bateu. Checa:

1. O Package ID no env var bate exatamente com o do APK?
2. O SHA-256 está correto e sem espaços/newlines?
3. O `https://solara-plural.vercel.app/.well-known/assetlinks.json` retorna o JSON com fingerprint preenchido?
4. Esperar 1-2 minutos depois do redeploy — Chrome cacheia o resultado por alguns segundos.

## Alternativa: Bubblewrap CLI

Se preferir terminal a UI:

```bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest=https://solara-plural.vercel.app/manifest.json
bubblewrap build
```

Mesmo princípio — vai gerar APK + keystore + assetlinks.json. Você ainda precisa configurar os env vars na Vercel com o fingerprint.
