//Lädt Abhängigkeiten.
const bodyParser = require('body-parser');
var app = require('express')();
var session = require("express-session")({
    secret: "my-secret",
    resave: true,
    saveUninitialized: true
});
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var sharedsession = require("express-socket.io-session");
app.use(session);
io.use(sharedsession(session));

//Globale Variable
var GameList = [];
var SoundFiles = LoadSoundfiles();

//Weiterleitung zur Startseite
app.get('/home', function (req, res) {
    res.sendFile(__dirname + '/start.html');
});

//Weiterleitung zur Buzzer Page
app.get('/buzzer', function (req, res) {
    res.sendFile(__dirname + '/buzzer.html');
});

//Weiterleitung zur Admin Page
app.get('/admin', function (req, res) {
    res.sendFile(__dirname + '/buzzer_admin.html');
});

//Weiterleitung zur Hauptwebseite
app.get('/', function (req, res) {
    //res.sendFile(__dirname + '/GuerillaGamingWebseite/index.html');
});


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// IO Logik
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


//Logik für alle verbundenen Clienten/Spieler
io.on('connection', function (socket) {

    //Schickt beim erstmaligen laden der Seite die Info des Spieler, der aktuell gedrückt hat, falls vorhanden
    socket.on('ini buzzer', function (msg) {
        socket.emit('update ranking', GameList.find(x => x.Code === socket.handshake.session.Room).Playerlist);
        socket.emit('load buzzer', GameList.find(x => x.Code === socket.handshake.session.Room).CurrentPress);
        socket.emit('set question', GameList.find(x => x.Code === socket.handshake.session.Room).CurrentQuestion);
        socket.emit('load soundfiles', SoundFiles);
    });

    //Prüft ob es ein Raum mit dem Code gibt
    socket.on('check code', function (msg) {
        var exists = GameList.find(x => x.Code === msg) != null;
        if (exists) {
            socket.join(msg);
            socket.handshake.session.Room = msg;
        }
        socket.emit('check code', exists);
    });

    //Erstellt einen Neuen Raum
    socket.on('admin create', function (data) {
        var notExists = GameList.find(x => x.Code === data.split(";")[0]) == null;
        if (notExists) {
            GameList.push(NewBuzzer(data.split(";")[0], data.split(";")[1]));
            socket.join(data.split(";")[0]);
            socket.handshake.session.Room = data.split(";")[0];
        }
        socket.emit('admin create', notExists);
    });

    //Logt sich in einem Raum ein
    socket.on('admin login', function (data) {
        var existsAndValid = GameList.find(x => x.Code === data.split(";")[0] && x.Pass === data.split(";")[1]) != null;
        if (existsAndValid) {
            socket.join(data.split(";")[0]);
            socket.handshake.session.Room = data.split(";")[0];
        }
        socket.emit('admin login', existsAndValid);
    });
    

    //Logik wenn der Buzzer gedrückt worden ist
    socket.on('buzzer press', function (msg) {
        var tempPress = GameList.find(x => x.Code === socket.handshake.session.Room).Playerlist.find(function (element) { return element.SocketID == socket.id; });
        if (tempPress != null) {
            if (GameList.find(x => x.Code === socket.handshake.session.Room).BuzzerInfo == true) {
                GameList.find(x => x.Code === socket.handshake.session.Room).BuzzerInfo = false;
                GameList.find(x => x.Code === socket.handshake.session.Room).CurrentPress = tempPress;
                console.log(GameList.find(x => x.Code === socket.handshake.session.Room).CurrentPress.Name + " pressed the Buzzer");
                //Nachricht an den Spieler, der Erfolgreich gedrückt hat
                socket.emit('successful pressed', "");
                //Nachricht an ale anderen das jemand gedrückt hat
                socket.to(socket.handshake.session.Room).emit('failed pressed', "");
                //Schickt Info des Spielers der erfolgreich gedrückt hat an alle Spieler
                io.in(socket.handshake.session.Room).emit('buzzer press', GameList.find(x => x.Code === socket.handshake.session.Room).CurrentPress);
            }
        }
    });

    //Schaltet den Buzzer wieder frei
    socket.on('buzzer unlocked', function (msg) {
        GameList.find(x => x.Code === socket.handshake.session.Room).BuzzerInfo = true;
        io.in(socket.handshake.session.Room).emit('buzzer unlocked', GameList.find(x => x.Code === socket.handshake.session.Room).CurrentPress);
        GameList.find(x => x.Code === socket.handshake.session.Room).CurrentPress = new Object();
    });

    //Löscht die aktuelle frage
    socket.on('clear question', function (msg) {
        GameList.find(x => x.Code === socket.handshake.session.Room).CurrentQuestion = "";
        io.in(socket.handshake.session.Room).emit('clear question', "");
    });

    //Sendet eine neue Frage zu den Clienten
    socket.on('send question', function (msg) {
        GameList.find(x => x.Code === socket.handshake.session.Room).CurrentQuestion = msg;
        io.in(socket.handshake.session.Room).emit('set question', msg);
    });

    //Startet ein neues Spiel
    socket.on('new game', function (msg) {
        GameList.find(x => x.Code === socket.handshake.session.Room).BuzzerInfo = true;
        GameList.find(x => x.Code === socket.handshake.session.Room).Playerlist = [];
        GameList.find(x => x.Code === socket.handshake.session.Room).CurrentPress = new Object();
        GameList.find(x => x.Code === socket.handshake.session.Room).CurrentQuestion = "";
        io.in(socket.handshake.session.Room).emit('new game', msg);
    });

    //Fügt Punkte zum aktuellem Clienten hinzu
    socket.on('add points', function (msg) {
        GameList.find(x => x.Code === socket.handshake.session.Room).Playerlist.find(function (element) { return element.SocketID == GameList.find(x => x.Code === socket.handshake.session.Room).CurrentPress.SocketID; }).Points += parseInt(msg);
        UpdateRanking(socket);
    });

    //Logik wenn ein neue Spieler sich einträgt
    socket.on('new player', function (msg) {
        GameList.find(x => x.Code === socket.handshake.session.Room).Playerlist.push(NewPlayer(msg.split(";")[0], msg.split(";")[1], socket.id));
        console.log("Player " + msg.split(";")[0] + " joint the game. [" + socket.id + "]");
        UpdateRanking(socket);
    });

    //Logik falls ein Spieler die Seite verlässt
    socket.on('disconnect', function () {
        if (GameList.find(x => x.Code === socket.handshake.session.Room).Playerlist.find(function (element) { return element.SocketID == socket.id; }) != null) {
            console.log('Player ' + GameList.find(x => x.Code === socket.handshake.session.Room).Playerlist.find(function (element) { return element.SocketID == socket.id; }).Name + ' disconnected. [' + socket.id + ']');
            GameList.find(x => x.Code === socket.handshake.session.Room).Playerlist = GameList.find(x => x.Code === socket.handshake.session.Room).Playerlist.filter(function (obj) {
                return obj.SocketID != socket.id;
            });
            UpdateRanking(socket);
        }
    });
});

