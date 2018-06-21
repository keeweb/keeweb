const fs = require('fs');
const path = require('path');

const CopyWebpackPlugin = require('copy-webpack-plugin');
const IgnoreAssetsWebpackPlugin = require('ignore-assets-webpack-plugin');

const production = process.env.NODE_ENV === 'production';

module.exports = {
    mode: production ? 'production' : 'development',
    entry: {
        // webpack needs an entry point.
        icon: './desktop/icon.png'
    },
    output: {
        path: path.resolve(__dirname, 'dist', 'app')
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: 'eslint-loader',
                options: {
                    failOnError: true
                }
            },
            {
                test: /\.png$/,
                loader: 'raw-loader'
            }
        ]
    },
    plugins: [
        new CopyWebpackPlugin([
            {
                context: 'desktop',
                from: '**/*',
                ignore: 'package-lock.json'
            },
            {
                context: 'desktop',
                from: 'main.js',
                transform: (content) => String(content).replace('@@PUBLIC_KEY_CONTENT', fs.readFileSync('./app/resources/public-key.pem', { encoding: 'utf8' }).trim())
            }
        ]),
        //  ignore the entrypoint output.
        new IgnoreAssetsWebpackPlugin({
            ignore: ['icon.js']
        })
    ]
};
