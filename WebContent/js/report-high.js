var start_time = null;
var end_time = null;
var margin_time = 2; // sec
var colors = [];
colors["cheb"] = ["#477DD1","#65A9EB","#8FD1E6","#7D9AC9","#5269A3","#816C99","#FFC2EB","#C69CD9","#9A9AD9", "#376CBD","#74A6D6","#8FD1E6","#3F9DD1","#5561CF","#A17ECF","#D696C1","#9153AD","#9A9AD9"];
colors["lom"] = ["#0789B0","#68ACCC","#7BD1CB","#78BF82","#96D190","#C1CF7A","#CDB37F","#C9956F","#91B557","#69B369","#669474","#307C82", "#35A9BD","#5A98B3","#7BD1CB","#78BF82","#96D190","#C1CF7A","#CDB37F","#C9956F","#91B557"];
colors["gra"] = ["#EBCA77","#DDAB71","#E88585","#CFC38B","#539990","#247087","#5F7D5D","#EBCA77","#DDAB71","#E88585","#CFC38B","#539990","#247087","#5F7D5D"];
colors["bright"] = ["#50a002","#b0d000","#0296c2","#1740ca","#652d9f","#c5322b","#b26834","#ce9619","#3ca68a"];

var col_counter = 0;

$(document).ready(function() 
{
	maketoggable = true;
// baseURL - base path for accessing query descriptions in Google Docs. 
	var prop = $('div#baseURL').attr('baseURL');
// Default baseURL is set in this file. To redefine set it in <div id='baseURL' baseURL='...'> tag in report template,
// or in baseURL attribute inside any <request> tag. 
	if (prop != undefined) {
		baseURL = prop;
	}
	
	
// Check start and end time in report template HTML file
// If tags with <.. id="start_time"> and <.. id="end_time"> exist and are not empty, set start end end time for xAxis
	start_time = time4axis(parseInt($("#start_time").text()) - margin_time);
	end_time = time4axis(parseInt($("#end_time").text()) + margin_time);
	
// Initialize with correct values for timeofday-typed x-axis charts
	if (start_time != null) {
		var localOffset = start_time.getTimezoneOffset() * 60000;
		var UTC_start = new Date(start_time.getTime() + localOffset);
		year_dummy = UTC_start.getFullYear();
		month_dummy = UTC_start.getMonth();
		day_dummy = UTC_start.getDate();
	}
	
	
// "Toggability" - attribute of charts that can be slide-opened and slide-closed. Toggable charts are initially closed.
// To toggle chart use <h3> title before <div class='toggable> tag. These <h3> titles will be rendered as buttons that toggle visablility of the <div>.	
	if (maketoggable) {
// Next to <h1> title there will be rendered an "expand all" button.		
		$("h1").before('<input type="button" onClick="expandAll()" value="expand all" class="expandButton" />');
		$("div.toggable").each( function(i) {
// For each div.toggable tag add <h3> title before if not exists.		
			var prev_h3 = $(this).prev("h3");
			if (prev_h3.length == 0) {
				$(this).before('<h3>'+defaultToggleButtonSign($(this).find("request"))+'</h3>');
			} 					 
		});		
// Add class 'toggable' to <h3>.		
		$("div.toggable").prev("h3").addClass("toggable");
// Add event handler on click to <h3> to slide-open the next <div> tag.
		$("h3.toggable").click(function() {
			toggle($(this));	
			$(this).next("div").slideToggle('slow');
			return false;
		});
// For all not Number charts set min-height (in CSS class "request_diagramm").	
		$('request').not('[chart="Number"]').addClass("request_diagramm");
		$("request").each( function(i) {		
// Now process all requests that do not have <div class="toggable"> before them.
			var div_parents = $(this).parents("div.toggable").length;
			if (div_parents < 1) processRequest($(this));
		});
	} else {
		$("request").each( function(i) {
			processRequest($(this));
		});		
	}	
	
});

function expandAll() {
	$('h3.toggable').each( function(i) {
		expand($(this));
	});
}

function expand(h_elm) {
	jQuery(h_elm).next("div").slideDown('slow',process_request);
}


function process_request(elm) {
	$(this).find("request").each( function(i) {			
		var request_elm_id = $(this).attr("id");
		var div_elm = $("div#"+request_elm_id);
		if (div_elm == null || div_elm.length < 1) processRequest($(this));
	});
}

function toggle(h_elm) {
	if (!isOpened(h_elm)) {
		jQuery(h_elm).next("div").find("request").each( function(i) {				
			processRequest($(this));
		});				
	}
}

/*
 * Check if element (should be div.toggable) is opened.
 */
function isOpened(elm) {
	if (jQuery(elm).next("div").css("display") == "none") return false;
	return true;
}


function reprocessRequest(request_elm_id) {
	var request_elm = $("request#"+request_elm_id);
	var step= jQuery(request_elm).attr("step");
	if (step==null || step == 'false') {
		jQuery(request_elm).attr("step","true");
	} else {
		jQuery(request_elm).attr("step","false");
	}
	$("div#"+request_elm_id).remove();
	$("h4#h4_"+request_elm_id).remove();
	processRequest(request_elm);
}


