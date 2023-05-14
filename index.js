// core packages
import path from "node:path";
import fs from "node:fs";
// external packages
import * as espree from "espree";
import escodegen from "@javascript-obfuscator/escodegen";
import estraverse from "estraverse";

/**
 * @param {string} requester
 * @param {string} relativePath
 */
function resolvePath(requester, relativePath) {
  return path.join(path.dirname(requester), relativePath);
}

const escodegenOpts = {
  format: {
    indent: {
      style: "  ",
    },
  },
};

/**
 * @param {string} modulePath
 * @param {Map} modules
 */
function getDependencyGraph(modulePath, modules) {
  const content = fs.readFileSync(modulePath, "utf8");
  const dependencies = [];
  const ast = espree.parse(content, { ecmaVersion: "latest", sourceType: "module" });
  /** traverse module AST to modify code for bundling (i.e. remove import statements, export keywords, etc.) */
  estraverse.replace(ast, {
    enter: function (node) {
      /**
       * before removing an import statements, resolve the import path and
       * add it to this modules array of dependencies to traverse through later.
       */
      if (node.type === "ImportDeclaration") {
        const resolvedModulePath = resolvePath(modulePath, node.source.value);
        dependencies.push(resolvedModulePath);
        return this.remove();
      }

      /** if the node is a named export, return whatever it's exporting. */
      if (node.type === "ExportNamedDeclaration") {
        return node.declaration;
      }

      /**
       * if the node is a a default export, check if the declaration is
       * actually defining defining something or just referencing a previously
       * declared variable. If it's just the referencing variable, remove the line
       * otherwise return whatever it's exporting.
       */
      if (node.type === "ExportDefaultDeclaration") {
        if (node.declaration.type === "Identifier") {
          return this.remove();
        }

        return node.declaration;
      }
    },
  });

  modules.set(modulePath, escodegen.generate(ast, escodegenOpts));

  for (const dependency of dependencies) {
    if (modules.has(dependency)) {
      continue;
    }
    getDependencyGraph(dependency, modules);
  }
}

/**
 * @typedef {Object} BundleOpts
 * @property {string} entry
 * @property {string} output
 */

/**
 * @param {BundleOpts} options
 */
export default function bundle(options) {
  const modules = new Map();
  getDependencyGraph(options.entry, modules);

  let bundledCode = "";
  for (const [module, moduleCode] of Array.from(modules).reverse()) {
    bundledCode += `// ${module.replace(/\\/g, "/")}\n` + moduleCode + "\n\n";
  }

  fs.writeFileSync(options.output, bundledCode);
}
