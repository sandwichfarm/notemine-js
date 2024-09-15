import { Subject } from 'rxjs';

interface MinerOptions {
  content?: string;
  tags?: string[][];
  pubkey?: string;
  difficulty?: number;
  numberOfWorkers?: number;
}

interface ProgressEvent {
  workerId: number;
  hashRate: number;
  bestPowData?: BestPowData;
}

interface ErrorEvent {
  error: any;
  message?: string;
}

interface CancelledEvent {
  reason?: string;
}

interface SuccessEvent {
  result: MinedResult | null;
}

interface BestPowData {
  bestPow: number;
  nonce: string;
  hash: string;
}

interface WorkerPow extends BestPowData {
  workerId: number;
}

interface MinedResult {
  event: any;
  totalTime: number;
  hashRate: number;
}

class Notemine {
  // Configuration
  private _content: string;
  private _tags: string[][];
  private _pubkey: string;
  private _difficulty: number;
  private _numberOfWorkers: number;
  static _defaultTags: string[][] = [['miner', 'notemine']];

  // State
  public mining: boolean = false;
  public cancelled: boolean = false;
  public result: MinedResult | null = null;
  private workers: Worker[] = [];
  private workersPow: Record<number, BestPowData> = {};
  public highestPow: WorkerPow | null = null;

  // Observables
  private progressSubject = new Subject<ProgressEvent>();
  private errorSubject = new Subject<ErrorEvent>();
  private cancelledSubject = new Subject<CancelledEvent>();
  private successSubject = new Subject<SuccessEvent>();

  public progress$ = this.progressSubject.asObservable();
  public error$ = this.errorSubject.asObservable();
  public cancelled$ = this.cancelledSubject.asObservable();
  public success$ = this.successSubject.asObservable();

  constructor(options?: MinerOptions) {
    this._content = options?.content || '';
    this._tags = [...Notemine._defaultTags, ...options?.tags || []];
    this._pubkey = options?.pubkey || '';
    this._difficulty = options?.difficulty || 20;
    this._numberOfWorkers = options?.numberOfWorkers || navigator.hardwareConcurrency || 4;
  }

  set content(content: string) {
    this._content = content;
  }

  get content(): string {
    return this._content;
  }

  set tags(tags: string[][]) {
    this._tags = [...this._tags, ...tags];
  }

  get tags(): string[][] {
    return this._tags;
  }

  set pubkey(pubkey: string) {
    this._pubkey = pubkey;
  }

  get pubkey(): string {
    return this._pubkey;
  }

  // set difficulty(difficulty: number) {
  //   this._difficulty = difficulty;
  // }

  // get difficulty(): number {
  //   return this._difficulty;
  // }

  // set numberOfWorkers(numberOfWorkers: number) {
  //   this._numberOfWorkers = numberOfWorkers;
  // }

  // get numberOfWorkers(): number {
  //   return this._numberOfWorkers;
  // }

  mine(): void {
    if (this.mining) return;

    if (!this.pubkey) {
      throw new Error('Public key is not set.');
    }

    if (!this.content) {
      throw new Error('Content is not set.');
    }

    this.mining = true;
    this.cancelled = false;
    this.result = null;
    this.workers = [];
    this.workersPow = {};
    this.highestPow = null;

    this.initializeWorkers();
  }

  stop(): void {
    this.cancel();
  }

  cancel(): void {
    if (!this.mining) return;

    this.cancelled = true;
    this.workers.forEach(worker => worker.terminate());
    this.mining = false;

    this.cancelledSubject.next({ reason: 'Mining cancelled by user.' });
  }

  private initializeWorkers(): void {
    for (let i = 0; i < this.numberOfWorkers; i++) {
      const worker = new Worker(new URL('./mine.worker.ts', import.meta.url))

      worker.onmessage = this.handleWorkerMessage.bind(this);
      worker.onerror = this.handleWorkerError.bind(this);
  
      const event = this.prepareEvent();
  
      worker.postMessage({
        type: 'mine',
        event,
        difficulty: this.difficulty,
        id: i,
        totalWorkers: this.numberOfWorkers,
      });
  
      this.workers.push(worker);
    }
  }
  private handleWorkerMessage(e: MessageEvent): void {
    const data = e.data;
    const { type, workerId, hashRate, bestPowData } = data;

    if (type === 'progress') {

      if (bestPowData) {
        this.workersPow[workerId] = bestPowData;


        if (!this.highestPow || bestPowData.best_pow > this.highestPow.bestPow) {
          this.highestPow = {
            bestPow: bestPowData.best_pow,
            nonce: bestPowData.nonce,
            hash: bestPowData.hash,
            workerId,
          };
        }
      }

      this.progressSubject.next({ workerId, hashRate, bestPowData });
    } else if (type === 'result') {

      this.result = data.data;
      this.mining = false;

      this.workers.forEach(worker => worker.terminate());

      this.successSubject.next({ result: this.result });
    } else if (type === 'error') {
      this.errorSubject.next({ error: data.error });
    }
  }

  private handleWorkerError(e: ErrorEvent): void {
    this.errorSubject.next({ error: e.error || e.message });
  }

  private prepareEvent(): string {
    const event = {
      pubkey: this.pubkey,
      kind: 1,
      tags: this.tags,
      content: this.content,
      created_at: Math.floor(Date.now() / 1000),
    };

    return JSON.stringify(event);
  }
}

export { Notemine, MinerOptions, ProgressEvent, ErrorEvent, CancelledEvent, SuccessEvent };
