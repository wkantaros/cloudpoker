const path = require('path');
// https://stackoverflow.com/questions/38252453/serving-mp3-files-using-the-webpack-file-loader/41158166#41158166
const SRC = path.resolve(__dirname, 'src/audio');

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
            createjs: 'soundjs/lib/soundjs.js'
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
                test: /\.(png|svg|jpg|gif)$/,
                use: [
                    'file-loader',
                ],
           },
            {
                test: /\.(wav|ogg)$/,
                include: SRC,
                loader: 'file-loader',
                // options: {
                //     name: 'audio/[name].[ext]'
                // }
            },
            {
                // test: /node_modules[/\\]createjs/,
                test: /node_modules[/\\]soundjs/,
                loaders: [
                    'imports-loader?this=>window',
                    'exports-loader?window.createjs'
                ],
            },
        ]
    }
};
