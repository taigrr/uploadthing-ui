/**
 * Custom oxlint rules.
 *
 * Each rule preserves severity and detection semantics of the original
 * hand-written checks. ESLint-compatible plugin format, loaded via `jsPlugins`
 * in `.oxlintrc.json`.
 */

/** @typedef {import("eslint").Rule.RuleModule} RuleModule */

const QUERY_HOOKS = new Set(["useQuery", "useMutation", "useSuspenseQuery", "useInfiniteQuery"]);
const BROWSER_GLOBALS = new Set(["window", "document", "navigator", "localStorage", "sessionStorage"]);

// React client-only APIs whose mere use requires a client component.
const CLIENT_REACT_APIS = new Set(["createContext", "useContext"]);

// Packages whose components/utilities require rendering in a client component.
// A file that imports from any of these is treated as legitimately "use client".
const CLIENT_ONLY_IMPORTS = new Set([
  "recharts",
  "framer-motion",
  "motion",
  "motion/react",
  "sonner",
  "vaul",
  "cmdk",
  "next-themes",
  "react-resizable-panels",
  "react-scroll-parallax",
  "@react-three/drei",
  "@react-three/fiber",
  "three",
  "maplibre-gl",
  "react-map-gl",
  "pmtiles",
  "streamdown",
  "zustand",
  "embla-carousel-react",
  "react-day-picker",
  "react-hook-form",
  "input-otp",
]);

// Import path prefixes that indicate client-only code (interactive UI libraries,
// explicit `/client` entrypoints).
const CLIENT_ONLY_PREFIXES = ["radix-ui", "@radix-ui/", "@base-ui"];

function isClientOnlyImport(node) {
  const source = node.source?.value;
  if (typeof source !== "string") return false;
  if (CLIENT_ONLY_IMPORTS.has(source)) return true;
  if (source.endsWith("/client")) return true;
  return CLIENT_ONLY_PREFIXES.some((prefix) => source === prefix || source.startsWith(prefix));
}
const COMPARISON_OPERATORS = new Set(["===", "!==", "==", "!=", "<", "<=", ">", ">="]);
const ALLOWED_MAGIC_NUMBERS = new Set([0, 1, -1, 2]);

function calleeName(node) {
  if (!node) return undefined;
  if (node.type === "Identifier") return node.name;
  if (node.type === "MemberExpression" && node.property?.type === "Identifier") return node.property.name;
  return undefined;
}

function getSourceCode(context) {
  return context.sourceCode ?? context.getSourceCode();
}

// no-classname-template-literal: disallow template literals inside JSX className.
const noClassnameTemplateLiteral = {
  meta: {
    type: "suggestion",
    docs: { description: "Disallow template literals in className. Use cn()/clsx() instead." },
    messages: {
      noTemplate: "Avoid template literals in className. Use cn() or clsx() for conditional classes.",
    },
  },
  create(context) {
    return {
      JSXAttribute(node) {
        if (node.name?.name !== "className") return;
        if (node.value?.type !== "JSXExpressionContainer") return;
        if (node.value.expression?.type === "TemplateLiteral") {
          context.report({ node: node.value.expression, messageId: "noTemplate" });
        }
      },
    };
  },
};

// no-usestate-from-query: don't seed useState with a query hook result.
const noUseStateFromQuery = {
  meta: {
    type: "problem",
    docs: { description: "Don't initialize useState from a query result — read query.data directly." },
    messages: {
      noQueryInit: "Don't initialize useState from a query result — read query.data directly.",
    },
  },
  create(context) {
    function containsQueryHook(node, depth) {
      if (!node || typeof node !== "object" || depth > 6) return false;
      if (node.type === "CallExpression" && QUERY_HOOKS.has(calleeName(node.callee))) return true;
      for (const key of Object.keys(node)) {
        if (key === "parent") continue;
        const value = node[key];
        if (Array.isArray(value)) {
          for (const child of value) {
            if (child && typeof child.type === "string" && containsQueryHook(child, depth + 1)) return true;
          }
        } else if (value && typeof value.type === "string") {
          if (containsQueryHook(value, depth + 1)) return true;
        }
      }
      return false;
    }
    return {
      CallExpression(node) {
        if (calleeName(node.callee) !== "useState") return;
        if (node.arguments.length === 0) return;
        if (containsQueryHook(node.arguments[0], 0)) {
          context.report({ node, messageId: "noQueryInit" });
        }
      },
    };
  },
};

