# bundler
A small bundler to service personal projects as an alternative to industry bundlers such as Webpack, Rollup, etc.

# purpose
This was an experiment to better understand what the frontend ecosystem is built on top of. This doesn't feature anything remotely close to what a production-ready bundler has but it was able to parsed my source code into a single file. This was built using `espree` for AST generation, `estraverse` for AST traversal and editing, and a fork of `escodegen` for rebuilding the AST into javascript.
