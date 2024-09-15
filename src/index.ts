// import Worker from './mine.worker'; 
import { Subject } from 'rxjs';


interface MinerOptions {
  content?: string;
  tags?: string[][];
  publicKey?: string;
  difficulty?: number;
  numberOfWorkers?: number;
  relayUrls?: string[];
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
  private content: string;
  private tags: string[][];
  private publicKey: string;
  private difficulty: number;
  private numberOfWorkers: number;
  private relayUrls: string[];

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
    this.content = options?.content || '';
    this.tags = options?.tags || [];
    this.publicKey = options?.publicKey || '';
    this.difficulty = options?.difficulty || 20;
    this.numberOfWorkers = options?.numberOfWorkers || navigator.hardwareConcurrency || 4;
    this.relayUrls = options?.relayUrls || [];
  }

  setContent(content: string): void {
    this.content = content;
  }

  setTags(tags: string[][]): void {
    this.tags = tags;
  }

  setPubkey(publicKey: string): void {
    this.publicKey = publicKey;
  }

  sign(privateKey: string): void {
    // Implement signing logic using privateKey
    // This is a placeholder; you'll need to integrate with a Nostr library
    // that can sign events using the private key.
  }

  mine(): void {
    if (this.mining) return;

    if (!this.publicKey) {
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

  cancel(): void {
    if (!this.mining) return;

    this.cancelled = true;
    this.workers.forEach(worker => worker.terminate());
    this.mining = false;

    this.cancelledSubject.next({ reason: 'Mining cancelled by user.' });
  }

  async publish(): Promise<void> {
    if (!this.result) {
      throw new Error('No mined result to publish.');
    }

    // Implement publishing logic to Nostr relays
    // This is a placeholder; you'll need to integrate with a Nostr library
    // that can publish events to relays.
  }

  private initializeWorkers(): void {
    for (let i = 0; i < this.numberOfWorkers; i++) {
      // const worker = new Worker();
      const worker = new Worker(new URL('./mine.worker.ts', import.meta.url))

      worker.onmessage = this.handleWorkerMessage.bind(this);
      worker.onerror = this.handleWorkerError.bind(this);
  
      // Prepare the event data
      const event = this.prepareEvent();
  
      // Send the mining message to the worker
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
      // Update worker's best PoW data
      if (bestPowData) {
        this.workersPow[workerId] = bestPowData;

        // Update highest PoW
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
      // Mining succeeded
      this.result = data.data;
      this.mining = false;

      // Terminate all workers
      this.workers.forEach(worker => worker.terminate());

      
      // Emit success event
      this.successSubject.next({ result: this.result });
    } else if (type === 'error') {
      // Handle error from worker
      this.errorSubject.next({ error: data.error });
    }
  }

  private handleWorkerError(e: ErrorEvent): void {
    // Emit error event
    this.errorSubject.next({ error: e.error || e.message });
  }

  private prepareEvent(): string {
    const event = {
      pubkey: this.publicKey,
      kind: 1,
      tags: this.tags,
      content: this.content,
      created_at: Math.floor(Date.now() / 1000),
    };

    return JSON.stringify(event);
  }
}

export { Notemine, MinerOptions, ProgressEvent, ErrorEvent, CancelledEvent, SuccessEvent };