// no-effect-set-from-query: useEffect that pipes query data into a setter.
const noEffectSetFromQuery = {
  meta: {
    type: "problem",
    docs: { description: "Don't pipe query data into useState via useEffect." },
    messages: {
      noEffectPipe: "Don't pipe query data into useState via useEffect. Use query.data directly.",
    },
  },
  create(context) {
    const sourceCode = getSourceCode(context);
    function bodyHasQuerySetter(node, depth) {
      if (!node || typeof node !== "object" || depth > 8) return false;
      if (node.type === "CallExpression") {
        const name = calleeName(node.callee);
        if (name && /^set[A-Z]/.test(name) && node.arguments.length > 0) {
          const argSrc = sourceCode.getText(node.arguments[0]);
          if (/\.data\b/.test(argSrc) || /\buse(?:Query|Mutation)\s*\(/.test(argSrc)) return true;
        }
      }
      for (const key of Object.keys(node)) {
        if (key === "parent") continue;
        const value = node[key];
        if (Array.isArray(value)) {
          for (const child of value) {
            if (child && typeof child.type === "string" && bodyHasQuerySetter(child, depth + 1)) return true;
          }
        } else if (value && typeof value.type === "string") {
          if (bodyHasQuerySetter(value, depth + 1)) return true;
        }
      }
      return false;
    }
    return {
      CallExpression(node) {
        if (calleeName(node.callee) !== "useEffect") return;
        if (node.arguments.length === 0) return;
        const callback = node.arguments[0];
        if (callback.type !== "ArrowFunctionExpression" && callback.type !== "FunctionExpression") return;
        if (bodyHasQuerySetter(callback.body, 0)) {
          context.report({ node, messageId: "noEffectPipe" });
        }
      },
    };
  },
};

// no-unknown-directive: flag directive-prologue strings that aren't a known directive
// (e.g. a misspelled "usse client"). Uses the ESTree `directive` field, which the parser
// only sets for genuine directive-prologue entries, so it never fires on regular strings.
const KNOWN_DIRECTIVES = new Set(["use strict", "use client", "use server", "use cache", "use memo", "use no memo"]);
const noUnknownDirective = {
  meta: {
    type: "problem",
    docs: { description: "Disallow unknown/misspelled directive prologue strings." },
    messages: {
      unknown: 'Unknown directive "{{value}}". Did you mean one of: use client, use server, use strict?',
    },
  },
  create(context) {
    function checkBody(body) {
      if (!Array.isArray(body)) return;
      for (const node of body) {
        // Only directive-prologue string statements have a `directive` field set.
        if (node?.type !== "ExpressionStatement" || typeof node.directive !== "string") continue;
        if (!KNOWN_DIRECTIVES.has(node.directive)) {
          context.report({ node, messageId: "unknown", data: { value: node.directive } });
        }
      }
    }
    function checkFunctionBody(node) {
      if (node.body?.type === "BlockStatement") checkBody(node.body.body);
    }
    return {
      Program(node) {
        checkBody(node.body);
      },
      FunctionDeclaration: checkFunctionBody,
      FunctionExpression: checkFunctionBody,
      ArrowFunctionExpression: checkFunctionBody,
    };
  },
};

// no-unnecessary-use-client: "use client" with no hook/browser-global/event-handler usage.
const noUnnecessaryUseClient = {
  meta: {
    type: "suggestion",
    docs: { description: 'Warn when "use client" is present but no client-only API is used.' },
    messages: {
      unnecessary: '"use client" directive but no hooks, browser globals, or event handlers detected.',
    },
  },
  create(context) {
    let directiveNode = null;
    let usesClientApi = false;
    // Next.js requires these special files to be Client Components regardless of content.
    const filename = (context.filename ?? context.getFilename?.() ?? "").replace(/\\/g, "/");
    const isRequiredClientFile = /(^|\/)(global-error|error)\.(jsx|tsx)$/.test(filename);
    return {
      Program(node) {
        directiveNode = null;
        usesClientApi = false;
        const first = node.body[0];
        if (
          first?.type === "ExpressionStatement" &&
          first.expression?.type === "Literal" &&
          first.expression.value === "use client"
        ) {
          directiveNode = first;
        }
      },
      ImportDeclaration(node) {
        if (!directiveNode) return;
        if (isClientOnlyImport(node)) usesClientApi = true;
      },
      CallExpression(node) {
        if (!directiveNode) return;
        const name = calleeName(node.callee);
        if (name && (/^use[A-Z_]/.test(name) || CLIENT_REACT_APIS.has(name))) usesClientApi = true;
      },
      Identifier(node) {
        if (!directiveNode) return;
        if (BROWSER_GLOBALS.has(node.name)) usesClientApi = true;
      },
      JSXAttribute(node) {
        if (!directiveNode) return;
        if (node.name?.name && /^on[A-Z]/.test(node.name.name)) usesClientApi = true;
      },
      "Program:exit"() {
        if (directiveNode && !usesClientApi && !isRequiredClientFile) {
          context.report({ node: directiveNode, messageId: "unnecessary" });
        }
      },
    };
  },
};

// no-nested-component-definition: don't define a PascalCase component inside another component.
const noNestedComponentDefinition = {
  meta: {
    type: "problem",
    docs: { description: "Don't define a React component inside another component." },
    messages: {
      noNested: "Don't define a component inside another component. Hoist it to module scope.",
    },
  },
  create(context) {
    const sourceCode = getSourceCode(context);
    let componentDepth = 0;
    const isPascal = (name) => typeof name === "string" && /^[A-Z_]/.test(name);
    function returnsJsx(node) {
      const src = sourceCode.getText(node);
      return /<[A-Za-z]/.test(src) || /\bjsx[s]?\(/.test(src);
    }
    function enter(name, node) {
      if (!isPascal(name)) return;
      if (componentDepth > 0 && /^[A-Z]/.test(name) && returnsJsx(node)) {
        context.report({ node, messageId: "noNested" });
      }
      componentDepth++;
    }
    function exit(name) {
      if (isPascal(name)) componentDepth--;
    }
    return {
      FunctionDeclaration(node) {
        enter(node.id?.name, node);
      },
      "FunctionDeclaration:exit"(node) {
        exit(node.id?.name);
      },
      ArrowFunctionExpression(node) {
        if (node.parent?.type === "VariableDeclarator") enter(node.parent.id?.name, node.parent);
      },
      "ArrowFunctionExpression:exit"(node) {
        if (node.parent?.type === "VariableDeclarator") exit(node.parent.id?.name);
      },
      FunctionExpression(node) {
        if (node.parent?.type === "VariableDeclarator") enter(node.parent.id?.name, node.parent);
      },
      "FunctionExpression:exit"(node) {
        if (node.parent?.type === "VariableDeclarator") exit(node.parent.id?.name);
      },
    };
  },
};

// prefer-cn-over-clsx: prefer cn() over clsx(), except inside the cn() utility itself.
const preferCnOverClsx = {
  meta: {
    type: "suggestion",
    docs: { description: "Use cn() instead of clsx(). cn() wraps clsx + tailwind-merge." },
    messages: {
      preferCn:
        "Use cn() instead of clsx(). cn() wraps clsx + tailwind-merge so conflicting utilities collapse correctly.",
    },
  },
  create(context) {
    const sourceCode = getSourceCode(context);
    function withinCnDefinition(node) {
      const ancestors = sourceCode.getAncestors ? sourceCode.getAncestors(node) : context.getAncestors();
      for (const ancestor of ancestors) {
        if (ancestor.type === "FunctionDeclaration" && ancestor.id?.name === "cn") return true;
        if (
          (ancestor.type === "ArrowFunctionExpression" || ancestor.type === "FunctionExpression") &&
          ancestor.parent?.type === "VariableDeclarator" &&
          ancestor.parent.id?.name === "cn"
        ) {
          return true;
        }
      }
      return false;
    }
    return {
      CallExpression(node) {
        if (node.callee?.type !== "Identifier" || node.callee.name !== "clsx") return;
        if (withinCnDefinition(node)) return;
        context.report({ node, messageId: "preferCn" });
      },
    };
  },
};

// no-magic-numbers-except-timers: numeric literal on the RHS of a comparison.
const noMagicNumbersExceptTimers = {
  meta: {
    type: "suggestion",
    docs: { description: "Magic number in a comparison. Extract to a named constant." },
    messages: {
      magicNumber: "Magic number in comparison. Extract to a named constant.",
    },
  },
  create(context) {
    return {
      BinaryExpression(node) {
        if (!COMPARISON_OPERATORS.has(node.operator)) return;
        let rhs = node.right;
        let value;
        if (rhs.type === "Literal" && typeof rhs.value === "number") {
          value = rhs.value;
        } else if (
          rhs.type === "UnaryExpression" &&
          rhs.operator === "-" &&
          rhs.argument?.type === "Literal" &&
          typeof rhs.argument.value === "number"
        ) {
          value = -rhs.argument.value;
        } else {
          return;
        }
        if (ALLOWED_MAGIC_NUMBERS.has(value)) return;
        context.report({ node, messageId: "magicNumber" });
      },
    };
  },
};

// no-cross-package-relative-import: don't reach across workspace boundaries via deep relative imports.
const CROSS_PACKAGE_PATTERNS = [
  /^\.\.\/\.\.\/packages\//,
  /^\.\.\/\.\.\/apps\//,
  /^\.\.\/\.\.\/services\//,
  /^(?:\.\.\/){3,}/,
];
const noCrossPackageRelativeImport = {
  meta: {
    type: "problem",
    docs: { description: "Don't import across workspace packages via relative paths." },
    messages: {
      crossPackage: "Don't import across workspace packages via relative paths. Use the workspace alias.",
    },
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        const source = node.source?.value;
        if (typeof source !== "string") return;
        if (CROSS_PACKAGE_PATTERNS.some((re) => re.test(source))) {
          context.report({ node, messageId: "crossPackage" });
        }
      },
    };
  },
};

