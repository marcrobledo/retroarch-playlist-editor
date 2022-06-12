/* Retroarch Playlist Editor v20220612 - Marc Robledo 2016-2022 - http://www.marcrobledo.com/license */
/* shortcuts */
function show(e){el(e).style.display='block'}
function hide(e){el(e).style.display='none'}
function empty(e){el(e).innerHTML=''}
function addEvent(e,ev,f){e.addEventListener(ev,f,false)}
function stopPropagation(e){if(typeof e.stopPropagation!=='undefined')e.stopPropagation();else e.cancelBubble=true}
function preventDefault(e){if(e.preventDefault)e.preventDefault();else e.returnValue=false}
function el(e){return document.getElementById(e)}
/* constants */
var REGEX_IGNORE_EXTENSIONS=/\.(jpe?g|png|gif|webp|bmp|avi|mp4|mp3|wav|srm|sav|eep|mcr|flash|pdf|txt|rtf|docx?|xlsx|diz|html?|css|js)$/i;
var ADDITIONAL_JSON_PROPERTIES_ORDER=[
	'version',
	'default_core_path',
	'default_core_name',
	'label_display_mode',
	'right_thumbnail_mode',
	'left_thumbnail_mode',
	'sort_mode',
	'scan_content_dir',
	'scan_file_exts',
	'scan_dat_file_path',
	'scan_search_recursively',
	'scan_search_archives',
	'scan_filter_dat_content'
];
/* variables */
var currentPlaylist;
var loadedDatabases={};
var lplQueueCount=0;
var suggestedPathsCommon=[];




/* service worker */
const FORCE_HTTPS=true;
if(FORCE_HTTPS && location.protocol==='http:')
	location.href=window.location.href.replace('http:','https:');
else if(location.protocol==='https:' && 'serviceWorker' in navigator && window.location.hostname==='www.marcrobledo.com')
	navigator.serviceWorker.register('/retroarch-playlist-editor/_cache_service_worker.js', {scope: '/retroarch-playlist-editor/'});












