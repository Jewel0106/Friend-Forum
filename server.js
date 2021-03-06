// Requiring necessary npm packages
var express = require("express");
var bodyParser = require("body-parser");
var session = require("express-session");
var cookieParser = require('cookie-parser');
// Requiring passport as we've configured it
var passport = require("./config/passport");

//Requiring MySQLSTORE to store our chat session and data
// MySQLStore = require('connect-mysql')(session),
//     options = {
//       config: {
//         user: 'root', 
//         password: "password", 
//         database: 'social_media_testDB' 
//       }
//     };

    MySQLStore = require('connect-mysql')(session),
    options = {
      config: {
        user: 'q8eehryqvqpicbsz', 
        password: 'x31k93q8sjojmd55', 
        database: 'brhuf5t1q0s80sgt',
        host: "gp96xszpzlqupw4k.cbetxkdyhwsb.us-east-1.rds.amazonaws.com"  
      }
    };

// if(process.env.JAWSDB_URL) {
//   connection = mysql.createConnection(process.env.JAWSDB_URL);
// } else {
//   MySQLStore = require('connect-mysql')(session),
//     options = {
//       config: {
//         user: 'root', 
//         password: "password", 
//         database: 'social_media_testDB' 
//       }
//     };
// }

// Setting up port and requiring models for syncing
var PORT = process.env.PORT || 8080;
var db = require("./models");

// Creating express app and configuring middleware needed for authentication
var app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static("public"));
// We need to use sessions to keep track of our user's login status
app.use(session({ secret: "keyboard cat", resave: true, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());


// initialize our socket.io/passport modules 
var http = require('http').createServer(app);
var io = require("socket.io")(http),
    sessionStore = new MySQLStore(options), // find a working session store (have a look at the readme) 
    passportSocketIo = require("passport.socketio");

io.use(passportSocketIo.authorize({
  cookieParser: cookieParser,       // the same middleware you registrer in express 
  key:          "express.sid",       // the name of the cookie where express/connect stores its session_id 
  secret:       "keyboard cat",    // the session_secret to parse the cookie 
  store:        sessionStore,        // we NEED to use a sessionstore. no memorystore please 
  success:      onAuthorizeSuccess,  // *optional* callback on success - read more below 
  fail:         onAuthorizeFail,     // *optional* callback on fail/error - read more below 
}));

io.sockets.on('connection', function(socket){
  var exRoom;

   socket.on('set-username', function(username) {
      socket.username = username;
  });

   socket.on('room', function(room){
      if(exRoom == room){
        socket.leave(room)
      } else {
      socket.join(room)
      exRoom = room;
      console.log(socket.username+" joined the "+room+" chatroom.")
      }
   })

    socket.on('chat message', function(msg){
      io.sockets.in(exRoom).emit('chat message', {
        username: socket.username,
        message: msg
      });
    });

  socket.on('connect', function() {
    console.log(socket.username+ " connected to chat.")
    // socket.broadcast.to(exRoom).emit("---"+ socket.username + ' has entered the room.---');
    });

  socket.on('disconnect', function() {
    console.log(socket.username+ " disconnected from chat.")
    // socket.broadcast.to(exRoom).emit("---"+ socket.username + ' has left the room.---');
    });

  });

function onAuthorizeSuccess(data, accept){
  console.log('successful connection to socket.io');
  // The accept-callback still allows us to decide whether to 
  // accept the connection or not. 
  accept(null, true);
}

function onAuthorizeFail(data, message, error, accept){
  if(error){
  throw new Error(message);
  console.log('failed connection to socket.io:', message);
 }
  // We use this callback to log all of our failed connections. 
  accept(null, false);  
}

//Requiring handelbars
var exphbs = require("express-handlebars");

app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

// Requiring our routes
require("./routes/html-routes.js")(app);
require("./routes/api-routes.js")(app);

// Syncing our database and logging a message to the user upon success
db.sequelize.sync().then(function() {
  http.listen(PORT, function() {
    console.log("==> 🌎  Listening on port %s. Visit http://localhost:%s/ in your browser.", PORT, PORT);
  });
});
