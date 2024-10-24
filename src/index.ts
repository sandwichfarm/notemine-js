// index.ts

import { Subject, BehaviorSubject } from 'rxjs';
import * as MineWorkerModule from './mine.worker';
const MineWorker = MineWorkerModule as unknown as { new (): Worker };

export interface MinerOptions {
  content?: string;
  tags?: string[][];
  pubkey?: string;
  difficulty?: number;
  numberOfWorkers?: number;
}

export interface ProgressEvent {
  workerId: number;
  hashRate?: number;
  bestPowData?: BestPowData;
}

export interface ErrorEvent {
  error: any;
  message?: string;
}

export interface CancelledEvent {
  reason?: string;
}

export interface SuccessEvent {
  result: MinedResult | null;
}

export interface BestPowData {
  bestPow: number;
  nonce: string;
  hash: string;
}

export interface WorkerPow extends BestPowData {
  workerId: number;
}

export interface MinedResult {
  event: any;
  totalTime: number;
  hashRate: number;
}

export class Notemine {
  // Configuration
  private _content: string;
  private _tags: string[][];
  private _pubkey: string;
  private _difficulty: number;
  private _numberOfWorkers: number;
  static _defaultTags: string[][] = [['miner', 'notemine']];

  // State with BehaviorSubjects
  public mining$ = new BehaviorSubject<boolean>(false);
  public cancelled$ = new BehaviorSubject<boolean>(false); // Track mining cancel state
  public result$ = new BehaviorSubject<MinedResult | null>(null);
  public workers$ = new BehaviorSubject<Worker[]>([]);
  public workersPow$ = new BehaviorSubject<Record<number, BestPowData>>({});
  public highestPow$ = new BehaviorSubject<WorkerPow | null>(null);

  // Observables for events
  private progressSubject = new Subject<ProgressEvent>();
  private errorSubject = new Subject<ErrorEvent>();
  private cancelledEventSubject = new Subject<CancelledEvent>(); // Renamed from cancelledSubject
  private successSubject = new Subject<SuccessEvent>();

  public progress$ = this.progressSubject.asObservable();
  public error$ = this.errorSubject.asObservable();
  public cancelledEvent$ = this.cancelledEventSubject.asObservable(); // Updated observable
  public success$ = this.successSubject.asObservable();

  constructor(options?: MinerOptions) {
    this._content = options?.content || '';
    this._tags = [...Notemine._defaultTags, ...(options?.tags || [])];
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
    this._tags = Array.from(new Set([...this._tags, ...tags]));
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

  set difficulty(difficulty: number) {
    this._difficulty = difficulty;
  }

  get difficulty(): number {
    return this._difficulty;
  }

  set numberOfWorkers(numberOfWorkers: number) {
    this._numberOfWorkers = numberOfWorkers;
  }

  get numberOfWorkers(): number {
    return this._numberOfWorkers;
  }

  mine(): void {
    console.log('mine()')
    if (this.mining$.getValue()) return;

    if (!this.pubkey) {
      throw new Error('Public key is not set.');
    }

    if (!this.content) {
      throw new Error('Content is not set.');
    }

    this.mining$.next(true);
    this.cancelled$.next(false);
    this.result$.next(null);
    this.workers$.next([]);
    this.workersPow$.next({});
    this.highestPow$.next(null);

    this.initializeWorkers();
  }

  stop(): void {
    this.cancel();
  }

  cancel(): void {
    if (!this.mining$.getValue()) return;

    this.cancelled$.next(true);
    this.workers$.getValue().forEach(worker => worker.terminate());
    this.mining$.next(false);

    this.cancelledEventSubject.next({ reason: 'Mining cancelled by user.' }); // Renamed
  }

  private initializeWorkers(): void {
    try {
      console.log('Initializing workers...');
      const workers: Worker[] = [];
      for (let i = 0; i < this.numberOfWorkers; i++) {
        console.log(`Creating worker ${i}`);
        const worker = new MineWorker();
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

        workers.push(worker);
      }

      this.workers$.next(workers);
      console.log(`Initialized ${workers.length} workers.`);
    } catch (error) {
      this.errorSubject.next({ error });
      console.error('Error initializing workers:', error);
    }
  }

  private handleWorkerMessage(e: MessageEvent): void {
    const data = e.data;
    const { type, workerId } = data;

    console.log('Message from worker:', data);

    if (type === 'initialized') {
      console.log(`Worker ${workerId} initialized:`, data.message);
    } else if (type === 'progress') {
      let bestPowData: BestPowData | undefined;
      let hashRate: number | undefined;

      if (data.bestPowData) {
        bestPowData = data.bestPowData as BestPowData;

        const workersPow = { ...this.workersPow$.getValue() };
        workersPow[workerId] = bestPowData;
        this.workersPow$.next(workersPow);

        if (!this.highestPow$.getValue() || bestPowData.bestPow > this.highestPow$.getValue()!.bestPow) {
          this.highestPow$.next({
            ...bestPowData,
            workerId,
          });
        }
      }

      hashRate = data.hashRate;

      this.progressSubject.next({ workerId, hashRate, bestPowData });
    } else if (type === 'result') {
      console.log('Mining result received:', data.data);
      this.result$.next(data.data);
      this.mining$.next(false);

      this.workers$.getValue().forEach(worker => worker.terminate());
      this.successSubject.next({ result: this.result$.getValue() });
    } else if (type === 'error') {
      console.error('Error from worker:', data.error);
      this.errorSubject.next({ error: data.error || 'Unknown error from worker' });
    }
  }

  private handleWorkerError(e: ErrorEvent): void {
    console.error('Worker encountered an error:', e);
    const errorDetails = {
      message: e.message,
      error: e.error ? e.error.message : null,
    };
    this.errorSubject.next({ error: JSON.stringify(errorDetails) });
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
