var remote = require('electron').remote;
const $ = require('jquery');

let submitbutton = $('#submitbutton')
$(document).ready(()=>{
    submitbutton.on('click',(e)=>{
        remote.getGlobal('shared').workerid = $('#username').val();
        remote.getGlobal('login').loggedIn = true;
        window.close();
    })
});