function create_headers(id,html) {  // add H4 header before element with id
	var h4_elem = $("h4#h4_"+id);
	if (h4_elem == null || h4_elem.length < 1) {
		$("#"+id).before("<h4 id=\"h4_"+id+"\" class=\"filename\">"+html+"</h4>");
//						 <a href=\""+URL+file+"\" target=\"_blank\" title='open CSV file \""+file+"\"'>"+txtfilename+"</a> &nbsp; &nbsp; <a href=\"javascript:reprocessRequest('"+id+"')\"> transform </a>"+time_stat+"</h4>");
	}
}


function processRequest(reqest_elm) 
{
	var filename = "/avroconnect/"+jQuery(reqest_elm).attr("file");
	var id = jQuery(reqest_elm).attr("id");
	var div_elm = $("div#"+id);
	if (div_elm == null || div_elm.length < 1) {
		jQuery(reqest_elm).before("<div id=\""+id+"\" title=\""+jQuery(reqest_elm).attr("title")+"\">");
		jQuery(reqest_elm).after("</div>");
	}
	
	var c_options = {
		chart: {
			renderTo: id,
			defaultSeriesType: 'column',
			spacingBottom:25,
			marginBottom:50,
			zoomType: 'xy'
		},
		title : {
			text: jQuery(reqest_elm).attr("title"),
			align:'center'
		},
		xAxis: {
			categories: [],
			labels: {
				style: {
					fontSize:'7pt'
				}
			},
			title: {
				text: ''
			}
		},
		yAxis: {
			title: {
				text: ''
			}
		},
		legend: {
			align:'left',
			verticalAlign: 'bottom',
			y:22,
			x:50,
			floating: true,
			margin:5,
			borderWidth:0,
			backgroundColor: (Highcharts.theme && Highcharts.theme.legendBackgroundColorSolid) || 'white'
		},
		
		plotOptions: {
			column: {
				borderWidth: 1
			},
			line: {
				lineWidth:1
			}
		},			
		series: []
	};
	
	// Check start and end time in report template HTML file
	// If tags with <.. id="start_time"> and <.. id="end_time"> exist and are not empty, set start end end time for xAxis

	if (start_time != null) c_options.xAxis.min = start_time;
	if (end_time != null) c_options.xAxis.max = end_time;
		
	if (jQuery(reqest_elm).attr("chart")!=null) {
		c_options.chart.defaultSeriesType = jQuery(reqest_elm).attr("chart");
		if (jQuery(reqest_elm).attr("chart") == "pie") {
			c_options.series.type="pie";
			c_options.plotOptions = {pie:
					{
						allowPointSelect: true, 
						innerSize:'12%',
						cursor: 'pointer',
						DataLabels: {
							enabled:true,
							formatter: function() {
								return '<b>'+ this.point.name+'</b>:' + this.percentage +' %';
							}
						}
					}
				};
			c_options.title.style= {
				fontSize: '9pt'
			};
		} else if (jQuery(reqest_elm).attr("chart") == "column") {
			c_options.series.type="column";
		} else if (jQuery(reqest_elm).attr("chart") == "bar") {
			c_options.series.type="bar";
			c_options.legend.align = 'right';
			c_options.legend.x = 0;
			c_options.legend.y = -15;
		}
	}		
	if (jQuery(reqest_elm).attr("stacking")!=null) {
		c_options.plotOptions.column.stacking = jQuery(reqest_elm).attr("stacking");
	}
	if (jQuery(reqest_elm).attr("vaxis")!=null) {
		c_options.yAxis.title.text = jQuery(reqest_elm).attr("vaxis");
	}
	if (jQuery(reqest_elm).attr("color")!=null) {
		c_options.colors = colors[jQuery(reqest_elm).attr("color")];
	}
	if (jQuery(reqest_elm).attr("labelRotation") != null) {
		c_options.xAxis.labels = {
			rotation : jQuery(reqest_elm).attr("labelRotation"),
			align:'right'
		};
		c_options.chart.marginBottom = 100;
	}
	
	
	$.ajax({
		url: filename,
		statusCode: {
			404: function() {
				var id = c_options.chart.renderTo;
				$("#"+id).html("<div class='empty'>No data file</div>");
			}
		},
		success: function(data) {
			data = stripQuotes(data);
			var formattedData = null;
			var id = c_options.chart.renderTo;
			//var file = filename.substring(filename.lastIndexOf("/"));
			var file = filename.substring(filename.lastIndexOf("/")+1);
			var txtfilename = file;
			if (file.indexOf("~") > 0 ) txtfilename = file.substring(0,file.indexOf("~"));
			var URL = document.URL;
			URL = URL.substring(0,URL.lastIndexOf("/")+1);
			//if (file.length > 1) file = file.substring(1);
			if (data.length < 2) {
				if (jQuery(reqest_elm).attr("short")==null) { 
					create_headers(id,"<a href=\""+URL+file+"\" target=\"_blank\" title='open CSV file \""+file+"\"'>"+txtfilename+"</a>");
				}

				$("#"+id).html("<div class='empty'>No data</div>");
				return;
			} else {
				var time_stat = "";
				var timestat_filename = file.replace(".csv","-time.csv");
				var timestat_fullname = URL+timestat_filename;
				var time_val = UrlExists(timestat_fullname);
				if (time_val!=false) time_stat = "&nbsp;&nbsp;&nbsp;<a href=\""+URL+timestat_filename+"\" target=\"_blank\" title=\"Request/Processing time (hours:minutes:seconds.milliseconds). Link to values in milliseconds in CSV file.\">"+format_time_stat(time_val)+"</a>";
				if (jQuery(reqest_elm).attr("short")==null) { 	
					create_headers(id,"<a href=\""+URL+file+"\" target=\"_blank\" title='open CSV file \""+file+"\"'>"+txtfilename+"</a> &nbsp; &nbsp; <a href=\"javascript:reprocessRequest('"+id+"')\"> transform </a>"+time_stat);					
				}	
			}
			if (data.indexOf("--") == 0) {
				message = format_error_reply(data);
				$("#"+id).html("<div class='error'>"+message+"</div>");
				jQuery(reqest_elm).remove();
				return;
			}
			if (c_options.chart.defaultSeriesType =="Number") {
				var lines = data.split('\n');
				var value = "---";
				if (lines.length > 1) value = lines[1];
				else value = lines[0];		
				if (jQuery(reqest_elm).attr("short")==null) { 
					create_headers(id,c_options.title.text);
				}
				var units="";
				if (jQuery(reqest_elm).attr("vaxis")!=null) {
					units = getUnits(jQuery(reqest_elm).attr("vaxis"));
				}				
				$("div#"+id).html("<span class='number'>"+value+" "+units+"</span>");
				$("div#"+id).addClass("number");
				return;
			} 
			else if (c_options.series.type=="pie") {
				formattedData = format4pie(data);
				c_options.series.push({type:'pie', name: 'name', data : formattedData});
			}
			else if (c_options.chart.defaultSeriesType == "line" && jQuery(reqest_elm).attr("indexed") == null) {
				//formattedData = formatCSVdata(data,c_options.yAxis.title.text);							
				//c_options.series = formattedData.series;				
				formattedData = formatData4Line(data);	
				c_options.series = formattedData.series;
				if (jQuery(reqest_elm).attr("step")!=null) {
					c_options.series.step = true;
				}
				c_options.first_column_type = formattedData.first_column_type;
				
				if (c_options.series[0] == null) {
					//alert("Empty data file: " +file);
					$("#"+id).html("<div class='empty'>Null data</div>");
					//jQuery(reqest_elm).remove();
					return;
				}
				
				c_options.chart.type = 'line';
				c_options.chart.zoomType = 'xy';
				c_options.plotOptions = {
					line: {
						lineWidth: 1,
						states: {
							hover: {
								lineWidth: 2								
							}
						},
						marker: {
							enabled: false,
							states: {
								hover: {
									enabled: true,
									symbol:'circle',
									radius: 3,
									lineWidth:1
								}
							}
						},
						pointInterval: 100
					}
				};
				
				c_options.xAxis.type = 'datetime';
				c_options.xAxis.labels = { 
					formatter: function() {
						return Highcharts.dateFormat('%H:%M:%S', this.value);// +':'+this.value%1000;
					},
					step: 5,						
					rotation: -30,
					y: 30
				};	
				
				var tickStep = 10* 60 * 1000; // 10 min
				if (end_time - start_time > 0) tickStep = calculateTickStep(end_time - start_time);
				else if (formattedData.timespan!=null && formattedData.timespan>0) tickStep = calculateTickStep(formattedData.timespan); 
				var minorTickInterval = tickStep/10;
				
				c_options.xAxis.tickInterval = tickStep;
				c_options.tooltip = {
					formatter: function() {	
						var type = c_options.first_column_type;
						var date = "";
						if (type == "datetime") date = "["+Highcharts.dateFormat('%Y.%b.%d', this.x)+"] ";
							return '<b>'+ this.series.name +'</b><br/>'+ date +
								Highcharts.dateFormat('%H:%M:%S', this.x) +'.'+(this.x%1000)+' = '+ this.y;
					}
				};
				if (!c_options.colors) c_options.colors = ['#0296C2','#629E02','#E38900','#75BF63','#829DE0'];
			} 
			else if (c_options.chart.defaultSeriesType == "line" && jQuery(reqest_elm).attr("indexed") != null) {   // MULTILINE chart
				var names = jQuery(reqest_elm).attr("names");				
				formattedData = formatData4MultiLine(data,names);	
				if (jQuery(reqest_elm).attr("theme")!=null) setTheme(jQuery(reqest_elm).attr("theme"));
				c_options.series = formattedData.series;
				if (jQuery(reqest_elm).attr("step")!=null && jQuery(reqest_elm).attr("step")=="true") {
					c_options.chart.type = 'line';
					// Check that series is not null
					for (var i = 0; i < c_options.series.length; i++) {
						if (typeof c_options.series[i] == 'undefined') c_options.series[i] = {};
					}
					$.each(c_options.series, function(i,series) {
						series.step = true;						
					});
				}
				else {
					c_options.chart.type = 'spline';
				}
				//alert("timespan:"+formattedData.timespan);
				
				if (c_options.series.length < 1) {
					//alert("Empty data file: " +file);
					$("#"+id).html("<div class='empty'>Null data</div>");
					//jQuery(reqest_elm).remove();					
					return;
				}
				
				c_options.chart.zoomType = 'xy';
				c_options.plotOptions = {
					series: {
						marker: {
							enabled: false,
							states: {
                     		   hover: {
                            		enabled: true
								}
							}
						}
					},
					spline: {
						lineWidth: 1,
						states: {
							hover: {
								lineWidth: 2								
							}
						},
						marker: {
							enabled: false,
							states: {
								hover: {
									enabled: true,
									symbol:'circle',
									radius: 2,
									lineWidth:1
								}
							}
						}						
					},
					line: {
						lineWidth: 1
					}
				};
				c_options.xAxis.type = 'datetime';
				c_options.chart.spacingBottom = 5;
				c_options.chart.marginBottom = 100;		
				c_options.legend = {
					align:'left',
					verticalAlign: 'bottom',
					y:10,
					x:50,
					floating: true,
					margin:5,
					borderWidth:0,
					backgroundColor: (Highcharts.theme && Highcharts.theme.legendBackgroundColorSolid) || 'white'
				};
				
				var tickStep = 10* 60 * 1000; // 10 min
				if (end_time - start_time > 0) tickStep = calculateTickStep(end_time - start_time);
				else if (formattedData.timespan!=null && formattedData.timespan>0) tickStep = calculateTickStep(formattedData.timespan); 
				var minorTickInterval = tickStep/10;
				
				c_options.xAxis.tickInterval = tickStep;
				c_options.xAxis.minorTickInterval = minorTickInterval;
				c_options.xAxis.minorGridLineWidth = 1;
				c_options.xAxis.minorTickPosition= 'inside';
				c_options.xAxis.minorTickWidth= 1;
				c_options.xAxis.minorTickColor= '#fff';
				
				
				var type = formattedData.first_column_type;
				if (type == "datetime") 
				{
					c_options.xAxis.labels = { 
						formatter: function() {
							return Highcharts.dateFormat('<span style="color:#444">%b %d</span><br>%H:%M:%S', this.value);// +':'+this.value%1000;						
						},
						step: 1,						
						rotation: -45,
						y: 30
					};	
					c_options.tooltip = 
					{
						formatter: 					
							function() {	
								var type = c_options.first_column_type;
								var date = "";
								//date = "["+Highcharts.dateFormat('%Y.%b.%d', this.x)+"] ";
								return Highcharts.dateFormat('%Y %b %d %H:%M:%S', this.x)+'<br/><b>'+ this.series.name + ' = '+ this.y+'</b>';
							} 
						
					};
				}					
				else if (type == "time") 
				{
					c_options.xAxis.labels = { 
						formatter: function() {
							return Highcharts.dateFormat('%H:%M:%S', this.value);// +':'+this.value%1000;						
						},
						step: 1,						
						rotation: -45,
						y: 30
					};						
					c_options.tooltip = 
					{
						formatter: 	
							function() {	
								var type = c_options.first_column_type;
								var date = "";
								return Highcharts.dateFormat('%H:%M:%S', this.x)+'.'+(this.x%1000)+'<br/><b>'+ this.series.name + ' = '+ this.y+'</b>';
							}
					};
				}
				if (!c_options.colors) c_options.colors = ['#0296C2','#629E02','#E38900','#75BF63','#829DE0'];
			}
			else {
				formattedData = formatCSVdata(data,c_options.yAxis.title.text);
				if (formattedData.series.length < 1) {
					$("#"+id).html("<div class='empty'>No data</div>");
					hideElement(reqest_elm);
					return;
				}
				if (c_options.series.type != null) {
					var type = c_options.series.type;
					c_options.series = formattedData.series;
					c_options.series[0].type = type;
					if (formattedData.vaxis != null) c_options.yAxis.title.text = formattedData.vaxis;
					if (formattedData.haxis != null) c_options.xAxis.title.text = formattedData.haxis;
				} else {
					c_options.series = formattedData.series;
				}
				c_options.xAxis.categories = formattedData.categories;
			}
		
			// remove request tags
			hideElement(reqest_elm);
			
			var chart = new Highcharts.Chart(c_options);			
		},
		mimeType: "text/csv",
		dataType: "text"
	});		
}


