// Part of HOPSA visualization module.
// Custom functions used to process data inside web browser.

// Must be called AFTER report_lib.js
// Output div is defined in message_div variable in report_lib.js

// Uses jQuery library.


//	append str to output div contents
function output(system_name,message,codition) {	
	var html = $("div#"+message_div).html(); 
	if (html == null) {
		alert(message);
		return;
	}
	if (html.length > 0) html = html + "\n";
// parse system name to define additional css class name for div with message
	var classname = "";
	if (system_name != null) {
		var sysname_lowercase = system_name.toLowerCase();
		switch (sysname_lowercase) {
			case "chebyshev": system_name = "cheb";break;
			case "lomonosov": system_name = "lom";break;
			case "graphit!": system_name = "gra";break;
			case "graphit": system_name = "gra";break;
		}
		classname = system_name + "_message";
	} 
	$("div#"+message_div).html(html+"<div class=\"warning "+classname+"\">"+message+"<div class=\"data\">"+codition+"</div></div>");
}


// Check avgwaittime_nq on system with name in arg[1].
// For chart type Number.
// Threshold in arg[0].
// reqest_elm - request tag
function check_waittime(reqest_elm,line,arg) {
	var value;  
	var threshold = arg[0];
// value - the value to be checked.
// if line is an array, check only first element
	if (line instanceof Array) value = line[0];
	else value = line;	
	if (parseFloat(value) > parseFloat(threshold)) output(arg[1],"User tasks on "+ arg[1]+" wait too long.", value+" > "+threshold+" sec");	
}


// check wait ime of cpu class of tasks
// threshhold is in arg[0]
// system name is in arg[1]
// reqest_elm - request tag
function class_waittime(reqest_elm,line,arg) {
	var value = line[1]; // values in the second column of data
	var system_name = jQuery(reqest_elm).attr("color");
	var threshold = arg[0];
	if (parseFloat(value) > parseFloat(threshold)) {
		output(system_name,"Tasks using "+line[0]+" CPUs on "+ arg[1]+" wait too long.", value+" > "+threshold+" sec");	
	}
}


// Check percentage for pie charts.
// arg[0] - threshold
// arg[1] - unique ID
// arg[2] - chart description to use in warnings
// tuple - array: [name, value] or null.
// First call this function with name-value tuples in tuple paramater,
// Last call this function with parameter tuple = null to calculate %-s for all values
// reqest_elm - request tag
function pie_threshold(reqest_elm,tuple,arg) {
	var obj_name = "object_"+arg[1];	
	if (window[obj_name] == null && tuple != null) {
// initialization			
		window[obj_name] = new Object();
		window[obj_name].sum = tuple[1];  		// sum - sum of all values
		window[obj_name].tuples = new Array(); 
		window[obj_name].tuples[0] = tuple; 	// pairs: name, value
		window[obj_name].i = 1;					// pairs array counter
	} else {
		if (tuple != null) {
// store values in window[obj_name]
			window[obj_name].sum += tuple[1];
			window[obj_name].tuples[window[obj_name].i] = tuple;
			window[obj_name].i++;
		} 
		else {
			var system_name = jQuery(reqest_elm).attr("color");
// calculate %-s	
// and check threshold
			for (var i=0; i < window[obj_name].i; i++ ) {
				window[obj_name].psnt =  Math.round(window[obj_name].tuples[i][1] / window[obj_name].sum * 1000) / 10;  // %-s with 0.1 precision
				if (window[obj_name].psnt > parseFloat(arg[0])) {
					output(system_name, "User "+window[obj_name].tuples[i][0]+" consumed too much "+ arg[2], window[obj_name].psnt +" > " +arg[0]+" %"); 
				}
			}
		}
	}	
}