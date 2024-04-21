/*
    eslint v9 flat config
    this has been migrated over from .eslintrc in favor of the new flat config structure

    this file will replace /root/.eslintrc once upgrading to ESLint v9 / grunt-eslint v25

    @ref    : https://eslint.org/blog/2022/08/new-config-system-part-2/
*/

import { FlatCompat } from '@eslint/eslintrc';
import { fileURLToPath } from 'url';
import path from 'path';

/*
    mimic CommonJS variables -- not needed if using CommonJS
*/

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat();

import pluginJs from '@eslint/js';
import babelParser from '@babel/eslint-parser';
import pluginPrettier from 'eslint-plugin-prettier';
import importPlugin from 'eslint-plugin-import';
import nodePlugin from 'eslint-plugin-n';
// import eslintCommentsPlugin from 'eslint-plugin-eslint-comments';
import babelPlugin from 'eslint-plugin-babel';
import pluginPromise from 'eslint-plugin-promise'
import globals from "globals";

// import jsdoc from "eslint-plugin-jsdoc";

export default [
  ...compat.config({
    extends: [
        'prettier',
        'plugin:prettier/recommended'

        // 'plugin:cypress/recommended',
        // Not ready for ESLint 9 yet, see https://github.com/cypress-io/eslint-plugin-cypress/issues/156
      ],
        rules: {
            'no-console': process.env.NODE_ENV === 'production' ? 'off' : 'off',
            'no-debugger': process.env.NODE_ENV === 'production' ? 'off' : 'off'
        },
    }),
    {
        files: ["**/*.js", "**/*.cjs"],
        ignores: [
            '**/jest.config.js',
            '**/node_modules/**',
            '**/dist/**',
            '**/fixtures/**',
            '**/coverage/**',
            '**/__snapshots__/**',
            '**/docs/**',
            '**/build/**',
            '**/.github/**'
        ],

        languageOptions: {
            ecmaVersion: 6,
            parser: babelParser,
            sourceType: "module",
            parserOptions: {
                requireConfigFile: false,
                babelOptions: {
                    babelrc: false,
                    configFile: false,
                    presets: ["@babel/preset-env"],
                }
            }
        },

        /*
            Compatibility warning:
                some of these plugins are NOT compatible with ESLint 9 / grunt-eslint v25

                for now, we've switched over to the new flat config, that way when we do upgrade, it's
                seamless
        */

        plugins: {
            ['@plugin-prettier']: pluginPrettier,
            ['import']: importPlugin,
            ['@plugin-babel']: babelPlugin,
            ['n']: nodePlugin
        },


        rules: {

            /*
                Plugin > Import
            */
            'import/no-webpack-loader-syntax': 'off',
            'import/no-relative-parent-imports': 'error',
            'import/first': 'error',
            'import/no-commonjs': 'off',
            'import/no-default-export': 'error',
            'n/no-deprecated-api': 'error',
            'import/no-commonjs': 'error',

            /*
                Plugin > babel
            */

            '@plugin-babel/no-unused-expressions': 'error',

            /*
                Plugin > Prettier
            */

            '@plugin-prettier/prettier': 'error',


            'semi': ['off', 'off'],
            'one-var': 'off',
            'space-before-function-paren': 'off',
            'no-throw-literal': 'off',
            'camelcase': ['error', { 'properties': 'always' }],
            'no-console': 'off',
            'no-alert': 'error',
            'no-debugger': 'error',
            'prefer-arrow-callback': 'error',
            'object-property-newline': 'off',
            'no-useless-escape': 'off',
            'no-var': 'error',
            'prefer-const': 'error',
            'no-unused-expressions': 'off',
            'strict': ['error', 'never'],
            'no-mixed-operators': 'off',
            'prefer-promise-reject-errors': 'off',
            'standard/no-callback-literal': 'off',
            'object-curly-spacing': 'off',
            'quote-props': 'off',
            'no-new-object': 'error',
            'object-shorthand': 'off',
            'no-array-constructor': 'error',
            'array-callback-return': 'error',
            'no-eval': 'error',
            'no-new-func': 'error',
            'prefer-rest-params': 'error',
            'prefer-spread': 'error',
            'no-useless-constructor': 'error',
            'no-dupe-class-members': 'error',
            'no-duplicate-imports': 'error',
            'eqeqeq': 'error',
            'no-unneeded-ternary': 'error',
            'curly': 'error',
            'no-empty': 'off',
            'no-restricted-syntax': [
                'error',
                {
                    'selector': 'ExportDefaultDeclaration',
                    'message': 'Prefer named exports'
                }
            ],
            'node/no-callback-literal': 'off',
            'n/no-callback-literal': 'off'
     }
  },{
    languageOptions: { globals: globals.browser }
  }
];
