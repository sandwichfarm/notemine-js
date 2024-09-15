<script>
  import { writable, derived, get } from 'svelte/store';
  import { generateSecretKey, getPublicKey, Relay, SimplePool } from 'nostr-tools'; 
  import { onMount, onDestroy } from 'svelte';
  import { Notemine } from '@notemine/wrapper';
  import { user, relaySettings, miningState, contentState } from './lib/stores/index';

  const POW_RELAYS = [
    'wss://nostr.bitcoiner.social',
    'wss://nostr.mom',
    'wss://nos.lol',
    'wss://powrelay.xyz',
    'wss://labour.fiatjaf.com/',
    'wss://nostr.lu.ke',
    'wss://140.f7z.io'
  ];

  let notemineInstance;
  let progressSub, successSub, errorSub, bestPowSub, workersPowSub;

  const activeRelays = derived(
    [relaySettings],
    ($relaySettings) => {
      let relays = [];
      if ($relaySettings.myRelays && $relaySettings.myRelays.length > 0) {
        relays.push(...$relaySettings.myRelays);
      }
      if ($relaySettings.powRelaysEnabled) {
        relays.push(...POW_RELAYS);
      }
      return relays;
    }
  );

  function authAnon() {
    const newSecret = generateSecretKey();
    user.set({
      isAnon: true,
      secret: newSecret,
      pubkey: getPublicKey(newSecret)
    });
    // relaySettings.update(r => ({ ...r, myRelays: [] }));
  }

  async function authUser() {
    try {
      const userPubkey = await window.nostr.getPublicKey();
      user.set({
        isAnon: false,
        pubkey: userPubkey,
        secret: ''
      });
      relaySettings.update(r => ({ ...r, myRelays: [] }));
    } catch (error) {
      console.error('Authentication failed:', error);
    }
  }

  function toggleAuth() {
    const currentUser = get(user);
    if (currentUser.isAnon) {
      authUser();
    } else {
      authAnon();
    }
  }

  function toggleRelays() {
    relaySettings.update(r => ({ ...r, myRelaysVisible: !r.myRelaysVisible }));
  }

  function setMyRelays(relays) {
    relaySettings.update(r => ({
      ...r,
      myRelays: Array.from(new Set([...r.myRelays, ...relays]))
    }));
  }

  function startMining() {
    const currentUser = get(user);
    const currentContent = get(contentState);

    if (!currentUser.pubkey || !currentContent.content.trim()) {
      alert('Please fill in all required fields.');
      return;
    }

    miningState.update(m => ({ ...m, mining: true, result: 'Mining started...' }));

    notemineInstance = new Notemine({
      content: currentContent.content,
      pubkey: currentUser.pubkey,
      difficulty: currentContent.difficulty,
      numberOfWorkers: currentContent.numberOfWorkers,
    });

    workersPowSub = notemineInstance.workersPow$.subscribe((data) => {
      miningState.update(m => {
        const workersBestPow = Object.values(data);
        return {
          ...m,
          workersBestPow
        };
      });
    });

    bestPowSub = notemineInstance.highestPow$.subscribe((data) => {
      miningState.update(m => {
        const overallBestPow = data;
        return {
          ...m,
          overallBestPow
        };
      });
    });

    progressSub = notemineInstance.progress$.subscribe(() => {
      miningState.update(m => {
        const overallBestPow = m.overallBestPow;
        const hashRate = notemineInstance.totalHashRate
        return {
          ...m,
          overallBestPow,
          hashRate
        };
      });
    });

    successSub = notemineInstance.success$.subscribe(({ result: minedResult }) => {
      const currentActiveRelays = get(activeRelays);
      miningState.update(m => ({
        ...m,
        mining: false,
        result: minedResult ? JSON.stringify(minedResult, null, 2) : 'No result received.',
        relayStatus: `Published to relays: ${currentActiveRelays.join(', ')}`
      }));
    });

    errorSub = notemineInstance.error$.subscribe(({ error }) => {
      console.error('Mining error:', error);
      miningState.update(m => ({
        ...m,
        mining: false,
        result: `Error: ${error}`
      }));
    });

    notemineInstance.mine();
  }

  const resetMiningState = () => {
    miningState.update(m => ({
      ...m,
      mining: false,
      result: '',
      relayStatus: '',
      hashRate: 0,
      overallBestPow: null
    }));
  }

  function stopMining() {
    if (notemineInstance) {
      notemineInstance.cancel();
      resetMiningState();
    }
  }

  onMount(() => {
    authAnon();
  });

  onDestroy(() => {
    progressSub && progressSub.unsubscribe();
    successSub && successSub.unsubscribe();
    errorSub && errorSub.unsubscribe();
    if (notemineInstance && get(miningState).mining) {
      notemineInstance.cancel();
    }
  });
</script>

