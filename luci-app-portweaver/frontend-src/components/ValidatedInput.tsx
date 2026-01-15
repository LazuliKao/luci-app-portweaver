/**
 * 创建带验证的通用 input 元素
 * @param options 配置选项
 * @returns 返回 input 元素
 */
export function ValidatedInput(options: {
  type?: string;
  className?: string;
  value?: string;
  placeholder?: string;
  style?: string;
  disabled?: boolean;
  onValidate?: (value: string) => boolean; // 返回 true 表示验证通过
  dataAttributes?: Record<string, string>;
}) {
  const {
    type = "text",
    className = "",
    value = "",
    placeholder = "",
    style = "",
    disabled = false,
    onValidate,
    dataAttributes = {},
  } = options;

  const input = document.createElement("input");
  input.type = type;
  input.className = className;
  input.value = value;
  input.placeholder = placeholder;
  input.style.cssText = style;
  input.disabled = disabled;

  // 设置数据属性
  Object.entries(dataAttributes).forEach(([key, val]) => {
    input.setAttribute(`data-${key}`, val);
  });

  // 验证函数
  const validate = () => {
    if (onValidate) {
      const isValid = onValidate(input.value.trim());
      if (!isValid) {
        input.style.setProperty("border-color", "red", "important");
      } else {
        input.style.borderColor = "";
      }
    }
  };

  input.addEventListener("input", validate);
  input.addEventListener("change", validate);

  return input;
}
