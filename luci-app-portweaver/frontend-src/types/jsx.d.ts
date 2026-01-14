declare global {
  type BaseProps = {
    children?: any;
    class?: string;
    id?: string;
    name?: string;
    style?: string;
  };
  function createJsxElement(tag: any, props: any, ...children: any[]): any;
  namespace JSX {
    type Element = any;
    interface IntrinsicElements {
      [elemName: string]: Element;
      div: BaseProps;
      span: BaseProps;
      input: BaseProps & {
        type?: 'hidden' | 'text' | 'checkbox';
        value?: string;
        checked?: boolean;
        placeholder?: string;
      }
      button: BaseProps & {
        disabled?: boolean;
        type?: 'button' | 'submit' | 'reset';
        onClick?: () => void;
      };
    }
  }
}

export { };