<style>
  body {
    font-family: Arial, sans-serif;
    padding: 20px;
  }

  #user {
    margin: 10px 0;
  }

  #relaysContainer {
    margin-top: 10px;
  }

  textarea, input[type="number"] {
    width: 100%;
    padding: 8px;
    margin-top: 5px;
    box-sizing: border-box;
  }

  button {
    padding: 10px 15px;
    margin-right: 10px;
    cursor: pointer;
  }

  pre {
    background-color: #f4f4f4;
    padding: 10px;
    overflow: auto;
  }

  ul {
    list-style-type: none;
    padding-left: 0;
  }

  li {
    margin-bottom: 5px;
  }
</style>

<h1><code>note⛏️</code></h1>
<p>This is a demo of <strong>Notemine</strong>, a wasm Nostr note miner written in Rust.</p>

<button on:click={toggleAuth}>
  {#if $user.isAnon}
    Login
  {/if}
  {#if !$user.isAnon}
    Logout
  {/if}
</button>

<button
  data-npub="npub1uac67zc9er54ln0kl6e4qp2y6ta3enfcg7ywnayshvlw9r5w6ehsqq99rx"
  data-relays="wss://relay.damus.io,wss://relay.snort.social,wss://nos.lol,wss://nostr.fmt.wiz.biz,wss://nostr.mutinywallet.com,wss://nostr.mywire.org,wss://relay.primal.net"
  style="inline-block"
>
    ⚡️ zap me
</button>

<button
  onclick="document.location.href='https://njump.me/nprofile1qythwumn8ghj7un9d3shjtnswf5k6ctv9ehx2ap0qy88wumn8ghj7mn0wvhxcmmv9uq3samnwvaz7tmwdaehgu3wvekhgtnhd9azucnf0ghsqg88wxhskpwga90umah7kdgq23xjlvwv6wz83r5lfy9m8m3garkkdusz5s2r'"
  style="display: inline-block; cursor: pointer;"
>
    🍻 follow
</button>

<button
  onclick="document.location.href='https://github.com/sandwichfarm/minnote-wasm'"
  style="display: inline-block; cursor: pointer;"
>
    🤖 git
</button>

<button
  onclick="document.location.href='https://crates.io/crates/notemine'"
  style="display: inline-block; cursor: pointer;"
>
    📦️ crate
</button>

<div id="user">
  posting as: 
  <img 
    id="userPhoto" 
    width="20" 
    height="20" 
    src={$user.isAnon ? './lib/img/anon.svg' : 'path_to_user_photo'} 
    alt="User Photo" 
  /> 
  <span id="userName">{$user.isAnon ? 'anon' : $user.pubkey}</span> 
  <small 
    id="relaysToggle" 
    style="cursor: pointer; color:#333;" 
    on:click={toggleRelays} 
    tabindex="0"
  >
    (relays)
  </small>
  
  {#if $relaySettings.myRelaysVisible}
    <div id="relaysContainer">
      <strong>My Relays:</strong>
      <ul>
        {#each $relaySettings.myRelays as relay}
          <li>{relay}</li>
        {/each}
      </ul>
      <br />
      <input type="checkbox" bind:checked={$relaySettings.powRelaysEnabled}> 
      <strong>POW Relays: </strong>
      <ul>
        {#each POW_RELAYS as relay}
          <li>{relay}</li>
        {/each}
      </ul>
    </div>
  {/if}
</div>

<textarea 
  id="eventInput" 
  rows="10" 
  placeholder="140 characters or less." 
  maxlength="140" 
  bind:value={$contentState.content}
></textarea>

<br><br>

<label for="difficulty">Difficulty:</label>
<input 
  type="number" 
  id="difficulty" 
  bind:value={$contentState.difficulty} 
  min="1"
/>
<br><br>

<label for="numberOfWorkers"># of workers:</label>
<input 
  type="number" 
  id="numberOfWorkers" 
  bind:value={$contentState.numberOfWorkers} 
  min="1" 
  max={navigator.hardwareConcurrency}
/>
<br><br>

<button on:click={startMining} disabled={$miningState.mining}>
  Mine & Publish
</button> 
<button on:click={stopMining} disabled={!$miningState.mining}>
  Cancel Mining
</button>

<h2>Hash Rate:</h2>
<pre id="hashrate">{$miningState.hashRate.toFixed(2)} kH/s</pre>

<h2>Worker Overview:</h2>
<pre id="hashrate">
  {#each $miningState.workersBestPow as worker, key}
    Miner #{key}: Best PoW: {worker.bestPow} (Nonce: {worker.nonce} Hash: {worker.hash} ) <br />
  {/each}
</pre>

<h2>Best PoW:</h2>
<pre id="overallBestPow">
  {#if $miningState.overallBestPow && typeof $miningState.overallBestPow.bestPow === 'number'}
    {JSON.stringify($miningState.overallBestPow, null, 2)}
  {:else}
    No PoW results yet.
  {/if}
</pre>

<h2>Result:</h2>
<pre id="result">{$miningState.result}</pre>

<h2>Relay Status:</h2>
<pre id="relayStatus">{$miningState.relayStatus}</pre>
