var express = require('express');
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
var socketIO = require('socket.io');

const app = express();
var path = require('path');
app.use(express.static(path.join(__dirname, 'build')));

app.get('/', function(req, res) {
  res.sendfile(__dirname + '/build/index.html');
});

app.get('/*', function(req, res) {
   res.sendfile(__dirname + '/build/index.html');
});
const server = app.listen(3084, 'localhost');


