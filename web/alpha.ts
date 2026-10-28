import { Chessground } from "@lichess-org/chessground";
import { Chess } from "chessops/chess";
import { parseFen } from "chessops/fen";
import type { Api } from "@lichess-org/chessground/api";
import type { Key } from "@lichess-org/chessground/types";
type Color = "white" | "black";
type Game = {
  id: string;
  version: number;
  fen: string;
  turn: Color;
  humanColor: Color;
  status: string;
  reason: string | null;
  result: string;
  bot: { id: string; name: string };
  clocks: Record<Color, number>;
  serverTime: number;
  dests: Record<string, string[]>;
  sans: string[];
  moves: string[];
  check: boolean;
  control: string;
};
const el = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
let game: Game | undefined,
  user: { username: string } | null = null,
  socket: WebSocket | undefined,
  connected = false,
  receivedAt = performance.now(),
  retry = 0,
  reconnectTimer: number | undefined;
const board: Api = Chessground(el("board"), {
  fen: "start",
  orientation: "white",
  viewOnly: false,
  coordinates: true,
  animation: { enabled: true, duration: 180 },
  movable: {
    free: false,
    color: undefined,
    dests: new Map(),
    events: { after: (from, to) => void move(from, to) },
  },
  premovable: { enabled: false },
});
function notice(s: string) {
  el("notice").textContent = s;
}
async function api(url: string, body?: unknown) {
  const r = await fetch(url, {
    credentials: "same-origin",
    headers: body ? { "Content-Type": "application/json" } : {},
    method: body ? "POST" : "GET",
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json();
  if (!r.ok) throw Error(data.error ?? "Request failed");
  return data;
}
async function updateHistory() {
  if (!user) return;
  const data = await api("/api/games");
  el("history").replaceChildren();
  for (const g of data.games as Game[]) {
    const b = document.createElement("button");
    b.textContent = `${g.bot.name} · ${g.status === "active" ? "In progress" : g.result}`;
    b.onclick = () => {
      game = undefined;
      setGame(g);
      subscribe();
    };
    el("history").append(b);
  }
  if (!data.games.length)
    el("history").textContent = "Your first game is waiting.";
}
function setGame(g: Game) {
  if (game?.id === g.id && game.version > g.version) return;
  game = g;
  receivedAt = performance.now();
  render();
  if (g.status !== "active") void updateHistory().catch(() => {});
}
function render() {
  el<HTMLButtonElement>("play").disabled = !user || game?.status === "active";
  el<HTMLButtonElement>("resign").disabled =
    !user || !connected || game?.status !== "active";
  el<HTMLButtonElement>("draw").disabled =
    !user || !connected || game?.status !== "active";
  el<HTMLButtonElement>("rematch").disabled =
    !user || !game || game.status === "active";
  if (!game) return;
  const active = game.status === "active";
  board.set({
    fen: game.fen,
    orientation: game.humanColor,
    turnColor: game.turn,
    check: game.check,
    movable: {
      color:
        active && connected && game.turn === game.humanColor
          ? game.humanColor
          : undefined,
      dests: new Map(Object.entries(game.dests)) as Map<Key, Key[]>,
    },
    lastMove: game.moves.length
      ? ([game.moves.at(-1)!.slice(0, 2), game.moves.at(-1)!.slice(2, 4)] as [
          Key,
          Key,
        ])
      : undefined,
  });
  el("opponent").textContent = `${game.bot.name} · Maia3 bot`;
  el("player").textContent = user?.username ?? "You";
  el("moves").textContent =
    game.sans
      .map((s, i) => `${i % 2 === 0 ? `${i / 2 + 1}. ` : ""}${s}`)
      .join(" ") || "Make your first move.";
  el("moves").scrollTop = el("moves").scrollHeight;
  const a = el<HTMLAnchorElement>("pgn");
  a.hidden = false;
  a.href = `/api/games/${game.id}/pgn`;
  notice(
    active
      ? game.turn === game.humanColor
        ? "Your turn."
        : "Maia is thinking…"
      : game.status === "void"
        ? `Game voided: ${game.reason?.replaceAll("_", " ")}. No rating changes.`
        : `${game.result} · ${game.reason?.replaceAll("_", " ")} · Unrated`,
  );
}
function subscribe() {
  if (game && socket?.readyState === WebSocket.OPEN)
    socket.send(JSON.stringify({ type: "subscribe", gameId: game.id }));
}
function connect() {
  if (!user) return;
  clearTimeout(reconnectTimer);
  socket?.close();
  const ws = new WebSocket(
    `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/api/socket`,
  );
  socket = ws;
  ws.onopen = () => {
    if (socket !== ws) return;
    connected = true;
    retry = 0;
    el("connection").textContent =
      "Connected · clocks are controlled by the server";
    subscribe();
    render();
  };
  ws.onmessage = (e) => {
    if (socket !== ws) return;
    const message = JSON.parse(e.data);
    if (message.type === "state") setGame(message.game);
    else if (message.type === "error") {
      notice(message.error);
      void refresh();
    }
  };
  ws.onclose = () => {
    if (socket !== ws) return;
    connected = false;
    el("connection").textContent =
      "Connection lost · clocks continue running · reconnecting…";
    render();
    if (user)
      reconnectTimer = window.setTimeout(
        connect,
        Math.min(8000, 500 * 2 ** retry++),
      );
  };
}
async function refresh() {
  if (game) setGame(await api(`/api/games/${game.id}`));
}
async function command(type: "move" | "resign" | "claim_draw", uci?: string) {
  if (!game) return;
  board.stop();
  try {
    setGame(
      await api(`/api/games/${game.id}/commands`, {
        id: crypto.randomUUID(),
        version: game.version,
        type,
        ...(uci ? { uci } : {}),
      }),
    );
  } catch (e) {
    await refresh();
    render();
    notice((e as Error).message);
    return;
  }
  render();
}
async function move(from: string, to: string) {
  if (!game || !connected) return;
  let suffix = "";
  const pos = Chess.fromSetup(parseFen(game.fen).unwrap()).unwrap();
  const piece = pos.board.get(
    from.charCodeAt(0) - 97 + 8 * (Number(from[1]) - 1),
  );
  if (piece?.role === "pawn" && /[18]$/.test(to)) {
    const dialog = el<HTMLDialogElement>("promotion");
    suffix = await new Promise<string>((resolve) => {
      dialog.addEventListener(
        "close",
        () => resolve(dialog.returnValue || "q"),
        { once: true },
      );
      dialog.returnValue = "q";
      dialog.showModal();
    });
  }
  await command("move", from + to + suffix);
}
async function join(botId?: string, control?: string) {
  try {
    const g = await api("/api/pool", {
      id: crypto.randomUUID(),
      control: control ?? el<HTMLSelectElement>("control").value,
      botId: botId ?? el<HTMLSelectElement>("bot").value,
    });
    game = undefined;
    setGame(g);
    subscribe();
    await updateHistory();
  } catch (e) {
    notice((e as Error).message);
  }
}
el("play").onclick = () => void join();
el("rematch").onclick = () => void join(game?.bot.id, game?.control);
el("resign").onclick = () => {
  if (confirm("Resign this game?")) void command("resign");
};
el("draw").onclick = () => void command("claim_draw");
el("login").onclick = async () => {
  try {
    const signer = (
      window as unknown as {
        nostr?: {
          getPublicKey: () => Promise<string>;
          signEvent: (e: unknown) => Promise<unknown>;
        };
      }
    ).nostr;
    if (!signer)
      throw Error(
        "Connect a NIP-07 Nostr browser signer, then try again. Local key creation and remote signer support are coming next.",
      );
    const pubkey = await signer.getPublicKey();
    const c = await api("/api/auth/challenge", { pubkey });
    const body = JSON.stringify({ challenge: c.challenge });
    const hash = Array.from(
      new Uint8Array(
        await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body)),
      ),
    )
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const event = await signer.signEvent({
      kind: 27235,
      created_at: Math.floor(Date.now() / 1000),
      content: "",
      tags: [
        ["u", c.url],
        ["method", "POST"],
        ["challenge", c.challenge],
        ["payload", hash],
      ],
    });
    const r = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Nostr ${btoa(JSON.stringify(event))}`,
      },
      body,
    });
    const data = await r.json();
    if (!r.ok) throw Error(data.error);
    await init();
  } catch (e) {
    notice((e as Error).message);
  }
};
el("logout").onclick = async () => {
  await api("/api/auth/logout", {});
  user = null;
  socket?.close();
  location.reload();
};
function clock(ms: number) {
  const seconds = Math.ceil(Math.max(0, ms) / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
setInterval(() => {
  if (!game) return;
  const other = game.humanColor === "white" ? "black" : "white";
  for (const [id, color] of [
    ["top-clock", other],
    ["bottom-clock", game.humanColor],
  ] as const) {
    const ms =
      game.clocks[color] -
      (game.status === "active" && game.turn === color
        ? performance.now() - receivedAt
        : 0);
    el(id).textContent = clock(ms);
    el(id).classList.toggle(
      "running",
      game.status === "active" && game.turn === color,
    );
  }
}, 100);
async function init() {
  const [me, list] = await Promise.all([api("/api/me"), api("/api/bots")]);
  user = me.user;
  el("account").textContent = user?.username ?? "Not signed in";
  el("login").hidden = !!user;
  el("logout").hidden = !user;
  el("bot").replaceChildren();
  for (const b of list.bots) {
    const o = document.createElement("option");
    o.value = b.id;
    o.textContent = b.name;
    el("bot").append(o);
  }
  const requested = new URLSearchParams(location.search);
  const botSelect = el<HTMLSelectElement>("bot");
  botSelect.value = list.bots.some(
    (b: { id: string }) => b.id === requested.get("bot"),
  )
    ? requested.get("bot")!
    : "cloud-knight";
  const control = requested.get("control");
  if (control === "blitz" || control === "rapid")
    el<HTMLSelectElement>("control").value = control;
  if (user) {
    const history = await api("/api/games");
    const active = history.games.find((g: Game) => g.status === "active");
    if (active) setGame(active);
    connect();
    await updateHistory();
  }
  render();
}
void init().catch(() => {
  notice(
    "The game service is unavailable. This local preview shows the interface; live games require the running alpha server and a Nostr browser signer.",
  );
  el("connection").textContent = "Game service offline";
  el<HTMLButtonElement>("login").disabled = true;
});
