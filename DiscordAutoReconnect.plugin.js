/**
 * @name DiscordAutoReconnect
 * @description A plugin that allows you to automatically reconnect to a voice channel. Uncompatible with "Platform Indicators v1.4.2".
 * @version 1.4.2
 * @author Omnom Metkij
 * @authorId 817410117049384990
 * @authorLink https://github.com/OmnomMetkij/-Discord-AutoReconnect
 * @website https://www.youtube.com/watch?v=dQw4w9WgXcQ
 * @source https://raw.githubusercontent.com/OmnomMetkij/-Discord-AutoReconnect/main/DiscordAutoReconnect.plugin.js
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
    authorLink: "https://github.com/OmnomMetkij/-Discord-AutoReconnect",
    version: "1.4.2",
    description: "A plugin that allows you to automatically reconnect to a voice channel. Uncompatible with \"Platform Indicators v1.4.2\".",
    website: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    source: "https://raw.githubusercontent.com/OmnomMetkij/-Discord-AutoReconnect/main/DiscordAutoReconnect.plugin.js",
    patreon: "",
    donate: "",
    invite: "",
    changelog: [
        {
            title: "Whats new?",
            items: [
                "Some display options"
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

    let conn;
    let hostname;
    let lcExec;
    let lastVoice;
    let pingTimer;

    const countdown = 10000;
    const maxPingValue = 250;
    const pingCheckInterval = 5500;

    const { DiscordModules, WebpackModules } = Library;
    const { SelectedChannelStore: {getVoiceChannelId}, MediaInfo, MessageActions: {sendBotMessage} } = DiscordModules;
    const Dispatcher = WebpackModules.getByProps('dispatch', 'register');
    const RTCConnection = WebpackModules.getByProps('getHostname', 'getRTCConnection', 'getAveragePing', 'getQuality');

    return class DAR extends Plugin{
        constructor(props){
            super(props);
            this.getPing = this.getPing.bind(this);
            this.connected = this.connected.bind(this);
        }

        checkUpdate(){
            const plugin = BdApi.Plugins.get("DiscordAutoReconnect");
            const handleUpdate = (v) => {
                const fs = require('fs');
                if (v != plugin.version){
                    BdApi.showConfirmationModal('DAR update', `A new update ${v} for DiscordAutoReconnect`, {
                        confirmText: 'Download',
                        cancelText: 'Cancel',
                        onConfirm: () => {
                            fetch(plugin.source)
                            .then(e => e.text())
                            .then(e => fs.writeFile(require("path").join(BdApi.Plugins.folder, `${plugin.name}.plugin.js`), e));
                        }
                    });
                    
                }
            }
            
            fetch('https://raw.githubusercontent.com/OmnomMetkij/-Discord-AutoReconnect/main/version.txt')
            .then(e => e.text())
            .then(e => e.replace('\n', ''))
            .then(e => handleUpdate(e));
            
        }

        connected(e) {
            if (e.state === "RTC_CONNECTED" && !e.hasOwnProperty('streamKey')){
                lastVoice = getVoiceChannelId();
                conn = RTCConnection.getRTCConnection();
                hostname = conn.hostname;

                lcExec = Date.now();
                pingTimer = setInterval(this.getPing, pingCheckInterval);

                BdApi.showToast(`Connected to ${hostname}.`, {type:'info'});
                sendBotMessage(lastVoice, `Endpoint: ${conn._endpoint}/${conn.port}\nChannel id: ${conn._channelId}\nGuild id: ${conn.guildId}`);
            }
            
            if (e.state === "RTC_DISCONNECTED" && !e.hasOwnProperty('streamKey')){
                clearInterval(pingTimer);
                BdApi.showToast(`Disconnected from ${hostname}`, {type:'info'});
            }
        };

        getPing(){
            if (conn.getLastPing()){
                if (conn.getLastPing() >= maxPingValue && !MediaInfo.isMute() && Date.now() - lcExec > countdown){
                    return this.doReconnect();
                }
            }else{
                BdApi.showNotice('[DAR] Failed to get ping. Try to reconnect to the channel.', {type:'error'});
                clearInterval(pingTimer);
                return;
            }
        }

        doReconnect(){
            conn.reconnect();
        }

        onStart(){   
            this.checkUpdate();     
            Dispatcher.subscribe('RTC_CONNECTION_STATE', this.connected);
        }
        onStop(){
            Dispatcher.unsubscribe('RTC_CONNECTION_STATE', this.connected);
            clearInterval(pingTimer);
        }

    }

};
     return plugin(Plugin, Api);
})(global.ZeresPluginLibrary.buildPlugin(config));
/*@end@*/