import init, { mine_event } from '../dist/wasm/notemine.js';

let mining = false;
let workerId: number;
let miningCancelled = false;

self.onmessage = async function (e) {
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

        (self as any).postMessage(message);
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

      (self as any).postMessage({ type: 'result', data: minedResult, workerId });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      (self as any).postMessage({ type: 'error', error: errorMessage, workerId });
    } finally {
      mining = false;
    }
  } else if (type === 'cancel') {
    miningCancelled = true;
  }
};

export default self