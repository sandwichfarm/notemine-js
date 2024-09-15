import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Notemine } from './index.ts';
import { Observable } from 'rxjs';

describe('Notemine', () => {
  let miner: Notemine;

  beforeEach(() => {
    miner = new Notemine({
      content: 'Test content',
      publicKey: 'testpublickey',
      difficulty: 20,
      numberOfWorkers: 2,
    });
  });

  it('should initialize with default values', () => {
    expect(miner.mining).toBe(false);
    expect(miner.cancelled).toBe(false);
    expect(miner.result).toBeNull();
  });

  it('should set content', () => {
    miner.setContent('New content');
    expect((miner as any).content).toBe('New content');
  });

  it('should set tags', () => {
    miner.setTags([['tag1', 'value1']]);
    expect((miner as any).tags).toEqual([['tag1', 'value1']]);
  });

  it('should set public key', () => {
    miner.setPubkey('newpublickey');
    expect((miner as any).publicKey).toBe('newpublickey');
  });

  it('should start mining', () => {
    miner.mine();
    expect(miner.mining).toBe(true);
  });

  it('should cancel mining', () => {
    miner.mine();
    expect(miner.mining).toBe(true);
    miner.cancel();
    expect(miner.mining).toBe(false);
    expect(miner.cancelled).toBe(true);
  });

  it('should emit progress events', (done) => {
    const progressSpy = vi.fn();
    const subscription = miner.progress$.subscribe(progressSpy);

    miner.mine();

    // Simulate a progress event
    setTimeout(() => {
      expect(progressSpy).toHaveBeenCalled();
      subscription.unsubscribe();
      miner.cancel();
      done();
    }, 100);
  });

  it('should handle mining success', (done) => {
    const successSpy = vi.fn();
    miner.success$.subscribe((success) => {
      successSpy(success);
      expect(success.result).toBeDefined();
      expect(miner.mining).toBe(false);
      done();
    });

    // Since we cannot actually mine without the WASM and worker setup,
    // we need to simulate a successful mining operation.
    // For this test, you would need to mock the worker and WASM interactions.

    // Simulate success after a short delay
    setTimeout(() => {
      miner['handleWorkerMessage']({
        data: {
          type: 'result',
          data: { event: {}, totalTime: 1.0, hashRate: 1000 },
          workerId: 0,
        },
      } as any);
    }, 100);
  });
});