function formatData4MultiLine(data,names_s) {  
//  Data format must be as follows:
//  TIMEOFDAY / DATETIME, value:NUMBER, series_number:NUMBER
	
	var first_column_type = "number";
	var lines = data.split('\n');
	var names = names_s.split(",");
	var number_correction = 1;  // If the smallest series number in CSV file is 1, must use number-1 for actual series numbers
	var redo = true;
	var maxtime = null;
	var mintime = null;
	
	// Initialization with number of names set in names_s
	var series = [];
	for (var i = 0; i < names.length; i++) {
	// create new element (line) in series
		if (names[i] == null) the_name = i;
		else the_name = names[i];
		series[i] = {name:the_name, data: [null]};
	}
	
	while (redo) {
		redo = false;
		for (var i=0; i<lines.length; i++) {
			var line = lines[i];
			var items = line.split(',');
			if (i==0) {
				var first_element_parts = items[0].split(':');
				if (first_element_parts.length > 1 && first_element_parts[1] != null) {
					first_column_type = first_element_parts[1];
					var time_pattern = /timeofday/i;
					var datetime_pattern = /datetime/i;
					if (first_column_type.search(time_pattern) >= 0) {  // First column in data file - datetime or timeofday
						 first_column_type = "time"; // TIMEOFDAY
					} else if (first_column_type.search(datetime_pattern) >= 0) {  // First column in data file - datetime or timeofday
						 first_column_type = "datetime"; // DATETIME
					}	
				}
				else first_column_type = "datetime";						
			} else {			
				series_number = parseInt(items[2]) - number_correction;   //  Number of the series
				if (isNaN(series_number)) continue;
				if (series_number < 0) {   // If 0 is used in the csv file for series numbers, redo with number_correction = 0
					number_correction = 0;
					redo = true;
					break;
				}				
				// insert new element into series			
				var the_time = 0;
				if (first_column_type == "time") {					
					the_time = parseTime(items[0]);
				} else if (first_column_type == "datetime") {
					the_time = parseDate(items[0]);
				}			
				if (maxtime==null) maxtime = the_time;
				else if (the_time > maxtime) maxtime = the_time;
				if (mintime==null) mintime = the_time;
				else if (the_time < mintime) mintime = the_time;
				
				if (typeof series[series_number] == "undefined") series[series_number] = {name:"line "+series_number, data: [null]};
				series[series_number].data.push([the_time,parseFloat(items[1])]);			
			}		
		}	
	}	
	return {series:series,timespan: maxtime-mintime,first_column_type:first_column_type};
}


