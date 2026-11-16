import { HardDropEvent, LineClearEvent, OmegaExplosionEvent } from './engine.js';
import { ActivePiece, CellType, GameMode, TetrominoType } from './types.js';

export type NetRole = 'host' | 'guest';

export type NetConnectionStatus =
  | 'idle'
  | 'gathering'
  | 'waiting_answer'
  | 'waiting_connect'
  | 'connected'
  | 'disconnected'
  | 'error';

export interface NetBoardState {
  board: CellType[][];
  activePiece: ActivePiece | null;
  holdPiece: TetrominoType | null;
  nextQueue: TetrominoType[];
  score: number;
  lines: number;
  level: number;
  pendingGarbage: number;
  overdriveGauge: number;
  omegaReady: boolean;
}

export type NetMessage =
  | { type: 'start'; mode: GameMode }
  | { type: 'state'; state: NetBoardState }
  | { type: 'attack'; lines: number }
  | { type: 'fx_hard_drop'; event: HardDropEvent }
  | { type: 'fx_line_clear'; event: LineClearEvent }
  | { type: 'fx_omega'; event: OmegaExplosionEvent }
  | { type: 'gameover' }
  | { type: 'rematch_request' }
  | { type: 'rematch_accept'; mode: GameMode };

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
];

const OFFER_PREFIX = 'TT1:';
const ANSWER_PREFIX = 'TT2:';

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function compressString(text: string): Promise<string> {
  const raw = new TextEncoder().encode(text);
  const CS = (globalThis as unknown as { CompressionStream?: new (fmt: string) => TransformStream }).CompressionStream;
  if (CS) {
    try {
      const cs = new CS('deflate-raw');
      const stream = new Blob([raw as unknown as BlobPart]).stream().pipeThrough(cs);
      const buf = await new Response(stream).arrayBuffer();
      return 'z' + toBase64Url(new Uint8Array(buf));
    } catch {
      // Fallback to raw base64
    }
  }
  return 'r' + toBase64Url(raw);
}

async function decompressString(encoded: string): Promise<string> {
  const flag = encoded.charAt(0);
  const payload = encoded.slice(1);
  const bytes = fromBase64Url(payload);
  if (flag === 'z') {
    const DS = (globalThis as unknown as { DecompressionStream?: new (fmt: string) => TransformStream }).DecompressionStream;
    if (!DS) {
      throw new Error('この環境は圧縮コードの展開に対応していません。');
    }
    const ds = new DS('deflate-raw');
    const stream = new Blob([bytes as unknown as BlobPart]).stream().pipeThrough(ds);
    const buf = await new Response(stream).arrayBuffer();
    return new TextDecoder().decode(buf);
  }
  if (flag === 'r') {
    return new TextDecoder().decode(bytes);
  }
  throw new Error('招待コードの形式が正しくありません。');
}

function waitForIceGathering(pc: RTCPeerConnection, timeoutMs = 2600): Promise<void> {
  if (pc.iceGatheringState === 'complete') {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      pc.removeEventListener('icegatheringstatechange', onState);
      pc.removeEventListener('icecandidate', onCand);
      clearTimeout(timer);
      resolve();
    };
    const onState = () => {
      if (pc.iceGatheringState === 'complete') {
        done();
      }
    };
    const onCand = (ev: RTCPeerConnectionIceEvent) => {
      if (!ev.candidate) {
        done();
      }
    };
    const timer = window.setTimeout(done, timeoutMs);
    pc.addEventListener('icegatheringstatechange', onState);
    pc.addEventListener('icecandidate', onCand);
  });
}

export interface P2PCallbacks {
  onStatusChange?: (status: NetConnectionStatus, detail?: string) => void;
  onMessage?: (msg: NetMessage) => void;
}

export class P2PClient {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private role: NetRole | null = null;
  private status: NetConnectionStatus = 'idle';
  private callbacks: P2PCallbacks;

  constructor(callbacks: P2PCallbacks) {
    this.callbacks = callbacks;
  }

  public getRole(): NetRole | null {
    return this.role;
  }

  public getStatus(): NetConnectionStatus {
    return this.status;
  }

  public isConnected(): boolean {
    return this.status === 'connected' && this.dc !== null && this.dc.readyState === 'open';
  }

