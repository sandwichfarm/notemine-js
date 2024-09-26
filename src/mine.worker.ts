import init, { mine_event } from './wasm/notemine.js';

let mining = false;
let workerId: number;
let miningCancelled = false;

console.log('Worker loaded');

setInterval(() => { 
  console.log('Worker started');
}, 1000);

self.onmessage = async function (e: MessageEvent) {
  console.log('Worker received message:', e.data);
  const { type, event, difficulty, id, totalWorkers } = e.data;
  workerId = id;

  if (type === 'mine' && !mining) {
    miningCancelled = false;
    mining = true;

    try {
      await init();
      const startNonce = BigInt(workerId);
      const nonceStep = BigInt(totalWorkers);
      const reportProgress = (hashRate: number, bestPowData: any) => {
        const message: any = {
          type: 'progress',
          workerId,
          hashRate,
        };

        if (bestPowData) {
          message.bestPowData = bestPowData;
        }

        self.postMessage(message);
      };

      const shouldCancel = () => {
        return miningCancelled;
      };

      const minedResult = mine_event(
        event,
        difficulty,
        startNonce.toString(),
        nonceStep.toString(),
        reportProgress,
        shouldCancel
      );

      self.postMessage({ type: 'result', data: minedResult, workerId });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      self.postMessage({ type: 'error', error: errorMessage, workerId });
    } finally {
      mining = false;
    }
  } else if (type === 'cancel') {
    miningCancelled = true;
  }
};

export default self;