function formatData4Line(data) {
	var series = [];
	var first_column_type = "number";
	var lines = data.split('\n');
	for (var i=0; i<lines.length; i++) {
		var line = lines[i];
		var items = line.split(',');
		if (i==0) {
			var first_element_parts = items[0].split(':');
			if (first_element_parts.length > 1 && first_element_parts[1] != null) first_column_type = first_element_parts[1];
			var time_pattern = /timeofday/i;
			var datetime_pattern = /datetime/i;
			if (first_column_type.search(time_pattern) >= 0) {  // First column in data file - datetime or timeofday
				 first_column_type = "time"; // TIMEOFDAY
			} else if (first_column_type.search(datetime_pattern) >= 0) {  // First column in data file - datetime or timeofday
				 first_column_type = "datetime"; // DATETIME
			}
			for (var j=1; j<items.length; j++) {  // j is a number of column
				series.push({name:seriesName(items[j]), data:[]}); 
				//series[j-1].data[0] = [];
			}
		} else {
			for (var j=1; j<items.length; j++) {
				var dat = parseFloat(items[j]);
				if (dat == null) dat = 0;
				if (first_column_type == "time") {					
					series[j-1].data.push([parseTime(items[0]),dat]);
				} else if (first_column_type == "datetime") {
					series[j-1].data.push([parseDate(items[0]),dat]);
				}
				else if (first_column_type == "number") series[j-1].data.push([parseFloat(items[0]),dat]);
				else series[j-1].data.push([items[0],dat]);
			}
		}		
	}	
	return {series:series,first_column_type:first_column_type};
}





