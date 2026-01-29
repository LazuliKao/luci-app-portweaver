export const JSXFragment = Symbol.for("jsx.fragment");

function filterChildren(children: any[]): any[] {
  return children.filter((child) => {
    if (child === null || child === undefined || typeof child === "boolean") {
      return false;
    }
    return true;
  });
}

export function createJsxElement(
  tag: any,
  props: any,
  ...children: any[]
): Node {
  const filteredChildren = filterChildren(children);

  if (tag === JSXFragment) {
    const fragment = document.createDocumentFragment();
    fragment.append(...filteredChildren);
    return fragment;
  }
  if (typeof tag === "function") {
    return tag({ ...props, children: filteredChildren });
  }

  if (props) {
    const eventHandlers: Record<string, any> = {};

    for (const [key, value] of Object.entries(props)) {
      if (key.startsWith("on") && typeof value === "function") {
        eventHandlers[key] = value;
        delete props[key];
      } else if (typeof value === "boolean") {
        if (value) {
          props[key] = key;
        } else {
          delete props[key];
        }
      }
    }

    const element =
      props === null || Object.keys(props).length === 0
        ? filteredChildren.length > 1
          ? E(tag, {}, filteredChildren)
          : E(tag, {}, filteredChildren[0])
        : filteredChildren.length > 1
          ? E(tag, props, filteredChildren)
          : E(tag, props, filteredChildren[0]);

    for (const [eventName, handler] of Object.entries(eventHandlers)) {
      const eventType = eventName.slice(2).toLowerCase();
      (element as HTMLElement).addEventListener(eventType, handler);
    }

    return element;
  }

  if (props === null) {
    props = {};
  }
  if (filteredChildren.length > 1) return E(tag, props, filteredChildren);
  else return E(tag, props, filteredChildren[0]);
}
createJsxElement.Fragment = JSXFragment;
globalThis.createJsxElement = createJsxElement;