// no-implicit-any-let: a `let`/`var` declaration with no type annotation and no
// initializer is implicitly typed `any`. (oxlint/typescript-eslint have no equivalent rule.)
const noImplicitAnyLet = {
  meta: {
    type: "problem",
    docs: { description: "Disallow implicit any on variables declared without type or initializer." },
    messages: {
      implicitAny: "This variable is implicitly typed `any`. Add a type annotation or initializer.",
    },
  },
  create(context) {
    return {
      VariableDeclaration(node) {
        if (node.kind === "const") return;
        for (const decl of node.declarations) {
          if (decl.init) continue;
          if (decl.id?.type !== "Identifier") continue;
          if (decl.id.typeAnnotation) continue;
          context.report({ node: decl, messageId: "implicitAny" });
        }
      },
    };
  },
};

// no-svg-without-title: require a <title> child (or role/aria-label) on <svg>.
// (oxlint jsx-a11y has no equivalent; see oxc#22115.)
const noSvgWithoutTitle = {
  meta: {
    type: "problem",
    docs: { description: "Require a <title> element inside <svg> for accessibility." },
    messages: {
      missingTitle:
        'Alternative text title element cannot be empty: add a <title> child, or a "role" / "aria-label" attribute to the <svg>.',
    },
  },
  create(context) {
    function attr(node, name) {
      return node.attributes?.find((a) => a.type === "JSXAttribute" && a.name?.name === name);
    }
    function attrStringValue(attribute) {
      if (!attribute || !attribute.value) return undefined;
      if (attribute.value.type === "Literal") return attribute.value.value;
      return undefined;
    }
    return {
      JSXElement(node) {
        const opening = node.openingElement;
        if (opening?.name?.type !== "JSXIdentifier" || opening.name.name !== "svg") return;

        // Decorative SVGs (aria-hidden="true") are exempt.
        if (attrStringValue(attr(opening, "aria-hidden")) === "true") return;

        // role="img" + a label is an accepted alternative to <title>.
        const role = attrStringValue(attr(opening, "role"));
        const ariaLabel = attr(opening, "aria-label");
        const ariaLabelledBy = attr(opening, "aria-labelledby");
        if (role === "img" && (ariaLabel || ariaLabelledBy)) return;

        // A <title> child with content satisfies the rule.
        const hasTitle = node.children?.some((child) => {
          if (child.type !== "JSXElement") return false;
          const childName = child.openingElement?.name;
          if (childName?.type !== "JSXIdentifier" || childName.name !== "title") return false;
          return (child.children?.length ?? 0) > 0;
        });
        if (hasTitle) return;

        context.report({ node: opening, messageId: "missingTitle" });
      },
    };
  },
};

const plugin = {
  meta: { name: "local", version: "1.0.0" },
  rules: {
    "no-classname-template-literal": noClassnameTemplateLiteral,
    "no-usestate-from-query": noUseStateFromQuery,
    "no-effect-set-from-query": noEffectSetFromQuery,
    "no-unnecessary-use-client": noUnnecessaryUseClient,
    "no-unknown-directive": noUnknownDirective,
    "no-nested-component-definition": noNestedComponentDefinition,
    "prefer-cn-over-clsx": preferCnOverClsx,
    "no-magic-numbers-except-timers": noMagicNumbersExceptTimers,
    "no-cross-package-relative-import": noCrossPackageRelativeImport,
    "no-implicit-any-let": noImplicitAnyLet,
    "no-svg-without-title": noSvgWithoutTitle,
  },
};

export default plugin;
