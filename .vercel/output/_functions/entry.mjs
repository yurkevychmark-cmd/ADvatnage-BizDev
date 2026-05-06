import { renderers } from './renderers.mjs';
import { c as createExports, s as serverEntrypointModule } from './chunks/_@astrojs-ssr-adapter_Cbaiv0Qq.mjs';
import { manifest } from './manifest_GFqA1s27.mjs';

const serverIslandMap = new Map();;

const _page0 = () => import('./pages/_image.astro.mjs');
const _page1 = () => import('./pages/buyers/add.astro.mjs');
const _page2 = () => import('./pages/buyers/_id_.astro.mjs');
const _page3 = () => import('./pages/buyers.astro.mjs');
const _page4 = () => import('./pages/calculator.astro.mjs');
const _page5 = () => import('./pages/deals.astro.mjs');
const _page6 = () => import('./pages/matchmaking.astro.mjs');
const _page7 = () => import('./pages/operators/add.astro.mjs');
const _page8 = () => import('./pages/operators/_id_.astro.mjs');
const _page9 = () => import('./pages/operators.astro.mjs');
const _page10 = () => import('./pages/pipeline.astro.mjs');
const _page11 = () => import('./pages/projects.astro.mjs');
const _page12 = () => import('./pages/index.astro.mjs');
const pageMap = new Map([
    ["node_modules/astro/dist/assets/endpoint/generic.js", _page0],
    ["src/pages/buyers/add.astro", _page1],
    ["src/pages/buyers/[id].astro", _page2],
    ["src/pages/buyers/index.astro", _page3],
    ["src/pages/calculator/index.astro", _page4],
    ["src/pages/deals/index.astro", _page5],
    ["src/pages/matchmaking/index.astro", _page6],
    ["src/pages/operators/add.astro", _page7],
    ["src/pages/operators/[id].astro", _page8],
    ["src/pages/operators/index.astro", _page9],
    ["src/pages/pipeline/index.astro", _page10],
    ["src/pages/projects/index.astro", _page11],
    ["src/pages/index.astro", _page12]
]);

const _manifest = Object.assign(manifest, {
    pageMap,
    serverIslandMap,
    renderers,
    actions: () => import('./noop-entrypoint.mjs'),
    middleware: () => import('./_noop-middleware.mjs')
});
const _args = {
    "middlewareSecret": "3ee3e47f-95ee-4a54-b8bc-b0643dc879b2",
    "skewProtection": false
};
const _exports = createExports(_manifest, _args);
const __astrojsSsrVirtualEntry = _exports.default;
const _start = 'start';
if (Object.prototype.hasOwnProperty.call(serverEntrypointModule, _start)) ;

export { __astrojsSsrVirtualEntry as default, pageMap };
