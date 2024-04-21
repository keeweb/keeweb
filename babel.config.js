const parserOpts = {
    // Allow returns in the module
    allowReturnOutsideFunction: true
};

const node = {
    presets: [
        [
            '@babel/preset-env',
            {
                targets: {
                    node: true
                }
            }
        ]
    ],
    plugins: [
        '@babel/plugin-transform-flow-strip-types',
        [
            '@babel/plugin-proposal-decorators',
            {
                legacy: true
            }
        ]
    ]
};

const all = {
    presets: ['@babel/preset-env'],
    plugins: node.plugins
};

const es5 = {
    presets: all.presets
};

module.exports = (api) => {
    api.cache(true);

    return {
        parserOpts,
        env: {
            node,
            all,
            es5
        }
    };
};
