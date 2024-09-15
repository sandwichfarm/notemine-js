declare module '*?worker' {
  class WebpackWorker extends Worker {
    constructor();
  }

  export default WebpackWorker;
}

declare module '../dist/wasm/notemine' {
  export function init(): Promise<void>;
  export function mine_event_wrapper(
    event: any,
    difficulty: number,
    start_nonce_str: string,
    nonce_step_str: string,
    report_progress: (hashRate: number, bestPowData: any) => void,
    should_cancel: () => boolean
  ): Promise<any>;
}

declare module '*.wasm' {
  const content: any;
  export default content;
}

// declare module '*?worker&inline' {
//   const workerConstructor: new () => Worker;
//   export default workerConstructor;
// }

// declare module '*?worker' {
//   const workerConstructor: new () => Worker;
//   export default workerConstructor;
// }

// declare module '*.wasm' {
//   const wasmModule: any;
//   export default wasmModule;
// }