var year_dummy = 2011;
var day_dummy = 1;
var month_dummy = 3;
var last_hour = 0;

function daysInMonth(month,year) {
    return new Date(year, month, 0).getDate();
}


function parseTime(time_s) {
	// time_s is of format: 17:41:00
	var parts = time_s.split(":");
	var hour = parts[0];
	if (hour == null) hour = 0;
	
	if (hour < last_hour) {		
		day_dummy++;
		if (day_dummy > daysInMonth(month_dummy,year_dummy)) {
			day_dummy = 1;
			month_dummy++;
			if (month_dummy > 11) {
				month_dummy = 0;
				year_dummy++;
			}
		}
	}
	last_hour = hour;
	
	var min = parts[1];
	if (min == null) min = 0 ;
	var sec = parts[2];
	if (sec == null) sec = 0;
	var date = Date.UTC(year_dummy,month_dummy,day_dummy,hour,min,sec);
	return date;
}


function parseTime_nodate(time_s) {
	// time_s is of format: 21:03:20.12
	var main_parts = time_s.split(".");
	var tparts = main_parts[0].split(":");
	var hour = tparts[0];
	if (hour == null) hour = 0;
	var min = tparts[1];
	if (min == null) min = 0 ;
	var sec = tparts[2];
	if (sec == null) sec = 0;
	var msec = 0;
	if (main_parts[1]!=null) msec = main_parts[1];
	var date = Date.UTC(2000,1,1,hour,min,sec,msec);
	return date;
}

function parseDate(datetime_s) {
	// datetime_s is of format: 2012-03-02 21:03:20
	var main_parts = datetime_s.split(" ");
	var dparts = main_parts[0].split("-");
	var tparts = main_parts[1].split(":");
	var year = dparts[0];
	if (year == null) year = 2012;
	var month = dparts[1]-1;
	if (month == null || month < 0) month = 0;
	var day = dparts[2];
	if (day == null) day = 1;
	var hour = tparts[0];
	if (hour == null) hour = 0;
	var min = tparts[1];
	if (min == null) min = 0 ;
	var sec = tparts[2];
	if (sec == null) sec = 0;
	var date = Date.UTC(year,month,day,hour,min,sec);
	return date;
}

function format4pie(data) {
	var fdata = []; 
	var lines = data.split('\n');
	$.each(lines,function(lineN,line) {
		if (lineN > 0 && line.length > 1) {				  
			var items = line.split(',');	
			var d = parseFloat(items[1]);
			fdata.push([items[0], d]);
		}
	});
	return fdata;
}

