import replace from '@rollup/plugin-replace';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import del from 'rollup-plugin-delete';
import { createRequire } from 'module';
const pkg = createRequire(import.meta.url)('./package.json');

const jsConfig = {
    input: 'dist/server.js',
    output: [
        {
            file: pkg.main,
            format: 'cjs',
            exports: 'auto'
        }
    ],
    plugins: [
        nodeResolve({
            preferBuiltins: true
        }),
        commonjs(),
        replace({
            preventAssignment: true,
            __version__: pkg.version
        }),
        del({ hook: 'buildEnd', targets: ['dist/server.js', 'dist/interface', 'dist/type'] })
    ],
    external: ['axios', 'express', 'sharp', 'cryptr', 'dotenv', 'file-type']
};

export default [jsConfig];
