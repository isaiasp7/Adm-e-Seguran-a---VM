# Biblioteca Distribuída entre Unidades

Demonstração acadêmica com React no host, Nginx e NODE-A na VM 1, e NODE-B na VM 2. **Não há gerador de configuração.** O frontend chama apenas o Nginx da VM 1.

## Como as requisições funcionam

```text
React no host → Nginx na VM 1
                  ├─ /biblioteca/todos → NODE-A consulta NODE-A e NODE-B e reúne os livros
                  └─ /balanceamento/  → Nginx encaminha a um dos dois nós
```

O frontend nunca chama a VM 2 diretamente. A VM 1 precisa saber o IP da VM 2 para as duas operações.

## Os três lugares para conferir se os IPs mudarem

1. **Frontend:** ao abrir `http://127.0.0.1:5173`, digite o IP atual da VM 1 na tela. Para trocar depois, use **Alterar IP**. Não há `.env` nem reinício do Vite por mudança desse IP.
2. **API da VM 1:** em [`VMs/V1/biblioteca-api/server.js`](VMs/V1/biblioteca-api/server.js), atualize o endereço da VM 2 na chamada `fetch("http://192.168.56.108:3000/livros")`. Copie o arquivo atualizado para a pasta da API na VM 1 e reinicie o Node.
3. **Nginx da VM 1:** copie [`nginx/nginx.conf`](nginx/nginx.conf) para `conf/nginx.conf` na instalação do Nginx da VM 1. Se o IP da VM 2 mudar, atualize as **duas linhas marcadas** `IP DA VM 2` nesse arquivo. Valide com `.\nginx.exe -t` e recarregue com `.\nginx.exe -s reload` na pasta do Nginx.

O `127.0.0.1:3000` representa o NODE-A dentro da própria VM 1; não é o IP Host-Only. A VM 2 não recebe arquivos gerados: basta executar sua API nela.

O `nginx.conf` fornecido inclui `/biblioteca/todos`, `/balanceamento/`, `/balanceamento/livros` e as rotas diretas `/servidor-a/livros` e `/servidor-b/livros` para demonstrar cada nó separadamente. Faça uma cópia do `nginx.conf` atual da VM 1 antes de substituí-lo. Ao recriar a VM a partir da ISO, copie novamente o arquivo completo; não é necessário reescrever as rotas.

## Qual código executar

- **VM 1:** na pasta `biblioteca-api` da VM, execute `npm install` uma vez e depois `node server.js` usando o código de `VMs/V1/biblioteca-api`.
- **VM 2:** na pasta da API da VM, execute `npm install` uma vez e depois `node server.js` usando o código de `VMs/v2`.
- **Host:** na pasta `frontend`, execute `npm install` uma vez e depois `npm run dev`; abra `http://127.0.0.1:5173`.

A pasta `backend/` contém outra implementação, **não usada nesta demonstração**. Seu `npm run dev` mostra “agregador: inativo” sem configuração própria. Não a execute junto com `VMs/V1/biblioteca-api` na porta 3000.

Se você começar apenas com as ISOs, ainda precisará instalar Node/Nginx, colocar os arquivos das APIs nas VMs e configurar o Nginx. Digitar o IP no React muda somente as requisições do navegador; não prepara as VMs.

## Verificação rápida

Na VM 1, teste a VM 2 e o agregador:

```powershell
Invoke-RestMethod http://IP_ATUAL_DA_VM2:3000/health
Invoke-RestMethod http://127.0.0.1:3000/agregador/todos
```

No host, teste o Nginx usando o IP atual da VM 1:

```powershell
Invoke-RestMethod http://IP_ATUAL_DA_VM1/servidor-a/livros
Invoke-RestMethod http://IP_ATUAL_DA_VM1/servidor-b/livros
Invoke-RestMethod http://IP_ATUAL_DA_VM1/biblioteca/todos
Invoke-RestMethod http://IP_ATUAL_DA_VM1/balanceamento/
Invoke-RestMethod http://IP_ATUAL_DA_VM1/balanceamento/
```

`/biblioteca/todos` deve trazer livros dos dois nós. Chamadas sucessivas a `/balanceamento/` devem indicar qual nó respondeu.
