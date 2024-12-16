/*
    Eslint 9 Flat Config

    old eslint < 8 .rc files are no longer supported! do not place .eslintrc files in subfolders.
    eslint developers are currently working on an experimental feature to allow for sub-folder
    override rules
    @ref        https://github.com/eslint/eslint/discussions/18574#discussioncomment-9729092
                https://eslint.org/docs/latest/use/configure/configuration-files#experimental-configuration-file-resolution
    
    eslint config migration docs
    @ref        https://eslint.org/docs/latest/use/configure/migration-guide
*/

const js = require('@eslint/js');
const globals = require('globals');

/*
    Parser
*/

const parserBabel = require('@babel/eslint-parser');

/*
    Plugins
*/

const pluginBabel = require('@babel/eslint-plugin');
const pluginImport = require('eslint-plugin-import');
const pluginNode = require('eslint-plugin-n');
const pluginPrettier = require('eslint-plugin-prettier');
const pluginChaiFriendly = require('eslint-plugin-chai-friendly');

/*
    Globals
*/

const customGlobals = {
    guid: 'readable',
    uuid: 'readable'
};

/*
    Compatibility
*/

const { FlatCompat } = require('@eslint/eslintrc');

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

/*
    Eslint > Flat Config
*/

module.exports = [
    ...compat.extends('eslint:recommended', 'plugin:prettier/recommended', 'plugin:chai-friendly/recommended'),
    {
        ignores: [
            'coverage/**',
            'node_modules/**',
            '**/node_modules/**',
            '**/dist/**/*',
            '**/__tmp__/**/*',
            'eslint.config.cjs'
        ],
        files: ['**/*.js', './src/**/*.js', './test/**/*.js'],
        plugins: {
            'n': pluginNode,
            'prettier': pluginPrettier,
            'babel': pluginBabel,
            'import': pluginImport,
            'chai-friendly': pluginChaiFriendly
        },

        linterOptions: {
            reportUnusedDisableDirectives: false
        },

        languageOptions: {
            parser: parserBabel,
            globals: {
                ...customGlobals,
                ...globals.browser,
                ...globals.node,
                ...globals.jest,
                ...globals.jquery,
                _: true,
                $: true
            },
            sourceType: 'module',
            ecmaVersion: 6,
            parserOptions: {
                requireConfigFile: false,
                ecmaFeatures: {
                    arrowFunctions: true,
                    binaryLiterals: true,
                    blockBindings: true,
                    classes: true,
                    defaultParams: true,
                    destructuring: true,
                    forOf: true,
                    generators: true,
                    modules: true,
                    objectLiteralComputedProperties: true,
                    objectLiteralDuplicateProperties: true,
                    objectLiteralShorthandMethods: true,
                    objectLiteralShorthandProperties: true,
                    octalLiterals: true,
                    regexUFlag: true,
                    regexYFlag: true,
                    spread: true,
                    superInFunctions: true,
                    templateStrings: true,
                    unicodeCodePointEscapes: true,
                    globalReturn: true,
                    jsx: true,
                    experimentalObjectRestSpread: true
                }
            }
        },
        rules: {
            // eslint/js rules
            'semi': ['off', 'off'],
            'one-var': 'off',
            'space-before-function-paren': 'off',
            'no-throw-literal': 'off',

            'camelcase': [
                'error',
                {
                    'properties': 'always'
                }
            ],

            'no-unused-vars': 'off',
            'no-console': 'off',
            'no-alert': 'error',
            'no-debugger': 'error',
            'prefer-arrow-callback': 'error',
            'object-property-newline': 'off',
            'no-useless-escape': 'off',
            'no-var': 'error',
            'prefer-const': 'error',
            'no-unused-expressions': 0,
            'chai-friendly/no-unused-expressions': 2,
            'strict': ['error', 'never'],
            'no-mixed-operators': 'off',
            'prefer-promise-reject-errors': 'off',
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
            'curly': 'off',

            'no-empty': 'off',
            'no-restricted-syntax': [
                'error',
                {
                    'selector': 'ExportDefaultDeclaration',
                    'message': 'Prefer named exports'
                }
            ],
            'import/no-webpack-loader-syntax': 'off',
            'import/no-relative-parent-imports': 'error',
            'import/first': 'error',
            'import/no-default-export': 'error',
            'babel/no-unused-expressions': 'off',
            'node/no-callback-literal': 0,

            /*
                @plugin         eslint-plugin-n
            */

            'n/no-callback-literal': 0,
            'n/no-deprecated-api': 'error',
            'n/no-exports-assign': 'error',
            'n/no-extraneous-import': 'error',
            'n/no-extraneous-require': [
                'error',
                {
                    'allowModules': ['electron', 'electron-notarize'],
                    'resolvePaths': [],
                    'tryExtensions': []
                }
            ],
            'n/no-hide-core-modules': 'off',
            'n/no-missing-import': 'off',
            'n/no-missing-require': 'off',
            'n/no-mixed-requires': 'error',
            'n/no-new-require': 'error',
            'n/no-path-concat': 'error',
            'n/no-process-env': 'off',
            'n/no-process-exit': 'off',
            'n/no-restricted-import': 'error',
            'n/no-restricted-require': 'error',
            'n/no-sync': 'off',
            'n/no-unpublished-bin': 'error',
            'n/no-unpublished-import': 'error',
            'n/no-unpublished-require': 'error',
            'n/no-unsupported-features/es-builtins': 'error',
            'n/no-unsupported-features/es-syntax': 'error',
            'n/no-unsupported-features/node-builtins': 'off',
            'n/prefer-global/buffer': 'error',
            'n/prefer-global/console': 'error',
            'n/prefer-global/process': 'error',
            'n/prefer-global/text-decoder': 'error',
            'n/prefer-global/text-encoder': 'error',
            'n/prefer-global/url': 'error',
            'n/prefer-global/url-search-params': 'error',
            'n/prefer-node-protocol': 'off',
            'n/prefer-promises/dns': 'off',
            'n/prefer-promises/fs': 'off',
            'n/process-exit-as-throw': 'error',

            'prettier/prettier': [
                'error',
                {
                    experimentalTernaries: false,
                    printWidth: 100,
                    tabWidth: 4,
                    useTabs: false,
                    semi: true,
                    singleQuote: true,
                    quoteProps: 'preserve',
                    jsxSingleQuote: true,
                    trailingComma: 'none',
                    bracketSpacing: true,
                    bracketSameLine: false,
                    arrowParens: 'always',
                    proseWrap: 'preserve',
                    htmlWhitespaceSensitivity: 'ignore',
                    endOfLine: 'auto',
                    parser: 'flow',
                    embeddedLanguageFormatting: 'auto',
                    singleAttributePerLine: true
                }
            ]
        }
    },
    {
        files: ['package/osx/*.js'],
        languageOptions: {
            ecmaVersion: 5
        },
        rules: {
            'no-console': 'off',
            'no-undef': 'off',
            'no-var': 'off'
        }
    }
];
