// Process report files
// Part of HOPSA visualization module.
// To be used with report_lib.js.


// List of all processed requests
var processed_requests = new Array();

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
	
// "Toggability" - attribute of charts that can be slide-opened and slide-closed. Toggable charts are initially closed.
// To toggle chart use <h3> title before <div class='toggable> tag. These <h3> titles will be rendered as buttons that toggle visablility of the <div>.	
	if (maketoggable) {
// Next to <h1> title there will be rendered an "expand all" button.		
		$("h1").before('<input type="button" onClick="expandAll()" value="expand all" class="expandButton" />');
		$("div.toggable").each( function (i) {
// For each div.toggable tag add <h3> title before if not exists.										  
			var prev_h3 = $(this).prev("h3");
			if (prev_h3.length == 0) {
				$(this).before('<h3>'+defaultToggleButtonSign($(this))+'</h3>');
			}
		});
// Add class 'toggable' to <h3>.		
		$("div.toggable").prev("h3").addClass("toggable");
// Add event handler on click to <h3> to slide-open the next <div> tag.
		$("h3.toggable").click(function() {
			toggle($(this));
			/*if (!isOpened($(this))) {
				$(this).next("div").find("request").each( function(i) {				
					processRequest($(this));
				});
			}*/
			$(this).next("div").slideToggle('slow');
			
			return false;
		});
// For all not Number charts set min-height (in CSS class "request_diagramm").	
		$("request").not('[chart="Number"]').addClass("request_diagramm");
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
	if (!isOpened(h_elm)) {
		jQuery(h_elm).next("div").find("request").each( function(i) {							
			processRequest($(this));
		});	
		jQuery(h_elm).next("div").slideDown('slow');	
	}
}

function toggle(h_elm) {
	if (!isOpened(h_elm)) {
		jQuery(h_elm).next("div").find("request").each( function(i) {				
			processRequest($(this));
		});				
	}
}


/*
 * Process request tag options and prepare options for rendering chart: c_options,
 */
function processRequest(reqest_elm) 
{
	var id = jQuery(reqest_elm).attr("id");
	
// check if id in list of processed requests	
	if (processed_requests.indexOf(id) >= 0) return;
	processed_requests.push(id);

	var filename = "/avroconnect/"+jQuery(reqest_elm).attr("file");
	jQuery(reqest_elm).before("<div id=\""+id+"\" title=\""+jQuery(reqest_elm).attr("title")+"\">");
	jQuery(reqest_elm).after("</div>");
	
	
	// reference to description in Google Docs	
	if (jQuery(reqest_elm).attr("baseURL")!=null) {
		baseURL = jQuery(reqest_elm).attr("baseURL");
	}
	else jQuery(reqest_elm).attr("baseURL",baseURL);
	
	
	var c_options = initialOptions();
	c_options.chart.renderTo = id;
	c_options.title.text = jQuery(reqest_elm).attr("title");
	
// If chart attribute is not set in request tab, draw Column chart with options set in initialOptions().
	if (jQuery(reqest_elm).attr("chart")!=null) {
		c_options = setOptions(c_options, jQuery(reqest_elm).attr("chart"));
	}			
	c_options = additionalOptions(c_options, reqest_elm);
	$.ajax({
		url: filename,		
		success: function(data) {
			data = stripQuotes(data);
			var formattedData = null;
			var id = c_options.chart.renderTo;		
// Check if has custom function
// Custom function - attribute of tag <request>.
// Format: function = "function_name"
// Function is executed on every line of data.
// Output is added to tag with id in message_div variable	
			
// Function arguments should be defined in attribute arguments, delimited by ",".
			
			var custom_function = null;
			var args = null;
			if (jQuery(reqest_elm).attr("function")!=null) {
				custom_function=jQuery(reqest_elm).attr("function");
				var args_attr = jQuery(reqest_elm).attr("arguments");
				if (args_attr != null) args = args_attr.split(',');
			}
			
// Check if headers exist. Headers sample:  top_users_CPU_time   [SOURCE]   [DESCR]   00:02:09.348/00:00:00.2
			var headers = $("#"+id).prev("h4.filename");
			if (false) {
// Add headers if not exist.				
				$("#"+id).before(requestInfoHeader(reqest_elm, filename));
			}
			
// Detect error message in data: if starts with "--" it's an error message, otherwise it's data.	
			if (data.indexOf("--") == 0) {
				message = format_error_reply(data);
				$("#"+id).html("<div class='error'>"+message+"</div>");
				hideElement(reqest_elm);
				return;
			}
			
			if (c_options.chart.type =="Number") {			// Number chart
				formatNumber(reqest_elm,data,c_options,custom_function,args);			
				return;
			} 
			else if (c_options.chart.type=="pie") {			// Pie chart
				formattedData = format4pie(reqest_elm,data,custom_function,args);
				c_options.series.push({type:'pie', name: 'name', data : formattedData});
			}
			else if (c_options.chart.type == "line") {		// Line chart
				formattedData = formatData4Line(data);	
				c_options.series = formattedData.series;
				c_options.first_column_type = formattedData.first_column_type;
				if (!c_options.colors) c_options.colors = ['#0296C2','#629E02','#E38900','#75BF63','#829DE0'];
			} 
			else { 											// Cloumn chart
				formattedData = formatCSVdata(reqest_elm,data,c_options.yAxis.title.text,custom_function,args);
				if (formattedData.series.length < 1) {
					$("#"+id).html("<div class='empty'>No data</div>");
					hideElement(reqest_elm);
					return;
				}
				if (c_options.chart.type != null) {
					var type = c_options.chart.type;
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
			
			new Highcharts.Chart(c_options);
			//charts.push(chart);
		},
		mimeType: "text/csv",
		dataType: "text"
	});			
}


