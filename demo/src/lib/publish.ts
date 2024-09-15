import { NostrEvent } from "nostr-tools";

const pool = new SimplePool();
let pubs = [];
let usub = null;

export const publishEvent = async (ev: NostrEvent) => {
  const pow = verifyPow(ev);

  console.log('Publishing event:', ev);
  
  try {
      if(isAnon) {
          ev = window.NostrTools.finalizeEvent(ev, secret);
      }
      else {
          ev = await window.nostr.signEvent(ev)
      }
      let isGood = window.NostrTools.verifyEvent(ev);
      if (!isGood) throw new Error('Event is not valid');
      pubs = pool.publish(activeRelays(), ev);
      await Promise.allSettled(pubs);
      relayStatus.style.display = '';
      showRelayStatus();
      console.log('Event published successfully.');
  } catch (error) {
      console.error('Error publishing event:', error);
      resultOutput.textContent = `Error publishing event: ${error.message}`;
  }
};

export const verifyPow = (event: NostrEvent) => {
  const hash = getEventHash(event);
  const count = getPow(hash);
  const nonceTag = event.tags.find(tag => tag[0] === 'nonce');
  if (!nonceTag || nonceTag.length < 3) {
      return 0;
  }
  const targetDifficulty = parseInt(nonceTag[2], 10);
  return Math.min(count, targetDifficulty);
}