// Load the Visualization API and the ready-made Google table visualization.
  	
  	
  	google.load('visualization', '1', {packages: ['charteditor']});
  	// Set a callback to run when the API is loaded.
  	var wrapper;
  	var data;
  	var view;
  	var xmlhttp = getXmlHttp();
  	
        var start_text="%default resdir \'/does/not/exist\' \n\
%default cfindic \'cheb_cpu_user\' \n\
%default fstart_node \'node-00-00\' \n\
%default fend_node \'node-00-00\' \n\
%default fnodes \'node-00-00\' \n\
%default fstart_time 1307865600000L \n\
%default fend_time 1307890800000L \n\
\n\
REGISTER hopsa-udfs.jar;\n\
DEFINE TOLONG hopsa.udfs.TOLONG;\n\
\n\
tsr = LOAD \'cassandra://zhopsa/$cfindic\' USING CassandraStorage() AS (\n\
        k:bytearray,    va:{t:(n:bytearray, v:bytearray)}); \n\
ts1 = FOREACH tsr GENERATE k, FLATTEN(va.(n, v)); \n\
ts = FOREACH ts1 GENERATE n AS node, TOLONG(k) AS time, (long)v AS cpu; \n\
tsf = FILTER ts BY time >= $fstart_time AND time <= $fend_time AND the_node_list; \n\
g = GROUP tsf BY time; \n\
bytime = FOREACH g GENERATE group AS time, MIN(tsf.cpu) AS min, AVG(tsf.cpu) AS avg, MAX(tsf.cpu) AS max; \n\
STORE bytime INTO \'$resdir\' USING PigStorage(\',\');\n\
";
        var data_name='cheb_cpu_user'

	function getUrlVars()
	{
		var vars = [], hash;
		var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
		for(var i = 0; i < hashes.length; i++)
		{
			hash = hashes[i].split('=');
			vars.push(hash[0]);
			vars[hash[0]] = hash[1];
		}
		return vars;
	}
	
	var params=getUrlVars();

  	function getXmlHttp(){
		var xmlhttp;
		try {
			xmlhttp = new ActiveXObject("Msxml2.XMLHTTP");
		} catch (e) {
			try {
				xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
			} catch (E) {
				xmlhttp = false;
			}
		}
		if (!xmlhttp && typeof XMLHttpRequest!='undefined') {
			xmlhttp = new XMLHttpRequest();
		}
		return xmlhttp;
	}
  	
    function init() {
  		// LOAD PIGS
  		xmlhttp.open('GET', 'getPigQueries', true);
  		xmlhttp.onreadystatechange = handlePigsResponse;
  		xmlhttp.send(null);  
  		
	   	document.fields_form.send.disabled=false;		
	    wrapper = new google.visualization.ChartWrapper({    	
	        containerId: 'chart_div',
	        chartType: 'Table'
	    });
		
    }

	function params2code(){
		var date1 = new Date(parseInt(params['fstart']));
		var date2 = new Date(parseInt(params['fend']));
		$("#startdate").datetimepicker('setDate', date1);
		$("#enddate").datetimepicker('setDate', date2);
		$("#nodelist").val(params['nodes']);
		

		createAnalyzeButton({title:"User time",value:"cheb_cpu_user"},1);
		createAnalyzeButton({title:"Idle time",value:"cheb_cpu_idle"},2);
		createAnalyzeButton({title:"IO   time",value:"cheb_cpu_wio"},3);
		createAnalyzeButton({title:"Nice time",value:"cheb_cpu_nice"},4);
		createAnalyzeButton({title:"Sys  time",value:"cheb_cpu_system"},5);
		createAnalyzeButton({title:"Bytes in",value:"cheb_bytes_in"},6);
		createAnalyzeButton({title:"Bytes out",value:"cheb_bytes_out"},7);
		createAnalyzeButton({title:"Packets in",value:"cheb_pkts_in"},8);
		createAnalyzeButton({title:"Packets out",value:"cheb_pkts_out"},9);
		createAnalyzeButton({title:"Load average",value:"cheb_load_one"},10);
		createAnalyzeButton({title:"Memory buffers",value:"cheb_mem_buffers"},11);
		createAnalyzeButton({title:"Memory cached",value:"cheb_mem_cached"},12);
		createAnalyzeButton({title:"Memory free",value:"cheb_mem_free"},13);
		createAnalyzeButton({title:"Memory shared",value:"cheb_mem_shared"},14);
		createAnalyzeButton({title:"Swap free",value:"cheb_swap_free"},15);
		setDates();
	}
	
	google.setOnLoadCallback(init);
    
    function handlePigsResponse() {
    	if (xmlhttp.readyState != 4) {
  			//alert("Error fetching pigs. ReadyState=" + xmlhttp.readyState);
  			return;
  		}
  		if (xmlhttp.responseText.indexOf('invalid') != -1) {
  			alert("Invalid response. Response:"+ xmlhttp.responseText);
  			return;
  		}
  		var data = xmlhttp.responseText;
//  		if (data.length>1) {
//			createPigButtons(data);  			
//  		}  		
    }
       
    
    var buttons = new Array();  
    
    function createPigButtons(data) {
    	var blocks = data.split("shorttitle");
    	var keywords = "shorttitle,longtitle,pigquery,googlequery,columns";
    	var shorttitle, longtitle, pig, googlequery,columns;    	  	
    	for (var i in blocks) {  
    		if (blocks[i].length>2) {
    			longtitle="";
    			pig="";
    			googlequery="";
    			columns="";
    			var block = blocks[i];
    			var p=-1;
    			while ((p=findNextKeyword(block.substring(1),keywords))>=0) {
    				if (p==0) {
    					block = block.substring(1);
    					continue;
    				}
    				command = block.substring(0,p-1);
    				if (command.indexOf("longtitle")>=0) {
						longtitle = trimString(command.substring(command.indexOf("=")+1));
					} else if (command.indexOf("pigquery")>=0) {
						pig = trimString(command.substring(command.indexOf("=")+1));    						
					} else if (command.indexOf("googlequery")>=0) {
						googlequery = trimString(command.substring(command.indexOf("=")+1));
					} else if (command.indexOf("columns")>=0) {
						columns = trimString(command.substring(command.indexOf("=")+1));
					} else if (command.length > 2) {
						shorttitle = trimString(command.substring(command.indexOf("=")+1));
					}
    				block = block.substring(p);
    			}
    			if (block.length > 2) {
    				command = block;
    				if (command.indexOf("longtitle")>=0) {
						longtitle = trimString(command.substring(command.indexOf("=")+1));						
					} else if (command.indexOf("pigquery")>=0) {
						pig = trimString(command.substring(command.indexOf("=")+1));    						
					} else if (command.indexOf("columns")>=0) {
						columns = trimString(command.substring(command.indexOf("=")+1));
					} else if (command.indexOf("googlequery")>=0) {
						googlequery = trimString(command.substring(command.indexOf("=")+1));
					}
    			}    			
    			
    			buttons[buttons.length] = {shorttitle:"",longtitle:"",pig:"",googlequery:"",columns:""};
    			if (shorttitle) buttons[buttons.length-1].shorttitle = shorttitle;
    			if (longtitle) buttons[buttons.length-1].longtitle = longtitle;
    			if (pig) buttons[buttons.length-1].pig = pig;
    			if (googlequery) buttons[buttons.length-1].googlequery = googlequery;
    			if (columns) buttons[buttons.length-1].columns = columns;
    			// create html element
    			var html_button = createButton(buttons[buttons.length-1],buttons.length-1);
    			document.getElementById("buttons").appendChild(html_button);    			
    		}
    	}
		//markInvalidButtons("");
    }
	
	function markInvalidButtons(s) {
		var numbers = s.split(",");
		for (var i = 0; i < numbers.length; i++) {
			//$("#button"+numbers[i]).attr("disabled","disabled");
			$("#buttondiv_"+numbers[i]).addClass("invalid");
		}
	}
    
    
    // search for position of next keyword in string s
    function findNextKeyword(s,cs_keywords){
    	var keywords = cs_keywords.split(",");
    	var pos=s.length;
    	var found = false;
    	for (i in keywords){
    		var p = s.indexOf(keywords[i]);
    		if (p>=0) {    			
    			if (p < pos) {
    				pos = p;
    				found = true;
    			}
    		}
    	}
    	if (found) return pos;
    	else return -1;
    }
    
    
    function createButton(button,n) {
		var html_div = document.createElement("div");
		html_div.id = "buttondiv_"+n;
		html_div.setAttribute("class","buttondiv");
		
    	var html_button = document.createElement("input");
    	html_button.type="button";    	
    	html_button.id = "button"+n;
    	html_button.setAttribute("class","query_button");
    	html_button.setAttribute("onclick","buttonPressed("+n+")");
    	html_button.setAttribute("value",button.shorttitle);
    	html_button.setAttribute("title",button.longtitle);
		
		html_div.appendChild(html_button);
    	return html_div;
    }
    
    function buttonPressed(n) {
    	document.fields_form.query.value= buttons[n].googlequery;
    	document.fields_form.pig.value= buttons[n].pig;
    	document.fields_form.columns.value= buttons[n].columns;
    	document.fields_form.chart_title.value=	buttons[n].longtitle;
    	$(".buttondiv").removeClass('selected');
    	addSystem2Title();    	
		checkPigParameters();
		setButtonHighlight(n);
    }
	


    function createAnalyzeButton(button,n) {
	var html_div = document.createElement("div");
	html_div.id = "buttondiv_"+n;
	html_div.setAttribute("class","buttondiv");
		
    	var html_button = document.createElement("input");
    	html_button.type="button";    	
    	html_button.id = "button"+n;
    	html_button.setAttribute("class","query_button");
    	html_button.setAttribute("onclick","buttonAnalyzePressed("+n+")");
    	html_button.setAttribute("value",button.value);
    	html_button.setAttribute("title",button.title);
		
	html_div.appendChild(html_button);
	document.getElementById("buttons").appendChild(html_button);    			
    	return html_div;
    }
    
    function buttonAnalyzePressed(n) {
//    	document.fields_form.query.value= buttons[n].googlequery;
//    	document.fields_form.pig.value= buttons[n].pig;
//    	document.fields_form.columns.value= buttons[n].columns;
//    	document.fields_form.chart_title.value=	buttons[n].longtitle;
    	$(".buttondiv").removeClass('selected');
//    	addSystem2Title();    	
//	checkPigParameters();
	setButtonHighlight(n);
	data_name=$("#button"+n).value;
	setNodeList();
	// replace value
    }






	function setButtonHighlight(n) {		
		$("#buttondiv_"+n).addClass('selected');
	}
    
    function trimString(s) {
    	return s.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
    }
    
    var editor;    

    function getChart() {
    	wrapper = editor.getChartWrapper();  
    	setAxis(wrapper);
    	google.visualization.events.addListener(wrapper, 'ready', getSVG);
        wrapper.draw(document.getElementById('chart_div'));
    }
    
    function openEditor() {
      // Handler for the "Open Editor" button.
      if (editor == null)  editor = new google.visualization.ChartEditor();
      google.visualization.events.addListener(editor, 'ok',getChart);
      editor.openDialog(wrapper);
    }
    
  	function setAxis(wrapper) {
  		var char_type = wrapper.getChartType();
  		if (char_type == "ColumnChart" || char_type == "AreaChart" || char_type == "LineChart" || char_type == "ComboChart") {  			 
  			var units = getUnits(document.fields_form.columns.value);
  			if (units.length>0) wrapper.setOption("vAxis",{title:units});
  		}
  	}
  	
  	function getUnits(s) {
  		//var unit_patt = /\(([a-z]+)\)/;
  		var unit_columns_patt = /_[a-z]+_([a-z]+)/
  		var units = s.match(unit_columns_patt);
  		if (units == null) return "";
  		return units[units.length-1];
  	}
  	
  	function view_formatted_data(required_columntype) {
		var columntype = data.getColumnType(0);
		var view = new google.visualization.DataView(data);
		if (required_columntype != columntype) {
			data.insertColumn(0,required_columntype,'x');			
			var formatter = new google.visualization.TablePatternFormat('{0}'); // Convertion string -> number do not work. May possibly use javascript parseFloat or parseInt	   	
			formatter.format(data,[1],0);
			view.hideColumns([1]);
		}
		return view;
	}		
  	
  	var secds=0,mints=0,hours=0;
  	var timer_run = false;
  	
	function sendRequest() {
		document.getElementById("chart_div").innerHTML = "<img src='dots64.gif' id='wait_me'>";
		wrapper.setChartType("Table");
		var pig = encodeURIComponent(document.fields_form.pig.value);
		startTimer()
		//alert(pig);
		//pig_c = encodeMyPig(pig); Avroconnect?tq=select A&pig=' + pig
 		var query = new google.visualization.Query('Avroconnect?tq='+escape(document.fields_form.query.value)+'&columns=' + escape(document.fields_form.columns.value)+'&pig=' + pig);
 		query.send(handleDsResponse);
 	}
 	
	
	function startTimer() {
		secds=0;
		mints=0;
		hours=0;
		if (!timer_run) {
			setTimeout("shiftTime()",1000);
			timer_run = true;
			displayTime();
		}
	}
	
	function shiftTime() {
		if (!timer_run) return;
		secds++;
		if (secds > 59) {
			mints++;
			secds=0;
		}
		if (mints > 59) {
			hours++;
			mints=0;
		}
		displayTime();
		setTimeout("shiftTime()",1000);
	}
	
	function displayTime() {
		var s = secds.toString();
		if (secds < 10) s = "0"+s;
		var m = mints.toString();
		if (mints<10) m = "0"+m;
		document.getElementById("timer").innerHTML = hours+":"+m+":"+s;
	} 
	
	
	function encodeMyPig(pig) {
		var pig_c = pig.replace(";","..");
		pig_c = pig.replace("\n","__");
		return pig_c;
	}
	
	
	function getSVG() {	
		$("#svg_link").html("");
		if ($("iframe")) {
			var svg_elm = $("iframe").contents().find("svg");
			if (svg_elm == null) return ;
			$("iframe").contents().find("svg").attr({ version: '1.1' , xmlns:"http://www.w3.org/2000/svg"});
			var svg = $("iframe").contents().find("#chartArea").html();
			if (svg==null) return;
			var b64 = Base64.encode(svg);			
			 // Works in recent Webkit(Chrome)
		 	$("#svg_link").append($("<img src='data:image/svg+xml;base64,\n"+b64+"' width=1 height=1 alt='file.svg'/>"));
			// Works in Firefox 3.6 and Webit and possibly any browser which supports the data-uri
		 	$("#svg_link").append($("<a href-lang='image/svg+xml' href='data:image/svg+xml;base64,\n"+b64+"' title='file.svg' target='_blank'>Download</a>"));
			//alert(svg);
			//alert(document.getElementById(element).innerHTML);
		}
	}
	
	
	 // Handle the simple data source query response
	 
	function handleDsResponse(response) {
		document.getElementById("chart_div").innerHTML = ""; 
		timer_run = false;
		if (response.isError()) {
		    alert( response.getMessage() + '\n' + response.getDetailedMessage());			
		    return;
	   	}
				
	   	data = response.getDataTable();
		
		// Substitute milliseconds with minutes
		
		if (document.fields_form.columns.value.indexOf("_minsec")> 0) {
			var columns = document.fields_form.columns.value.split(",");
			for (var i=0; i<columns.length; i++){
				columns[i] = trim_spaces(columns[i]);
				if (columns[i].indexOf("_minsec")>0) {
					var id = columns[i].substring(0,columns[i].indexOf("_minsec"));
					var j;					
					var j=0; 
					while (j < data.getNumberOfColumns()) {
						if (data.getColumnId(j) == id) {
							data.insertColumn(j+1,"timeofday",id,id);
							data = addDateColumn(data, j, j+1);
							data.removeColumn(j);
							j = data.getNumberOfColumns();							
						}
						j++;
					}		
				}
			}
		}			
	   	drawGraph();
	}
	
	function addDateColumn(data, from, to) {
		for (i=0; i < data.getNumberOfRows(); i++) {
			var ms = data.getValue(i,from)/1000;
			var sec = ms % 60;
			ms = Math.floor(ms / 60);
			var mn = ms % 60;
			ms = Math.floor(ms / 60);
			var hour = ms % 24;
			data.setCell(i, to, [hour, mn, sec, 0]);
			//alert(hour+":"+mn+":"+sec+"\n"+data.getValue(i,to));
		}
		return data;
	}
	
	function trim_spaces(s) {
		var r = "";
		var i = 0;
		while (s[i] == ' ') i++;
		r = s.substring(i);
		i = r.length - 1;
		while (r[i] == ' ' && i > 0) i--;
		r = r.substring(0, i+1);
		return r;		
	}
	
	  
	function drawGraph() {
		if (data==null) return;
		addSystem2Title();
		wrapper.setDataTable(data);
		wrapper.setOption('title',document.fields_form.chart_title.value);
		google.visualization.events.addListener(wrapper, 'ready', getSVG);
		wrapper.draw();			
	}
	
	function reDrawGraph() {
		if (data==null) {
			alert("No data");
			return;
		}
		view = new google.visualization.DataView(data);
		var min = parseInt(document.fields_form.min.value);
    	var max = parseInt(document.fields_form.max.value);
    	if (!isNaN(min)) {
    		if (!isNaN(max)) {
    			view.setRows(min,max);	
    		} else {
    			alert("Max value is not a number");
	    		return;
    		} 
    			
    	} else {
    		alert("Min value is not a number");
    		return;
    	}	
    	wrapper.setDataTable(view);
		google.visualization.events.addListener(wrapper, 'ready', getSVG);
		wrapper.draw();
	}
	
	function resetRange() {
		wrapper.setDataTable(data);
		wrapper.draw();	
	}
	
		 
	function setName(name) {
		document.fields_form.pig.value = document.fields_form.pig.value.replace(/%default(\s)+cf(\s)+'tasks_[a-z]+'/i,"%default cf 'tasks_"+name+"'");
		addSystem2Title();
	}
    
	function getChartJSON() {
		var chart = "";
		chart = wrapper.toJSON();		
		document.fields_form.snippet.value = chart;		
	}
	
	function chartFromJSON(){
		//var new_wrapper = new google.visualization.ChartWrapper(document.fields_form.snippet.value);
		//new_wrapper.draw();
		//data = new_wrapper.getDataTable();
		//wrapper.setDataTable(data);
		
		wrapper = new google.visualization.ChartWrapper(document.fields_form.snippet.value);
		google.visualization.events.addListener(wrapper, 'ready', getSVG);
		wrapper.draw();
		data = wrapper.getDataTable();		
	}
	
	function newChartFromJSON() {
		$("#new_div").height(500);
		var json = document.fields_form.snippet.value;
		var new_wrapper = new google.visualization.ChartWrapper(json.replace("chart_div","new_div"));
		
		new_wrapper.draw();
		$("#new_div").append($("<div style=\"position:relative;float:left;margin-left:910px;top:-500px;padding:10px;background-color:#059;\"><input type=button value=clear onClick=\"hideNewDiv()\"></div>"));
	}

	
	function hideNewDiv() {
		$("#new_div").html("");
		$("#new_div").height(1);
	}
	
	function addSystem2Title() {
		if (document.fields_form.pig.value.length < 2) return;
		var patt_cheb = /%default(\s)*cf(\s)*'(\w)*_cheb'/i;
		var patt_lom = /%default(\s)*cf(\s)*'(\w)*_lom'/i;
		var patt_graph = /%default(\s)*cf(\s)*'(\w)*_gra'/i;
		if (patt_cheb.test(document.fields_form.pig.value)) addSysTitle("Chebyshev");
		else if (patt_lom.test(document.fields_form.pig.value)) addSysTitle("Lomonosov");	
		else if (patt_graph.test(document.fields_form.pig.value)) addSysTitle("GraphIt!");
		else alert("Didn't find matches")
	}	
	
	var setTitle=" ()";
	
	function addSysTitle(title) {
		var s = " ("+title+")";
		clearTitle();
		setTitle = " ("+title+")";
		if (document.fields_form.chart_title.value.length < 2) document.fields_form.chart_title.value = document.fields_form.chart_title.value + s;
		if (document.fields_form.chart_title.value.indexOf(title)<0) document.fields_form.chart_title.value = document.fields_form.chart_title.value + s;
		higlightSysButton(title);
	}
	
	function clearTitle() {
		var titles = ["Lomonosov","Chebyshev","GraphIt!"];
		document.fields_form.chart_title.value = document.fields_form.chart_title.value.replace(setTitle,"");
		for (var i=0;i< titles.length;i++) {
			document.fields_form.chart_title.value = document.fields_form.chart_title.value.replace("("+titles[i]+")","");
		}
	}
	
	function higlightSysButton(title) {
		if (title.indexOf("Lomonosov") >= 0) {
			$("#lom").addClass("selected");
			$("#cheb").removeClass("selected");
			$("#gra").removeClass("selected");
		}
		else if (title.indexOf("Chebyshev") >= 0) {
			$("#lom").removeClass("selected");
			$("#cheb").addClass("selected");
			$("#gra").removeClass("selected");
		} 
		else if (title.indexOf("GraphIt!") >= 0) {
			$("#lom").removeClass("selected");
			$("#cheb").removeClass("selected");
			$("#gra").addClass("selected");
		}
	}
	
	function checkPigParameters() {
		if (document.fields_form.pig.value.length < 2) return;
		var patt_startt = /%default(\s)*fstart_time/i;
		var patt_endt = /%default(\s)*fend_time/i;
		/*if (patt_startt.test(document.fields_form.pig.value) && patt_endt.test(document.fields_form.pig.value)) unhideBlock("#date_range");
		else hideBlock("#date_range");*/
		
		unhideBlock("#date_range");
		
		var top_patt = /%default(\s)*ntop/i;
		if (top_patt.test(document.fields_form.pig.value)) unhideBlock("#top_value");
		else hideBlock("#top_value");
	}
	
	function unhideBlock(block_id) {
		
		// check value
		if (block_id.indexOf("#top_value") >=0) {
			var ntop = document.fields_form.pig.value.match(/%default(\s)*ntop(\s)*(')*(\d)*(')*/i)[0];
			ntop = ntop.match(/(\d)+/)[0];	
			document.fields_form.ntop.value = ntop;
		}
		
		$(block_id).show(300);
	}
	
	function hideBlock(block_id) {
		$(block_id).hide(300);
	}
	
	
	var correction = 0;//3600000*12; // 1 hour in milliseconds
	
	function setStartDate() {		
		//var time = $.datepicker.formatDate( "@", $.datepicker.parseDate( "dd/mm/yy hh:mm:ss", document.fields_form.startdate.value));
		var time = new Date(document.fields_form.startdate.value);
		//time += document.fields_form.startdate.value
		document.fields_form.pig.value = document.fields_form.pig.value.replace(/%default(\s)*fstart_time(\s)*(-)*(\d)+L/i,"%default fstart_time "+ (Number(time) + Number(correction)) +"L");
	} 
	
	function setEndDate() {
//		var time = $.datepicker.formatDate( "@", $.datepicker.parseDate( "dd/mm/yy", document.fields_form.enddate.value));
		var time = new Date(document.fields_form.enddate.value);
		document.fields_form.pig.value = document.fields_form.pig.value.replace(/%default(\s)*fend_time(\s)*(-)*(\d)+L/i,"%default fend_time "+(Number(time) + Number(correction))+"L");
	}
	
	function setDates() {
		var date_patt = /(\d)+\/(\d)+\/(\d+)/i;
		var time="";
		if (date_patt.test(document.fields_form.startdate.value)) {
/*			time = $.datepicker.formatDate( "@", $.datepicker.parseDate( "dd/mm/yy", document.fields_form.startdate.value));
			document.fields_form.pig.value = document.fields_form.pig.value.replace(/%default(\s)*fstart_time(\s)*(-)*(\d)+L/i,"%default fstart_time "+(Number(time) + Number(correction))+"L");
*/
                        setStartDate();
		} else {
			document.fields_form.startdate.value = "";
		}
		if (date_patt.test(document.fields_form.enddate.value)) {
/*
			time = $.datepicker.formatDate( "@", $.datepicker.parseDate( "dd/mm/yy", document.fields_form.enddate.value));
			document.fields_form.pig.value = document.fields_form.pig.value.replace(/%default(\s)*fend_time(\s)*(-)*(\d)+L/i,"%default fend_time "+(Number(time) + Number(correction))+"L");
*/
                        setEndDate();
		} else {
			document.fields_form.enddate.value = "";
		}
	}
	
	
	function setTopValue() {
		if (document.fields_form.ntop.value.length > 0) {
			document.fields_form.pig.value = document.fields_form.pig.value.replace(/%default(\s)*ntop(\s)*(')*(\d)*(')*/i,"%default ntop "+document.fields_form.ntop.value);
		}
	}
	
	
	function setNodeList(){
	        var t=$("#nodelist").val();
	        var list=t.split(',');
	        var len=list.length;
	        var str="( node == '"+list[0]+"'";
	        
	        for(var i=1; i<len;i++){
	                str += " OR node == '"+list[i]+"'";
	        }
	        
	        str += " )";
	        
//		$("#pig_text").val($("#pig_text").val().replace(/node_start .* node_end/m, "node_start */ "+str+" /* node_end"));
                var rep=start_text.replace(/the_node_list/m, str);
                $("#pig_text").val(rep.replace(/%default(\s*)cfindic(\s*)'.*'/m, "%default cfindic '"+data_name+"'"));
                setDates();
	}
