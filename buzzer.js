//L�dt Abh�ngigkeiten.
var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

//Globale Variable
var BuzzerStatus = true;
var Playerlist = [];
var CurrentPress = new Object();
var CurrentQuestion = "";
var SoundFiles = LoadSoundfiles();

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
    res.sendFile(__dirname + '/GuerillaGamingWebseite/index.html');
});


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// IO Logik
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


//Logik f�r alle verbundenen Clienten/Spieler
io.on('connection', function (socket) {

    //Schickt beim erstmaligen laden der Seite die Info des Spieler, der aktuell gedr�ckt hat, falls vorhanden
    socket.emit('update ranking', Playerlist);
    socket.emit('load buzzer', CurrentPress);
    socket.emit('set question', CurrentQuestion);
    socket.emit('load soundfiles', SoundFiles);

    //Logik wenn der Buzzer gedr�ckt worden ist
    socket.on('buzzer press', function (msg) {
        var tempPress = Playerlist.find(function (element) { return element.SocketID == socket.id });
        if (tempPress != null) {
            if (BuzzerStatus == true) {
                BuzzerStatus = false;
                CurrentPress = tempPress;
                console.log(CurrentPress.Name + " pressed the Buzzer");
                //Nachricht an den Spieler, der Erfolgreich gedr�ckt hat
                socket.emit('successful pressed', "");
                //Nachricht an ale anderen das jemand gedr�ckt hat
                socket.broadcast.emit('failed pressed', "");
                //Schickt Info des Spielers der erfolgreich gedr�ckt hat an alle Spieler
                io.emit('buzzer press', CurrentPress);
            }
        }
    });

    //Schaltet den Buzzer wieder frei
    socket.on('buzzer unlocked', function (msg) {
        BuzzerStatus = true;
        io.emit('buzzer unlocked', CurrentPress);
        CurrentPress = new Object();
    });

    //L�scht die aktuelle frage
    socket.on('clear question', function (msg) {
        CurrentQuestion = "";
        io.emit('clear question', "");
    });

    //Sendet eine neue Frage zu den Clienten
    socket.on('send question', function (msg) {
        CurrentQuestion = msg;
        io.emit('set question', msg);
    });

    //Startet ein neues Spiel
    socket.on('new game', function (msg) {
        BuzzerStatus = true;
        Playerlist = [];
        CurrentPress = new Object();
        CurrentQuestion = "";
        io.emit('new game', msg);
    });

    //f�gt Punkte zum aktuellem Clienten hinzu
    socket.on('add points', function (msg) {
        Playerlist.find(function (element) { return element.SocketID == CurrentPress.SocketID }).Points += parseInt(msg);
        UpdateRanking();
    });

    //Logik wenn ein neue Spieler sich eintr�gt
    socket.on('new player', function (msg) {
        Playerlist.push(NewPlayer(msg.split(";")[0], msg.split(";")[1], socket.id));
        console.log("Player " + msg.split(";")[0] + " joint the game. [" + socket.id + "]");
        UpdateRanking();
    });

    //Logik falls ein Spieler die Seite verl�sst
    socket.on('disconnect', function () {
        if (Playerlist.find(function (element) { return element.SocketID == socket.id }) != null) {
            console.log('Player ' + Playerlist.find(function (element) { return element.SocketID == socket.id }).Name + ' disconnected. [' + socket.id + ']');
            Playerlist = Playerlist.filter(function (obj) {
                return obj.SocketID != socket.id;
            });
            UpdateRanking();
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
function UpdateRanking() {
    Playerlist.sort((a, b) => (a.Points < b.Points) ? 1 : ((b.Points < a.Points) ? -1 : 0));
    io.emit('update ranking', Playerlist);
    if (JSON.stringify(CurrentPress) != JSON.stringify(new Object())) {
        io.emit('buzzer press', CurrentPress);
    }
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
