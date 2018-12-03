const fs = require('fs');
const $ = require('jquery');
const remote = require('electron').remote;

const config = JSON.parse(fs.readFileSync('./src/environment/config/config.json','utf8'));
var restartRequired = false;
var isfullscreen = config.fullscreen;

function setupConfig(){
    if(config.fullscreen == true){
        $('#fullscreen').click();
    }
    if(config.orientation.rows == true){
        $('#horizontalview').click();
    }
    if(config.inputorientation.rows == true){
        $('#onelineinputs').click();
    }
    if(config.blockscroll == true){
        $('#sectionscrolling').click();
    }

    $('#apply').click((event)=>{
        if($('#imageDirectory')[0].files[0] != undefined){
            config.image = $('#imageDirectory')[0].files[0].path + '/';
            restartRequired = true;
        }
        if($('#inputDirectory')[0].files[0] != undefined){ 
            config.input = $('#inputDirectory')[0].files[0].path + '/';
            restartRequired = true;
        }
        if($('#outputDirectory')[0].files[0] != undefined){
            config.output = $('#outputDirectory')[0].files[0].path + '/';
            restartRequired = true;
        }
        config.fullscreen =  $('#fullscreen').prop('checked');
        config.orientation.rows =  $('#horizontalview').prop('checked');
        config.inputorientation.rows =  $('#onelineinputs').prop('checked');
        config.blockscroll = $('#sectionscrolling').prop('checked');
        if(restartRequired == false) restartRequired = !(isfullscreen == config.fullscreen);
    });

    $('#ok').click((event)=>{
        $('#apply').click();
        fs.writeFileSync("./src/environment/config/config.json", JSON.stringify(config), function(err){
            if(err) throw err;
        });
        if(restartRequired == true ){
            remote.app.relaunch();
            remote.app.exit(0);
        }else{
            remote.getGlobal('mainWindow').reload();
            remote.getGlobal('configWindow').close();
        }
    });
    
}


$(document).ready(setupConfig)