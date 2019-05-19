var remote = require('electron').remote;
const $ = require('jquery');
const fs = require('fs-extra');
const config = JSON.parse(fs.readFileSync('./src/environment/config/config.json','utf8'));
let username = $('#username');
let password = $('#password');
let submitbutton = $('#submitbutton')

$(document).ready(()=>{
    $('#loginTitle').append(config.loginTitle);
    submitbutton.on('click',(e)=>{
        if(username.val() != ''){
            remote.getGlobal('shared').workerid = username.val();
            remote.getGlobal('login').loggedIn = true;
            window.close();
        }else{
            alert('input a valid username');
        }
    })
});