var FADE_TIME           = 150; // ms
var TYPING_TIMER_LENGTH = 400; // ms

var COLORS = [
    '#e21400', '#91580f', '#f8a700', '#f78b00',
    '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
    '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
];


// Initialize varibles
var $window         = $(window);
var $usernameInput  = $('.usernameInput');  // Input for username
var $avatarInput    = $('.avatarInput');    // Input for avatar
var $messages       = $('.messages');       // Messages area
var $inputMessage   = $('.inputMessage');   // Input message input box
var $loginPage      = $('.login.page');     // The login page
var $chatPage       = $('.chat.page');      // The chatroom page


var user = {};       // user
// user.name
// user.avatar
// message


var avatar;                 // avatar
var connected = false;      // connecter ?
var typing = false;         // typing
var lastTypingTime;         // typing
var $currentInput = $usernameInput.focus();

var socket = io();


// ==================================================================
// LES FONCTIONS =>  :
// ==================================================================
////////////////////////////////////////////////////// INFOS COMPLEMENTAIRES DU TCHAT : //////////////////////////////////////////////////////
// data =  toute les données (message | nom de l'utilisateur | nombre d'utilisateur...)
function addParticipantsMessage(data) {
    var message = '';

    if (data.numUsers === 1) {
        message += "Il y as 1 participant";
    } else {
        message += "Il y as " + data.numUsers + " participants";
    }
    log(message);

}


////////////////////////////////////////////////////// GESTION DU LOGIN : //////////////////////////////////////////////////////
function setUsername() {

    user.name = cleanInput($usernameInput.val().trim());    // on récupere la value de l'input (on passe pas par un submit d'un form)
    user.avatar = $avatarInput.val();                       // on récupere la value de l'input (on passe pas par un submit d'un form)

    // Si username valide :
    if (user.name) {
        $loginPage.fadeOut();
        $chatPage.show();
        $loginPage.off('click');
        $currentInput = $inputMessage.focus();

        // Tell the server your 'username'
        socket.emit('add_user', user); // ICI ON PASSE LA BIG VARIABLE AU SERVER
    }
}


////////////////////////////////////////////////////// GESTION DES ENVOIS DES MESSAGES : //////////////////////////////////////////////////////
function sendMessage() {
    var message = cleanInput($inputMessage.val().trim()); // on récupere la value de l'input (on passe pas par un submit d'un form)

    // if there is a non-empty message and a socket connection
    if (message && connected) {
        $inputMessage.val('');
        $avatarInput.val('');

        addChatMessage({
            username: user.name,
            message: message,
            avatar: user.avatar       // add
        });

        // tell server to execute 'new_message' and send along one parameter
        socket.emit('new_message', message);
    }
}


///////// GESTION DE CREATION DES ELEMENTS HTML : /////////
// Log a message
function log(message, options) {
    var $el = $('<li>').addClass('log').text(message);
    addMessageElement($el, options);
}


///////// GESTION DE CREATION DES ELEMENTS HTML : /////////
function addChatMessage(data, options) { // data : {'username', 'message', 'avatar'}
    console.log('NAME coté server : ' + data.username);
    console.log('AVAT coté server : ' + data.avatar);
    console.log('MSG  coté server : ' + data.message);

    // Don't fade the message in if there is an 'X was typing'
    var $typingMessages = getTypingMessages(data);
    options = options || {};

    if ($typingMessages.length !== 0) {
        options.fade = false;
        $typingMessages.remove();
    }


    //var $avatarDiv      = $('<img src="http://localhost:8000/img/'+data.avatar+'">');
    var $avatarDiv = $('<img src="http://localhost:8000/img/test.jpg">');
    var $usernameDiv = $('<span class="username">').text(data.username).css('color', getUsernameColor(data.username));
    var $messageBodyDiv = $('<span class="messageBody">').text(data.message);

    var typingClass = data.typing ? 'typing' : '';

    var $messageDiv = $('<li class="message">')
        .data('username', data.username)
        .addClass(typingClass)
        .append($avatarDiv, $usernameDiv, $messageBodyDiv);                                   // ici add balise img

    addMessageElement($messageDiv, options);
}


