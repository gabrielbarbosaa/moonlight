# Deploy: Moonlight em uma VPS com vários projetos

Guia para uma VPS zerada (sem Node, Docker ou Git) que vai hospedar **vários projetos**, sendo o Moonlight um deles.

## Como a VPS fica organizada

Só **um** processo pode usar as portas 80 e 443. Por isso a VPS tem um **proxy único** (Caddy), e cada projeto fica em sua própria pasta, com seu próprio `docker compose`, **sem publicar portas**. O proxy e os projetos conversam por uma rede Docker compartilhada chamada `proxy`.

```
internet :80/:443
      |
   [ proxy: Caddy ]  ~/proxy              (HTTPS automático de todos os projetos)
      |  rede Docker "proxy"
      |-- moonlight-web, moonlight-api    ~/apps/moonlight    (+ postgres e redis privados)
      |-- outro-projeto-...               ~/apps/outro-projeto
      '-- ...
```

Regras que valem para todo projeto da VPS:

- Não publica `ports:` para a internet (só o proxy publica).
- Entra na rede externa `proxy` apenas com os serviços que recebem tráfego web.
- Usa nomes de serviço **únicos** (`moonlight-api`, `moonlight-web`, não `api` nem `web`), porque a rede `proxy` é compartilhada e nomes iguais de projetos diferentes se misturam.
- Banco e cache ficam só na rede interna do próprio projeto, sem se ligar à rede `proxy`.
- Cada projeto tem seu `.env`, seus volumes e seu domínio. O trecho de roteamento dele fica em `~/proxy/sites/<projeto>.caddy`.

O Moonlight serve três endereços: `moonlight.gabrielbarbosadev.com.br` (landing e `/admin`), `api.moonlight.gabrielbarbosadev.com.br` (API) e `*.moonlight.gabrielbarbosadev.com.br` (páginas dos usuários, como `maria.moonlight.gabrielbarbosadev.com.br`). O Caddy emite o certificado de cada subdomínio de usuário no primeiro acesso, e só para páginas que existem (a API confirma em `/tenants/domain-check`), então não precisa de certificado wildcard.

> O Moonlight usa o subdomínio **dedicado** `moonlight.gabrielbarbosadev.com.br` dentro do seu domínio `gabrielbarbosadev.com.br`. O wildcard `*.moonlight.gabrielbarbosadev.com.br` só captura endereços dentro dele, então outros projetos (`outro.gabrielbarbosadev.com.br`) não são afetados. Não crie um wildcard `*.gabrielbarbosadev.com.br` na raiz.

## O que você precisa antes

- Uma VPS **Ubuntu 22.04 ou 24.04** com acesso `root` por SSH. Para vários projetos, prefira 4 GB de RAM ou mais (mínimo 2 GB, com swap) e disco de sobra.
- Um **domínio** com acesso ao painel de DNS.
- Uma conta de **e-mail SMTP** (Brevo, Resend, Mailgun, SES ou Gmail com senha de app) para os avisos de reserva. O código de 2FA é enviado pelo **Pygmy** (`PYGMY_URL` e `PYGMY_API_KEY` no `.env`); sem a chave ninguém consegue entrar.

## 1. DNS

No painel de DNS do domínio do Moonlight, crie três registros apontando para o **IP da VPS**:

| Tipo | Nome          | Valor     |
| ---- | ------------- | --------- |
| A    | `moonlight`   | IP da VPS |
| A    | `*.moonlight` | IP da VPS |

O `*.moonlight` cobre `api.moonlight` e faz `maria.moonlight.gabrielbarbosadev.com.br` funcionar. Sem wildcard, as páginas continuam em `moonlight.gabrielbarbosadev.com.br/s/maria`. Confira com `ping api.moonlight.gabrielbarbosadev.com.br` (deve mostrar o IP da VPS; a propagação pode levar de minutos a horas).

## 2. Primeiro acesso à VPS

No seu computador:

```bash
ssh root@IP_DA_VPS
```

