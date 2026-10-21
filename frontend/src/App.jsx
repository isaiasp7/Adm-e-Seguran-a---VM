import { useEffect, useMemo, useRef, useState } from "react";

import {
  fetchAllBooks,
  fetchBalancedInstance,
} from "./api.js";

const SESSION_KEY = "biblioteca.vm1.session";
const LAST_IP_KEY = "biblioteca.vm1.lastIp";

function parseVm1Ip(value) {
  const ip = value.trim().replace(/^https?:\/\//i, "").replace(/\/$/, "");
  const octets = ip.split(".");

  if (
    octets.length !== 4 ||
    !octets.every((octet) => /^(0|[1-9]\d{0,2})$/.test(octet) && Number(octet) <= 255)
  ) {
    throw new Error("Digite apenas o IPv4 da VM 1, por exemplo: 192.168.56.107.");
  }

  return ip;
}

function getSessionIp() {
  try {
    return parseVm1Ip(sessionStorage.getItem(SESSION_KEY) ?? "");
  } catch {
    return null;
  }
}

function getLastIp() {
  try {
    return localStorage.getItem(LAST_IP_KEY) ?? "";
  } catch {
    return "";
  }
}

function rememberIp(ip) {
  try {
    sessionStorage.setItem(SESSION_KEY, ip);
    localStorage.setItem(LAST_IP_KEY, ip);
  } catch {
    // A página continua usando o endereço mesmo se o storage estiver bloqueado.
  }
}

const MULTIPLE_REQUESTS = 6;
const VALID_VIEWS = ["overview", "library", "balancing"];
const VIEW_TITLES = {
  overview: "Visão geral",
  library: "Acervo distribuído",
  balancing: "Teste de load balancing",
};

function getViewFromHash() {
  const requestedView = window.location.hash.replace("#", "");
  return VALID_VIEWS.includes(requestedView) ? requestedView : "overview";
}

function Icon({ name }) {
  const paths = {
    book: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M8 3v18M11.5 7H16M11.5 11H16" />
      </>
    ),
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    nodes: (
      <>
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="6" r="3" />
        <circle cx="18" cy="18" r="3" />
        <path d="m8.7 10.7 6.6-3.4M8.7 13.3l6.6 3.4" />
      </>
    ),
    activity: (
      <path d="M3 12h4l2.5-7 5 14 2.5-7h4" />
    ),
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    refresh: (
      <>
        <path d="M20 11a8 8 0 1 0-2.3 5.7" />
        <path d="M20 4v7h-7" />
      </>
    ),
  };

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

function NodeBadge({ node }) {
  return <span className={`node-badge ${node.toLowerCase()}`}>{node}</span>;
}

function App() {
  const dialogRef = useRef(null);
  const ipInputRef = useRef(null);
  const connectionEpoch = useRef(0);
  const [vm1Ip, setVm1Ip] = useState(getSessionIp);
  const [ipDraft, setIpDraft] = useState(() => getSessionIp() ?? getLastIp());
  const [ipError, setIpError] = useState("");
  const [connectionOpen, setConnectionOpen] = useState(() => !getSessionIp());
  const [activeView, setActiveView] = useState(getViewFromHash);
  const [books, setBooks] = useState([]);
  const [bookSources, setBookSources] = useState([]);
  const [bookLoading, setBookLoading] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [bookError, setBookError] = useState("");
  const [balanceError, setBalanceError] = useState("");
  const [history, setHistory] = useState([]);
  const nginxBaseUrl = vm1Ip ? `http://${vm1Ip}` : null;

  const counters = useMemo(
    () =>
      history.reduce(
        (total, item) => ({
          ...total,
          [item.server]: (total[item.server] ?? 0) + 1,
        }),
        { "NODE-A": 0, "NODE-B": 0 },
      ),
    [history],
  );

  const sourceCount = useMemo(() => {
    const fromResponse = Object.fromEntries(
      bookSources.map((source) => [source.servidor, source.quantidade]),
    );

    return {
      "NODE-A":
        fromResponse["NODE-A"] ??
        books.filter((book) => book.origem === "NODE-A").length,
      "NODE-B":
        fromResponse["NODE-B"] ??
        books.filter((book) => book.origem === "NODE-B").length,
    };
  }, [bookSources, books]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (connectionOpen && !dialog.open) {
      dialog.showModal();
      ipInputRef.current?.focus();
    } else if (!connectionOpen && dialog.open) {
      dialog.close();
    }
  }, [connectionOpen]);

  useEffect(() => {
    if (!nginxBaseUrl) return;
    handleFetchBooks();
  }, [nginxBaseUrl]);

  useEffect(() => {
    function syncViewWithHash() {
      setActiveView(getViewFromHash());
    }

    window.addEventListener("hashchange", syncViewWithHash);
    return () => window.removeEventListener("hashchange", syncViewWithHash);
  }, []);

  function navigateTo(view) {
    window.location.hash = view;
    setActiveView(view);
  }

  function openConnection() {
    setIpDraft(vm1Ip ?? getLastIp());
    setIpError("");
    setConnectionOpen(true);
  }

  function handleSaveIp(event) {
    event.preventDefault();

    try {
      const ip = parseVm1Ip(ipDraft);
      connectionEpoch.current += 1;
      rememberIp(ip);
      setVm1Ip(ip);
      setIpDraft(ip);
      setIpError("");
      setBooks([]);
      setBookSources([]);
      setHistory([]);
      setBookError("");
      setBalanceError("");
      setBookLoading(false);
      setBalanceLoading(false);
      setConnectionOpen(false);
    } catch (error) {
      setIpError(error.message);
      ipInputRef.current?.focus();
    }
  }

  async function handleFetchBooks() {
    if (!nginxBaseUrl) return;
    const epoch = connectionEpoch.current;
    setBookLoading(true);
    setBookError("");

    try {
      const response = await fetchAllBooks(nginxBaseUrl);
      if (epoch !== connectionEpoch.current) return;
      const returnedBooks = Array.isArray(response) ? response : response.livros;

      if (!Array.isArray(returnedBooks)) {
        throw new Error("A resposta não contém uma lista de livros válida.");
      }

      setBooks(returnedBooks);
      setBookSources(Array.isArray(response.fontes) ? response.fontes : []);
    } catch (error) {
      if (epoch === connectionEpoch.current) setBookError(error.message);
    } finally {
      if (epoch === connectionEpoch.current) setBookLoading(false);
    }
  }

  async function handleFetchAndOpenLibrary() {
    await handleFetchBooks();
    navigateTo("library");
  }

  function createHistoryItem(response) {
    const server = response.servidor;

    if (!["NODE-A", "NODE-B"].includes(server)) {
      throw new Error("O backend não identificou NODE-A ou NODE-B.");
    }

    return {
      id: `${Date.now()}-${Math.random()}`,
      server,
      time: new Intl.DateTimeFormat("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(new Date()),
    };
  }

  async function requestBalancedInstance() {
    const response = await fetchBalancedInstance(nginxBaseUrl);
    return createHistoryItem(response);
  }

  async function handleSingleRequest() {
    const epoch = connectionEpoch.current;
    setBalanceLoading(true);
    setBalanceError("");

    try {
      const item = await requestBalancedInstance();
      if (epoch !== connectionEpoch.current) return;
      setHistory((currentHistory) => [item, ...currentHistory]);
      navigateTo("balancing");
    } catch (error) {
      if (epoch === connectionEpoch.current) setBalanceError(error.message);
    } finally {
      if (epoch === connectionEpoch.current) setBalanceLoading(false);
    }
  }

  async function handleMultipleRequests() {
    const epoch = connectionEpoch.current;
    setBalanceLoading(true);
    setBalanceError("");

    try {
      const batch = [];

      for (let index = 0; index < MULTIPLE_REQUESTS; index += 1) {
        batch.push(await requestBalancedInstance());
        if (epoch !== connectionEpoch.current) return;
      }

      setHistory((currentHistory) => [...batch.reverse(), ...currentHistory]);
      navigateTo("balancing");
    } catch (error) {
      if (epoch === connectionEpoch.current) setBalanceError(error.message);
    } finally {
      if (epoch === connectionEpoch.current) setBalanceLoading(false);
    }
  }

  const visibleError =
    activeView === "library"
      ? bookError
      : activeView === "balancing"
        ? balanceError
        : bookError || balanceError;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div
            className="reference-sprite library-logo-sprite"
            role="img"
            aria-label="Livro aberto com raios"
          />
          <div>
            <span>Biblioteca</span>
            <strong>Distribuída</strong>
          </div>
        </div>

        <nav aria-label="Navegação principal">
          <button
            type="button"
            className={"nav-item" + (activeView === "overview" ? " active" : "")}
            onClick={() => navigateTo("overview")}
          >
            <Icon name="grid" />
            Visão geral
          </button>
          <button
            type="button"
            className={"nav-item" + (activeView === "library" ? " active" : "")}
            onClick={() => navigateTo("library")}
          >
            <Icon name="book" />
            Acervo distribuído
          </button>
          <button
            type="button"
            className={"nav-item" + (activeView === "balancing" ? " active" : "")}
            onClick={() => navigateTo("balancing")}
          >
            <Icon name="nodes" />
            Balanceamento
          </button>
        </nav>

        <div className="sidebar-note">
          <span className="live-dot" />
          <div>
            <strong>Endereço da VM 1</strong>
            <small>{nginxBaseUrl ?? "Não informado"}</small>
            <button type="button" className="change-network" onClick={openConnection}>
              Alterar IP
            </button>
          </div>
        </div>
      </aside>

      <dialog
        ref={dialogRef}
        className="connection-dialog"
        aria-labelledby="connection-title"
        aria-describedby="connection-description"
        onCancel={(event) => {
          if (!vm1Ip) event.preventDefault();
          else setConnectionOpen(false);
        }}
      >
        <form onSubmit={handleSaveIp}>
          <p className="eyebrow">Conexão da apresentação</p>
          <h2 id="connection-title">Qual é o IP da VM 1?</h2>
          <p id="connection-description">
            Informe o IPv4 da máquina com Nginx. O React usará esse endereço
            para consultar o acervo e testar o balanceamento.
          </p>
          <label htmlFor="vm1-ip">IP da VM 1 (Nginx)</label>
          <input
            ref={ipInputRef}
            id="vm1-ip"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="192.168.56.107"
            value={ipDraft}
            aria-invalid={Boolean(ipError)}
            aria-describedby={ipError ? "vm1-ip-error" : "vm1-ip-help"}
            onChange={(event) => {
              setIpDraft(event.target.value);
              if (ipError) setIpError("");
            }}
          />
          {ipError ? (
            <p id="vm1-ip-error" className="connection-error" role="alert">{ipError}</p>
          ) : (
            <p id="vm1-ip-help" className="connection-help">Digite somente o IP; a porta 80 será usada.</p>
          )}
          <div className="connection-actions">
            {vm1Ip && (
              <button type="button" className="connection-cancel" onClick={() => setConnectionOpen(false)}>
                Cancelar
              </button>
            )}
            <button type="submit" className="connection-submit">Usar este IP</button>
          </div>
          <p className="connection-limit">
            Esta escolha configura apenas o navegador. As APIs e o Nginx precisam
            estar preparados nas VMs.
          </p>
        </form>
      </dialog>

      <main>
        <header className="topbar">
          <div>
            <p className="eyebrow">Projeto acadêmico · Sistemas Distribuídos</p>
            <h1>{VIEW_TITLES[activeView]}</h1>
          </div>
          <div className="architecture-pill">
            React <span>→</span> Nginx <span>→</span> Express
          </div>
        </header>

        <section
          className={
            "experiment-grid" + (activeView === "overview" ? "" : " single-card")
          }
          aria-label="Experimentos"
        >
          <article
            className={
              "experiment-card library-card" +
              (activeView === "balancing" ? " view-hidden" : "")
            }
          >
            <div className="card-copy">
              <span className="card-number">Experimento 01</span>
              <h2>Consulta distribuída</h2>
              <p>Uma requisição reúne os acervos do NODE-A e do NODE-B.</p>
              <button onClick={handleFetchAndOpenLibrary} disabled={bookLoading}>
                {bookLoading
                  ? "Consultando nós..."
                  : activeView === "overview"
                    ? "Consultar e ver acervo"
                    : "Atualizar acervo"}
                <Icon name="arrow" />
              </button>
            </div>
            <div
              className="reference-sprite book-stack-sprite"
              role="img"
              aria-label="Pilha de livros"
            />
          </article>

          <article
            className={
              "experiment-card balance-card" +
              (activeView === "library" ? " view-hidden" : "")
            }
          >
            <div className="card-copy">
              <span className="card-number">Experimento 02</span>
              <h2>Load balancing</h2>
              <p>Cada requisição é entregue pelo Nginx a apenas um dos nós.</p>
              <div className="button-row">
                <button onClick={handleSingleRequest} disabled={balanceLoading}>
                  {balanceLoading
                    ? "Processando..."
                    : activeView === "overview"
                      ? "Testar e ver resultado"
                      : "Fazer requisição"}
                  <Icon name="arrow" />
                </button>
                <button
                  className="secondary-button"
                  onClick={handleMultipleRequests}
                  disabled={balanceLoading}
                >
                  <Icon name="refresh" />
                  Fazer {MULTIPLE_REQUESTS}
                </button>
              </div>
            </div>
            <div
              className="reference-sprite open-book-sprite"
              role="img"
              aria-label="Livro aberto com círculo amarelo"
            />
          </article>
        </section>

        {visibleError && (
          <div className="error-banner" role="alert">
            <strong>Não foi possível concluir a operação.</strong>
            <span>{visibleError}</span>
          </div>
        )}

        <section
          className={"metrics" + (activeView === "overview" ? "" : " view-hidden")}
          aria-label="Resumo"
        >
          <article>
            <span className="metric-icon cyan"><Icon name="book" /></span>
            <div><strong>{books.length}</strong><span>Livros combinados</span></div>
          </article>
          <article>
            <span className="metric-icon pink">A</span>
            <div><strong>{sourceCount["NODE-A"]}</strong><span>Livros do NODE-A</span></div>
          </article>
          <article>
            <span className="metric-icon yellow">B</span>
            <div><strong>{sourceCount["NODE-B"]}</strong><span>Livros do NODE-B</span></div>
          </article>
          <article>
            <span className="metric-icon orange"><Icon name="activity" /></span>
            <div><strong>{history.length}</strong><span>Respostas processadas</span></div>
          </article>
        </section>

        <section
          className={
            "data-grid single-panel" +
            (activeView === "overview" ? " view-hidden" : "")
          }
        >
          <article
            className={
              "panel books-panel" +
              (activeView === "library" ? "" : " view-hidden")
            }
          >
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Resultado agregado</p>
                <h2>Biblioteca distribuída</h2>
              </div>
              <span className="method-label">GET /biblioteca/todos</span>
            </div>

            {books.length === 0 ? (
              <div className="empty-state">
                <Icon name="book" />
                <strong>Nenhum acervo consultado</strong>
                <span>Use o botão amarelo para consultar os dois nós.</span>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Livro</th>
                      <th>Categoria</th>
                      <th>Origem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {books.map((book) => (
                      <tr key={book.id}>
                        <td>
                          <strong>{book.titulo}</strong>
                          <span>{book.autor}</span>
                        </td>
                        <td>{book.categoria}</td>
                        <td><NodeBadge node={book.origem} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>

          <article
            className={
              "panel balance-panel" +
              (activeView === "balancing" ? "" : " view-hidden")
            }
          >
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Round robin</p>
                <h2>Histórico de respostas</h2>
              </div>
              <span className="method-label">GET /balanceamento/</span>
            </div>

            <div className="node-counters">
              <div className="counter-a">
                <span>NODE-A</span>
                <strong>{counters["NODE-A"]}</strong>
              </div>
              <div className="counter-b">
                <span>NODE-B</span>
                <strong>{counters["NODE-B"]}</strong>
              </div>
            </div>

            <div className="history-list">
              {history.length === 0 ? (
                <div className="empty-state compact">
                  <Icon name="nodes" />
                  <strong>Aguardando requisições</strong>
                  <span>O nó escolhido aparecerá aqui.</span>
                </div>
              ) : (
                history.map((item, index) => (
                  <div className="history-item" key={item.id}>
                    <span className="request-index">#{history.length - index}</span>
                    <div>
                      <strong>Resposta recebida</strong>
                      <span>{item.time}</span>
                    </div>
                    <NodeBadge node={item.server} />
                  </div>
                ))
              )}
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}

export default App;