function getUnits(str) {
	// Parse vertical axis title for units.
	// In case title has format: 'something (units)', units taken from brackets,
	// otherwais units - is the last word.
	
	var bracketed_pattern = /\(([\w,%]*)\)/;
	var matches = str.match(bracketed_pattern);
	if (matches != null && matches.length > 1) {
		//alert("units: "+ matches[1]);
		return matches[1];
	}
	
	// last word
	// trim trailing spaces
	for (i = str.length - 1; i >= 0 && str.charAt(i) == ' '; i--) {
			str = str.substring(0, i + 1);			
	}
	
	var last_space = str.lastIndexOf(" ");
	if (last_space > 0 && last_space < str.length) return str.substring(last_space+1);
}

function setVaxis(vaxis, units) {
	// Inserts units into vaxis on correct place
	var bracketed_pattern = /\((\w*)\)/;
	var matches = vaxis.match(bracketed_pattern);
	if (matches != null && matches.length > 1) {
		vaxis = vaxis.replace(/\((\w*)\)/g,"("+units+")");
	} else {
		// last word
		// trim trailing spaces
		for (i = vaxis.length - 1; i >= 0 && vaxis.charAt(i) == ' '; i--) {
				vaxis = vaxis.substring(0, i + 1);			
		}
		var last_space = vaxis.lastIndexOf(" ");
		vaxis = vaxis.substring(0,last_space) + units;
	}
	return vaxis;
}

function getReduceTrigger(units) {
	if (units == "sec") return 600;
	else if (units == "CPUsec") return 600;
	else if (units == "min") return 120;
	else if (units == "CPUmin") return 120;
	else if (units == "hours") return 72;
	else return 0;  // do not reduce values
}

function reduceValues(reducer,units) {
	var unit_reduce_values = []; // units, reducer, new_units triples
	unit_reduce_values.push({units:"sec",reducer:60,new_units:"min"});
	unit_reduce_values.push({units:"CPUsec",reducer:60,new_units:"CPUmin"});
	unit_reduce_values.push({units:"min",reducer:60,new_units:"hours"});
	unit_reduce_values.push({units:"CPUmin",reducer:60,new_units:"CPUhours"});
	unit_reduce_values.push({units:"hours",reducer:24,new_units:"days"});
	for (var i=0; i < unit_reduce_values.length; i++){
		if (units==unit_reduce_values[i].units) {
			reducer = reducer * unit_reduce_values[i].reducer;
			units = unit_reduce_values[i].new_units;
			break;
		}
	} 
	return [reducer, units];
}


