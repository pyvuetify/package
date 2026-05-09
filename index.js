import {
  createApp,
  customRef,
  defineComponent,
  h,
  inject,
  onMounted,
  onUnmounted,
  provide,
  ref,
  toValue,
  unref,
  watch,
} from "vue";
import "vuetify/styles";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";

/**
 * @template {Record<string, any>} T
 * @typedef RenderContext
 * @property {import("@anywidget/types").AnyModel<T>} model
 * @property {import("@anywidget/types").Experimental} experimental
 * @property {import("@anywidget/types").Host} host
 */

/**
 * @type {import("vue").InjectionKey<RenderContext<any>>}
 */
const RENDER_CONTEXT_KEY = Symbol("anywidget.RenderContext");

/**
 * @returns {RenderContext<any>}
 */
function useRenderContext() {
  let ctx = inject(RENDER_CONTEXT_KEY);
  if (!ctx) throw new Error("anywidget.RenderContext is not provided.");
  return ctx;
}

/**
 * @template {Record<string, any>} T
 * @returns {import("@anywidget/types").AnyModel<T>}
 */
export function useModel() {
  let ctx = useRenderContext();
  return ctx.model;
}

/** @returns {import("@anywidget/types").Experimental} */
export function useExperimental() {
  let ctx = useRenderContext();
  return ctx.experimental;
}

/** @returns {import("@anywidget/types").Host} */
export function useHost() {
  let ctx = useRenderContext();
  return ctx.host;
}

/**
 * A Vue Composable to use model-backed state in a component.
 *
 * Returns a ShallowRef that synchronizes its value with
 * the underlying model provided by an anywidget host.
 *
 * @example
 * ```ts
 * import { useModelState } from "@anywidget/vue";
 *
 * function Counter() {
 *   const value = useModelState<number>("value");
 *
 *   return (
 *     <button onClick={() => value++}>
 *       Count: {value}
 *     </button>
 *   );
 * }
 * ```
 *
 * @template S
 * @param {import("vue").MaybeRef<string>} key - The name of the model field to use
 * @returns {import("vue").ShallowRef<S>}
 */
export function useModelState(key) {
  const model = useModel();

  /**
   * @type {VoidFunction}
   */
  let trigger;

  /**
   * @type {import("vue").Ref<S>}
   */
  const value = customRef((_track, _trigger) => {
    trigger = _trigger;
    return {
      get() {
        _track();
        return model.get(unref(key));
      },
      set(newValue) {
        model.set(unref(key), toValue(newValue));
        model.save_changes();
      },
    };
  });

  const update = () => {
    value.value = model.get(unref(key));
    trigger();
  };

  onMounted(() => {
    model.on(`change:${key}`, update);
  });

  onUnmounted(() => {
    model.off(`change:${key}`, update);
  });

  return value;
}

/**
 * @type {import("vue").DefineSetupFnComponent<RenderContext<any>>}
 */
const WidgetWrapper = defineComponent(
  ({ model, experimental, host }, ctx) => {
    provide(RENDER_CONTEXT_KEY, { model, experimental, host });
    return () => ctx.slots?.default?.();
  },
  {
    props: ["model", "experimental", "host"],
    name: "WidgetWrapper",
  }
);

/**
 * @param {import("vue").Component} Widget
 * @returns {import("@anywidget/types").Render}
 */
export function createRender(Widget) {
  return ({ el, model, experimental, host }) => {
    const vuetify = createVuetify({ components, directives });
    const app = createApp(
      h(WidgetWrapper, { model, experimental, host }, h(Widget)),
    );
    app.use(vuetify).mount(el);

    return () => app.unmount();
  };
}

/**
 * Vue component that renders an anywidget child widget or plain text.
 * Accepts a single `reference` prop:
 *  - If it starts with "anywidget:" → resolves via host.getWidget() and renders the child
 *  - Otherwise → renders as a text node
 */
export const WidgetSlot = defineComponent(
  (props) => {
    const host = useHost();
    const container = ref(null);
    let abortController = null;

    async function mountWidget(reference) {
      // Clean up previous child
      if (abortController) {
        abortController.abort();
        abortController = null;
      }
      if (!container.value) return;

      if (
        typeof reference === "string" &&
        reference.startsWith("anywidget:")
      ) {
        abortController = new AbortController();
        const child = await host.getWidget(reference);
        if (abortController.signal.aborted) return;
        container.value.innerHTML = "";
        await child.render({
          el: container.value,
          signal: abortController.signal,
        });
      } else if (reference != null) {
        container.value.textContent = String(reference);
      } else {
        container.value.innerHTML = "";
      }
    }

    onMounted(() => {
      mountWidget(props.reference);
    });

    onUnmounted(() => {
      if (abortController) {
        abortController.abort();
      }
    });

    watch(
      () => props.reference,
      (newRef) => mountWidget(newRef),
    );

    return () => h("span", { ref: container });
  },
  {
    props: ["reference"],
    name: "WidgetSlot",
  },
);
