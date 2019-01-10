var remote = require('electron').remote;
const $ = require('jquery');

let username = $('#username');
let password = $('#password');
let submitbutton = $('#submitbutton')
$(document).ready(()=>{
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