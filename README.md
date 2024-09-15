# notemine js 

![build](https://img.shields.io/npm/v/notemine)
![build](https://github.com/github/docs/actions/workflows/main.yml/badge.svg)
![test](https://github.com/github/docs/actions/workflows/main.yml/badge.svg)
![coverage](https://github.com/github/docs/actions/workflows/main.yml/badge.svg)

a module that wraps [notemine](https://github.com/sandwichfarm/notemine) as observables for use in modern web applications.

## install
package name: `notemine`

**npm**
```bash
  npm install notemine
```

<details>
<summary>pnpm</summary>

```bash
  pnpm install notemine
```
</details>

<details>
<summary>yarn</summary>

```bash
  yarn install notemine
```
</details>

## usage 
_untested_

```typescript 
  import Notemine from "notemine"

  //prepare meta for event 
  const content = "hello world."
  const tags = [ "#t", "introduction"]
  const pubkey = "e771af0b05c8e95fcdf6feb3500544d2fb1ccd384788e9f490bb3ee28e8ed66f"

  //set options for miner 
  const difficulty = 21
  const numberOfWorkers = 7
 

  const noteminer = new Noteminer({
    content,
    tags,
    difficulty,
    numberOfWorkers    
  })

  //you can also set content, tags and pubkey via assessors after initialization. 
  noteminer.pubkey = pubkey

  //start miner
  noteminer.mine()
```

Updates to noteminer can be accessed via observables.
```
noteminer.progress$
noteminer.error$
noteminer.progress$
noteminer.progress$
```



<details>
<summary>svelte</summary>

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { type Writable, writable } from 'svelte/store'
  import { type ProgressEvent, NostrMiner } from 'nostr-miner';

  const numberOfMiners = 8
  let miner: NostrMiner;
  let progress: Writable<ProgressEvent[]> = new writable(new Array(numberOfMiners))

  onMount(() => {
    miner = new NostrMiner({ content: 'Hello, Nostr!', numberOfMiners  });

    const subscription = miner.progress$.subscribe(progress_ => {
      progress.update( _progress => {
        _progress[progress_.workerId] = progress_
      })
    });

    miner.mine();

    return () => {
      subscription.unsubscribe();
      miner.cancel();
    };
  });

  $: miners = $progress
</script>


<div>
{#each $miners as miner}
<span>Miner #{miner.workerId}: {miner.hashRate}kH/s [Best PoW: ${miner.bestPowData}]
{/each}

</div>
```
</details>



<details>
<summary>react</summary>

```reactjs
  import React, { useEffect } from 'react';
  import { NostrMiner } from 'nostr-miner';

  const MyComponent = () => {
    const miner = new NostrMiner({ content: 'Hello, Nostr!' });

    useEffect(() => {
      const subscription = miner.progress$.subscribe(progress => {
        // Update progress bar or display miner's progress
      });

      miner.mine();

      return () => {
        subscription.unsubscribe();
        miner.cancel();
      };
    }, []);

    return (
      <div>
        {/* Your UI components */}
      </div>
    );
  };

```
</details>

<details>
<summary>vue</summary>

```vue
<template>
  <div>
    <!-- Your UI components -->
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, onUnmounted } from 'vue';
import { NostrMiner } from 'nostr-miner';

export default defineComponent({
  name: 'MinerComponent',
  setup() {
    const miner = new NostrMiner({ content: 'Hello, Nostr!' });

    onMounted(() => {
      const subscription = miner.progress$.subscribe(progress => {
        // Update progress bar or display miner's progress
      });

      miner.mine();

      onUnmounted(() => {
        subscription.unsubscribe();
        miner.cancel();
      });
    });

    return {};
  },
});
</script>

```
</details>

<details>
<summary>angular</summary>

```javascript
import { Component, OnInit, OnDestroy } from '@angular/core';
import { NostrMiner } from 'nostr-miner';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-miner',
  templateUrl: './miner.component.html',
})
export class MinerComponent implements OnInit, OnDestroy {
  miner: NostrMiner;
  progressSubscription: Subscription;

  ngOnInit() {
    this.miner = new NostrMiner({ content: 'Hello, Nostr!' });
    this.progressSubscription = this.miner.progress$.subscribe(progress => {
      // Update progress bar or display miner's progress
    });

    this.miner.mine();
  }

  ngOnDestroy() {
    this.progressSubscription.unsubscribe();
    this.miner.cancel();
  }
}
```
</details>

## build
The wasm is not included in version control, so to build you'll need rust and it's toolchain. That includes `rustup` and `cargo`

### install build deps

Install **wasm-pack** with `cargo install wasm-pack` 

### build wasm 
Build the wasm with `build:wasm` 

**npm**

```bash
  npm build:wasm
```

<details>
<summary>pnpm</summary>

```bash
  pnpm build:wasm
```
</details>

<details>
<summary>yarn</summary>

```bash
  yarn build:wasm
```
</details>

### build package 

Build the package with `build` 
**npm**

```bash
  npm run build
```

<details>
<summary>pnpm</summary>

```bash
  pnpm run build
```
</details>

<details>
<summary>yarn</summary>

```bash
  yarn build
```
</details>

### test 
<details>
<summary>npm</summary>

```bash
  npm run build
```
</details>

<details>
<summary>pnpm</summary>

```bash
  pnpm run build
```
</details>

<details>
<summary>yarn</summary>

```bash
  yarn build
```
</details>