  private setStatus(status: NetConnectionStatus, detail?: string): void {
    this.status = status;
    this.callbacks.onStatusChange?.(status, detail);
  }

  private setupPeerConnection(): RTCPeerConnection {
    this.close(false);
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.pc = pc;

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        if (this.status === 'connected' || this.status === 'waiting_connect') {
          this.setStatus('disconnected', '通信が切断されました');
        }
      }
    };

    return pc;
  }

  private attachDataChannel(dc: RTCDataChannel): void {
    this.dc = dc;
    dc.onopen = () => {
      this.setStatus('connected', 'P2P接続完了！');
    };
    dc.onclose = () => {
      if (this.status === 'connected') {
        this.setStatus('disconnected', '相手が切断しました');
      }
    };
    dc.onerror = () => {
      this.setStatus('error', 'データ通信エラーが発生しました');
    };
    dc.onmessage = (ev) => {
      try {
        const msg = JSON.parse(String(ev.data)) as NetMessage;
        this.callbacks.onMessage?.(msg);
      } catch (err) {
        console.error('[P2P] Invalid message:', err);
      }
    };
  }

  public async createHostOffer(): Promise<string> {
    this.role = 'host';
    const pc = this.setupPeerConnection();
    this.setStatus('gathering', 'ネットワーク経路を探索中...');

    const dc = pc.createDataChannel('ttoris-vs', { ordered: true });
    this.attachDataChannel(dc);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await waitForIceGathering(pc, 2600);

    const local = pc.localDescription;
    if (!local || !local.sdp) {
      throw new Error('招待コードの生成に失敗しました。');
    }

    const compressed = await compressString(JSON.stringify({ t: local.type, s: local.sdp }));
    this.setStatus('waiting_answer', '招待コードを相手に送り、参加コードを入力してください');
    return OFFER_PREFIX + compressed;
  }

  public async acceptHostOffer(offerCode: string): Promise<string> {
    const trimmed = offerCode.trim();
    if (!trimmed.startsWith(OFFER_PREFIX)) {
      throw new Error('招待コードの形式が正しくありません（TT1: で始まるコードを入力してください）。');
    }

    this.role = 'guest';
    const pc = this.setupPeerConnection();
    this.setStatus('gathering', '参加コードを生成中...');

    pc.ondatachannel = (ev) => {
      this.attachDataChannel(ev.channel);
    };

    const jsonStr = await decompressString(trimmed.slice(OFFER_PREFIX.length));
    const parsed = JSON.parse(jsonStr) as { t: RTCSdpType; s: string };
    await pc.setRemoteDescription({ type: parsed.t, sdp: parsed.s });

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await waitForIceGathering(pc, 2600);

    const local = pc.localDescription;
    if (!local || !local.sdp) {
      throw new Error('参加コードの生成に失敗しました。');
    }

    const compressed = await compressString(JSON.stringify({ t: local.type, s: local.sdp }));
    this.setStatus('waiting_connect', '参加コードをホストへ送って接続を待っています...');
    return ANSWER_PREFIX + compressed;
  }

  public async acceptGuestAnswer(answerCode: string): Promise<void> {
    if (!this.pc || this.role !== 'host') {
      throw new Error('先に「招待コードを作成」を実行してください。');
    }
    const trimmed = answerCode.trim();
    if (!trimmed.startsWith(ANSWER_PREFIX)) {
      throw new Error('参加コードの形式が正しくありません（TT2: で始まるコードを入力してください）。');
    }

    this.setStatus('waiting_connect', 'P2P接続を確立中...');
    const jsonStr = await decompressString(trimmed.slice(ANSWER_PREFIX.length));
    const parsed = JSON.parse(jsonStr) as { t: RTCSdpType; s: string };
    await this.pc.setRemoteDescription({ type: parsed.t, sdp: parsed.s });
  }

  public send(msg: NetMessage): boolean {
    if (!this.isConnected() || !this.dc) return false;
    try {
      this.dc.send(JSON.stringify(msg));
      return true;
    } catch {
      return false;
    }
  }

  public close(notify = true): void {
    if (this.dc) {
      try {
        this.dc.close();
      } catch { }
      this.dc = null;
    }
    if (this.pc) {
      try {
        this.pc.close();
      } catch { }
      this.pc = null;
    }
    if (notify) {
      this.setStatus('idle');
    } else {
      this.status = 'idle';
    }
  }
}
