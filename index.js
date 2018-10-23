const {app, BrowserWindow, Menu, MenuItem, ipcMain, shell} = require('electron');
const fs = require('fs');
const $ = require('jquery');
let mainWindow;
const config = JSON.parse(fs.readFileSync('./config/config.json','utf8'));
let configWindow;
//window creation
function createWindow(){
    mainWindow = new BrowserWindow({ minWidth:600, minHeight:750,width:1366, height:720, frame:config.frame, fullscreen:config.fullscreen, webPreferences: {
        plugins: true
      }});

    if(config.fullscreen == false)mainWindow.maximize();
    mainWindow.loadFile('./sections/index.html');
    mainWindow.setMenuBarVisibility(false);
    mainWindow.setAutoHideMenuBar(true);
    mainWindow.on('closed', () => {
        mainWindow = null
    })

    compileInput();
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
        mainWindow.removeAllListeners('close');
      }
})

//context menu set up
const menu = new Menu()
menu.append(new MenuItem({ id:'reset', label: 'Reset', role:'reload'}))

app.on('browser-window-created', (event, win) => {
  win.webContents.on('context-menu', (e, params) => {
    menu.popup(win, params.x, params.y)
  })
})

ipcMain.on('show-context-menu', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  menu.popup(win)
})

var images = [];
var inputs = [];

function compileInput(){
    //compilation of inputs 
    fs.readdir(config.image, (err, dir) => {
            for(let i in dir){
                images.push(config.image + dir[i]);
            }
    });
    fs.readdir(config.input, (err, dir) => {
            for(let i in dir){
                inputs.push(config.input + dir[i]);
            }
    });

    global.images = images;
    global.inputs = inputs;
}

 //menu set up
 if(config.devmode == false){
    let template = [{
      label: 'File',
      submenu: [{
        label:'Settings',
        click: ()=>{
          configWindow = new BrowserWindow({ width:300, height:400 });
          configWindow.loadFile('./sections/config.html');
          configWindow.setResizable(false);
          configWindow.setMenuBarVisibility(false);
          global.configWindow = configWindow;
          global.mainWindow = mainWindow;
          configWindow.on('closed', () => {
            configWindow = null
          });
        }
      },
      // {
      //   label: 'DevTools',
      //   role: 'toggledevtools'
      // },
      {
        label: 'Exit',
        role: 'close'
      }]
    }, {
      label: 'Window',
      role: 'window',
      submenu: [{
        label: 'Minimize',
        role: 'minimize'
      },{
        label: 'Fulscreen',
        role: 'togglefullscreen'
      }]
    }, {
      label: 'Help',
      role: 'help',
      submenu: [{
        label: 'Learn More',
        click: () => {
          shell.openExternal('http://electron.atom.io')
        }
      }]
    }]

    function addUpdateMenuItems (items, position) {
      if (process.mas) return
    
      const version = app.getVersion()
      let updateItems = [{
        label: `Version ${version}`,
        enabled: false
      }, {
        label: 'Checking for Update',
        enabled: false,
        key: 'checkingForUpdate'
      }, {
        label: 'Check for Update',
        visible: false,
        key: 'checkForUpdate',
        click: () => {
          require('electron').autoUpdater.checkForUpdates()
        }
      }, {
        label: 'Restart and Install Update',
        enabled: true,
        visible: false,
        key: 'restartToUpdate',
        click: () => {
          require('electron').autoUpdater.quitAndInstall()
        }
      }]
    
      items.splice.apply(items, [position, 0].concat(updateItems))
    }

    function findReopenMenuItem () {
      const menu = Menu.getApplicationMenu()
      if (!menu) return
    
      let reopenMenuItem
      menu.items.forEach(item => {
        if (item.submenu) {
          item.submenu.items.forEach(item => {
            if (item.key === 'reopenMenuItem') {
              reopenMenuItem = item
            }
          })
        }
      })
      return reopenMenuItem
    }

    if (process.platform === 'darwin') {
      const name = app.getName()
      template.unshift({
        label: name,
        submenu: [{
          label: `About ${name}`,
          role: 'about'
        }, {
          type: 'separator'
        }, {
          label: 'Services',
          role: 'services',
          submenu: []
        }, {
          type: 'separator'
        }, {
          label: `Hide ${name}`,
          accelerator: 'Command+H',
          role: 'hide'
        }, {
          label: 'Hide Others',
          accelerator: 'Command+Alt+H',
          role: 'hideothers'
        }, {
          label: 'Show All',
          role: 'unhide'
        }, {
          type: 'separator'
        }, {
          label: 'Quit',
          accelerator: 'Command+Q',
          click: () => {
            app.quit()
          }
        }]
      })
    
      // Window menu.
      template[3].submenu.push({
        type: 'separator'
      }, {
        label: 'Bring All to Front',
        role: 'front'
      })
    
      addUpdateMenuItems(template[0].submenu, 1)
    }

    if (process.platform === 'win32') {
      const helpMenu = template[template.length - 1].submenu
      addUpdateMenuItems(helpMenu, 0)
    }

    app.on('ready', () => {
      const menu = Menu.buildFromTemplate(template)
      Menu.setApplicationMenu(menu)
    })

    app.on('browser-window-created', () => {
      let reopenMenuItem = findReopenMenuItem()
      if (reopenMenuItem) reopenMenuItem.enabled = false
    })

    app.on('window-all-closed', () => {
      let reopenMenuItem = findReopenMenuItem()
      if (reopenMenuItem) reopenMenuItem.enabled = true
    })
  }