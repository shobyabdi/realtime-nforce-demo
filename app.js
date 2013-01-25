var express = require('express')
  , http = require('http');

var app = express();
var server = http.createServer(app);

var io = require('socket.io').listen(server);
var nforce = require('nforce');

var env     = process.env.SFDC_ENV || 'production';
var port    = process.env.PORT || 5000;
var host	= process.env.HOST || 'http://localhost';
var key		= process.env.KEY || '3MVG9rFJvQRVOvk74_Gd4.EAzwYgmtfcRAOxcy6dArPDK2SNbgOHbL2iST4D8qIU6yZLujBLMaY1f41mqgcop';
var secret	= process.env.SECRET || '7624826066055734035';

var user = "shoby@mavensconsulting-d3demo.com";
var pass = "thispasswordwillchange123";
var sToken = "gBdHxvE1kTRWsBKiRusywcvSn";

/***********************************
 * socket.io configuration         *
 ***********************************/

io.configure(function () { 
  io.set('transports', ['xhr-polling']); 
  io.set('polling duration', 10); 
  io.set('log level', 1);
});

io.sockets.on('connection', function (socket) {
  console.log('client connected to socket.io');
});

var oauth;

var org = nforce.createConnection({
  clientId: key,
  clientSecret: secret,
  redirectUri: host+':'+port+'/oauth/_callback',
  apiVersion: 'v25.0',  // optional, defaults to v24.0
  environment: env  // optional, sandbox or production, production default
});

// Configuration
app.configure(function(){
  app.set('views', __dirname + '/views');
  app.engine('html', require('ejs').renderFile);
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
  app.use(express.cookieParser()); 
  app.use(express.session({ secret: 'fajdlfjadslkfja' }));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

/***********************************
 * force.com streaming             *
 ***********************************/

org.authenticate({ username: user, password: pass, securityToken: sToken}, function(err, resp){
  if(err) return console.log('Unable to connect to force.com. Error: ' + err.statusCode + " - " + err.message);
  console.log('Authenticated with force.com!');
  oauth = resp;
  var str = org.stream('AccountData', oauth);
  str.on('connect', function(){
    console.log('connected to force.com pushtopic');
  });
  str.on('error', function(error) {
    console.log('force.com stream error: ' + error);
  });
  str.on('data', function(data) {
    // send the data to all listeners
    io.sockets.emit('force', JSON.stringify(data));
  });
});

// Routes
app.get('/', function(req, res) {
    res.render('index.html');
});

app.get('/demo', function(req, res){
  res.render('demo.html');
});

app.get('/color/:color', function(req, res){
  var acc = nforce.createSObject('Account');
  acc.Name = req.params.color;
  org.insert(acc, oauth, function(err, response){
    if(!err) { 
      console.log('changed force.com color to ' + acc.Name);
      res.end();
    }
  });
});

server.listen(port);
