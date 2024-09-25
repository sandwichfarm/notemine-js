<script>
  import { generateSecretKey, getPublicKey } from 'nostr-tools'; 
  import { onMount, onDestroy } from 'svelte';
  import { Notemine } from 'notemine';

  console.log(Notemine)

  let pubkey = '';
  let secret = '';
  let isAnon = true;
  let content = '';
  let difficulty = 21;
  let numberOfWorkers = navigator.hardwareConcurrency || 2;
  let mining = false;
  let hashRate = 0;
  let minersBestPow = '';
  let overallBestPow = '';
  let result = 'Waiting for worker to initialize...';
  let neventOutput = '';
  let relayStatus = '';
  let halt = false;

  const POW_RELAYS = [
    'wss://nostr.bitcoiner.social',
    'wss://nostr.mom',
    'wss://nos.lol',
    'wss://powrelay.xyz',
    'wss://labour.fiatjaf.com/',
    'wss://nostr.lu.ke',
    'wss://140.f7z.io'
  ];
  let MY_RELAYS = [];
  let powRelaysEnabled = true;
  let myRelaysVisible = false;

  let notemineInstance;

  let progressSub;
  let successSub;
  let errorSub;

  function authAnon() {
    isAnon = true;
    secret = generateSecretKey();
    pubkey = getPublicKey(secret);
    MY_RELAYS = [];
  }

  async function authUser() {
    try {
      pubkey = await window.nostr.getPublicKey();
      isAnon = false;
      // Fetch user-specific relays if available
      // For demonstration, we'll keep MY_RELAYS empty
      MY_RELAYS = [];
    } catch (error) {
      console.error('Authentication failed:', error);
    }
  }

  function toggleAuth() {
    if (isAnon) {
      authUser();
    } else {
      authAnon();
    }
  }

  function toggleRelays() {
    myRelaysVisible = !myRelaysVisible;
  }

  function setMyRelays(relays) {
    MY_RELAYS = Array.from(new Set([...MY_RELAYS, ...relays]));
  }

  function resetBestPow() {
    minersBestPow = '';
    overallBestPow = '';
  }

  function activeRelays() {
    let relays = [...MY_RELAYS];
    if (powRelaysEnabled) {
      relays = [...relays, ...POW_RELAYS];
    }
    return relays;
  }

  function startMining() {
    if (!pubkey || !content || mining) {
      alert("Please fill in all required fields.");
      return;
    }

    mining = true;
    notemineInstance = new Notemine({
      content,
      pubkey,
      difficulty,
      numberOfWorkers
    });

    resetBestPow();

    progressSub = notemineInstance.progress$.subscribe(({ workerId, hashRate: hr, bestPowData }) => {
      console.log(workerId, hr, bestPowData); 
      hashRate = (hr / 1000).toFixed(2); // Convert to kH/s
      if (bestPowData) {
        minersBestPow += `Miner #${workerId}: Best PoW ${bestPowData.bestPow} (Nonce: ${bestPowData.nonce}, Hash: ${bestPowData.hash})\n`;
        if (!overallBestPow || bestPowData.bestPow > parseInt(overallBestPow.split(': ')[1])) {
          overallBestPow = `Overall Best PoW: ${bestPowData.bestPow} by Miner #${workerId}`;
        }
      }
    });

    successSub = notemineInstance.success$.subscribe(({ result: minedResult }) => {
      console.log('minedResult', minedResult);
      mining = false;
      result = JSON.stringify(minedResult, null, 2);
      relayStatus = `Published to relays: ${activeRelays().join(', ')}`;
    });

    errorSub = notemineInstance.error$.subscribe(({ error }) => {
      console.error('Mining error:', error);
      mining = false;
      result = `Error: ${error}`;
    });

    notemineInstance.mine();

    console.log('instance', notemineInstance)
  }

  function stopMining() {
    if (notemineInstance) {
      notemineInstance.cancel();
      mining = false;
      hashRate = 0;
      result = 'Mining cancelled.';
    }
  }

  onMount(() => {
    authAnon();
  });

  onDestroy(() => {
    if (progressSub) progressSub.unsubscribe();
    if (successSub) successSub.unsubscribe();
    if (errorSub) errorSub.unsubscribe();
    if (notemineInstance && mining) {
      notemineInstance.cancel();
    }
  });
</script>

<style>
  body {
    font-family: Arial, sans-serif;
    margin: 20px;
  }
  textarea {
    width: 100%;
    max-width: 600px;
  }
  input[type="number"] {
    width: 100px;
  }
  button {
    padding: 10px 20px;
    font-size: 16px;
    margin-right: 10px;
  }
  pre {
    background-color: #f4f4f4;
    padding: 10px;
    max-width: 600px;
    overflow-x: auto;
  }
  code {
    font-size: 30px;
  }
  #user {
    max-width: 600px;
    margin: 10px 0;
  }
  #relaysContainer {
    background: #f0f0f0;
    padding: 4px 6px;
    margin-top: 10px;
  }
</style>

<h1><code>note⛏️</code></h1>
<p>This is a demo of <strong>Notemine</strong>, a wasm Nostr note miner written in Rust.</p>

<!-- Authentication Button -->
<button on:click={toggleAuth}>{isAnon ? 'Login' : 'Logout'}</button>

<!-- User Information -->
<div id="user">
  posting as: 
  <img id="userPhoto" width="20" height="20" src={isAnon ? './lib/img/anon.svg' : 'path_to_user_photo'} alt="User Photo" /> 
  <span id="userName">{isAnon ? 'anon' : pubkey}</span> 
  <small 
    id="relaysToggle" 
    style="cursor: pointer; color:#333;" 
    on:click={toggleRelays} 
    on:keydown={(e) => { if (e.key === 'Enter') toggleRelays(); }} 
    tabindex="0"
  >
    (relays)
  </small>
  
  {#if myRelaysVisible}
    <div id="relaysContainer">
      <strong>My Relays:</strong> <span>{MY_RELAYS.join(', ')}</span>
      <br />
      <input type="checkbox" id="powRelaysEnable" bind:checked={powRelaysEnabled}> 
      <strong>POW Relays: </strong> <span>{POW_RELAYS.join(', ')}</span>
    </div>
  {/if}
</div>

<!-- Event Input and Controls -->
<textarea 
  id="eventInput" 
  rows="10" 
  placeholder="140 characters or less." 
  maxlength="140" 
  bind:value={content}
></textarea>
<br><br>

<label for="difficulty">Difficulty:</label>
<input type="number" id="difficulty" bind:value={difficulty} min="1">
<br><br>

<label for="numberOfWorkers"># of workers:</label>
<input 
  type="number" 
  id="numberOfWorkers" 
  bind:value={numberOfWorkers} 
  min="1" 
  max={navigator.hardwareConcurrency}
>
<br><br>

<button on:click={startMining} disabled={mining}>Mine & Publish</button> 
<button on:click={stopMining} disabled={!mining}>Cancel Mining</button>

<!-- Mining Progress -->
<pre id="minersBestPow">{minersBestPow}</pre>
<pre id="overallBestPow">{overallBestPow}</pre>

<h2>Hash Rate:</h2>
<pre id="hashrate">{hashRate} kH/s</pre>

<h2>Result:</h2>
<pre id="result">{result}</pre>

<pre id="relayStatus">{relayStatus}</pre>

<pre id="neventOutput">{neventOutput}</pre>
