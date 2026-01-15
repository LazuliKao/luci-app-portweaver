export const JSXFragment = Symbol.for("jsx.fragment");
export function createJsxElement(
  tag: any,
  props: any,
  ...children: any[]
): Node {
  if (tag === JSXFragment) {
    const fragment = document.createDocumentFragment();
    fragment.append(...children);
    return fragment;
  }
  // fix all boolean attributes
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (typeof value === "boolean") {
        if (value) {
          props[key] = key;
        } else {
          delete props[key];
        }
      }
    }
  }
  return E(tag, props, children);
}
createJsxElement.Fragment = JSXFragment;
export {};
globalThis.createJsxElement = createJsxElement;