Na VPS, atualize o sistema e crie um usuário próprio:

```bash
apt update && apt upgrade -y
adduser deploy
usermod -aG sudo deploy
```

Crie um swap de 2 GB (protege os builds contra falta de memória):

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

Firewall, abrindo só o necessário:

```bash
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw --force enable
```

## 3. Instalar Docker e Git

```bash
curl -fsSL https://get.docker.com | sh
apt install -y git
usermod -aG docker deploy
su - deploy
docker --version && docker compose version && git --version
```

## 4. Baixar o Moonlight

```bash
mkdir -p ~/apps && cd ~/apps
git clone https://github.com/gabrielbarbosaa/moonlight.git
cd moonlight/deploy
```

Se o repositório for privado, o GitHub não aceita senha: crie um _Personal Access Token_ (GitHub > Settings > Developer settings > Tokens, com leitura do repositório) e use-o como senha no `git clone`.

## 5. Proxy da VPS (uma vez só)

O proxy é infraestrutura da VPS, não do Moonlight. Copie o modelo e suba:

```bash
mkdir -p ~/proxy
cp -r ~/apps/moonlight/deploy/vps-proxy/. ~/proxy/
cd ~/proxy
docker compose up -d
```

Isso cria a rede `proxy` e passa a escutar as portas 80 e 443. Ainda não há nenhum site; eles entram na pasta `~/proxy/sites/`.

## 6. Configurar o `.env` do Moonlight

```bash
cd ~/apps/moonlight/deploy
chmod +x init-env.sh backup.sh
./init-env.sh
nano .env
```

