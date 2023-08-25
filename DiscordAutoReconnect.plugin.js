/**
 * @name DiscordAutoReconnect
 * @description A plugin that allows you to automatically reconnect to a voice channel.
Uncompatible with "Platform Indicators v1.4.2".
 * @version 1.3.0
 * @author Omnom Metkij
 * @authorId 817410117049384990
 * @authorLink https://github.com/OmnomMetkij
 * @website https://www.youtube.com/watch?v=dQw4w9WgXcQ
 * @source https://github.com/OmnomMetkij/DAR_plugin
 */
/*@cc_on
@if (@_jscript)
    
    // Offer to self-install for clueless users that try to run this directly.
    var shell = WScript.CreateObject("WScript.Shell");
    var fs = new ActiveXObject("Scripting.FileSystemObject");
    var pathPlugins = shell.ExpandEnvironmentStrings("%APPDATA%\\BetterDiscord\\plugins");
    var pathSelf = WScript.ScriptFullName;
    // Put the user at ease by addressing them in the first person
    shell.Popup("It looks like you've mistakenly tried to run me directly. \n(Don't do that!)", 0, "I'm a plugin for BetterDiscord", 0x30);
    if (fs.GetParentFolderName(pathSelf) === fs.GetAbsolutePathName(pathPlugins)) {
        shell.Popup("I'm in the correct folder already.", 0, "I'm already installed", 0x40);
    } else if (!fs.FolderExists(pathPlugins)) {
        shell.Popup("I can't find the BetterDiscord plugins folder.\nAre you sure it's even installed?", 0, "Can't install myself", 0x10);
    } else if (shell.Popup("Should I copy myself to BetterDiscord's plugins folder for you?", 0, "Do you need some help?", 0x34) === 6) {
        fs.CopyFile(pathSelf, fs.BuildPath(pathPlugins, fs.GetFileName(pathSelf)), true);
        // Show the user where to put plugins in the future
        shell.Exec("explorer " + pathPlugins);
        shell.Popup("I'm installed!", 0, "Successfully installed", 0x40);
    }
    WScript.Quit();

@else@*/
const config = {
    main: "index.js",
    id: "",
    name: "DiscordAutoReconnect",
    author: "Omnom Metkij",
    authorId: "817410117049384990",
    authorLink: "https://github.com/OmnomMetkij",
    version: "1.3.0",
    description: "A plugin that allows you to automatically reconnect to a voice channel.\nUncompatible with \"Platform Indicators v1.4.2\".",
    website: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    source: "https://github.com/OmnomMetkij/DAR_plugin",
    patreon: "",
    donate: "",
    invite: "",
    changelog: [
        {
            title: "Whats new?",
            items: [
                "Hotfix #3."
            ]
        },
        {
            title: "Fixed",
            items: [
                "Streaming Issues."
            ]
        }
    ],
    defaultConfig: []
};
class Dummy {
    constructor() {this._config = config;}
    start() {}
    stop() {}
}
 
if (!global.ZeresPluginLibrary) {
    BdApi.showConfirmationModal("Library Missing", `The library plugin needed for ${config.name ?? config.info.name} is missing. Please click Download Now to install it.`, {
        confirmText: "Download Now",
        cancelText: "Cancel",
        onConfirm: () => {
            require("request").get("https://betterdiscord.app/gh-redirect?id=9", async (err, resp, body) => {
                if (err) return require("electron").shell.openExternal("https://betterdiscord.app/Download?id=9");
                if (resp.statusCode === 302) {
                    require("request").get(resp.headers.location, async (error, response, content) => {
                        if (error) return require("electron").shell.openExternal("https://betterdiscord.app/Download?id=9");
                        await new Promise(r => require("fs").writeFile(require("path").join(BdApi.Plugins.folder, "0PluginLibrary.plugin.js"), content, r));
                    });
                }
                else {
                    await new Promise(r => require("fs").writeFile(require("path").join(BdApi.Plugins.folder, "0PluginLibrary.plugin.js"), body, r));
                }
            });
        }
    });
}
 
module.exports = !global.ZeresPluginLibrary ? Dummy : (([Plugin, Api]) => {
     const plugin = (Plugin, Library) => {
    const {Logger} = Library;

    let hostname;
    let lcExec;
    let delay;
    let currentChannelId;

    const countdown = 10000;
    const maxPingValue = 250;

    const { DiscordModules, WebpackModules } = Library;
    const { SelectedChannelStore: {getVoiceChannelId}, ChannelActions} = DiscordModules;
    const Dispatcher = WebpackModules.getByProps('dispatch', 'register');

    return class DAR extends Plugin{
        constructor(props){
            super(props);
            this.sp = this.getPing.bind(this);
            this.connected = this.connected.bind(this);
        }

        connected(e) {
            if (e.state === "RTC_CONNECTED" && !e.hasOwnProperty('streamKey')){
                if (currentChannelId == undefined) currentChannelId = getVoiceChannelId();
                if (getVoiceChannelId() != currentChannelId) currentChannelId = getVoiceChannelId();
                hostname = `wss://${e.hostname}`;
                BdApi.showToast(`Connected to ${hostname}.`);
                lcExec = Date.now();
                Dispatcher.subscribe('RTC_CONNECTION_PING', this.getPing);
            }
            if (e.state === "RTC_DISCONNECTED" && !e.hasOwnProperty('streamKey')){
                BdApi.showToast(`Disconnected from ${hostname}`);
                Dispatcher.unsubscribe('RTC_CONNECTION_PING', this.getPing);
            }
        }
        getPing(e){          
            delay = e.pings.slice(-1)[0].value;
            Logger.info(`Echo ${hostname}: ${delay}`);
            if (delay >= maxPingValue){
                new DAR().leaveCall();
            }
        }
  
        leaveCall(){                   
            if (Date.now() - lcExec < countdown) return;
            currentChannelId = getVoiceChannelId();
            ChannelActions.disconnect();
            setTimeout(this.joinCall, 1000);
        }
        joinCall(){ 
            ChannelActions.selectVoiceChannel(currentChannelId);
        }
        
        onStart(){       
            Dispatcher.subscribe('RTC_CONNECTION_STATE', this.connected);
        }
        onStop(){
            Dispatcher.unsubscribe('RTC_CONNECTION_STATE', this.connected);
            Dispatcher.unsubscribe('RTC_CONNECTION_PING', this.getPing);
        }

    }

};
     return plugin(Plugin, Api);
})(global.ZeresPluginLibrary.buildPlugin(config));
/*@end@*/