///////// GESTION DE TYPING : /////////
// Adds the visual chat typing message
function addChatTyping(data) {
    data.typing = true;
    data.message = 'ecrit...';
    addChatMessage(data);
}

// Removes the visual chat typing message
function removeChatTyping(data) {
    getTypingMessages(data).fadeOut(function () {
        $(this).remove();
    });
}


// Adds a message element to the messages and scrolls to the bottom
// el - The element to add as a message
// options.fade - If the element should fade-in (default = true)
// options.prepend - If the element should prepend
//   all other messages (default = false)
function addMessageElement(el, options) {
    var $el = $(el);

    // Setup default options
    if (!options) {
        options = {};
    }
    if (typeof options.fade === 'undefined') {
        options.fade = true;
    }
    if (typeof options.prepend === 'undefined') {
        options.prepend = false;
    }

    // Apply options
    if (options.fade) {
        $el.hide().fadeIn(FADE_TIME);
    }
    if (options.prepend) {
        $messages.prepend($el);
    } else {
        $messages.append($el);
    }
    $messages[0].scrollTop = $messages[0].scrollHeight;
}


// HTML ENTITIES (QUI MARCHE PAS)
function cleanInput(input) {
    return $('<div/>').text(input).text();
}


// Updates the typing event
function updateTyping() {
    if (connected) {
        if (!typing) {
            typing = true;
            socket.emit('typing');
        }
        lastTypingTime = (new Date()).getTime();

        setTimeout(function () {
            var typingTimer = (new Date()).getTime();
            var timeDiff = typingTimer - lastTypingTime;
            if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
                socket.emit('stop_typing');
                typing = false;
            }
        }, TYPING_TIMER_LENGTH);
    }
}


// Gets the 'X is typing' messages of a user
function getTypingMessages(data) {
    return $('.typing.message').filter(function (i) {
        return $(this).data('username') === data.username;
    });
}


// COLOR RANDOM :
function getUsernameColor(username) {
    // Compute hash code
    var hash = 7;
    for (var i = 0; i < user.name.length; i++) {
        hash = user.name.charCodeAt(i) + (hash << 5) - hash;
    }
    // Calculate color
    var index = Math.abs(hash % COLORS.length);
    return COLORS[index];
}


// SUBMIT
$window.keydown(function (event) {
    if (event.which === 13) {
        if (user.name) {
            sendMessage();
            socket.emit('stop_typing');
            typing = false;
        } else {
            setUsername();
        }
    }
});

function sendFormCreateLogin(e) {
    //e.preventDefault();
    setUsername();
}


$inputMessage.on('input', function () {
    updateTyping();
});


// // FOCUS PAGE HOME :
// $loginPage.click(function () {
//   $currentInput.focus();
// });

// // FOCUS PAGE CHAT :
$inputMessage.click(function () {
    $inputMessage.focus();
});


// ==================================================================
// SOCKET EVENT => (ON RECUPERE LES INFOS DU SEVREUR) :
// ==================================================================
// Whenever the server emits 'login', log the login message
socket.on('login', function (data) {
    connected = true;

    // Display the welcome message
    var message = "Bienvenue... ";
    log(message, {
        prepend: true
    });

    addParticipantsMessage(data);
});


///////// NOUVEAU MESSAGE D'UN USER => SEND (MESSAGE) AUX AUTRE
socket.on('new_message', function (data) {
    addChatMessage(data);
});


///////// CONNECTION D'UN USER => (nombre d'utilisateurs) + (noms d'utilisateurs)
// Whenever the server emits 'user_joined', log it in the chat body
socket.on('user_joined', function (data) {
    log(data.username + ' est conecté');
    addParticipantsMessage(data);
});


///////// DECONNECTION D'UN USER =>
// Whenever the server emits 'user_left', log it in the chat body
socket.on('user_left', function (data) {
    log(data.username + ' est parti');
    addParticipantsMessage(data);
    removeChatTyping(data);
});


// ///////// TYPING =>
// // Whenever the server emits 'typing', show the typing message
// socket.on('typing', function (data) {
//   addChatTyping(data);
// });
//
// // Whenever the server emits 'stop_typing', kill the typing message
// socket.on('stop_typing', function (data) {
//   removeChatTyping(data);
// });