O script pergunta o domínio (Enter aceita `moonlight.gabrielbarbosadev.com.br`) e o seu e-mail, gera todas as senhas e segredos e cria o `moonlight.caddy` (o trecho de roteamento deste projeto). No `nano`, preencha `PYGMY_API_KEY` e o bloco de e-mail (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`). Salve com `Ctrl+O`, `Enter` e saia com `Ctrl+X`.

O `.env` guarda segredos e já está no `.gitignore`.

## 7. Subir o Moonlight

```bash
cd ~/apps/moonlight/deploy
docker compose up -d --build
```

O primeiro build leva de 5 a 15 minutos. Acompanhe com `docker compose ps` e `docker compose logs -f moonlight-api`. A API aplica as migrations sozinha na primeira inicialização. Em projetos diferentes, faça os builds **um de cada vez** para não faltar memória.

## 8. Publicar no proxy

```bash
cp ~/apps/moonlight/deploy/moonlight.caddy ~/proxy/sites/
cd ~/proxy
docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile
```

Pronto, sem derrubar nada:

- `https://api.moonlight.gabrielbarbosadev.com.br/health` responde `{"status":"ok","database":"up"}`.
- `https://moonlight.gabrielbarbosadev.com.br` abre a landing.

## 9. Primeiro uso

1. Acesse `https://moonlight.gabrielbarbosadev.com.br/admin/login` e crie uma conta **com o e-mail informado no passo 6**. O código de 2FA chega por e-mail e, ao confirmá-lo, a conta vira superadmin (`/admin/backoffice`).
2. Crie uma página (ex.: `maria`) e abra `https://maria.moonlight.gabrielbarbosadev.com.br`. O primeiro acesso demora um instante, porque o certificado é emitido ali.

## Adicionar outro projeto à VPS

1. Crie `~/apps/outro-projeto` com o `docker-compose.yml` dele, seguindo as regras do início deste guia. O esqueleto:

```yaml
services:
  outro-web:
    build: .
    restart: unless-stopped
    networks:
      - default
      - proxy

networks:
  proxy:
    external: true
```

2. Crie `~/proxy/sites/outro-projeto.caddy`:

```
outro.com.br {
	encode gzip
	reverse_proxy outro-web:3000
}
```

3. Suba o projeto (`docker compose up -d --build`) e recarregue o proxy com o comando do passo 8.

Limitação: o Caddy aceita uma única URL de verificação (`ask`) para certificados sob demanda, e ela aponta para o Moonlight. Outros projetos funcionam normalmente com certificados comuns; só não configure `on_demand` neles.

## Operação do dia a dia

Atualizar o Moonlight:

```bash
cd ~/apps/moonlight && git pull && cd deploy && docker compose up -d --build
```

Logs e estado:

```bash
docker compose ps
docker compose logs -f --tail=100 moonlight-api
docker compose logs -f --tail=100 moonlight-web
cd ~/proxy && docker compose logs -f --tail=100 caddy
```

Reiniciar um serviço: `docker compose restart moonlight-api`. Parar o projeto sem perder dados: `docker compose down` (nunca use `-v`, que apaga os volumes). Liberar espaço de builds antigos: `docker image prune -f`.

### Backup

O `backup.sh` guarda o Postgres e as imagens enviadas em `deploy/backups`, por 14 dias. Agende para as 03:00:

```bash
(crontab -l 2>/dev/null; echo "0 3 * * * $HOME/apps/moonlight/deploy/backup.sh") | crontab -
```

Copie os backups também para fora da VPS (`scp` ou `rclone`). Restaurar o banco:

```bash
gunzip -c backups/ARQUIVO.sql.gz | docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"'
```

Restaurar as imagens:

```bash
docker compose exec -T moonlight-api tar -C /data/media -xzf - < backups/ARQUIVO-media.tar.gz
```

## Problemas comuns

- **`network proxy declared as external, but could not be found`:** o proxy ainda não foi criado. Faça o passo 5 antes de subir o projeto.
- **Build do front termina com `Killed`:** falta de memória. Confira o swap (`free -h`), pare outros builds e tente de novo.
- **O Caddy não emite o certificado:** confira o DNS, as portas 80 e 443 (`ufw status`) e `docker compose logs caddy` dentro de `~/proxy`.
- **Subdomínio de uma página com erro de certificado:** só recebe certificado se a página existir e estiver ativa, e se o registro DNS `*` existir.
- **Erro 502:** o projeto não está de pé ou o nome do serviço no `.caddy` não bate com o do compose. Veja `docker compose ps`.
- **Erro de CORS no painel:** `WEB_URL` deve ser exatamente a origem do front, com `https://` e sem barra no final.
- **Login não mantém a sessão:** front e API precisam estar sob o mesmo domínio raiz (é o caso: `moonlight.gabrielbarbosadev.com.br` e `api.moonlight.gabrielbarbosadev.com.br`).
- **Código de 2FA não chega:** veja `docker compose logs moonlight-api` (erros do Pygmy aparecem ali) e confira `PYGMY_URL` e `PYGMY_API_KEY`. O Pygmy permite um novo pedido por e-mail a cada 60 s.
- **Mudou o domínio no `.env`:** as variáveis `NEXT_PUBLIC_*` entram no build, então rode `docker compose up -d --build` de novo e atualize o `moonlight.caddy`.
- **Checkout responde 404:** com `BILLING_SANDBOX_ENABLED=false` o checkout simulado fica desligado. O único provedor de pagamento hoje é o sandbox, que não cobra de verdade.

## Front na Vercel (alternativa)

O front também pode ficar na Vercel, com a VPS só para a API: o `apps/web/vercel.json` já existe para isso. Suba apenas a API (`docker compose up -d --build moonlight-api`), deixe no `moonlight.caddy` somente o bloco `api.`, e configure na Vercel: Root Directory `apps/web` (com "Include source files outside of the Root Directory"), as variáveis `NEXT_PUBLIC_API_URL`, `API_URL` (`https://api.moonlight.gabrielbarbosadev.com.br`), `ROOT_DOMAIN` e `NEXT_PUBLIC_ROOT_DOMAIN` (`moonlight.gabrielbarbosadev.com.br`) e os domínios `moonlight.gabrielbarbosadev.com.br` e `*.moonlight.gabrielbarbosadev.com.br`.
