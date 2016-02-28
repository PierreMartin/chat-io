//////////////////////////////// SERVER CONFIG ////////////////////////////////
var express     = require('express');
var app         = express();
var server      = require('http').createServer(app);
var io          = require('../..')(server);
var port        = process.env.PORT || 8000;

var multer      = require('multer');    // add
var path        = require('path');      // add

//////////////////////////////// SERVER PORT ////////////////////////////////
server.listen(port, function () {
    console.log('✔ Server listening at port %d', port);
});

//////////////////////////////// ROUTING ////////////////////////////////
app.use(express.static(__dirname + '/public'));

//////////////////////////////// CHAT ////////////////////////////////

// CONNECTION D'UN USER
var users       = {};   // Objet contenant tous les utilisateurs connectés
var numUsers    = 0;    // Nombre d'utilisateurs connectés


// ==================================================================
// GESTION D'UPLOAD DES AVATARS
// ==================================================================
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads/origin');
    },
    filename: function (req, file, cb) {
        cb(null, (Math.random().toString(36)+'00000000000000000').slice(2, 10) + Date.now() + path.extname(file.originalname));
    }
});

var upload = multer({
    storage: storage,
    limits: {
        fileSize: 1000004,
        files: 1
    }
});

app.post('/', upload.single('avatar'), function(req, res){
    //console.log(req.body);
    //console.log(req.file);

    var lwip                = require('lwip');
    var path_image_origin   = req.file.path;
    var name_image          = '100X100_' + req.file.filename;

    users.avatar            = name_image;
    console.log('from upload : ' + users.avatar);

    // TODO: finir le test
    /*socket.emit('avatar', {
        avatar: users.avatar
    });*/


    lwip.open(path_image_origin, function(err, image){
        var width   = 100;
        var height  = 100;

        var widthRatio  = width / image.width();
        var heightRatio = height / image.height();
        var ratio       = Math.max(widthRatio, heightRatio);

        image
            .batch()
            .scale(ratio)
            .crop(width, height)
            .writeFile('uploads/avatar/' + name_image, function(err){  });
    });


    //res.status(200).send();

    /*
    res.writeHead(301,
        {Location: 'http://test.com/'}
    );
    res.end();
    */
});

// EN CAS D'ERREUR :
/*app.use(function (err, req, res, next) {
    res.status(413).send('File too large');
});*/

// ==================================================================
// FIN GESTION D'UPLOAD DES AVATARS
// ==================================================================








io.on('connection', function (socket) {
    var addedUser = false;

    // ==================================================================
    // NOUVEAU MESSAGE D'UN USER => ENVOI / RECEPTION
    // ==================================================================
    socket.on('new_message', function (data) {    // data  = message coté client

        // On envoi le (message) + (noms d'utilisateurs) :
        socket.broadcast.emit('new_message', {
            username: socket.username,
            message: data
        });
    });

    // ==================================================================
    // GESTION DU LOGIN
    // ==================================================================
    socket.on('add_user', function (user) {                                       // user => viens coté client

        // On stocke le nom de l'utilisateur :
        socket.username = user.name;

        // On ajoute à l'objet :
        users.name     = user.name;
        console.log('from socket.on : ' + users.avatar);

        ++numUsers;

        addedUser = true;

        // on envoi le (nombre d'utilisateurs) :
        socket.emit('login', {
            numUsers: numUsers
        });

        // On envoi le (nombre d'utilisateurs) + (noms d'utilisateurs) :
        socket.broadcast.emit('user_joined', {  // broadcast = TOUS les users
            username: socket.username,
            numUsers: numUsers
        });
    });

    // // ==================================================================
    // // TYPING => on l'envoi a 'tous le monde'
    // // ==================================================================
    // socket.on('typing', function () {
    //   // On envoi les (noms d'utilisateurs) :
    //   socket.broadcast.emit('typing', {
    //     username: socket.username
    //   });
    // });
    //
    //
    // // ==================================================================
    // // stop_typing => on l'envoi a 'tous le monde'
    // // ==================================================================
    // socket.on('stop_typing', function () {
    //     // On envoi les (noms d'utilisateurs) :
    //   socket.broadcast.emit('stop_typing', {
    //     username: socket.username
    //   });
    // });


    // ==================================================================
    // DECONNECTION D'UN USER => mise à jour de la liste et du tableau "users"
    // ==================================================================
    socket.on('disconnect', function () {
        // On supprime le nom d'utilisateur à l'objet :
        if (addedUser) {
            delete users[socket.username];
            --numUsers;

            // On envoi le (nombre d'utilisateurs) + (noms d'utilisateurs) :
            socket.broadcast.emit('user_left', {
                username: socket.username,
                numUsers: numUsers
            });
        }
    });
});


// on a pas d'ID par utilisateurs

// LES ECOUTEURS :
//  socket.on    = recupere des infos de l'autre coter
//  socket.emit  = envoi    des infos de l'autre coter

// 'connection' et 'disconnect' sont des evenements natifs de socket
//  pour les autres ('envoiMessageSurServer', 'setPseudo'...) on choisis le nom
