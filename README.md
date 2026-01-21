# @pyvuetify/vuetify

> Vuetify utilities for [**anywidget**](https://anywidget.dev)

## Installation

```sh
npm install @pyvuetify/vuetify
```

## Usage

```javascript
// src/index.js
import { createRender } from "@pyvuetify/vuetify";
import CounterWidget from "./CounterWidget.vue";

const render = createRender(CounterWidget);

export default { render };
```

```vue
<!-- src/CounterWidget.vue -->
<template>
  <v-btn :type="color" @click="handleClick">
    <v-icon icon="mdi-counter"></v-icon>
    Clicked {{ nbClicks }} times
  </v-btn>
</template>

<script setup>
import { useModelState } from "@pyvuetify/vuetify";

// Reactive state synced with Python
const nbClicks = useModelState("nb_clicks");
const color = useModelState("color");

// Handle click event
const handleClick = () => {
  nbClicks.value = (nbClicks.value || 0) + 1;
};
</script>

<style scoped></style>
```

## Bundlers

You'll need to compile the above source files into a single ESM entrypoint for
**anywidget** with a bundler.

### Vite

We currently only support [Vite](https://vite.dev/) in [library mode](https://vite.dev/guide/build.html#library-mode).

```sh
pnpm add -D @types/node @vitejs/plugin-vue vite-plugin-vuetify vite
```

```javascript
// vite.config.js
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vuetify from "vite-plugin-vuetify";

const __dirname = dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vuetify({ autoImport: true })],
  build: {
    lib: {
      entry: resolve(__dirname, "js/CounterWidget.ts"),
      // the proper extensions will be added
      fileName: "counter-widget",
      formats: ["es"],
    },
    // minify: false, // Uncomment to make it easier to debug errors.
  },
  define: {
    // DOCS: https://vite.dev/guide/build.html#css-support
    // > In library mode, all import.meta.env.* usage are statically replaced when building for production.
    // > However, process.env.* usage are not, so that consumers of your library can dynamically change it.
    //
    // The consumer of the widget is a webview, which does not have a top level process object.
    // So we need to replace it with a static value.
    "process.env.NODE_ENV": '"production"',
  },
});
```

```sh
vite build
```

You can read more about using Vite with **anywidget** in
[their documentation](https://anywidget.dev/en/bundling/#vite).

## License

MIT
