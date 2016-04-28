/* retroarch-playlist-builder.js v20160427 - Marc Robledo 2016 - http://www.marcrobledo.com/license */

/* SYSTEMS */
var SYSTEMS=[
	{
		id:'custom',
		playlistName:'Custom',
		cores:[]
	},{
		id:'a2600',
		playlistName:'Atari - 2600',
		cores:[
			{id:'stella',name:'Stella'}
		]
	},{
		id:'a7800',
		playlistName:'Atari - 7800',
		cores:[
			{id:'prosystem',name:'ProSystem'}
		]
	},{
		id:'nes',
		playlistName:'Nintendo - Nintendo Entertainment System',
		cores:[
			{id:'fceumm',name:'FCEUmm'}
		]
	},{
		id:'snes',
		playlistName:'Nintendo - Super Nintendo Entertainment System',
		cores:[
			{id:'snes9x',name:'Snes9x'}
		]
	},{
		id:'vb',
		playlistName:'Nintendo - Virtual Boy',
		cores:[
			{id:'mednafen_vb',name:'Mednafen/Beetle VB'}
		]
	},{
		id:'n64',
		playlistName:'Nintendo - Nintendo 64',
		cores:[
			{id:'mupen64plus',name:'Mupen64Plus'}
		]
	},{
		id:'gb',
		playlistName:'Nintendo - Game Boy',
		cores:[
			{id:'gambatte',name:'Gambatte'}
		]
	},{
		id:'gbc',
		playlistName:'Nintendo - Game Boy Color',
		cores:[
			{id:'gambatte',name:'Gambatte'}
		]
	},{
		id:'gba',
		playlistName:'Nintendo - Game Boy Advance',
		cores:[
			{id:'mgba',name:'mGBA'}
		]
	},{
		id:'sms',
		playlistName:'Sega - Master System - Mark III',
		cores:[
			{id:'genesis_plus_gx',name:'Genesis Plus GX'}
		]
	},{
		id:'smd',
		playlistName:'Sega - Mega Drive - Genesis',
		cores:[
			{id:'genesis_plus_gx',name:'Genesis Plus GX'}
		]
	},{
		id:'gg',
		playlistName:'Sega - Game Gear',
		cores:[
			{id:'genesis_plus_gx',name:'Genesis Plus GX'}
		]
	},{
		id:'ngp',
		playlistName:'SNK - Neo Geo Pocket',
		cores:[
			{id:'mednafen_ngp',name:'Mednafen/Beetle NeoPop'}
		]
	},{
		id:'ngpc',
		playlistName:'SNK - Neo Geo Pocket Color',
		cores:[
			{id:'mednafen_ngp',name:'Mednafen/Beetle NeoPop'}
		]
	}
];
var VALID_EXTENSIONS_REGEX=/\.(a26|a78|bin|cue|fig|gb|gba|gbc|gg|iso|n64|nds|nes|ngc|ngp|ngpc|rom|sfc|smc|smd|sms|v64|vb|z64|zip)$/i;




/* shortcuts */
function addEvent(e,ev,f){e.addEventListener(ev,f,false)}
function el(e){return document.getElementById(e)}
function show(e){el(e).style.display='block'}
function hide(e){el(e).style.display='none'}
function createSpan(t,c){var s=document.createElement('span');s.innerHTML=t;if(c)s.className=c;return s}

/* variables */
var loadingQueue=0,fileCounter,items,customConfig={paths:{}};


function closeBlock(b){
	el('block-'+b).className+=' closed';
	window.setTimeout(function(){document.body.removeChild(el('block-'+b))}, 1000);
}


function getSelectedCorePath(){
	for(var i=0;i<3;i++)
		if(el('radio-corepath'+i).checked)
			return el('radio-corepath'+i).value;
	el('radio-corepath0').value
}

function getSelectedSystem(){
	return SYSTEMS[el('select-system').value];
}

function getDefaultSystemPath(s){
	if(el('radio-corepath1').checked || el('radio-corepath2').checked){
		if(s.id=='custom'){
			return './roms/';
		}else{
			return './roms/'+s.id+'/';
		}
	}else{
		if(s.id=='custom'){
			return '.\\roms\\';
		}else{
			return '.\\roms\\'+s.id+'\\';
		}
	}
}


