interface Complex {
  re: number;
  im: number;
}

type Operator = "+" | "-" | "*" | "/" | "^";
type FunctionName = "sin" | "cos" | "exp" | "log";

interface BinaryOperation {
  type: "binary";
  operator: Operator;
  left: Expression;
  right: Expression;
}

interface FunctionCall {
  type: "function";
  name: FunctionName;
  argument: Expression;
}

interface Constant {
  type: "constant";
  value: Complex;
}

interface Variable {
  type: "variable";
}

type Expression = BinaryOperation | FunctionCall | Constant | Variable;

function parseFunction(input: string): Expression | null {
  // Implement a recursive descent parser for complex functions
  // This is a simplified version and may not handle all cases
  const tokens =
    input.replace(/\s+/g, "").match(/(\w+|[-+*/^()]|\d+(?:\.\d*)?)/g) || [];
  let index = 0;

  function parseExpression(): Expression | null {
    let left = parseTerm();
    if (!left) return null;

    while (
      index < tokens.length &&
      (tokens[index] === "+" || tokens[index] === "-")
    ) {
      const operator = tokens[index++] as Operator;
      const right = parseTerm();
      if (!right) return null;
      left = { type: "binary", operator, left, right };
    }

    return left;
  }

  function parseTerm(): Expression | null {
    let left = parseFactor();
    if (!left) return null;

    while (
      index < tokens.length &&
      (tokens[index] === "*" || tokens[index] === "/" || tokens[index] === "^")
    ) {
      const operator = tokens[index++] as Operator;
      const right = parseFactor();
      if (!right) return null;
      left = { type: "binary", operator, left, right };
    }

    return left;
  }

  function parseFactor(): Expression | null {
    if (index >= tokens.length) return null;

    if (tokens[index] === "(") {
      index++;
      const expr = parseExpression();
      if (!expr || tokens[index++] !== ")") return null;
      return expr;
    }

    if (tokens[index] === "z") {
      index++;
      return { type: "variable" };
    }

    if (["sin", "cos", "exp", "log"].includes(tokens[index])) {
      const name = tokens[index++] as FunctionName;
      if (tokens[index++] !== "(") return null;
      const argument = parseExpression();
      if (!argument || tokens[index++] !== ")") return null;
      return { type: "function", name, argument };
    }

    const num = parseFloat(tokens[index]);
    if (!isNaN(num)) {
      index++;
      return { type: "constant", value: { re: num, im: 0 } };
    }

    return null;
  }

  const result = parseExpression();
  return index === tokens.length ? result : null;
}

function evaluateFunction(expr: Expression | null, z: Complex): Complex {
  if (!expr) return { re: 0, im: 0 };

  switch (expr.type) {
    case "binary":
      const left = evaluateFunction(expr.left, z);
      const right = evaluateFunction(expr.right, z);
      switch (expr.operator) {
        case "+":
          return { re: left.re + right.re, im: left.im + right.im };
        case "-":
          return { re: left.re - right.re, im: left.im - right.im };
        case "*":
          return {
            re: left.re * right.re - left.im * right.im,
            im: left.re * right.im + left.im * right.re,
          };
        case "/": {
          const denom = right.re * right.re + right.im * right.im;
          return {
            re: (left.re * right.re + left.im * right.im) / denom,
            im: (left.im * right.re - left.re * right.im) / denom,
          };
        }
        case "^": {
          const r = Math.sqrt(left.re * left.re + left.im * left.im);
          const theta = Math.atan2(left.im, left.re);
          const newR = Math.pow(r, right.re) * Math.exp(-right.im * theta);
          const newTheta = right.re * theta + right.im * Math.log(r);
          return {
            re: newR * Math.cos(newTheta),
            im: newR * Math.sin(newTheta),
          };
        }
      }
    case "function":
      const arg = evaluateFunction(expr.argument, z);
      switch (expr.name) {
        case "sin":
          return {
            re: Math.sin(arg.re) * Math.cosh(arg.im),
            im: Math.cos(arg.re) * Math.sinh(arg.im),
          };
        case "cos":
          return {
            re: Math.cos(arg.re) * Math.cosh(arg.im),
            im: -Math.sin(arg.re) * Math.sinh(arg.im),
          };
        case "exp":
          return {
            re: Math.exp(arg.re) * Math.cos(arg.im),
            im: Math.exp(arg.re) * Math.sin(arg.im),
          };
        case "log":
          return {
            re: Math.log(Math.sqrt(arg.re * arg.re + arg.im * arg.im)),
            im: Math.atan2(arg.im, arg.re),
          };
      }
    case "constant":
      return expr.value;
    case "variable":
      return z;
  }
}

export function createEvaluator(
  expr: Expression | null
): (z: Complex) => Complex {
  return (z: Complex) => evaluateFunction(expr, z);
}

export { parseFunction, evaluateFunction };
