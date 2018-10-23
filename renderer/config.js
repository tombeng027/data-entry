const fs = require('fs');
const $ = require('jquery');
const remote = require('electron').remote;

const config = JSON.parse(fs.readFileSync('./config/config.json','utf8'));

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

    $('#apply').click((event)=>{
        if($('#imageDirectory')[0].files[0] != undefined) config.image = $('#imageDirectory')[0].files[0].path + '/';
        if($('#inputDirectory')[0].files[0] != undefined) config.input = $('#inputDirectory')[0].files[0].path + '/';
        if($('#outputDirectory')[0].files[0] != undefined) config.output = $('#outputDirectory')[0].files[0].path + '/';
        config.fullscreen =  $('#fullscreen').prop('checked');
        config.orientation.rows =  $('#horizontalview').prop('checked');
        config.inputorientation.rows =  $('#onelineinputs').prop('checked');
    });

    $('#ok').click((event)=>{
        $('#apply').click();
        fs.writeFileSync("./config/config.json", JSON.stringify(config), function(err){
            if(err) throw err;
        });
        remote.app.relaunch();
        remote.app.exit(0);
    });
    
}


$(document).ready(setupConfig)