/* string manipulation */
function fixString(string){
	return string.trim().replace(/[\n\r\t]/g,'').replace(/\\+'/g, '\'').replace(/\\+"/g, '\"');
}
function fixStringPath(string){
	var path=fixString(string);
	if(checkIfWindowsSystem(path)){
		path=path.replace(/\//g, '\\');
		if(!/\\$/.test(path))
			path+='\\';
	}else{
		path=path.replace(/\\/g, '/');
		if(!/\/$/.test(path))
			path+='/';
	}
	
	return path;
}
function getFileExtension(string){
	var match=string.trim().match(/\.\S+$/);
	return match? match[0].replace('.',''):'';
}
function escapeJSON(str){
	return str.replace(/"/g,'\\"').replace(/\\/g,'\\\\');
}




function createThSorter(label, playlist, criteria){
	var spanTh=document.createElement('span');
	spanTh.reverse=true;
	spanTh.innerHTML=label;
	spanTh.className='clickable';
	addEvent(spanTh, 'click', function(){
		this.reverse=!this.reverse;
		playlist.sortContentBy(criteria, this.reverse);
	});

	var th=document.createElement('th');
	th.appendChild(spanTh);
	return th;
}





function Playlist(name, additionalProperties){
	this.name=name;
	this.unsavedChanges=false;

	this.reset(additionalProperties);
	this.content=[];

	this._table=document.createElement('table');
	this._table.appendChild(document.createElement('thead'));
	this._table.appendChild(document.createElement('tbody'));
	this._table.children[0].appendChild(document.createElement('tr'));
	this._table.children[0].children[0].appendChild(createThSorter('Name', this, 'name'));
	this._table.children[0].children[0].appendChild(createThSorter('Filename', this, 'filename'));
	this._table.children[0].children[0].appendChild(createThSorter('Core', this, 'core'));
	this._table.children[0].children[0].appendChild(createThSorter('CRC', this, 'crc'));
	
	this.dataTable=MarcDataTable.enable(this._table, this.content);
	this.dataTable._playlist=this;
	this.dataTable.enableDragAndDrop(true);
	this.dataTable.onSelect=function(selectedElements, selectedIndexes){
		if(selectedElements.length){
			refreshEditBalloon(this._playlist, selectedElements);

			if(UI.automaticEditBalloon)
				UI.showBalloon('edit');
		}else{
			refreshEditBalloon(this._playlist, []);
			UI.hideBalloon('edit');
		}
	}
	this.dataTable.onChange=function(changedElements, action){
		if(this.getLength()>5){
			hide('drop-message');
		}else{
			show('drop-message');
		}
	};
}
Playlist.prototype.reset=function(additionalProperties){
	this.name='My playlist';

	this.additionalProperties={
		'version':'1.0'/*,
		'version':'1.5',
		'default_core_path':'',
		'default_core_name':'',
		'label_display_mode':0,
		'right_thumbnail_mode':0,
		'left_thumbnail_mode':0,
		'sort_mode':0*/
	};
	if(additionalProperties){
		for(var prop in additionalProperties){
			this.additionalProperties[prop]=additionalProperties[prop];
		}
	}

	if(this.dataTable && this.dataTable.getLength())
		this.dataTable.empty();
}
Playlist.prototype.addContent=function(newContent){
	var newContentNoDupes=[];
	for(var i=0; i<newContent.length; i++){
		var dupe=false;
		for(var j=0; j<this.content.length && !dupe; j++){
			if(this.content[j].file===newContent[i].file)
				dupe=true;
		}
		
		if(!dupe)
			newContentNoDupes.push(newContent[i]);
	}

	this.dataTable.add(newContentNoDupes);
}
Playlist.prototype.sortContentBy=function(criteria, reverse){
	if(criteria==='name')
		this.dataTable.sort(_sortContentByName, reverse);
	else if(criteria==='filename')
		this.dataTable.sort(_sortContentByPath, reverse);
	else if(criteria==='core')
		this.dataTable.sort(_sortContentByCore, reverse);
	else if(criteria==='crc')
		this.dataTable.sort(_sortContentByCrc, reverse);
}


Playlist.prototype.massiveContentRename=function(content, renameFilter){	
	for(var i=0; i<content.length; i++)
		content[i].setName(renameFilter(content[i]), true);

	this.unsavedChanges=true;
}
Playlist.prototype.setContentCore=function(content, newCore){
	for(var i=0; i<content.length; i++)
		content[i].setCore(newCore, knownCoreNames[newCore], true);

	this.unsavedChanges=true;
}
Playlist.prototype.setContentPath=function(content, newPath){
	for(var i=0; i<content.length; i++)
		content[i].setPath(newPath, true);
	
	this.unsavedChanges=true;
}
Playlist.prototype.setContentDatabase=function(content, newDatabase){
	for(var i=0; i<content.length; i++){
		content[i].setDatabaseName(newDatabase, true);
		if(/(MAME|Arcade Games)/.test(newDatabase) && content[i].name.replace(/\.\w+$/, '')===content[i].file.replace(/\.\w+$/, '')){
			var guessedName=content[i].guessNameFromDatabase();
			if(guessedName){
				content[i].setName(guessedName, true);
				
				if(content.length===1)
					el('input-content-name').value=content[0].name;
			}
		}
		var guessedCrc=content[i].guessCrcFromDatabase();
		if(guessedCrc)
			content[i].setCrc(guessedCrc, true);
	}

	this.unsavedChanges=true;
}
Playlist.prototype.getContentPaths=function(){
	var contentPathsCount={};
	var contentPaths=[];
	for(var i=0; i<this.content.length; i++){
		if(contentPaths.indexOf(this.content[i].path)===-1){
			contentPaths.push(this.content[i].path);
			contentPathsCount[this.content[i].path]=1;
		}else{
			contentPathsCount[this.content[i].path]++;
		}
	}
	return contentPaths.sort(function(a,b){
		return contentPathsCount[b] - contentPathsCount[a]
	});
}
Playlist.prototype.export=function(legacyMode){
	var text='';
	var mime;
	if(legacyMode){
		mime='application/octet-stream';

		for(var i=0;i<this.content.length;i++)
			text+=this.content[i].toStringLPL(currentPlaylist);
	}else{
		mime='application/json';
		
		text+='{\n';		
		for(var i=0; i<ADDITIONAL_JSON_PROPERTIES_ORDER.length; i++){
			if(typeof this[ADDITIONAL_JSON_PROPERTIES_ORDER[i]]!='undefined'){
				var val=this[ADDITIONAL_JSON_PROPERTIES_ORDER[i]];
				if(typeof val==='string')
					val='"'+val.replace(/\\/g, '\\\\')+'"';
				text+='	"'+ADDITIONAL_JSON_PROPERTIES_ORDER[i]+'": '+val+',\n';
			}
		}
		
		text+='	"items": [\n';
		for(var i=0;i<this.content.length;i++){
			text+=this.content[i].toStringJSON(currentPlaylist);
			if(i<(this.content.length-1)){
				text=text.replace(/\}\n$/,'},\n');
			}
		}
		text+='	]\n';
		text+='}\n';
		
		text=text.replace(/\t/g, '  ');
	}


	var blob=new Blob([text], {type: mime+';charset=utf-8'});
	saveAs(blob, this.name+'.lpl');
	this.unsavedChanges=false;
}


function _sortContentByName(a,b){
	return a.name.localeCompare(b.name, 'en', {sensitivity: 'base'})
}
function _sortContentByPath(a,b){
	return (a.path+a.file+(a.compressed || '')).localeCompare(b.path+b.file+(b.compressed || ''), 'en', {sensitivity: 'base'})
}
function _sortContentByCore(a,b){
	if((a.coreName || '0').toLowerCase()<(b.coreName || '0').toLowerCase())
		return -1;
	if((a.coreName || '0').toLowerCase()>(b.coreName || '0').toLowerCase())
		return 1;
	return 0
}
function _sortContentByCrc(a,b){
	if((a.crc || '00000000').toLowerCase()<(b.crc || '00000000').toLowerCase())
		return -1;
	if((a.crc || '00000000').toLowerCase()>(b.crc || '00000000').toLowerCase())
		return 1;
	return 0
}




function rebuildSelectCore(playlist){
	var newCores=0;
	if(playlist){
		for(var i=0; i<playlist.content.length; i++){
			if(playlist.content[i].coreFile && !knownCoreNames[playlist.content[i].coreFile]){
				knownCoreNames[playlist.content[i].coreFile]=typeof playlist.content[i].coreName==='string' && playlist.content[i].coreName!=='DETECT'? playlist.content[i].coreName : playlist.content[i].coreFile;
				newCores++;
			}
		}
	}

	if(newCores || !playlist){
		//console.log('refreshing select core');
		var oldValue=el('select-core').value;

		var sortedCores=Object.keys(knownCoreNames).sort(function(a,b){
			return knownCoreNames[a].replace(/^\S+ - /, '') > knownCoreNames[b].replace(/^\S+ - /, '')
		});
		empty('select-core');
		var option=document.createElement('option');
		option.value='';
		option.innerHTML='- Detect -';
		el('select-core').appendChild(option);
		for(var i=0; i<sortedCores.length; i++){
			option=document.createElement('option');
			option.value=sortedCores[i];
			option.innerHTML=knownCoreNames[sortedCores[i]].replace(/^\S+ - /, '');
			el('select-core').appendChild(option);
		}

		el('select-core').value=oldValue;
	}
}

function rebuildSelectContentPaths(playlist){
	//console.log('refreshing select paths');
	var contentPaths=playlist && playlist.dataTable.getLength()? playlist.getContentPaths() : [];
	for(var i=0; i<suggestedPathsCommon.length; i++){
		if(contentPaths.indexOf(suggestedPathsCommon[i])===-1)
			contentPaths.push(suggestedPathsCommon[i]);
	}

	if(!contentPaths.length)
		contentPaths=['c:\\roms\\', '/home/roms/'];

	empty('path-suggestions');
	for(var i=0; i<contentPaths.length && i<20; i++){
		var option=document.createElement('option');
		option.innerHTML=contentPaths[i];
		el('path-suggestions').appendChild(option);
	}
}
function rebuildSelectDatabase(playlist){
	var newDatabases=0;
	if(playlist){
		for(var i=0; i<playlist.content.length; i++){
			if(typeof playlist.content[i].databaseName==='string' && knownDatabases.indexOf(playlist.content[i].databaseName)===-1){
				knownDatabases.push(playlist.content[i].databaseName);
				newDatabases++;
			}
		}
	}else{
		newDatabases=true;
	}

	if(newDatabases){
		//console.log('refreshing select databases');
		var oldValue=el('select-database').value;

		knownDatabases.sort();
		empty('select-database');
		var option=document.createElement('option');
		option.value='';
		option.innerHTML='- None -'
		el('select-database').appendChild(option);
		for(var i=0; i<knownDatabases.length; i++){
			option=document.createElement('option');
			option.value=knownDatabases[i];
			option.innerHTML=knownDatabases[i];
			el('select-database').appendChild(option);
		}

		el('select-database').value=oldValue;
	}
}
function rebuildSelects(playlist){
	rebuildSelectCore(playlist);
	rebuildSelectContentPaths(playlist);
	rebuildSelectDatabase(playlist);
}
function rebuildSelectCorePath(){
	el('select-core-path').innerHTML='<option value="">- none -</option>';

	for(var i=0; i<Settings.myCorePaths.length; i++){
		var option=document.createElement('option');
		option.value=Settings.myCorePaths[i];
		option.innerHTML=Settings.myCorePaths[i];
		el('select-core-path').appendChild(option);
	}
	el('select-core-path').selectedIndex=Settings.myCorePathIndex;
}


function Content(path, label, core_path, core_name, crc32, db_name){
	this.setName(label);
	this.setFilePath(path);
	this.setCore(core_path, core_name);
	this.setCrc(crc32);
	this.setDatabaseName(db_name);
}
Content.prototype._getDataTableCellName=function(){
	return this.name
}
Content.prototype._getDataTableCellFileName=function(){
	if(this.compressed){
		return this.path+this.file+' <span class="compressed-name">&#9656; '+(this.compressed.replace(/\.\w+$/, '')===this.file.replace(/\.\w+$/, '')? getFileExtension(this.compressed) : this.compressed)+'</span>';
	}else{
		return this.path+this.file;
	}
}
Content.prototype._getDataTableCellCore=function(){
	return this.coreName? this.coreName.replace(/^\S+ - /, '') : '-'
}
Content.prototype._getDataTableCellCRC=function(){
	if(this.crc)
		return '<span class="crc crc-true" title="'+this.crc+'"></span>';
	else
		return '<span class="crc crc-false"></span>';
}
Content.prototype.getDataTableCells=function(){
	return [
		this._getDataTableCellName(),
		this._getDataTableCellFileName(),
		this._getDataTableCellCore(),
		this._getDataTableCellCRC(),
	]
}
Content.prototype._toLPL=function(parentPlaylist){
	return [
		this.compressed? this.path+this.file+'#'+this.compressed : this.path+this.file,
		this.name,
		el('select-core-path').selectedIndex && this.coreFile? el('select-core-path').value.replace('*_libretro', this.coreFile) : 'DETECT',
		el('select-core-path').selectedIndex && this.coreFile && this.coreName? this.coreName : 'DETECT',
		this.crc? this.crc+'|'+(/[^0-9a-fA-F]/.test(this.crc)? 'serial':'crc') : '00000000|crc',
		this.databaseName? this.databaseName+'.lpl' : parentPlaylist.name+'.lpl'
	];
}
Content.prototype.toStringLPL=function(parentPlaylist){
	return this._toLPL(parentPlaylist).join('\n')+'\n';
}
Content.prototype.toStringJSON=function(parentPlaylist){
	var lplString=this._toLPL(parentPlaylist);
	var str='		{\n';
	str+='			"path": "'+escapeJSON(lplString[0])+'",\n';
	str+='			"label": "'+escapeJSON(lplString[1])+'",\n';
	str+='			"core_path": "'+escapeJSON(lplString[2])+'",\n';
	str+='			"core_name": "'+escapeJSON(lplString[3])+'",\n';
	str+='			"crc32": "'+escapeJSON(lplString[4])+'",\n';
	str+='			"db_name": "'+escapeJSON(lplString[5])+'"\n';
	str+='		}\n';
	return str;
}
Content.prototype.setName=function(name, refreshCell){
	this.name=fixString(name);

	if(refreshCell)
		this._refreshName()
}
Content.prototype.setFilePath=function(filePath, refreshCell){
	var pathMatch=fixString(filePath).match(/^(.*?)([^\/\\]+)$/);

	this.path=pathMatch[1];
	this.file=pathMatch[2];
	this.compressed=false;
	var isCompressed=this.file.indexOf('#');
	if(isCompressed>4){
		this.compressed=this.file.substr(isCompressed+1);
		this.file=this.file.substr(0,isCompressed);
	}

	if(refreshCell)
		this._refreshPath()
}
Content.prototype.setPath=function(filePath, refreshCell){
	this.path=fixStringPath(filePath);

	if(refreshCell)
		this._refreshPath()
}
Content.prototype.setCore=function(coreFile, coreName, refreshCell){
	if(typeof coreFile==='string' && coreFile.trim()){
		var matches=coreFile.trim().match(/([\w\-]+)_libretro/);
		if(matches){
			this.coreFile=matches[1] + '_libretro';
			if(typeof coreName==='string' && coreName.trim() && coreName!=='DETECT')
				this.coreName=coreName.trim();
			else
				this.coreName=matches[1];
		}else{
			this.coreFile=false;
			this.coreName=false;
		}
	}else{
		this.coreFile=false;
		this.coreName=false;
	}

	if(refreshCell)
		this._refreshCore()
}
Content.prototype.setCrc=function(crc, refreshCell){
	if(typeof crc==='string'){
		crc=crc.trim().replace(/\|.*?$/,'');
		this.crc=crc && crc!=='0' && crc!=='00000000' && crc!=='DETECT' && !/\s/.test(crc)? crc : false;
	}else{
		this.crc=false;
	}

	if(refreshCell)
		this._refreshCrc()
}
Content.prototype.setDatabaseName=function(databaseName, refreshCell){
	if(this.databaseName !== databaseName){
		if(typeof databaseName==='string'){
			databaseName=databaseName.trim().replace(/\.lpl$/i, '');
			this.databaseName=databaseName && databaseName!=='DETECT'? databaseName : false;
		}else{
			this.databaseName=false;
			//this.setCrc(false, refreshCell);
		}
	}
}


Content.prototype._refreshName=function(){
	this._dataTableRow.children[0].innerHTML=this._getDataTableCellName();
}
Content.prototype._refreshPath=function(){
	this._dataTableRow.children[1].innerHTML=this._getDataTableCellFileName();
	if(this.compressed)
		this._dataTableRow.children[1].title=this.path+this.file+'#'+this.compressed;
	else
		this._dataTableRow.children[1].title=this.path+this.file;
}
Content.prototype._refreshCore=function(){this._dataTableRow.children[2].innerHTML=this._getDataTableCellCore();}
Content.prototype._refreshCrc=function(){this._dataTableRow.children[3].innerHTML=this._getDataTableCellCRC();}


Content.prototype._guessFromDatabase=function(){
	if(!this.databaseName || !loadedDatabases[this.databaseName]){
		if(typeof this.databaseName==='string')
			console.warn('trying to guess item from a not loaded database: '+this.databaseName);
		return null;
	}

	var cleanName=(this.compressed || this.file)
			.replace(/\.\S+$/, '')
			//.replace(/ \(v1.(\d)\)/, ' (Rev $1)')
			.replace(' (Rev A)', ' (Rev 1)')
			.replace(' (Rev B)', ' (Rev 2)')
			.replace(/ \(Track \d+\)/, '');

	var guessedItem=loadedDatabases[this.databaseName][cleanName];

	if(!guessedItem)
		guessedItem=loadedDatabases[this.databaseName][cleanName.replace(/( \(.*?\))/, '$1 (Disc 1)')];

	if(!guessedItem)
		guessedItem=loadedDatabases[this.databaseName][cleanName.replace(/( \(.*?\))/, '$1 (Disc 1 of 2)')];

	if(!guessedItem)
		guessedItem=loadedDatabases[this.databaseName][cleanName.replace(/( \(.*?\))/, '$1 (Disc 1 of 3)')];

	if(!guessedItem)
		guessedItem=loadedDatabases[this.databaseName][cleanName.replace(/( \(.*?\))/, '$1 (Disc 1 of 4)')];

	if(!guessedItem)
		guessedItem=loadedDatabases[this.databaseName][cleanName.replace(/( \([A-Z][a-z](,[A-Z][a-z])*\))/, '$1 (Disc 1)')];

	if(!guessedItem)
		guessedItem=loadedDatabases[this.databaseName][cleanName.replace(/( \([A-Z][a-z](,[A-Z][a-z])*\))/, '$1 (Disc 1 of 2)')];

	if(!guessedItem)
		guessedItem=loadedDatabases[this.databaseName][cleanName.replace(/( \([A-Z][a-z](,[A-Z][a-z])*\))/, '$1 (Disc 1 of 3)')];

	if(!guessedItem)
		guessedItem=loadedDatabases[this.databaseName][cleanName.replace(/( \([A-Z][a-z](,[A-Z][a-z])*\))/, '$1 (Disc 1 of 4)')];

	if(!guessedItem && this.crc){
		guessedItem=loadedDatabases[this.databaseName]['crc_'+this.crc.toUpperCase()];
	}

	return guessedItem || null;
}
Content.prototype.guessNameFromDatabase=function(){
	var guessedItem=this._guessFromDatabase();
	if(guessedItem && guessedItem.name)
		return guessedItem.name.replace(/ \(Disc 1\)$/, '');
	return false;
}
Content.prototype.guessCrcFromDatabase=function(refreshCell){
	var guessedItem=this._guessFromDatabase();
	if(guessedItem && guessedItem.crc.length)
		return guessedItem.crc[0]+'|'+(/[^a-fA-F0-9]/.test(guessedItem.crc[0])? 'serial':'crc');
	return false;
}





















/* settings */
var Settings=(function(){
	var LOCALSTORAGE_ID='retroarchPlaylistEditorSettings';

	return{
		version:1,
		myCorePaths:[],
		myCorePathIndex:0,

		load:function(){
			if(typeof localStorage !== 'undefined'){
				try{
					var item=localStorage.getItem(LOCALSTORAGE_ID);
					if(item){
						var parsedSettings=JSON.parse(item);

						if(typeof parsedSettings.myCorePaths==='object' && typeof parsedSettings.myCorePaths.length==='number'){
							for(var i=0; i<parsedSettings.myCorePaths.length; i++){
								if(typeof parsedSettings.myCorePaths[i]==='string' && this.myCorePaths.indexOf(parsedSettings.myCorePaths[i])===-1)
									this.myCorePaths.push(parsedSettings.myCorePaths[i]);
							}
						}

						if(typeof parsedSettings.myCorePathIndex==='number' && parsedSettings.myCorePathIndex>=0 && parsedSettings.myCorePathIndex<=this.myCorePaths.length){
							this.myCorePathIndex=parsedSettings.myCorePathIndex;
						}

						return true;
					}
				}catch(err){
					console.error('error while parsing JSON settings');
				}
			}
			return false;
		},
		reset:function(){
			if(typeof localStorage !== 'undefined'){
				localStorage.removeItem(LOCALSTORAGE_ID);
				return true;
			}
			return false;
		},
		save:function(){
			if(typeof localStorage !== 'undefined'){
				localStorage.setItem(LOCALSTORAGE_ID, JSON.stringify(this));
				return true;
			}
			return false;
		}
	}
}());


/* UI */
var UI=(function(){
	var BALLOONS=[];
	var DIALOGS=['scripts'];
	var tempWin;

	var arrangeBalloon=function(balloonId){
		tempWin=el('button-toolbar-'+balloonId).getBoundingClientRect();
		el('balloon-'+balloonId).style.top=parseInt(tempWin.y+52)+'px';
		
		if(balloonId==='edit')
			el('balloon-'+balloonId).style.right=parseInt(window.innerWidth-tempWin.x-tempWin.width)+'px';
		else
			el('balloon-'+balloonId).style.left=parseInt(tempWin.x)+'px';
	};
	var arrangeBalloons=function(){
		for(var i=0; i<BALLOONS.length; i++)
			arrangeBalloon(BALLOONS[i]);
	};
	
	var _hideBalloons=function(){
		for(var i=0; i<BALLOONS.length; i++){
			el('balloon-'+BALLOONS[i]).className='balloon';
			el('button-toolbar-'+BALLOONS[i]).className='btn';
		}
		document.activeElement.blur();
	};
	addEvent(window, 'resize', arrangeBalloons);
	addEvent(window, 'click', _hideBalloons);
	
	
	
	return{
		automaticEditBalloon:true,
		showBalloon:function(id){
			arrangeBalloon(id);
			for(var i=0; i<BALLOONS.length; i++){
				if(BALLOONS[i]===id){
					el('balloon-'+BALLOONS[i]).className='balloon show';
					el('button-toolbar-'+BALLOONS[i]).className='btn btn-active';
				}else{
					el('balloon-'+BALLOONS[i]).className='balloon';
					el('button-toolbar-'+BALLOONS[i]).className='btn';
				}
			}
		},
		hideBalloon:_hideBalloons,
		toggleBalloon:function(id){
			if(this.isBalloonOpen(id))
				this.hideBalloon();
			else
				this.showBalloon(id);
		},
		isBalloonOpen:function(id){
			if(typeof id==='string')
				return / show/.test(el('balloon-'+id).className);

			for(var i=0; i<BALLOONS.length; i++){
				if(/ show/.test(el('balloon-'+BALLOONS[i]).className))
					return true;
			}
			return false;
		},
		enableBalloon:function(id){
			BALLOONS.push(id);
			addEvent(el('button-toolbar-'+id), 'click', stopPropagation);
			addEvent(el('balloon-'+id), 'click', stopPropagation);
			//addEvent(el('balloon-'+id), 'mouseup', stopPropagation);

			arrangeBalloons();
		},
		openDialog:function(id){
			for(var i=0; i<DIALOGS.length; i++){
				if(DIALOGS[i]===id)
					show('dialog-'+DIALOGS[i]);
				else
					hide('dialog-'+DIALOGS[i]);
			}
			show('dialogs');
		},
		closeDialog:function(){
			hide('dialogs');
		},
		isDialogOpen:function(){
			for(var i=0; i<DIALOGS.length; i++){
				if(el('dialog-'+DIALOGS[i]).style.display==='block')
					return true;
			}
			return false;
		}
	}
}());




/* add content */
function openImportBrowser(){
	el('input-file').click();
}
function readFiles(playlist, droppedFiles){
	var filePath;
	
	var contentPaths=playlist.getContentPaths();
	if(contentPaths.length)
		filePath=contentPaths[0];
	else
		filePath='';

	var newContent=[];
	var mergingPlaylists=[];
	for(var i=0; i<droppedFiles.length; i++){
		if(/\.lpl$/.test(droppedFiles[i].name)){ /* lpl */
			mergingPlaylists.push(droppedFiles[i]);
		}else if(!REGEX_IGNORE_EXTENSIONS.test(droppedFiles[i].name)){ /* add items */
			var fileName=droppedFiles[i].name;
			newContent.push(new Content(filePath+fileName, fileName.replace(/\.\w+$/i,''), false, false, false, false));
			
			if(/\.zip$/.test(droppedFiles[i].name) && droppedFiles[i].size<16777216)
				queueParseZip(droppedFiles[i], newContent[newContent.length-1]);
		}
	}
	if(newContent.length){
		playlist.addContent(newContent);
		playlist.unsavedChanges=true;
	}
	if(mergingPlaylists.length){
		if(!playlist.content.length)
			playlist.name=mergingPlaylists[0].name.replace('.lpl','');

		lplQueueCount+=mergingPlaylists.length;
		for(var i=0; i<mergingPlaylists.length; i++){
			queueParseLpl(mergingPlaylists[i], playlist);
		}
	}else{
		rebuildSelects(playlist);
	}

	el('form').reset();
}

function queueParseLpl(lplFile, playlist){
	/* event for reading text from .lpl files */
	var fr=new FileReader();
	fr.onload=function(e){
		try{
			//try to parse JSON format
			var jsonPlaylist=JSON.parse(e.target.result);
			importPlaylistJSON(jsonPlaylist, playlist);
			el('checkbox-legacy').checked=false;
		}catch(ex){
			//could not parse JSON playlist, trying to parse the old format
			importPlaylistJSON(lpl2json(e.target.result), playlist);
			el('checkbox-legacy').checked=true;
		}

		lplQueueCount--;
		if(lplQueueCount===0)
			rebuildSelects(playlist);
	}
	
	fr.readAsText(lplFile);
}

function queueParseZip(zipFile, content){
	var fr=new FileReader();
	fr.onload=function(evt){
		var u8arr=new Uint8Array(this.result);
		var offset=0;
		var uniqueExtension=false;
		var firstCrc=false;
		var filesFound=0;
		while(u8arr[offset + 3] < u8arr.length && u8arr[offset + 0]===0x50 && u8arr[offset + 1]===0x4b && u8arr[offset + 2]===0x03 && u8arr[offset + 3]===0x04){
			offset+=14;
			var crc=(((u8arr[offset + 3] << 24) + (u8arr[offset + 2] << 16) + (u8arr[offset + 1] << 8) + (u8arr[offset + 0])) >>> 0).toString(16).toUpperCase();
			while(crc.length<8)
				crc='0'+crc;
			
			offset+=4;
			var compressedFileSize=(u8arr[offset + 3] << 24) + (u8arr[offset + 2] << 16) + (u8arr[offset + 1] << 8) + (u8arr[offset + 0]);
			if(compressedFileSize===0xffffffff)
				break;
			//console.log(compressedFileSize);

			offset+=8;
			var fileNameLength=(u8arr[offset + 1] << 8) + (u8arr[offset + 0]);
			//console.log(fileNameLength);

			offset+=2;
			var extraFieldLength=(u8arr[offset + 1] << 8) + (u8arr[offset + 0]);
			//console.log(extraFieldLength);

			offset+=2;
			var fileName='';
			for(var i=0; i<fileNameLength; i++){
				fileName+=String.fromCharCode(u8arr[offset++]);
			}
			//console.log(fileName);

			offset+=extraFieldLength + compressedFileSize;
			
			if(!REGEX_IGNORE_EXTENSIONS.test(fileName)){
				filesFound++;

				if(!firstCrc)
					firstCrc=crc;

				if(REGEX_KNOWN_EXTENSIONS.test(fileName)){			
					if(!uniqueExtension){
						uniqueExtension=getFileExtension(fileName);
					}else if(getFileExtension(fileName)!==uniqueExtension){
						uniqueExtension=false;
						break;
					}
				}else{
					break;
				}
			}
		}


		if(uniqueExtension && DATABASE_BY_EXTENSION[uniqueExtension]){
			content.setDatabaseName(DATABASE_BY_EXTENSION[uniqueExtension]);

			if(filesFound===1)
				content.setCrc(firstCrc+'|crc', true);
		}
	}
	fr.readAsArrayBuffer(zipFile);
}





function fetchDatabase(databaseName, onLoadFunc, param1, param2, param3){
	if(FETCHABLE_DATABASES.indexOf(databaseName)===-1 && !loadedDatabases[databaseName])
		loadedDatabases[databaseName]={};
	
	if(loadedDatabases[databaseName]){
		onLoadFunc(param1, param2, param3);
		return false;
	}
	console.log('fetching db: '+databaseName);

	fetch('./app/databases/'+databaseName+'.txt')
		.then(result => result.text())
		.then(text => {
			//parse database
			var lines=text.split('\n');
			//var extensions=lines[0].split(',');
			
			loadedDatabases[databaseName]={};
			for(var i=1; i<lines.length; i++){
				var data=lines[i].trim().split('|');

				if(data.length>1){
					var item={
						rom_name:data[0],
						crc:data[1].split(','),
						name:data[2] || data[0]
					};
					loadedDatabases[databaseName][item.rom_name]=item;

					if(item.crc.length===1 && !item.crc[0])
						item.crc=[];
					
					for(var j=0; j<item.crc.length; j++){
						if(item.crc[j])
							loadedDatabases[databaseName]['crc_'+item.crc[j].toUpperCase()]=item;
					}
				}
			}

			onLoadFunc(param1, param2, param3);
		})
		.catch(function(evt){
			console.error('error parsing database: '+evt.message);
			loadedDatabases[databaseName]={};
		});
}


function importPlaylistJSON(jsonPlaylist, targetPlaylist){
	if(!targetPlaylist.content.length){
		for(var i=0; i<ADDITIONAL_JSON_PROPERTIES_ORDER.length; i++){
			if(typeof jsonPlaylist[ADDITIONAL_JSON_PROPERTIES_ORDER[i]]!='undefined'){
				targetPlaylist[ADDITIONAL_JSON_PROPERTIES_ORDER[i]]=jsonPlaylist[ADDITIONAL_JSON_PROPERTIES_ORDER[i]];
			}
		}
	}

	var newContent=[];
	for(var i=0; i<jsonPlaylist.items.length; i++){
		var item=jsonPlaylist.items[i];

		newContent.push(new Content(item.path, item.label, item.core_path, item.core_name, item.crc32, item.db_name));
		
		if(typeof item.core_path==='string' && item.core_path!=='DETECT'){
			if(/[\/\\][\w\-]+_libretro/.test(item.core_path))
				setCorePath(item.core_path.trim().replace(/[\w\-]+_libretro/,'*_libretro'));
		}
	}
	targetPlaylist.addContent(newContent);
	rebuildSelects(targetPlaylist);
}
function lpl2json(string){
	var items=[];
	var lines=string.replace(/\r\n?/g,'\n').split('\n');
	for(var i=0;i<lines.length;i+=6){
		if(!lines[i])
			break;

		items.push({
			path:lines[i],
			label:lines[i+1],
			core_path:lines[i+2],
			core_name:lines[i+3],
			crc32:lines[i+4],
			db_name:lines[i+5]
		})
	}
	
	return {
		items:items
	};
}





function getPathSystem(path){
	path=fixString(path);
	if(/^[a-z]:[\\\/]/i.test(path))
		return 'Windows';
	else if(/.*?_libretro\.dylib$/.test(path))
		return 'Mac';
	else if(/^\/home\/deck\/.*?_libretro\.so$/.test(path))
		return 'Steam Deck';
	else if(/^\/run\/media\/mmcblk0p1\/.*?_libretro\.so$/.test(path))
		return 'Steam Deck (SD)';
	else if(/_libretro\.so$/.test(path))
		return 'Linux';
	else if(/_libretro_android\.so$/.test(path))
		return 'Android';
	else if(/^app0:\/.*?_libretro\.self$/.test(path))
		return 'PS Vita';
	else if(/_libretro_ps2\.elf$/.test(path))
		return 'PS2';
	else if(/_libertro\.PBP$/.test(path))
		return 'PSP';
	else if(/_libretro\.rpx$/.test(path))
		return 'Wii U';
	else if(/_libretro\.dol$/.test(path))
		return 'GC / Wii';
	else if(/_libretro\.3dsx$/.test(path))
		return '3DS';
	else if(/_libretro_libnx\.nro$/.test(path))
		return 'Switch';
	return '';
}
function checkIfWindowsSystem(path){
	return getPathSystem(path)==='Windows'
}
function refreshCorePathMessage(playlist){
	var corePath=el('select-core-path').value;
	
	var invalidContentPath=false;
	for(var i=0; i<playlist.content.length && !invalidContentPath; i++){
		if(!playlist.content[i].path || playlist.content[i].path==='/' || playlist.content[i].path==='\\')
			invalidContentPath=true;
	}
	if(invalidContentPath){
		el('core-path-message').className='warning';
		el('core-path-message').innerHTML='<img class="icon" src="app/assets/icon_alert.svg" /> Warning: one or more content has no defined content path.';
	}else if(corePath){
		el('core-path-message').className='';
		el('core-path-message').innerHTML=getPathSystem(corePath);
	}else if(Settings.myCorePaths.length){
		el('core-path-message').className='warning';
		el('core-path-message').innerHTML='<img class="icon" src="app/assets/icon_alert.svg" /> Warning: all content will be set to DETECT core.';
	}else{
		el('core-path-message').className='warning';
		el('core-path-message').innerHTML='<img class="icon" src="app/assets/icon_alert.svg" /> Advice: import any of your existing playlists to detect your device core path.';
	}
}
function setCorePath(corePath){
	var saveSettings=false;
	var oldCorePath=el('select-core-path').value;

	/* new core path */
	if(corePath && /\*_libretro/.test(corePath) && Settings.myCorePaths.indexOf(corePath)===-1){
		console.log('new core path: '+corePath);

		Settings.myCorePaths.push(corePath);
		Settings.myCorePaths.sort(function(a,b){
			return getPathSystem(a) < getPathSystem(b)
		});

		rebuildSelectCorePath();

		saveSettings=true;
	}
	if(corePath && oldCorePath!==corePath){
		Settings.myCorePathIndex=Settings.myCorePaths.indexOf(corePath)+1;
		save=true;
	}
	el('select-core-path').value=corePath || '';

	
	refreshCorePathMessage(currentPlaylist);

	/* save settings */
	if(saveSettings)
		Settings.save();
}




/* initialize everything! */
addEvent(window,'load',function(){
	/* load config */
	Settings.load();

	/* initialize data table */
	currentPlaylist=new Playlist('My playlist');
	el('playlist-table-container').appendChild(currentPlaylist._table);

	/* core path <select> */
	rebuildSelectCorePath();
	refreshCorePathMessage(currentPlaylist);

	/* build database <select> */
	rebuildSelects();

	
	/* build massive rename <select> */
	for(var i=0; i<MASSIVE_RENAME.length; i++){
		var option=document.createElement('option');
		option.innerHTML=MASSIVE_RENAME[i].label;
		el('select-massive-rename').appendChild(option);
	}


	/* UI events */
	addEvent(el('button-toolbar-select'), 'click', function(evt){
		UI.showBalloon('select');
	});
	addEvent(el('button-toolbar-import'), 'click', openImportBrowser);
	addEvent(el('button-toolbar-save'), 'click', function(evt){
		refreshCorePathMessage(currentPlaylist);
		UI.showBalloon('save');
		el('input-playlist-name').value=currentPlaylist.name;
		el('input-playlist-name').focus();
	});
	addEvent(el('button-toolbar-edit'), 'click', function(evt){
		UI.automaticEditBalloon=!UI.isBalloonOpen('edit');
		if(!UI.automaticEditBalloon)
			refreshEditBalloon(currentPlaylist);
		UI.toggleBalloon('edit');
	});
	addEvent(el('button-toolbar-remove'), 'click', function(evt){
		currentPlaylist.dataTable.removeSelected();
	});
	/* select balloon */
	addEvent(el('button-select-none'), 'click', function(evt){
		UI.hideBalloon();
		currentPlaylist.dataTable.deselectAll(true);
		refreshEditBalloon(currentPlaylist);
	});
	addEvent(el('button-select-inverse'), 'click', function(evt){
		UI.hideBalloon();
		currentPlaylist.dataTable.selectInverse(true);
		refreshEditBalloon(currentPlaylist);
	});
	addEvent(el('button-select-all'), 'click', function(evt){
		UI.hideBalloon();
		currentPlaylist.dataTable.selectAll(true);
		refreshEditBalloon(currentPlaylist);
	});
	addEvent(el('input-search'), 'input', function(evt){
		searchContent(this.value);
		refreshEditBalloon(currentPlaylist, null, false);
	});
	addEvent(el('input-search'), 'focus', function(evt){
		searchContent(this.value);
		refreshEditBalloon(currentPlaylist);
	});
	/* save balloon */
	addEvent(el('input-playlist-name'), 'change', function(evt){
		var newName=this.value.trim();
		if(newName)
			currentPlaylist.name=newName;
		else
			this.value=currentPlaylist.name='My playlist';
	});
	addEvent(el('select-core-path'), 'change', function(evt){
		setCorePath(this.value);
		if(this.value){
			Settings.myCorePathIndex=Settings.myCorePaths.indexOf(this.valu)+1;
			Settings.save();
		}
	});
	addEvent(el('button-save'), 'click', function(evt){
		currentPlaylist.export(el('checkbox-legacy').checked);
		UI.hideBalloon();
	});
	/* edit balloon */
	addEvent(el('input-content-name'), 'input', function(evt){
		var selectedElement=currentPlaylist.dataTable.getSelectedElements()[0];
		if(selectedElement){
			selectedElement.setName(this.value, true);
			currentPlaylist.unsavedChanges=true;
		}
	});
	addEvent(el('select-massive-rename'), 'change', function(evt){
		var selectedContent=currentPlaylist.dataTable.getSelectedElements();
		var renameFilter=MASSIVE_RENAME[this.selectedIndex-1];

		if(/database/.test(renameFilter.label)){
			var queuedDatabases={};
			for(var i=0; i<selectedContent.length; i++){
				var databaseName=selectedContent[i].databaseName;
				if(databaseName){
					if(queuedDatabases[databaseName])
						queuedDatabases[databaseName].push(selectedContent[i]);
					else
						queuedDatabases[databaseName]=[selectedContent[i]];
				}
			}

			for(var databaseName in queuedDatabases){
				if(loadedDatabases[databaseName]){
					currentPlaylist.massiveContentRename(selectedContent, renameFilter.filter);
				}else{
					fetchDatabase(databaseName, currentPlaylist.massiveContentRename, selectedContent, renameFilter.filter);
				}
			}
		}else{
			currentPlaylist.massiveContentRename(selectedContent, renameFilter.filter);
		}
		
		el('select-massive-rename').selectedIndex=0;
	});
	addEvent(el('input-content-path'), 'input', function(evt){
		this.value=fixString(this.value);
		currentPlaylist.setContentPath(currentPlaylist.dataTable.getSelectedElements(), this.value);
	});
	addEvent(el('input-content-path'), 'change', function(evt){
		rebuildSelectContentPaths(currentPlaylist);
	});
	addEvent(el('select-database'), 'change', function(evt){
		if(loadedDatabases[this.value] || this.value==='')
			currentPlaylist.setContentDatabase(currentPlaylist.dataTable.getSelectedElements(), this.value || false);
		else
			fetchDatabase(this.value, currentPlaylist.setContentDatabase, currentPlaylist.dataTable.getSelectedElements(), this.value);

		this.children[0].innerHTML='- None -';
	});
	addEvent(el('select-core'), 'change', function(evt){
		currentPlaylist.setContentCore(currentPlaylist.dataTable.getSelectedElements(), this.value || false);

		this.children[0].innerHTML='- Detect -';
	});








	/* drag and drop */
	document.body.appendChild(DragAndDropZone);

	/* key events */
	addEvent(window, 'keydown', function(evt){
		if(evt.keyCode===27){ //escape
			if(UI.isDialogOpen()){
				UI.closeDialog();
			}else if(UI.isBalloonOpen()){
				UI.hideBalloon();
			}else if(MarcDataTable.getFocus()===currentPlaylist.dataTable && currentPlaylist.dataTable.getSelectedElements().length){
				currentPlaylist.dataTable.deselectAll();
			}
		}else if(document.activeElement.tagName!=='INPUT'){
			if(evt.keyCode===46){ //delete
				currentPlaylist.dataTable.removeSelected();
			}else if(evt.keyCode===13){
				var selectedContent=currentPlaylist.dataTable.getSelectedElements();
				if(selectedContent.length)
					refreshEditBalloon(currentPlaylist, selectedContent);
			}
		}
	});

	UI.enableBalloon('select');
	UI.enableBalloon('edit');
	UI.enableBalloon('save');	
	
	//buildExample();
});
function buildExample(path){
	currentPlaylist.name='test';

	importPlaylistJSON(
		{
			items:[
				{
					"path": "C:\\roms\\psx\\Adventures of Lomax, The (USA).chd",
					"label": "Adventures of Lomax, The (USA)",
					"core_path": "c:\\retroarch\\cores\\mednafen_psx_hw_libretro.dll",
					"core_name": "Beetle PSX HW",
					"crc32": "7b8df6b2|crc",
					"db_name": "Sony - PlayStation.lpl"
				},{
					"path": "C:\\roms\\psx\\Ape Escape (USA).chd",
					"label": "Ape Escape (USA)",
					"core_path": "/sd/retroarch/cores/mednafen_psx_hw_libretro_libnx.nro",
					"core_name": "Beetle PSX HW",
					"crc32": "c6f455bc|crc",
					"db_name": "Sony - PlayStation.lpl"
				},{
					"path": "C:\\roms\\psx\\Sexy Parodius (Japan).chd",
					"label": "Sexy Parodius (Japan)",
					"core_path": "/sd/retroarch/cores/mednafen_psx_hw_libretro.rpx",
					"core_name": "Sony - PlayStation (Beetle PSX HW)",
					"crc32": "b459c1ce|crc",
					"db_name": "Sony - PlayStation.lpl"
				},{
					"path": "C:\\roms\\gba\\Advance Wars (Europe) (En,Fr,De,Es).zip#Advance Wars (Europe) (En,Fr,De,Es).gba",
					"label": "Advance Wars (Europe) (En,Fr,De,Es)",
					"core_path": "DETECT",
					"core_name": "DETECT",
					"crc32": "66FB29E9|crc",
					"db_name": "Nintendo - Game Boy Advance.lpl"
				},{
					"path": "C:\\roms\\gba\\Advance Wars (Europe) (En,Fr,De,Es).zip#Advance Wars (USA).gba",
					"label": "Advance Wars NTSC",
					"core_path": "DETECT",
					"core_name": "DETECT",
					"crc32": "66FB29E9|crc",
					"db_name": "Nintendo - Game Boy Advance.lpl"
				},{
					"path": "C:\\roms\\fbneo\\3countb.zip",
					"label": "3countb",
					"core_path": "DETECT",
					"core_name": "DETECT",
					"crc32": "DETECT",
					"db_name": "DETECT"
				},{
					"path": "C:\\roms\\dreamcast\\Resident Evil - Code - Veronica (Europe).m3u",
					"label": "Resident Evil - Code - Veronica (Europe)",
					"core_path": "DETECT",
					"core_name": "DETECT",
					"crc32": "DETECT",
					"db_name": "Sega - Dreamcast.lpl"
				},{
					"path": "C:\\roms\\fbneo\\ffight.zip",
					"label": "ffight",
					"core_path": "DETECT",
					"core_name": "DETECT",
					"crc32": "DETECT",
					"db_name": "DETECT"
				},{
					"path": "C:\\roms\\gb\\Donkey Kong.zip",
					"label": "Donkey Kong",
					"core_path": "c:\\retroarch\\cores\\gambatte_libretro.dll",
					"core_name": "Nintendo - Game Boy / Color (Gambatte)",
					"crc32": "DETECT",
					"db_name": "DETECT"
				},{
					"path": "C:\\roms\\psx\\Atlantis - The Lost Tales (Europe) (En,Es,Nl,Sv).m3u",
					"label": "Atlantis - The Lost Tales (Europe) (En,Es,Nl,Sv)",
					"core_path": "DETECT",
					"core_name": "DETECT",
					"crc32": "DETECT",
					"db_name": "DETECT"
				},{
					"path": "C:\\roms\\psx\\Final Fantasy VII (Spain) (Rev 1).m3u",
					"label": "Final Fantasy VII (Spain) (Rev 1)",
					"core_path": "DETECT",
					"core_name": "DETECT",
					"crc32": "DETECT",
					"db_name": "DETECT"
				}
			]
		}, currentPlaylist
	);
}


/*
function openSelectBalloon(){
	if(currentPlaylist.content.length){
		if(UI.isBalloonOpen('select')){
			if(currentPlaylist.selectedContent.length){
				currentPlaylist.selectableTable.unselectAll();
			}else{
				currentPlaylist.selectableTable.selectAll();
			}
			hideBalloon('select');
		}else{
			UI.showBalloon('select');
		}
	}
}
*/

function searchContent(filter){
	filter=filter.trim();
	
	if(filter){
		var regex=/\*/.test(filter);

		var filteredContent=[];
		if(/^(\*?\.\w{2,3}(, *\*?\.\w{2,3})*)$/i.test(filter)){
			var allExtensions=filter.match(/\.(\w{2,3})/gi);
			for(var i=0; i<allExtensions.length; i++)
				allExtensions[i]=new RegExp(allExtensions[i].replace('.', '\\.')+'$');

			for(var i=0; i<currentPlaylist.content.length; i++){
				for(var j=0; j<allExtensions.length; j++){
					var regexFileExtension=allExtensions[j];
					if(
						(currentPlaylist.content[i].compressed && regexFileExtension.test(currentPlaylist.content[i].compressed)) ||
						regexFileExtension.test(currentPlaylist.content[i].file)
					){
						filteredContent.push(currentPlaylist.content[i]);
						break;
					}
				}
			}
		}else if(regex){
			try{
				filter=new RegExp(filter.replace(/[-[\]{}()*+?.,\\^$|#\\s]/g, '\\$&').replace(/\\\*/g, '.+?'), 'i');

				for(var i=0; i<currentPlaylist.content.length; i++){
					if(filter.test(currentPlaylist.content[i].name))
						filteredContent.push(currentPlaylist.content[i]);
				}
			}catch(ex){
			}
		}else{
			filter=filter.toLowerCase();
			for(var i=0; i<currentPlaylist.content.length; i++){
				if(currentPlaylist.content[i].name.toLowerCase().indexOf(filter)!==-1)
					filteredContent.push(currentPlaylist.content[i]);
			}
		}
		
		currentPlaylist.dataTable.selectOnly(filteredContent, true);
	}else{
		currentPlaylist.dataTable.deselectAll(true);
	}
}





/*
function refreshSearchDatalist(db_name){
	var datalist=el('datalist-search');
	datalist.innerHTML='';
	
	var db=databases[db_name];
	
	for(var title in db){
		if(!/^crc_/.test(title)){
			var option=document.createElement('option');
			option.value=title;
			datalist.appendChild(option);
		}
	}
}
function searchInDatabase(db_name, query, resultsContainer, onClick){
	resultsContainer.innerHTML='';

	var words=query.clean().split('_');
	if(words.length===0)
		return [];
	
	var db=databases[db_name+'_clean'];
	
	var results=[];
	for(var title in db){
		var matches=0;
		for(var i=0; i<words.length; i++){
			if(title.indexOf(words[i])!==-1)
				matches++;
		}
		if(matches===words.length){
			results.push(db[title]);
			if(results.length===8)
				break;
		}
	}
	
	for(var i=0; i<results.length; i++){
		var li=document.createElement('li');
		li.crcValue=results[i].crc[0];
		li.innerHTML=results[i].name;
		li.addEventListener('click', onClick, false);
		resultsContainer.appendChild(li);
	}
	return results;
}
*/

function refreshEditBalloon(playlist, precalculatedSelectedContent, refreshSearchBox){
	var selectedContent=precalculatedSelectedContent || playlist.dataTable.getSelectedElements();

	if(selectedContent.length){
		if(selectedContent.length>1)
			el('selected-elements').innerHTML=selectedContent.length+' elements selected';
		else
			el('selected-elements').innerHTML=selectedContent.length+' element selected';

		var path=selectedContent[0].path;
		var databaseName=selectedContent[0].databaseName;
		var coreFile=selectedContent[0].coreFile;
		var mixedPaths=false;
		var mixedDatabaseNames=false;
		var mixedCoreFiles=false;
		for(var i=1; i<selectedContent.length; i++){
			if(selectedContent[i].path !== path)
				mixedPaths=true;

			if(selectedContent[i].databaseName !== databaseName)
				mixedDatabaseNames=true;

			if(selectedContent[i].coreFile !== coreFile)
				mixedCoreFiles=true;
		}
		

		if(!mixedPaths){
			el('input-content-path').value=fixString(path);
			el('input-content-path').placeholder='';
		}else{
			el('input-content-path').value='';
			el('input-content-path').placeholder='- Mixed -';
		}

		if(!mixedDatabaseNames){
			el('select-database').value=databaseName || '';
			el('select-database').children[0].innerHTML='- None -';
		}else{
			el('select-database').value='';
			el('select-database').children[0].innerHTML='- Mixed -';
		}

		if(!mixedCoreFiles){
			el('select-core').value=coreFile || '';
			el('select-core').children[0].innerHTML='- Detect -';
		}else{
			el('select-core').value='';
			el('select-core').children[0].innerHTML='- Mixed -';
		}




		if(selectedContent.length===1){
			show('edit-content-name-single');
			hide('edit-content-name-multiple');

			el('input-content-name').value=selectedContent[0].name;
			//el('input-content-name').focus();
		}else{
			hide('edit-content-name-single');
			show('edit-content-name-multiple');
			//el('select-content-path').focus();
		}
		
		show('toolbar-right');
	}else{
		el('selected-elements').innerHTML='';
		hide('toolbar-right');
	}






	if(selectedContent.length===playlist.dataTable.getLength() && selectedContent.length){
		el('button-toolbar-select').children[0].src=el('button-toolbar-select').children[0].src.replace(/_[a-z]+\.svg$/, '_all.svg');
		el('button-select-none').className='btn';
		//el('button-select-inverse').className='btn';
		el('button-select-all').className='btn btn-active';
		/*if(refreshSearchBox!==false)
			el('input-search').value='*';*/
	}else if(selectedContent.length===0){
		el('button-toolbar-select').children[0].src=el('button-toolbar-select').children[0].src.replace(/_[a-z]+\.svg$/, '_none.svg');
		el('button-select-none').className='btn btn-active';
		//el('button-select-inverse').className='btn';
		el('button-select-all').className='btn';
		/*if(refreshSearchBox!==false)
			el('input-search').value='';*/
	}else{
		el('button-toolbar-select').children[0].src=el('button-toolbar-select').children[0].src.replace(/_[a-z]+\.svg$/, '_mixed.svg');
		el('button-select-none').className='btn';
		//el('button-select-inverse').className='btn btn-active';
		el('button-select-all').className='btn';
	}
}

var MASSIVE_RENAME=[
	{
		label:'Restore names from database',
		filter:function(content){
			return content.guessNameFromDatabase() || content.name;
		}
	},{
		label:'Remove (USA) tags',
		filter:function(content){
			return content.name
				.replace(/ \(((.*?, )+)?USA((, .*?)+)?\)/, '')
				.replace(/ \(World\)/, '')
			;
		}
	},{
		label:'Remove (Europe) tags',
		filter:function(content){
			return content.name
				.replace(/ \(((.*?, )+)?Europe((, .*?)+)?\)/, '')
				.replace(/ \(World\)/, '')
			;
		}
	},{
		label:'Remove (Japan) tags',
		filter:function(content){
			return content.name
				.replace(/ \(((.*?, )+)?Japan((, .*?)+)?\)/, '')
				.replace(/ \(World\)/, '')
			;
		}
	},{
		label:'Remove language tags',
		filter:function(content){
			return content.name.replace(/ \([A-Z][a-z]((,[A-Z][a-z])+)?\)/, '');
		}
	},{
		label:'Remove other tags',
		filter:function(content){
			return content.name
				.replace(/ \((v\d\.\d|Rev .*?)\)/, '')
				.replace(/ \((No )?EDC\)/, '')
				.replace(/ \[\!\]/, '')
			;
		}
	}/*,{
		label:'Fix old tags',
		filter:function(content){
			return content.name
				.replace(/ \((v1\.1|Rev A)\)/, ' (Rev 1)')
				.replace(/ \((v1\.2|Rev B)\)/, ' (Rev 2)')
				.replace(/ \[\(!|S|M|C|BF)\]/, '')
				.replace(/ \(J\)/, ' (Japan)')
				.replace(/ \(U\)/, ' (USA)')
				.replace(/ \(E\)/, ' (Europe)')
				.replace(/ \(UE\)/, ' (USA, Europe)')
				.replace(/ \(JUE\)/, ' (World)')
				.replace(/ \(S\)/, ' (Spain)')
				.replace(/ \(F\)/, ' (France)')
				.replace(/ \(I\)/, ' (Italy)')
				.replace(/ \(G\)/, ' (Germany)')
				.replace(/ \(PD\)/, ' [homebrew]')
				.replace(/\]\[/g, '] [')
				.replace(/ \[o\d+?\]/, ' [overdump]')
				.replace(/ \[b\d+?\]/, ' [bad dump]')
				.replace(/ \[(f\d+?|BF)\]/, ' [old fix]')
				.replace(/ \[hI.?\]/, ' [hacked intro]')
				.replace(/ \[t\d\]/, ' [hacked trainer]')
				.replace(/ \[h.*?\]/, ' [hacked]')
				.replace(/ \[T[+\-]Eng,.*?\]/, ' [translated-en]')
				.replace(/ \[T[+\-]Spa,.*?\]/, ' [translated-es]')
				.replace(/ \[T[+\-]Ger,.*?\]/, ' [translated-de]')
			;
		}
	}*/
];




/*! @source http://purl.eligrey.com/github/FileSaver.js/blob/master/FileSaver.js */
var saveAs=saveAs||function(e){"use strict";if(typeof e==="undefined"||typeof navigator!=="undefined"&&/MSIE [1-9]\./.test(navigator.userAgent)){return}var t=e.document,n=function(){return e.URL||e.webkitURL||e},r=t.createElementNS("http://www.w3.org/1999/xhtml","a"),o="download"in r,a=function(e){var t=new MouseEvent("click");e.dispatchEvent(t)},i=/constructor/i.test(e.HTMLElement)||e.safari,f=/CriOS\/[\d]+/.test(navigator.userAgent),u=function(t){(e.setImmediate||e.setTimeout)(function(){throw t},0)},s="application/octet-stream",d=1e3*40,c=function(e){var t=function(){if(typeof e==="string"){n().revokeObjectURL(e)}else{e.remove()}};setTimeout(t,d)},l=function(e,t,n){t=[].concat(t);var r=t.length;while(r--){var o=e["on"+t[r]];if(typeof o==="function"){try{o.call(e,n||e)}catch(a){u(a)}}}},p=function(e){if(/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(e.type)){return new Blob([String.fromCharCode(65279),e],{type:e.type})}return e},v=function(t,u,d){if(!d){t=p(t)}var v=this,w=t.type,m=w===s,y,h=function(){l(v,"writestart progress write writeend".split(" "))},S=function(){if((f||m&&i)&&e.FileReader){var r=new FileReader;r.onloadend=function(){var t=f?r.result:r.result.replace(/^data:[^;]*;/,"data:attachment/file;");var n=e.open(t,"_blank");if(!n)e.location.href=t;t=undefined;v.readyState=v.DONE;h()};r.readAsDataURL(t);v.readyState=v.INIT;return}if(!y){y=n().createObjectURL(t)}if(m){e.location.href=y}else{var o=e.open(y,"_blank");if(!o){e.location.href=y}}v.readyState=v.DONE;h();c(y)};v.readyState=v.INIT;if(o){y=n().createObjectURL(t);setTimeout(function(){r.href=y;r.download=u;a(r);h();c(y);v.readyState=v.DONE});return}S()},w=v.prototype,m=function(e,t,n){return new v(e,t||e.name||"download",n)};if(typeof navigator!=="undefined"&&navigator.msSaveOrOpenBlob){return function(e,t,n){t=t||e.name||"download";if(!n){e=p(e)}return navigator.msSaveOrOpenBlob(e,t)}}w.abort=function(){};w.readyState=w.INIT=0;w.WRITING=1;w.DONE=2;w.error=w.onwritestart=w.onprogress=w.onwrite=w.onabort=w.onerror=w.onwriteend=null;return m}(typeof self!=="undefined"&&self||typeof window!=="undefined"&&window||this.content);if(typeof module!=="undefined"&&module.exports){module.exports.saveAs=saveAs}else if(typeof define!=="undefined"&&define!==null&&define.amd!==null){define("FileSaver.js",function(){return saveAs})}




/* string cleaner */
if(typeof String.prototype.clean==='undefined'){
	String.prototype.clean=function(){
		var s=this.toLowerCase().replace(/[\xc0\xc1\xc2\xc4\xe0\xe1\xe2\xe4]/g, 'a');
		s=s.replace(/[\xc8\xc9\xca\xcb\xe8\xe9\xea\xeb]/g, 'e');
		s=s.replace(/[\xcc\xcd\xce\xcf\xec\xed\xee\xef]/g, 'i');
		s=s.replace(/[\xd2\xd3\xd4\xd6\xf2\xf3\xf4\xf6]/g, 'o');
		s=s.replace(/[\xd9\xda\xdb\xdc\xf9\xfa\xfb\xfc]/g, 'u');
		s=s.replace(/[\xd1\xf1]/g, 'n');
		s=s.replace(/[\xc7\xe7]/g, 'c');
		s=s.replace(/[\xc6\xe6]/g, 'ae');
		s=s.replace(/\x26/g, 'and');
		s=s.replace(/\u20ac/g, 'euro');
		s=s.replace(/[^\w- ]/g, '');
		s=s.replace(/( |-)/g, '_');
		s=s.replace(/_+/g, '_');
		s=s.replace(/^_|_$/g, '_');

		return s /* || '0'*/
	}
}



/* drag and drop */
DragAndDropZone=(function(){
	var showDrag=false, timeout=-1;

	/* check if drag items are files */
	function checkIfDraggingFiles(e){
		if(e.dataTransfer.types)
			for(var i=0;i<e.dataTransfer.types.length;i++)
				if(e.dataTransfer.types[i]==='Files')
					return true;
		return false
	}

	/* remove dragging-files class name from body */
	function removeClass(){document.body.className=document.body.className.replace(/ dragging-files/g,'')}


	/* add drag and drop events */
	addEvent(document,'drop',removeClass);
	addEvent(document,'dragenter',function(e){
		if(checkIfDraggingFiles(e)){
			if(!/ dragging-files/.test(document.body.className))
				document.body.className+=' dragging-files'
			showDrag=true; 
		}
	});
	addEvent(document,'dragleave',function(e){
		showDrag=false; 
		clearTimeout(timeout);
		timeout=setTimeout(function(){
			if(!showDrag)
				removeClass();
		}, 200);
	});
	addEvent(document,'dragover',function(e){
		if(checkIfDraggingFiles(e)){
			stopPropagation(e);
			preventDefault(e);
			showDrag=true; 
		}
	});

	/* create drag and drop zone */
	var overlay=document.createElement('div');
	overlay.id='drop-overlay';
	overlay.innerHTML='Drop content here';

	addEvent(overlay,'drop',function(e){
		stopPropagation(e);
		preventDefault(e);
		removeClass();
		if(checkIfDraggingFiles(e))
			readFiles(currentPlaylist, e.dataTransfer.files)
	});

	return overlay
}());