function setTheme(theme_name) {
	/**
	 * Gray theme for Highcharts JS
	 * @author Torstein H�nsi
	 */
	
	Highcharts.theme = {
	   colors: ["#DDDF0D", "#7798BF", "#55BF3B", "#DF5353", "#aaeeee", "#ff0066", "#eeaaee",
		  "#55BF3B", "#DF5353", "#7798BF", "#aaeeee"],
	   chart: {
		 backgroundColor: {
			 linearGradient: [0, 0, 0, 400],
			 stops: [
				[0, 'rgb(96, 96, 96)'],
				[1, 'rgb(26, 26, 26)']
			 ]
		  },
		  borderWidth: 0,
		  borderRadius: 5,
		  plotBackgroundColor: null,
		  plotShadow: false,
		  plotBorderWidth: 0,
		  marginLeft: 60,
		  spacingBottom:0,
		  spacingTop: 0
	   },
	   title: {
		  style: {
			 color: '#FFF',
			 font: '16px Lucida Grande, Lucida Sans Unicode, Verdana, Arial, Helvetica, sans-serif'
		  }
	   },
	   subtitle: {
		  style: {
			 color: '#DDD',
			 font: '12px Lucida Grande, Lucida Sans Unicode, Verdana, Arial, Helvetica, sans-serif'
		  }
	   },
	   xAxis: {
		  gridLineWidth: 1,
		  gridLineColor: 'rgba(155, 155, 155, .1)',
		  tickColor: 'rgba(155, 155, 155, .1)',		  
		  labels: {
			 style: {
				color: '#999',
				fontWeight: 'bold'
			 }
		  },
		  title: {
			 style: {
				color: '#AAA',
				font: 'bold 12px Lucida Grande, Lucida Sans Unicode, Verdana, Arial, Helvetica, sans-serif'
			 }
		  }
	   },
	   yAxis: {
		  alternateGridColor: null,
		  //minorTickInterval: null,
		  gridLineColor: 'rgba(255, 255, 255, .1)',
		  labels: {
			 style: {
				color: '#999',
				fontWeight: 'bold'
			 }
		  },
		  title: {
			 style: {
				color: '#AAA',
				font: 'bold 12px Lucida Grande, Lucida Sans Unicode, Verdana, Arial, Helvetica, sans-serif'
			 }
		  }
	   },
	   legend: {
		  itemStyle: {
			 color: '#ccc'
		  },
		  itemHoverStyle: {
			 color: '#FFF'
		  },
		  itemHiddenStyle: {
			 color: '#333'
		  }
	   },
	   labels: {
		  style: {
			 color: '#CCC'
		  }
	   },
	   tooltip: {
		  backgroundColor: {
			 linearGradient: [0, 0, 0, 50],
			 stops: [
				[0, 'rgba(36, 36, 36, .6)'],
				[1, 'rgba(6, 6, 6, .6)']
			 ]
		  },
		  borderWidth: 0,
		  style: {
			 color: '#FFF'
		  }
	   },
	
	
	   plotOptions: {
		  line: {
			 dataLabels: {
				color: '#CCF'
			 },
			 marker: {
				lineColor: '#333'
			 }
		  },
		  spline: {
			 marker: {
				lineColor: '#333'
			 }
		  },
		  scatter: {
			 marker: {
				lineColor: '#333'
			 }
		  },
		  candlestick: {
			 lineColor: 'white'
		  }
	   },
	
	   toolbar: {
		  itemStyle: {
			 color: '#CCC'
		  }
	   },
	
	   navigation: {
		  buttonOptions: {
			 backgroundColor: {
				linearGradient: [0, 0, 0, 20],
				stops: [
				   [0.4, '#606060'],
				   [0.6, '#333333']
				]
			 },
			 borderColor: '#000000',
			 symbolStroke: '#C0C0C0',
			 hoverSymbolStroke: '#FFFFFF'
		  }
	   },
	
	   exporting: {
		  buttons: {
			 exportButton: {
				symbolFill: '#55BE3B'
			 },
			 printButton: {
				symbolFill: '#7797BE'
			 }
		  }
	   },
	
	   // scroll charts
	   rangeSelector: {
		  buttonTheme: {
			 fill: {
				linearGradient: [0, 0, 0, 20],
				stops: [
				   [0.4, '#888'],
				   [0.6, '#555']
				]
			 },
			 stroke: '#000000',
			 style: {
				color: '#CCC',
				fontWeight: 'bold'
			 },
			 states: {
				hover: {
				   fill: {
					  linearGradient: [0, 0, 0, 20],
					  stops: [
						 [0.4, '#BBB'],
						 [0.6, '#888']
					  ]
				   },
				   stroke: '#000000',
				   style: {
					  color: 'white'
				   }
				},
				select: {
				   fill: {
					  linearGradient: [0, 0, 0, 20],
					  stops: [
						 [0.1, '#000'],
						 [0.3, '#333']
					  ]
				   },
				   stroke: '#000000',
				   style: {
					  color: 'yellow'
				   }
				}
			 }
		  },
		  inputStyle: {
			 backgroundColor: '#333',
			 color: 'silver'
		  },
		  labelStyle: {
			 color: 'silver'
		  }
	   },
	
	   navigator: {
		  handles: {
			 backgroundColor: '#666',
			 borderColor: '#AAA'
		  },
		  outlineColor: '#CCC',
		  maskFill: 'rgba(16, 16, 16, 0.5)',
		  series: {
			 color: '#7798BF',
			 lineColor: '#A6C7ED'
		  }
	   },
	
	   scrollbar: {
		  barBackgroundColor: {
				linearGradient: [0, 0, 0, 20],
				stops: [
				   [0.4, '#888'],
				   [0.6, '#555']
				]
			 },
		  barBorderColor: '#CCC',
		  buttonArrowColor: '#CCC',
		  buttonBackgroundColor: {
				linearGradient: [0, 0, 0, 20],
				stops: [
				   [0.4, '#888'],
				   [0.6, '#555']
				]
			 },
		  buttonBorderColor: '#CCC',
		  rifleColor: '#FFF',
		  trackBackgroundColor: {
			 linearGradient: [0, 0, 0, 10],
			 stops: [
				[0, '#000'],
				[1, '#333']
			 ]
		  },
		  trackBorderColor: '#666'
	   },
	
	   // special colors for some of the demo examples
	   //legendBackgroundColor: 'rgba(48, 48, 48, 0.8)',
	   legendBackgroundColorSolid: 'rgba(16, 16, 16, .1)',
	   dataLabelsColor: '#444',
	   textColor: '#E0E0E0',
	   maskColor: 'rgba(255,255,255,0.3)'
	};
	
	// Apply the theme
	var highchartsOptions = Highcharts.setOptions(Highcharts.theme);
	
}

function UrlExists(url)
{
    var http = new XMLHttpRequest();
    http.open('GET', url, false);
    http.send();
    if (http.status==404) return false;
	else return http.responseText;
}

function format_time_stat(time_val) {  
// format CSV file:
// NNN1,Request
// NNN2,Processing
// into: NNN1 (min:sec:ms) / NNN2 (min:sec:ms)
	var time_stat = "";
	var two_lines = time_val.split("\n");
	var request_values = two_lines[0].split(",");
	time_stat = ms2readable_time(request_values[0]);
	if (two_lines.length > 0) {
		var processing_values = two_lines[1].split(",");
		time_stat += "/"+ms2readable_time(processing_values[0]);
	}
	return time_stat;
}

function ms2readable_time(ms) {
// return time in ms in human readable form: days hours:mins:secs.ms
	var readable_time = "";
	var days = Math.floor(ms / 1000 / 60 / 60 / 24);
	if (days > 0) {
		readable_time = days+" days ";
		ms = ms - days * 24*60*60*1000;
	}
	hours = Math.floor(ms / 1000 / 60 / 60);
	if (hours > 0) {
		if (hours < 10) {
			readable_time += "0" + hours + ":";
		} else {
			readable_time += hours + ":";
		}
		ms = ms - hours * 60*60*1000;
	}
	else  {
		readable_time += "00:";
	}
	mins = Math.floor(ms / 1000 / 60 );
	if (mins > 0) {
		if (mins < 10) {
			readable_time += "0" + mins + ":";
		} else {
			readable_time += mins + ":";
		}
		ms = ms - mins * 60*1000;
	}
	else {
		readable_time += "00:";
	}
	secs = Math.floor(ms / 1000);
	if (secs > 0) {
		if (secs < 10) {
			readable_time += "0" + secs + ".";
		} else {
			readable_time += secs + ".";
		}
		ms = ms - secs * 1000;
	}
	else {
		readable_time += "00.";
	}
	readable_time +=ms
	return readable_time;
}

