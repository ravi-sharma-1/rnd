var express = require('express');
var webpack = require('webpack');
var webpackDevMiddleware = require('webpack-dev-middleware');
var webpackHotMiddleware = require('webpack-hot-middleware');
var config = require('./webpack.development.config');
var socketIO = require('socket.io');

const app = express();
const compiler = webpack(config);

const wdm = webpackDevMiddleware(compiler, {
    publicPath: config.output.publicPath,
    stats: {
        colors: true,
        chunks: false
    }
});

app.use(wdm);
app.use(webpackHotMiddleware(compiler));

const server = app.listen(3082, 'localhost');
app.use(express.static(__dirname));

process.on('SIGTERM', () => {
    console.log('Stopping dev server');
    wdm.close();
    server.close(() => {
        process.exit(0);
    });
});