//Listener auf Port 3000
http.listen(3000, function () {
    console.log('listening on *:3000');
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Functions
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


//Funktion um ein neuen Spieler zu erstellen
function NewPlayer(name, color, socketID) {
    var player = new Object();
    player.Name = name;
    player.Color = color;
    player.Points = 0;
    player.SocketID = socketID;

    return player;
}

//Generiert eine Liste mit allen Sound Daten
function LoadSoundfiles() {
    const soundFolder = './sounds/';
    const fs = require('fs');
    var soundArray = [];

    fs.readdirSync(soundFolder).forEach(file => {
        soundArray.push(file);
    });

    return soundArray;
}

//Sortiert die Spielerliste/Rangliste nach Punkten und sendet sie zu allen Clienten/Spieler
function UpdateRanking(socket) {
    GameList.find(x => x.Code === socket.handshake.session.Room).Playerlist.sort((a, b) => (a.Points < b.Points) ? 1 : ((b.Points < a.Points) ? -1 : 0));
    io.in(socket.handshake.session.Room).emit('update ranking', GameList.find(x => x.Code === socket.handshake.session.Room).Playerlist);
    if (JSON.stringify(GameList.find(x => x.Code === socket.handshake.session.Room).CurrentPress) != JSON.stringify(new Object())) {
        io.in(socket.handshake.session.Room).emit('buzzer press', GameList.find(x => x.Code === socket.handshake.session.Room).CurrentPress);
    }
}

//Erstellt ein neuen Raum/Buzzer
function NewBuzzer(code, pass) {
    var game = {};
    game.Code = code;
    game.Pass = pass;
    game.Players = 1;
    game.BuzzerInfo = true;
    game.Playerlist = [];
    game.CurrentPress = new Object();
    game.CurrentQuestion = "";

    return game;
}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//// Load Resource Files
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//Hauptseiten resourcen
app.use(require('express').static(__dirname + '/GuerillaGamingWebseite/'));

//Sound resourcen
app.use(require('express').static(__dirname + '/sounds/'));

app.get('/sounds/RDM_Robot_Hit_8.mp3', function (req, res) {
    res.sendFile(__dirname + '/sounds/RDM_Robot_Hit_8.mp3');
});

app.get('/sounds/RDM_Negative_Dongs_5.mp3', function (req, res) {
    res.sendFile(__dirname + '/sounds/RDM_Negative_Dongs_5.mp3');
});

app.get('/sounds/RDM_Negative_Hit_Wrong_Ball.mp3', function (req, res) {
    res.sendFile(__dirname + '/sounds/RDM_Negative_Hit_Wrong_Ball.mp3');
});

app.get('/sounds/RDM_tv-total.mp3', function (req, res) {
    res.sendFile(__dirname + '/sounds/RDM_tv-total.mp3');
});
app.get('/sounds/SMW_1-up.wav', function (req, res) {
    res.sendFile(__dirname + '/sounds/SMW_1-up.wav');
});
app.get('/sounds/SMW_coin.wav', function (req, res) {
    res.sendFile(__dirname + '/sounds/SMW_coin.wav');
});
app.get('/sounds/SMW_fireball.wav', function (req, res) {
    res.sendFile(__dirname + '/sounds/SMW_fireball.wav');
});
app.get('/sounds/SMW_kick.wav', function (req, res) {
    res.sendFile(__dirname + '/sounds/SMW_kick.wav');
});
app.get('/sounds/SMW_power-up.wav', function (req, res) {
    res.sendFile(__dirname + '/sounds/SMW_power-up.wav');
});
app.get('/sounds/SMW_save_menu.wav', function (req, res) {
    res.sendFile(__dirname + '/sounds/SMW_save_menu.wav');
});
app.get('/sounds/RDM_Sonic_Ring.mp3', function (req, res) {
    res.sendFile(__dirname + '/sounds/RDM_Sonic_Ring.mp3');
});
app.get('/sounds/RDM_Metal_Gear.mp3', function (req, res) {
    res.sendFile(__dirname + '/sounds/RDM_Metal_Gear.mp3');
});