function time4axis(time) {
	if (time == null || time.length < 1) return null;	
	// time - epoch time in seconds
	var date = new Date(time*1000); //  constructor needs time in milliseconds
	// correct time zone offset
	var offset_minutes = date.getTimezoneOffset();
	//alert("offset: "+offset_minutes);
	if (offset_minutes != 0) {
		var correction = offset_minutes * 60 * 1000; // correction time in milliseconds
		date = new Date((time*1000) - correction);
	}
	if (isNaN(date.getTime())) {
		return null;
	}
	return date;
}


function calculateTickStep(timespan) {
	// Calculates tick step value, based on time span of values
	// Ticks are for time-typed x-axis 
	// Makes no more than 10 ticks
	// Steps are:
	// 1 sec, 5 sec, 10sec, 30 sec, 1 min, 5 min, 10 min, 30 min, 1 h, 5 h, 10 h, 1 day, 2 days, 5 days
	
	var tick_step = 1000; // 1 sec 
	var tick_increase_steps = [5,2,3,2,5,2,3,2,5,2,2.4,2,2.5];
	i = 0;
	while (timespan / 20  > tick_step && tick_increase_steps[i] != null) {
		tick_step = tick_step * tick_increase_steps[i];   
		i++;
	}
	return tick_step;
}


function getColor(elm) {
	var col = jQuery(elm).attr("color");
	if (col !=null && col.length > 0) return colors[col];
	else return nextColor();
}

function nextColor() {
	var col = colors[col_counter];
	col_counter++;
	if (col_counter >= colors.length) col_counter = 0;
	return col;
}

function formatCSVdata(data,vaxis) {
	// 1st cell of 1st row -> categories_form
	// 1st column (without 1st row) -> categories 
	// 1st row (without 1st column) -> series
	// all other cells go to series.data
	// data parsed as float
	
	var categories = [];
	var series = []; 
	
	var units = getUnits(vaxis);
	var reducer = 1;    // divider to reduce large values and change units
	var startover = true;
	var max_value_before_reduce;
	var have_months = false;  // convert numbers to month names
	var have_wdays = false;  // convert numbers to week days 1 = Mon
	have_wdays_google = false; //  google query language produced wdays. 1 = Sun
	var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
	var wdays = ["","Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
	var wdays_google = ["","Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
	var haxis = "";
	var lines = data.split('\n');
	while (startover) {
		max_value_before_reduce = getReduceTrigger(units);
		startover = false;
		for (var lineN = 0; lineN < lines.length && startover == false; lineN++) {
			var line = lines[lineN];
			if (line.length > 1) {				  
				var items = line.split(',');		
				if (lineN == 0) {
					$.each(items,function(itemN,item) {
						if (itemN > 0) series.push({name:seriesName(item), data: []});
						else {
							//categories_form = item;
							if (item.indexOf("month")>=0) have_months = true;
							else if (item.indexOf("wday")>=0) have_wdays = true;
							else if (item.indexOf("dayofweek")>=0) have_wdays_google = true;
							else if (item.indexOf("hour")>=0) haxis = "hours";
							else if (item.indexOf("min")>=0) haxis = "minutes";
							else if (item.indexOf("sec")>=0) haxis = "seconds";
						}
					});
				}
				else {
					for (var itemN = 0; itemN < items.length && startover == false; itemN++) {
						var item = items[itemN];
						if (itemN == 0) {
							if (have_months) categories.push(months[parseInt(item)]);
							else if (have_wdays) categories.push(wdays[parseInt(item)]);
							else if (have_wdays_google) categories.push(wdays_google[parseInt(item)]);
							else categories.push(item);
						}
						else {
							var d = parseFloat(item);
							d = Math.floor((d/reducer)*1000) / 1000;
							if (max_value_before_reduce > 0 && d > max_value_before_reduce) {
								var tmp = reduceValues(reducer,units);
								reducer = tmp[0];
								units = tmp[1];
								categories = [];
								series = [];
								startover = true;
								break;
							}
							if (isNaN(d)) d = 0;
							if (series[itemN-1] == undefined) series.push({name:item, data: []});
							series[itemN-1].data.push(d);
						}
					}	
				}
			}
		}
	}
	if (units != null) vaxis = setVaxis(vaxis,units);
	return {
		categories: categories,
		series: series,
		vaxis: vaxis,
		haxis: haxis
	}
}

function stripQuotes(s) {
	s = s.replace(/"/g,"");
	return s;
}


function seriesName(item) {
	var s = item.split(":");
	if (s.length > 0) {
		var t = s[0].split(" ");
		if (t.length > 0) {
			return t[0];
		}
		return s[0];
	}
	return item;
}


function hideElement(elm) {
	jQuery(elm).css('display','none');
}

function defaultToggleButtonSign(elm) {	
	var title = jQuery(elm).attr("title");
	if (jQuery(elm).attr("title") != null) return jQuery(elm).attr("title");
	else return "open chart";
}

function format_error_reply(data) {
	var message = data.substring(2); // remove "--"
	message = message.replace(/\n/,"<br/>\n");
	return message;
}