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
  // fix custom componment
  if (typeof tag === "function") {
    return tag({ ...props, children });
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
  if (props === null) {
    props = {};
  }
  if (children.length > 1) return E(tag, props, children);
  else return E(tag, props, children[0]);
}
createJsxElement.Fragment = JSXFragment;
globalThis.createJsxElement = createJsxElement;
