export function createJsxElement(tag: any, props: any, ...children: any[]): any {
    const flatChildren: any[] = [];

    const pushChild = (child: any): void => {
        if (Array.isArray(child)) {
            child.forEach(pushChild);
            return;
        }
        if (child === null || child === undefined || child === false) return;
        flatChildren.push(child);
    };

    children.forEach(pushChild);

    const childArg = flatChildren.length === 0
        ? undefined
        : flatChildren.length === 1
            ? flatChildren[0]
            : flatChildren;

    return (E as any)(tag, props || {}, childArg);
}

globalThis.createJsxElement = createJsxElement;