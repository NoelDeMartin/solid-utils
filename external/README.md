# Solid Utils Externals

This folder includes the source for the `@noeldemartin/solid-utils-external` package. This library is not intended to be used by itself, rather it should be used through `@noeldemartin/solid-utils`. Keep reading if you want to learn why.

## Bundling woes

Whilst building [my latest application](https://github.com/noeldemartin/umai), I started using [Vite](vitejs.dev/) after a long time developing exclusively with [Webpack 4](https://v4.webpack.js.org/). On the one hand, this was great, because Vite is a lot faster and supports ESM natively. On the other hand, this introduced a new set of issues with some of my dependencies.

In particular, [everything that has to do with Node built-ins doesn't work](https://github.com/vitejs/vite/issues/1915). So the solution is to use polyfills, which webpack 4 provided out of the box. But unfortunately, I haven't been able to make this work with Vite. As far as I can tell, the main culprit is [readable-stream](https://github.com/nodejs/readable-stream). But I'm not even sure why at this point.

After a lot of tinkering and many wasted hours, I decided that for now I will continue using webpack 4 for these problematic dependencies, and use modern tooling for everything else.

It works, but it comes at a cost. Normally, I would create 3 bundles:

- `.cjs.js` (CommonJS) for Node environments.
- `.esm.js` for ESM environments.
- `.umd.js` for browser environments (like CDNs).

But given the aforementioned issues, the `esm` bundle is not working properly with Vite. So in this package, I'm only providing 2 bundles: `cjs` and `umd` (ESM environments will use the `umd` bundle). The main problem with doing this is that ESM environments won't be able to apply tree-shaking and other optimizations. But given that I'm already preselecting what to include in this library, I'm already doing a tree-shaking of sorts.

In any case, this is a long way of saying that I'm having a lot of headaches using some dependencies with modern tooling and I decided to maintain what worked before for them (Webpack). I may look into this again at some point in the future, but for now this should get the job done.