/* Item class */
function createLi(item){
	/* create li */
	item.li=document.createElement('li');
	item.li.className='text-ellipsis';
	item.liName=createSpan(item.name);
	item.li.appendChild(item.liName);

	if(!item.systemId){
		for(var i=0;i<SYSTEMS.length && !item.systemId;i++){
			for(var j=0;j<SYSTEMS[i].cores && !item.systemId;j++){
				if(item.core.indexOf(SYSTEMS[i].cores[j].id)>=0)
					item.systemId=SYSTEMS[i].id
			}
		}
	}

	var coreTag;
	if(item.core=='DETECT'){
		coreTag='(auto)';
	}else{
		coreTag=item.systemId;
	}


	addEvent(item.li,'click',function(){
		el('span-info-file').innerHTML=item.file;
		el('span-info-name').innerHTML=item.name;
		el('span-info-core').innerHTML=item.core;
		el('span-info-corename').innerHTML=item.coreName;
		el('span-info-crc').innerHTML=item.crc;
		MarcDialogs.open('info');
	});
	item.li.appendChild(createSpan(coreTag, 'core core-'+item.systemId));

	/* add to playlist */
	items.push(item);
}


function saveConfig(){if(localStorage)localStorage.setItem('customConfig',JSON.stringify(customConfig))}
function loadConfig(){
	if(localStorage && localStorage.customConfig)
		customConfig=JSON.parse(localStorage.customConfig)

	if(customConfig.corePath)
		el('radio-corepath'+customConfig.corePath).checked=true;

	if(customConfig.tweaks)
		for(var i=0;i<3;i++)
			if(customConfig.tweaks[i])
				el('checkbox-tweak'+i).checked=true;
}

