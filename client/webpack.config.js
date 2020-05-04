const path = require('path');

module.exports = {
    entry: './src/index.js',
    // login: './src/login.js',
    // game: './src/index.js',
    output: {
        filename: 'main.js',
        path: path.resolve(__dirname, 'dist'),
    },
    resolve: {
        alias: {
            // createjs: 'createjs/builds/1.0.0/createjs.js'
            soundjs: 'soundjs/lib/soundjs.js'
        }
    },
    module: {
        rules: [
            {
                test: /\.(m?jsx?$)/,
                resolve: { extensions: [".js", ".jsx"] },
                exclude: /(node_modules|bower_components)/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env', '@babel/preset-react']
                    }
                }
            },
            {
                 test: /\.css$/,
                 use: [
                   'style-loader',
                   'css-loader',
                 ],
           },
            {
                test: /\.(png|svg|jpg|gif|wav|ogg)$/,
                use: [
                    'file-loader',
                ],
           },
            {
                // test: /node_modules[/\\]createjs/,
                test: /node_modules[/\\]soundjs/,
                loaders: [
                    'imports-loader?this=>window',
                    'exports-loader?window.createjs'
                ]
            },
        ]
    }
};
