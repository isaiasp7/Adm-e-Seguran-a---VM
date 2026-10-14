# Biblioteca Distribuída entre Unidades

Aplicação acadêmica pequena para demonstrar dois comportamentos diferentes do Nginx:

1. **Proxy reverso para uma API agregadora:** uma requisição reúne os acervos do NODE-A **e** do NODE-B.
2. **Load balancing:** cada requisição é atendida pelo NODE-A **ou** pelo NODE-B por round robin.

## Arquitetura

```text
Consulta distribuída

React no host
  └─ GET http://192.168.56.101/biblioteca/todos
       └─ Nginx na VM 1
            └─ GET http://127.0.0.1:3000/agregador/todos
                 ├─ GET http://127.0.0.1:3000/livros       (NODE-A)
                 └─ GET http://192.168.56.103:3000/livros  (NODE-B)

Load balancing

React no host
  └─ GET http://192.168.56.101/balanceamento/
       └─ Nginx escolhe uma instância do upstream
            ├─ http://127.0.0.1:3000/health
            └─ http://192.168.56.103:3000/health
```

O frontend conhece apenas o endereço do Nginx. O IP do NODE-B aparece somente na configuração do backend agregador e na configuração já existente do upstream do Nginx.

## Estrutura

```text
backend/
  src/
    app.js              rotas Express e agregador
    config.js           leitura e validação das variáveis de ambiente
    data/books.js       acervos locais de NODE-A e NODE-B
    server.js           inicialização HTTP
  .env.example
  package.json
frontend/
  src/
    api.js              chamadas exclusivas ao Nginx
    App.jsx             interface React
    styles.css          identidade visual
  .env.example
  package.json
nginx/
  biblioteca.conf.snippet
```

## Requisitos

- Node.js 18.17 ou superior nas duas VMs e no computador host;
- Nginx já instalado e funcionando na VM 1;
- conectividade Host-Only já configurada;
- nenhuma etapa usa Docker ou banco de dados.

## 1. Backend na VM 1 — NODE-A

Copie a pasta `backend` para a VM 1. No PowerShell, dentro dessa pasta:

```powershell
npm install
Copy-Item .env.example .env
notepad .env
```

Use estes valores:

```dotenv
NODE_ID=NODE-A
PORT=3000
AGGREGATOR_ENABLED=true
LOCAL_NODE_URL=http://127.0.0.1:3000
OTHER_NODE_URL=http://192.168.56.103:3000
REQUEST_TIMEOUT_MS=3000
CORS_ORIGIN=*
```

Inicie:

```powershell
npm start
```

> A porta 3000 já está ocupada pela API atual. Pare o processo antigo antes de iniciar esta versão ou incorpore as rotas de `src/app.js` ao servidor atual. Não execute dois processos na mesma porta.

## 2. Backend na VM 2 — NODE-B

Copie a mesma pasta `backend` para a VM 2 e execute:

```powershell
npm install
Copy-Item .env.example .env
notepad .env
```

Use estes valores:

```dotenv
NODE_ID=NODE-B
PORT=3000
AGGREGATOR_ENABLED=false
LOCAL_NODE_URL=http://127.0.0.1:3000
OTHER_NODE_URL=http://192.168.56.101:3000
REQUEST_TIMEOUT_MS=3000
CORS_ORIGIN=*
```

Inicie:

```powershell
npm start
```

## 3. Testar os backends antes do Nginx

Na VM 1:

```powershell
Invoke-RestMethod http://127.0.0.1:3000/health
Invoke-RestMethod http://127.0.0.1:3000/livros
Invoke-RestMethod http://192.168.56.103:3000/livros
Invoke-RestMethod http://127.0.0.1:3000/agregador/todos
```

O último comando deve devolver oito livros: quatro do NODE-A e quatro do NODE-B. Se ele falhar, não avance para o Nginx; primeiro confirme qual dos dois acessos a `/livros` não respondeu.

## 4. Acrescentar a rota ao Nginx

O arquivo [`nginx/biblioteca.conf.snippet`](nginx/biblioteca.conf.snippet) contém apenas o novo bloco `location`.

1. Abra o `nginx.conf` que já funciona na VM 1.
2. Localize o bloco `server` que contém `/balanceamento/`.
3. Cole o novo `location` dentro desse mesmo bloco `server`.
4. Cole as diretivas CORS do snippet dentro do mesmo `server`, fora dos `locations`.
5. Não substitua o `upstream` nem o `location /balanceamento/` existentes.

Valide e recarregue usando o caminho real da instalação do Nginx:

```powershell
nginx.exe -t
nginx.exe -s reload
```

Teste pelo endereço externo:

```powershell
Invoke-RestMethod http://192.168.56.101/biblioteca/todos
Invoke-RestMethod http://192.168.56.101/balanceamento/
Invoke-RestMethod http://192.168.56.101/balanceamento/
```

O primeiro comando deve combinar os dois acervos. Os dois últimos devem continuar mostrando o round robin já configurado.

Confirme também que o Nginx devolve o cabeçalho CORS:

```powershell
curl.exe -I -H "Origin: http://127.0.0.1:5173" http://192.168.56.101/biblioteca/todos
```

A resposta deve conter `Access-Control-Allow-Origin: *`. Sem esse cabeçalho, o
endpoint funciona no PowerShell, mas o navegador impede o React de ler o JSON.

## 5. Frontend React no host

No computador host, abra o PowerShell na pasta `frontend`:

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Acesse [http://localhost:5173](http://localhost:5173).

O arquivo `.env` do frontend deve conter somente:

```dotenv
VITE_NGINX_BASE_URL=http://192.168.56.101
```

Não coloque o IP `192.168.56.103` no frontend.

## Endpoints

| Camada | Endpoint | Responsabilidade |
| --- | --- | --- |
| NODE-A e NODE-B | `GET /health` | Identifica a instância para o load balancing |
| NODE-A e NODE-B | `GET /instance` | Mostra a configuração didática da instância |
| NODE-A e NODE-B | `GET /livros` | Devolve somente o acervo local |
| NODE-A | `GET /agregador/todos` | Consulta os dois nós em paralelo com `Promise.all` |
| Nginx | `GET /biblioteca/todos` | Encaminha diretamente para o agregador do NODE-A |
| Nginx | `GET /balanceamento/` | Preserva o upstream round robin já existente |

## Respostas de erro

- rota inexistente: `404 Not Found`;
- falha ou timeout ao consultar qualquer nó: `502 Bad Gateway`;
- o agregador não devolve resultado parcial, porque o experimento exige NODE-A **e** NODE-B.

Essa decisão é intencional: retornar somente um acervo com status de sucesso esconderia a falha distribuída e produziria uma demonstração incorreta.