function changePath(){
	var val=el('input-path').value;
	if(val){
		/* fix path */
		if(/\//.test(val) && !/\/$/.test(val))
			val=val+'/'
		else if(!/\//.test(val) && !/\\$/.test(val))
			val=val+'\\'
	}else{
		val=getDefaultSystemPath(getSelectedSystem());
	}
	el('input-path').value=val;
	customConfig.paths[getSelectedSystem().id]=val;

	saveConfig();
}

function changeSystem(){
	var system=getSelectedSystem();

	if(customConfig.paths[system.id]){
		el('input-path').value=customConfig.paths[system.id];
	}else{
		el('input-path').value=getDefaultSystemPath(system);
	}

	while(el('select-core').children[0]){
		el('select-core').removeChild(el('select-core').children[0]);
	}
	var option=document.createElement('option');
	option.value=-1;
	option.innerHTML='(autodetect)';
	el('select-core').appendChild(option);
	for(var i=0;i<system.cores.length;i++){
		var option=document.createElement('option');
		option.value=i;
		option.innerHTML=system.cores[i].name;
		el('select-core').appendChild(option);
	}
	if(system.cores[0])
		el('select-core').value=0;
}



function resetItems(){
	items=new Array();
	while(el('items').children[0])
		el('items').removeChild(el('items').children[0]);

	hide('row-items');
	show('drop-message');
}



function exportAsFile(type){
	if(!items[0])
		return false;

	


	var lplFileName=getSelectedSystem().playlistName+'.lpl';


	var text='';
	for(var i=0;i<items.length;i++){
		text+=items[i].file+items[i].compressed+'\n';
		text+=items[i].name+'\n';
		text+=items[i].core+'\n';
		text+=items[i].coreName+'\n';
		text+=(i)+'|crc\n';
		text+=lplFileName+'\n';
	}

	//console.log(text);
	var blob=new Blob([text], {type: 'application/octet-stream;charset=utf-8'});
	saveAs(blob, lplFileName);
}


/* event for reading text from .lpl files */
var fr=new FileReader();
fr.onload=function(e){
	var lines=e.target.result.replace(/\r\n?/g,'\n').split('\n');
	for(var i=0;i<lines.length;i+=6){
		if(!lines[i])
			continue;

		var file,compressed;
		if(lines[i].indexOf('#')>0){
			var c=lines[i].indexOf('#');
			file=lines[i].substr(0,c);
			compressed=lines[i].substr(c);
		}else{
			file=lines[i];
			compressed='';
		}
		var item={
			file:file,
			compressed:compressed,
			name:lines[i+1],
			core:lines[i+2],
			coreName:lines[i+3],
			crc:lines[i+4],
			lastLine:lines[i+5]
		};
		createLi(item);
	}

	loadingQueue--;
	refreshList();
}



/* initialize everything! */
addEvent(window,'load',function(){
	loadConfig();

	/* build systems <select> */
	for(var i=0;i<SYSTEMS.length;i++){
		var option=document.createElement('option');
		option.value=i;
		option.innerHTML=SYSTEMS[i].playlistName;
		el('select-system').appendChild(option);
	}


	/* initialize */
	resetItems();
	changeSystem();


	/* add drag and drop zone */
	MarcDragAndDrop.addGlobalZone(function(droppedFiles){
		
		for(var i=0; i<droppedFiles.length; i++){
			if(/\.lpl$/.test(droppedFiles[i].name)){ /* read lpl playlist */
				loadingQueue++;
				fr.readAsText(droppedFiles[i]);
			}else if(VALID_EXTENSIONS_REGEX.test(droppedFiles[i].name)){ /* add items */
				var fileName=droppedFiles[i].name;

				var core,coreName;
				if(el('select-core').value==-1){
					core='DETECT';
					coreName='DETECT';
				}else{
					core=getSelectedCorePath().replace('%s', getSelectedSystem().cores[el('select-core').value].id);
					coreName=getSelectedSystem().cores[el('select-core').value].name;
				}

				var item={
					file:el('input-path').value+fileName,
					compressed:'',
					name:fileName.replace(/\.\w+$/i,''),
					core:core,
					coreName:coreName,
					systemId:getSelectedSystem().id,
					crc:'00000000|crc',
					lastLine:''
				}
				createLi(item);
			}
		}

		refreshList();
	}, 'Drop items here');
});


function tweak(){
	MarcDialogs.close();

	
	if(el('checkbox-tweak0').checked)
		tweakGoodNames();

	if(el('checkbox-tweak1').checked)
		tweakRemoveDupes();

	if(el('checkbox-tweak2').checked)
		tweakSort();

	if(el('checkbox-tweak0').checked || el('checkbox-tweak1').checked || el('checkbox-tweak2').checked)
	refreshList();

	customConfig.tweaks=[
		el('checkbox-tweak0').checked,
		el('checkbox-tweak1').checked,
		el('checkbox-tweak2').checked
	]
	saveConfig();
}

/* fix GoodNames */
function tweakGoodNames(){
	for(var i=0;i<items.length;i++){
		items[i].name=items[i].name.replace(/(\[(!|C|c)\]|\(M\d\))/g,'');
		items[i].name=items[i].name.replace(' (J)',' (Japan)');
		items[i].name=items[i].name.replace(' (U)',' (USA)');
		items[i].name=items[i].name.replace(' (E)',' (Europe)');
		items[i].name=items[i].name.replace(' (W)',' (World)');
		items[i].name=items[i].name.replace(' (JUE)',' (World)');
		items[i].name=items[i].name.replace(' (JU)',' (Japan/USA)');
		items[i].name=items[i].name.replace(' (UE)',' (USA/Europe)');
		items[i].name=items[i].name.replace(/ +$/,'');
		items[i].liName.innerHTML=items[i].name;
	}
}

function tweakSort(){items=items.sort(sortByCleanName)}
function sortByCleanName(a,b){
    if(a.name.toLowerCase()<b.name.toLowerCase())
		return -1;
    if(a.name.toLowerCase()>b.name.toLowerCase())
		return 1;
    return 0
}

/* remove duplicates, try always to keep ones with CRC */
function tweakRemoveDupes(){
	for(var i=0;i<items.length;i++){
		for(var j=i+1;j<items.length;j++){
			if(items[i].file==items[j].file){
				if(items[i].crc=='00000000|crc'){
					items[i].crc=items[j].crc;
				}
				items.splice(j,1);
			}
		}
	}
}

function refreshList(){
	if(loadingQueue)
		return false;

	while(el('items').children[0]){
		el('items').removeChild(el('items').children[0]);
	}

	for(var i=0;i<items.length;i++){
		el('items').appendChild(items[i].li);
	}

	if(items[0]){
		show('row-items');
		hide('drop-message');
	}
}


/* FileSaver.js (2014-01-24) - A saveAs() FileSaver implementation - by Eli Grey, http://eligrey.com - License: X11/MIT, see LICENSE.md */
var saveAs=saveAs||typeof navigator!=="undefined"&&navigator.msSaveOrOpenBlob&&navigator.msSaveOrOpenBlob.bind(navigator)||function(e){"use strict";if(typeof navigator!=="undefined"&&/MSIE [1-9]\./.test(navigator.userAgent)){return}var t=e.document,n=function(){return e.URL||e.webkitURL||e},r=e.URL||e.webkitURL||e,i=t.createElementNS("http://www.w3.org/1999/xhtml","a"),s=!e.externalHost&&"download"in i,o=function(n){var r=t.createEvent("MouseEvents");r.initMouseEvent("click",true,false,e,0,0,0,0,0,false,false,false,false,0,null);n.dispatchEvent(r)},u=e.webkitRequestFileSystem,a=e.requestFileSystem||u||e.mozRequestFileSystem,f=function(t){(e.setImmediate||e.setTimeout)(function(){throw t},0)},l="application/octet-stream",c=0,h=[],p=function(){var e=h.length;while(e--){var t=h[e];if(typeof t==="string"){r.revokeObjectURL(t)}else{t.remove()}}h.length=0},d=function(e,t,n){t=[].concat(t);var r=t.length;while(r--){var i=e["on"+t[r]];if(typeof i==="function"){try{i.call(e,n||e)}catch(s){f(s)}}}},v=function(r,o){var f=this,p=r.type,v=false,m,g,y=function(){var e=n().createObjectURL(r);h.push(e);return e},b=function(){d(f,"writestart progress write writeend".split(" "))},w=function(){if(v||!m){m=y(r)}if(g){g.location.href=m}else{window.open(m,"_blank")}f.readyState=f.DONE;b()},E=function(e){return function(){if(f.readyState!==f.DONE){return e.apply(this,arguments)}}},S={create:true,exclusive:false},x;f.readyState=f.INIT;if(!o){o="download"}if(s){m=y(r);t=e.document;i=t.createElementNS("http://www.w3.org/1999/xhtml","a");i.href=m;i.download=o;var T=t.createEvent("MouseEvents");T.initMouseEvent("click",true,false,e,0,0,0,0,0,false,false,false,false,0,null);i.dispatchEvent(T);f.readyState=f.DONE;b();return}if(e.chrome&&p&&p!==l){x=r.slice||r.webkitSlice;r=x.call(r,0,r.size,l);v=true}if(u&&o!=="download"){o+=".download"}if(p===l||u){g=e}if(!a){w();return}c+=r.size;a(e.TEMPORARY,c,E(function(e){e.root.getDirectory("saved",S,E(function(e){var t=function(){e.getFile(o,S,E(function(e){e.createWriter(E(function(t){t.onwriteend=function(t){g.location.href=e.toURL();h.push(e);f.readyState=f.DONE;d(f,"writeend",t)};t.onerror=function(){var e=t.error;if(e.code!==e.ABORT_ERR){w()}};"writestart progress write abort".split(" ").forEach(function(e){t["on"+e]=f["on"+e]});t.write(r);f.abort=function(){t.abort();f.readyState=f.DONE};f.readyState=f.WRITING}),w)}),w)};e.getFile(o,{create:false},E(function(e){e.remove();t()}),E(function(e){if(e.code===e.NOT_FOUND_ERR){t()}else{w()}}))}),w)}),w)},m=v.prototype,g=function(e,t){return new v(e,t)};m.abort=function(){var e=this;e.readyState=e.DONE;d(e,"abort")};m.readyState=m.INIT=0;m.WRITING=1;m.DONE=2;m.error=m.onwritestart=m.onprogress=m.onwrite=m.onabort=m.onerror=m.onwriteend=null;e.addEventListener("unload",p,false);g.unload=function(){p();e.removeEventListener("unload",p,false)};return g}(typeof self!=="undefined"&&self||typeof window!=="undefined"&&window||this.content);if(typeof module!=="undefined"&&module!==null){module.exports=saveAs}else if(typeof define!=="undefined"&&define!==null&&define.amd!=null){define([],function(){return saveAs})}

/* MarcDragAndDrop.js */
MarcDragAndDrop=function(){function e(e,n,t){/MSIE 8/.test(navigator.userAgent)?e.attachEvent("on"+n,t):e.addEventListener(n,t,!1)}function n(e){if(e.dataTransfer.types)for(var n=0;n<e.dataTransfer.types.length;n++)if("Files"===e.dataTransfer.types[n])return!0;return!1}function t(){document.body.className=document.body.className.replace(" dragging-files","")}var a=function(e){"undefined"!=typeof e.stopPropagation?e.stopPropagation():e.cancelBubble=!0,e.preventDefault?e.preventDefault():e.returnValue=!1};return e(document,"dragenter",function(e){n(e)&&(a(e),document.body.className+=" dragging-files")}),e(document,"dragexit",function(e){a(e),t(),t(),t(),t()}),e(document,"dragover",function(e){n(e)&&a(e)}),{add:function(r,o){e(document.querySelector(r),"drop",function(e){return n(e)?(a(e),t(),void o(e.dataTransfer.files)):!1})},addGlobalZone:function(e,n){var t=document.createElement("div");t.id="drop-overlay",t.className="marc-drop-files";var a=document.createElement("span");n?a.innerHTML=n:a.innerHTML="Drop files here",t.appendChild(a),document.body.appendChild(t),this.add("#drop-overlay",e)}}}();

/* MarcDialogs.js */
MarcDialogs=function(){function e(e,t,n){a?e.attachEvent("on"+t,n):e.addEventListener(t,n,!1)}function t(){s&&(s.className="dialog",c.className="dialog-overlay",o&&history.replaceState({myTag:!0},null,null),s=null)}function n(e){for(var t=0;t<s.dialogElements.length;t++){var n=s.dialogElements[t];if("INPUT"===n.nodeName&&"hidden"!==n.type||"INPUT"!==n.nodeName)return n.focus(),!0}return!1}function l(){s&&(s.style.marginLeft="-"+s.offsetWidth/2+"px",s.style.marginTop="-"+s.offsetHeight/2-30+"px")}var a=/MSIE 8/.test(navigator.userAgent),o=navigator.userAgent.match(/Android|webOS|iPhone|iPad|iPod|BlackBerry|Windows Phone/i)&&"function"==typeof history.pushState,i=["Cancel","Accept"],s=null,c=document.createElement("div");c.className="dialog-overlay",c.style.position="fixed",c.style.top="0",c.style.left="0",c.style.width="100%",c.style.height="100%",c.style.zIndex=8e3,e(c,"click",t),e(window,"load",function(){document.body.appendChild(c),o&&history.replaceState({myTag:!0},null,null)}),e(window,"resize",l),o&&e(window,"popstate",function(e){e.state.myTag&&s&&(MarcDialogs.close(),history.pushState({myTag:!1},null,null))}),e(document,"keydown",function(e){s&&(27==e.keyCode?(e.preventDefault?e.preventDefault():e.returnValue=!1,t()):9==e.keyCode&&s.dialogElements[s.dialogElements.length-1]==document.activeElement&&(e.preventDefault?e.preventDefault():e.returnValue=!1,n()))});var d=null,u=null,r=null;return{open:function(e){s&&(s.className="dialog"),c.className="dialog-overlay active",s="string"==typeof e?document.getElementById("dialog-"+e):e,s.className="dialog active",s.style.position="fixed",s.style.top="50%",s.style.left="50%",s.style.zIndex=8001,o&&history.pushState({myTag:!1},null,null),s.dialogElements||(s.dialogElements=s.querySelectorAll("input,textarea,select")),n(),l(s),l(s)},close:t,alert:function(t){if(!d){d=document.createElement("div"),d.id="dialog-quick-alert",d.className="dialog",d.msg=document.createElement("div"),d.msg.style.textAlign="center",d.appendChild(d.msg),d.buttons=document.createElement("div"),d.buttons.className="buttons";var n=document.createElement("input");n.type="button",n.className="button",n.value=i[1],e(n,"click",this.close),d.buttons.appendChild(n),d.appendChild(d.buttons),document.body.appendChild(d)}d.msg.innerHTML=t,MarcDialogs.open("quick-alert")},confirm:function(t,n){if(!u){u=document.createElement("div"),u.id="dialog-quick-confirm",u.className="dialog",u.msg=document.createElement("div"),u.msg.style.textAlign="center",u.appendChild(u.msg),u.buttons=document.createElement("div"),u.buttons.className="buttons";var l=document.createElement("input");l.type="button",l.className="button",l.value=i[0],e(l,"click",this.close),u.buttons.appendChild(l);var a=document.createElement("input");a.type="button",a.className="button button-accept",a.value=i[1],e(a,"click",function(){r()}),u.buttons.appendChild(a),u.appendChild(u.buttons),document.body.appendChild(u)}r=n,u.msg.innerHTML=t,MarcDialogs.open("quick-confirm")}}}();

/* MarcStringCleaner.js */
var _STR_CLEAN=['a',/[\xc0\xc1\xc2\xc4\xe0\xe1\xe2\xe4]/g,'e',/[\xc8\xc9\xca\xcb\xe8\xe9\xea\xeb]/g,'i',/[\xcc\xcd\xce\xcf\xec\xed\xee\xef]/g,'o',/[\xd2\xd3\xd4\xd6\xf2\xf3\xf4\xf6]/g,'u',/[\xd9\xda\xdb\xdc\xf9\xfa\xfb\xfc]/g,'n',/[\xd1\xf1]/g,'c',/[\xc7\xe7]/g,'ae',/[\xc6\xe6]/g,'and',/\x26/g,'euro',/\u20ac/g,'',/[^\w- ]/g,'_',/( |-)/g,'_',/_+/g,'',/^_|_$/g];
if(!String.prototype.clean)String.prototype.clean=function(){var s=this.toLowerCase();for(var i=0;i<_STR_CLEAN.length;i+=2)s=s.replace(_STR_CLEAN[i+1],_STR_CLEAN[i]);return s}
