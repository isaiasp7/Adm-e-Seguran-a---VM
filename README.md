# Biblioteca Distribuída entre Unidades

Projeto acadêmico com React no host, Nginx e NODE-A na VM 1, e NODE-B na VM 2. A consulta distribuída reúne os livros dos dois nós; a rota de balanceamento entrega cada requisição a um deles.

## IPs na apresentação

Ao abrir o React, informe **o IP da VM 1** no formulário. Ele é usado imediatamente nas duas rotas públicas do Nginx, sem editar `frontend/.env`, rodar o gerador ou reiniciar o Vite. A opção **Alterar IP** na barra lateral permite corrigir o endereço. O último IP fica sugerido no navegador, mas cada nova sessão pede confirmação.

O React **não configura a VM 1 nem a VM 2**. Para preparar o agregador e o upstream do Nginx, edite somente **o IP da VM 2** em [`config/rede.json`](config/rede.json):

```json
{
  "vm2": "192.168.56.108"
}
```

No PowerShell, na raiz do projeto, execute:

```powershell
node scripts/configurar-rede.mjs
```

O comando gera dois arquivos a partir desse valor:

| Arquivo gerado | Uso |
| --- | --- |
| `VMs/V1/biblioteca-api/rede-gerada.json` | IP da VM 2 para a API agregadora existente |
| `nginx/rede-upstream-servers.conf` | Endereços dos dois nós para o upstream existente |

Esses arquivos são gerados automaticamente. Não edite os IPs neles. O endereço `127.0.0.1:3000` representa o NODE-A na própria VM 1 e não depende do IP Host-Only.

### Instalação única no Nginx da VM 1

Na primeira atualização da VM 1, copie também `VMs/V1/biblioteca-api/server.js` atualizado e `VMs/V1/biblioteca-api/rede-gerada.json` para a pasta `biblioteca-api` da VM 1. Reinicie o Node uma vez para carregar o novo código. Nas próximas mudanças de IP, somente o JSON gerado precisará ser copiado novamente; a API lê esse arquivo a cada consulta, sem precisar reiniciar o Node.

No `nginx.conf` real, substitua apenas as linhas `server` do `upstream` existente por uma inclusão. Mantenha o nome do seu upstream e o `location /balanceamento/` que já funcionam:

```nginx
upstream NOME_EXISTENTE_DO_UPSTREAM {
    include conf/rede-upstream-servers.conf;
}
```

Copie o arquivo gerado `nginx/rede-upstream-servers.conf` para a pasta `conf` do Nginx na VM 1. A rota `/biblioteca/todos` continua apontando para `127.0.0.1:3000/agregador/todos`; o trecho da rota está em [`nginx/biblioteca.conf.snippet`](nginx/biblioteca.conf.snippet). Não crie um segundo `upstream` com o mesmo nome.

Valide e recarregue a partir da pasta de instalação do Nginx:

```powershell
.\nginx.exe -t
.\nginx.exe -s reload
```

### Quando os IPs mudarem novamente

1. Altere o IP da VM 2 em `config/rede.json`.
2. Execute `node scripts/configurar-rede.mjs` no host.
3. Copie `VMs/V1/biblioteca-api/rede-gerada.json` para a pasta `biblioteca-api` da VM 1; copie `nginx/rede-upstream-servers.conf` para a pasta `conf` do Nginx na VM 1. Se ambas as pastas estiverem acessíveis no host, o comando pode escrever nelas diretamente:

   ```powershell
   node scripts/configurar-rede.mjs --vm1-api-dir "CAMINHO_DA_API_NA_VM1" --nginx-conf-dir "CAMINHO_DA_PASTA_CONF_DO_NGINX_NA_VM1"
   ```

4. Valide e recarregue o Nginx com os comandos acima. Se o IP da VM 1 também mudou, escolha **Alterar IP** no React; não é necessário reiniciar o Vite.

O arquivo central fica no host. Se as VMs não compartilham pastas com ele, a cópia dos dois arquivos gerados é necessária: Nginx e Node na VM 1 não conseguem ler automaticamente um arquivo que existe só no host.

## Arquitetura

```text
React no host
  └─ Nginx na VM 1 (:80)
       ├─ GET /biblioteca/todos → agregador NODE-A (:3000)
       │    ├─ 127.0.0.1:3000/livros       (acervo A)
       │    └─ IP da VM 2:3000/livros       (acervo B)
       └─ GET /balanceamento/ → upstream com NODE-A ou NODE-B
```

O frontend conhece somente o IP da VM 1 informado na tela. Os livros do NODE-A e do NODE-B são mantidos nas pastas `VMs/V1/biblioteca-api` e `VMs/v2`, respectivamente. A pasta `backend/` contém uma implementação alternativa, não utilizada nesta instalação; ela não recebe configuração de rede do gerador.

## Inicialização

Na VM 2, dentro da pasta da API, execute `npm install` uma vez e depois `node server.js`. Na VM 1, faça o mesmo dentro de `biblioteca-api`, depois de copiar o `rede-gerada.json`. Não inicie a versão `backend/` na mesma porta ao mesmo tempo que `VMs/V1/biblioteca-api`: são duas implementações alternativas da API.

No host, dentro de `frontend`, execute `npm install` uma vez e depois `npm run dev`. Abra `http://127.0.0.1:5173` e informe o IP atual da VM 1. **O frontend não precisa mais de `.env`.**

## Testes diretos

Na VM 1, confirme que o NODE-B responde e que o agregador combina os acervos:

```powershell
$rede = Get-Content .\rede-gerada.json | ConvertFrom-Json # execute na pasta da API da VM 1
Invoke-RestMethod "http://$($rede.vm2):3000/health"
Invoke-RestMethod http://127.0.0.1:3000/agregador/todos
```

No host, confirme as rotas públicas:

```powershell
$ipVm1 = Read-Host "IP da VM 1"
Invoke-RestMethod "http://$ipVm1/biblioteca/todos"
Invoke-RestMethod "http://$ipVm1/balanceamento/"
Invoke-RestMethod "http://$ipVm1/balanceamento/"
```

O primeiro retorno deve trazer livros com `origem` NODE-A e NODE-B. As chamadas à segunda rota devem indicar qual nó respondeu. Por fim, abra `http://127.0.0.1:5173` no host.

Se você recriar as VMs a partir das ISOs, precisará reinstalar/iniciar Node e Nginx e reaplicar seus arquivos de configuração. O formulário de IP no React não substitui essa preparação.
