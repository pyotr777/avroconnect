/* This program is a part of Visualization module of HOPSA project.
 * 
 * The program is a servlet working under Tomcat. It generates reports based on templates.
 * These include two kinds of templates:
 * 		Report templates - HTML files with <request> tags.
 * 		Request templates - text files with query in Pig or Hoplang, column description and optional Google Query Language query.  
 * 
 * Request templates should include:
 * a. DB query in Hoplang or Pig Latin in parameter "pigquery";
 * b. Columns descriptions in parameter "columns";
 *    Description format: columnname_columntype_columnunits - name, type and unit of measurement for the column data, all separated with commas.
 *    If column type is omitted, TEXT (String) is used.
 *    Other possible column types:
 *      "num" for NUMBER
 *      "minsec" for NUMBER (for compatibility)
 *      "time" tor TIMEOFDAY
 *      "date" for DATE
 *      "datetime" for DATETIME
 *    Types are listed in com.google.visualization.datasource.datatable.value.ValueType
 *    Sample columns description: "queue, day_date, avglength_num_jobs". - Respond must include three columns: text column (name of a queue), date column and number column (number of jobs).
 * c. Complementary Google Query Language query in parameter "googlequery"
 *	Google query is executed on results of Pig (Hoplang) query, before data is sent back to the client.
 *  
 * <request> tags in Report templates are substituted with actual data charts.
 * <request> tag attributes:
 * 		id - unique id string,
 * 		file - request template file name with parameters. Format: file="filename~parameter1_value1!parameter2_value2!..."
 * 			Filename should not include extention.
 * 			Request results (data) is written into CSV file. CSV file name will include parameters and their values, unless
 * 			an HTTP parameter "filename" is received. 
 * 		chart - chart type to use. Possible values are: column (default), bar, line, pie, Number.
 * 		title - chart title,
 * 		vaxis - vertical axis title,
 * 		etc.
 * 		Only "id" and "filename" are sensitive for this servlet. Other attributes are parsed on client side.
 * 		 
 * Report templates may include parameters in format: <<parameter_name:default_value>>. Values are taken from HTTP request parameters with the same name. 
 * Request templates may include parameters in same format. Values are taken from request attribute of corresponding <request> tag in report template 
 * or from HTTP request parameters. 	
 * 			 
 * Workflow:
 *  1. Receive request from web client.
 *  2. Read configuration file
 *  3. Create folder for writing report, data files, log files, etc.
 *  4. Read report template file.
 *  5. Substitute parameter placeholders with values in report template file.
 *  6. Parse <request> tags.
 *  7. Prepare query for Analysis module.
 *  8. Send request to Analysis module.
 *  9. Convert dates from milliseconds from epoch time to human-readable format.	 
 * 10. Create DataTable.
 * 11. Apply Google query.
 * 12. Save report file.
 * 13. Set servlet response.
 */

import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import java.text.ParseException;
import java.util.Calendar;
import java.util.GregorianCalendar;
import java.util.HashSet;
import java.util.Hashtable;
import java.util.Iterator;
import java.util.List;
import java.util.TimeZone;
import java.io.*;
import java.net.ConnectException;
import java.net.SocketTimeoutException;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.servlet.*;

import org.apache.commons.io.FileUtils;

import com.google.visualization.datasource.DataSourceHelper;
import com.google.visualization.datasource.DataSourceRequest;
import com.google.visualization.datasource.base.DataSourceException;
import com.google.visualization.datasource.base.ReasonType;
import com.google.visualization.datasource.datatable.DataTable;
import com.google.visualization.datasource.datatable.TableCell;
import com.google.visualization.datasource.datatable.TableRow;
import com.google.visualization.datasource.datatable.ValueFormatter;
import com.google.visualization.datasource.datatable.value.BooleanValue;
import com.google.visualization.datasource.datatable.value.DateTimeValue;
import com.google.visualization.datasource.datatable.value.DateValue;
import com.google.visualization.datasource.datatable.value.NumberValue;
import com.google.visualization.datasource.datatable.value.TextValue;
import com.google.visualization.datasource.datatable.value.TimeOfDayValue;
import com.google.visualization.datasource.datatable.value.Value;
import com.google.visualization.datasource.datatable.value.ValueType;
import com.ibm.icu.util.ULocale;

public class MakeReport extends HttpServlet {
	
	static private boolean write_debug = false; 				// write debug logs to stdout	
	 
	static private final long serialVersionUID = 20120927L;	
	static private int count = 0;								// count - counter for simultaneous MakeReport threads
	static private int abscounter = 0;							// abscounter - counter for MakeReport calls since servlet start 
																// abscounter is used to idetify job in logs.
	
// parameter_placeholder_pattern for finding parameter placeholders in report tenplates and request templates.
	static private final Pattern parameter_placeholder_pattern = Pattern.compile("<<([\\w\\d\\+\\-_:\\.\\s]*)>>");  	
// Delimiter in parameter placeholders: <<parameter_name:default_value>>	
	static private final String placeholder_delimiter = ":"; 	
// Delimiter in request tags: <request file="requestname~parameters" >	
	static private final String requestname_parameters_delimiter = "~";
// Delimiter in request tag parameters: <request file="requestname~parameter1!parameter2!parameter3" >
	static private final String pairs_delimiter = "!"; 				
// Delimiter in request tag parameters: <request file="requestname~parametername_parametervalue!..." >
	static private final String parameter_value_delimiter = "_"; 	
// today_pattern is for finding special notations inside parameter placeholders: today-N, which denotes N days before today.	
	static private final Pattern today_pattern = Pattern.compile("today\\s*[\\+\\-]+\\s*(\\d*)"); 					
// request_pattern if for finding <request> tags in report template.	
	static private final Pattern request_pattern = Pattern.compile("<request(.*)?file=\"(([\\w~!_\\+\\-\\d])*)?\"([^>]*)>",Pattern.MULTILINE);	
	
	static private Boolean saveRawResult = true; 				// Save raw data from Analysis module to a file
	
	final int maxJD = 16;  									// Maximum number of simultaneous jobs. 
// 16 is the maximum number of simultaneous requests for Hoplang server.
	final String hopserver_address = "cluster.parallel.ru";	// Part of Hoplang server address.
	final String reports_folder = "reports/auxiliary/";		// Report folder will be create inside this folder.
	
	;
	public void init() throws ServletException {
		LogWriter.writeLog(Integer.toString(abscounter),"INF","Servlet initialization.","MakeReport v."+serialVersionUID);
	}	
	
	private synchronized int[] inc() {
		abscounter++;
		count++;
		int[] counters = {abscounter, count};
		return counters;
	}
	
	public void doGet(HttpServletRequest http_request, HttpServletResponse response)	throws ServletException, IOException {
		
		int[] counters;  							
		int abscount_local;
		
// Start measuring time  
		long startTime = System.nanoTime();  

// Increment counters		
		counters = inc(); 													
		abscount_local = counters[0];									
		LogWriter log_writer = new LogWriter(abscount_local,"Makereport",getServletContext().getRealPath("/"));
// Log time of execution start and job parameters to stdout (Apache log file)
		log_writer.write("AZ","NEW job, thread #"+counters[1]+ ", conf="+http_request.getParameter("conf")+", from "+http_request.getRemoteAddr());		
			    
// Define configuration file path
		String conffilename = http_request.getParameter("conf");
		if (conffilename==null || conffilename.length()<1) conffilename = "config";
		String conf_path=getServletContext().getRealPath(conffilename+".txt");		
		
		RequestHelper requestor;		
		try {
// 2. 
// Read configuration file			
			requestor = new RequestHelper(conf_path,getServletContext());
		}
		catch (Exception e) {
			setErrorResponse(log_writer,"Error reading config file "+conf_path+". "+e.getMessage(), http_request, response, null);
			return;
		}
		
// Check max number of instances
	    if (requestor.address.indexOf(hopserver_address) >= 0) {						
// If connecting to Hoplang server
	    	if (count > maxJD){
	    		setErrorResponse(log_writer,"Too many instances of servlet. Max = "+maxJD+". Instance closed.", http_request, response, null);
				return;
	    	}
	    }
	    
// Set name of directory for writing report. 
// If HTTP parameter 'folder' is set, use it as folder name.		
		String report_dir_name = http_request.getParameter("folder");  								
		if (report_dir_name != null && report_dir_name.length() > 0) {
			report_dir_name = reports_folder+report_dir_name+"/";
		} else {
// If no "folder" parameter, use default: reports/yyyy/mmdd (date = today)
			report_dir_name = dirNameFromCalendar();						 
		}
// 3.
// Create directory for report				
		File dir = new File(getServletContext().getRealPath(report_dir_name));							
		if ( !dir.exists() && !dir.mkdirs() ) {											    
			setErrorResponse(log_writer,"Cannot create directory: " + report_dir_name, http_request, response, null);
			return;
		} else {
			log_writer.write("INF", "Created directory " +getServletContext().getRealPath(report_dir_name));			
		}
		
// Create debug log writer
		if (http_request.getParameter("errlog")!=null) {			
			String debuglog_path = getServletContext().getRealPath(report_dir_name)+"/"+http_request.getParameter("errlog")+".txt";
			log_writer.setDebugLog(debuglog_path);
		} 
		
// 4.
// Read report template file			
		String report_template_s;  												
		String template_path = getTemplatePath(http_request.getParameter("template"),getServletContext());		
		try {
// report_template_s - report template file contents as a String				
			report_template_s = FileUtils.readFileToString(new File(template_path),"UTF-8");
		} 
		catch (FileNotFoundException e) {
			setErrorResponse(log_writer,"File not found: " + template_path, http_request, response, null);
			return;
		}
		if (report_template_s.length() < 2) {
			setErrorResponse(log_writer,"Error reading template file or file is empty: " + template_path, http_request, response, null);
			return;
		}
		
		
/* 
 * write report fragment 
 */
		if (write_debug ) {
			int length =  report_template_s.length() - 1;
			int start = 0;
			if (length > 250) start = 250;
			if (length > 1000) length = 1000;
			log_writer.write("INF", "template file "+template_path+" size = " + report_template_s.length()+"fragment: "+ report_template_s.substring(start,length));
		}
		
// 5.  
// Substitute parameter placeholders with values in report template file
		report_template_s = replaceParameterPlaceholders(report_template_s, http_request, null, null);
		
		DataSourceRequest dsRequest = null;	    			
// Extract datasource request
	    try {
			dsRequest = new DataSourceRequest(http_request);			
		} catch (DataSourceException e) {
			setErrorResponse(log_writer,"Data Source Exception. "+e.getLocalizedMessage(), http_request, response, null);
			return;
		}
		
// END measure init time		
		long endTime = System.nanoTime();
		log_writer.write("INF", "Init time: "+(endTime-startTime)/1000000+"ms");
		
// 6.
// Parse request tags		
		HashSet<String> requests = new HashSet<String>();		// List of processed requests 										 
		Matcher m = request_pattern.matcher(report_template_s); 
// find next request tag		
		while (m.find()) {			
			if (m.group(2)!=null && m.group(2).length()>0) {
// If request tag has file attribute and it's not empty 				
				String attr_file = m.group(2);  						
// attr_file_parts[0] - file name, attr_file_parts[1] - parameters for this request template				
				String[] attr_file_parts = attr_file.split(requestname_parameters_delimiter);	 		
				String request_name = attr_file_parts[0];
				String request_parameters = attr_file_parts[1];
				Hashtable<String, String> parameters = null;
				if (attr_file_parts.length > 1) {
// parameters - parameters from request tag of report template					
					parameters = log_writer.splitStringPairs(request_parameters,pairs_delimiter,parameter_value_delimiter);		
				}
				
				String request_filename = "templates/"+request_name+".txt";
				request_filename = getServletContext().getRealPath(request_filename);	
				String request_template_s;
				RequestTemplate request_template;
				try {	
// request_template_s - request template as a String					
					request_template_s = FileUtils.readFileToString(new File(request_filename),"UTF-8");					
					try {					
						request_template = new RequestTemplate(request_template_s);												
					} catch (IOException e) {
						log_writer.write("ERR","IOException parcing request "+e.getMessage());
						log_writer.writeDebuglog("IO exception parcing request. "+e.getMessage());
						continue;
					} catch (ParseException e) {
						log_writer.write("ERR","Parse exception "+e.getMessage());
						log_writer.writeDebuglog("Parse exception. "+e.getMessage());
						continue;
					} 
				} catch (FileNotFoundException e) {
					log_writer.write("ERR","Request file not found: "+request_filename);
					log_writer.writeDebuglog("File not found: " + request_filename);
			    	continue;
				} 
// 7.
// Prepare query for Analysis module					
				String pig_query = request_template.getPig();
// Replace placeholders with parameter values from HTTP request and <request> tag.
				pig_query = replaceParameterPlaceholders(pig_query, http_request, parameters,request_template);   
				String columns = request_template.getColumns();
				String query = request_template.getGQ();					
				String result_str;
// Check if had same request before					
				if (requests.contains(attr_file)) continue;
				requests.add(attr_file);
// Define file name for saving data					
				String csv_file_name=csvFileName(request_name,http_request, parameters,request_template.getParameters());
				log_writer.write("INF","CSV file: "+csv_file_name);
// File name for saving time information					
				String timeLogFile = getServletContext().getRealPath(report_dir_name+csv_file_name).replaceAll(".csv","-time.csv");					
				log_writer.setTimerLog(timeLogFile);					
									
				try {
					log_writer.write("COMM","Send query to "+requestor.address);						
// start timer for request processing
					startTime = System.nanoTime();
// debugCSV parameter is for testing. If set, do not send request to Analysis module, instead read result from debugCSV file.					
					String debugCSV = http_request.getParameter("debugCSV");				 
					if (debugCSV != null) {													
						String csv_filename = getServletContext().getRealPath(report_dir_name+csv_file_name).replaceAll(".csv","-raw.csv");
						result_str = FileUtils.readFileToString(new File(csv_filename),"UTF-8");  				
					}
					else {
// 8.							
// Send request to Analysis module							
						result_str = requestor.sendQuery(pig_query, log_writer);
					}
					if (saveRawResult) {													
// save raw results for debugging
						String filename = getServletContext().getRealPath(report_dir_name+csv_file_name).replaceAll(".csv","-raw.csv");
						try {
							save2file(filename,result_str);
						} catch (IOException e) {
							log_writer.write("ERR","Error writing raw result to file. "+e.getLocalizedMessage()+" ("+report_dir_name+")");
						}
					}
					
				}
				catch (ConnectException e) {
					log_writer.write("ERR","Connect Exception in sendQuery. "+e.getLocalizedMessage());
					log_writer.writeDebuglog("Connection failure. Error message:" + e.getMessage());
					continue;
				}
				catch (SocketTimeoutException e) {
					log_writer.write("ERR","SocketTimeoutException in sendQuery. "+e.getLocalizedMessage());
					log_writer.writeDebuglog("SocketTimeoutException. Error message:" + e.getMessage());
					continue;
				}
				catch (IOException e) {
					log_writer.write("ERR","IOException in sendQuery. "+e.getLocalizedMessage());
					log_writer.writeDebuglog("IOException. Error message:" + e.getMessage());
					continue;
				}

// end timer for request processing					
				endTime = System.nanoTime();												
				log_writer.writeTimeLog(startTime,endTime,"Request");
				
				log_writer.write("COMM","Response received. Length="+result_str.length());
				log_writer.writeDebuglog("Response received. Length="+result_str.length());					
				
				if (result_str.trim().indexOf("--") == 0) {  								
// Error response from hoplang server
					report_template_s = report_template_s.replace("\""+attr_file+"\"", "\""+report_dir_name+csv_file_name+"\"");
					String ErrResponse = result_str.trim();
					ErrResponse = ErrResponse.substring(2);
					log_writer.write("ERR","Error response from server: "+ErrResponse); 
					log_writer.writeDebuglog("     Error response from server: "+ErrResponse);
// Save error message to data file						
					save2file(getServletContext().getRealPath(report_dir_name+csv_file_name),result_str);
		            continue;
				}
				
				if (result_str.indexOf("\n") <=0) {											
// Empty response detection
					report_template_s = report_template_s.replace("\""+attr_file+"\"", "\""+report_dir_name+csv_file_name+"\"");
					log_writer.writeDebuglog("Empty response. "+result_str);						
					log_writer.write("ERR","Empty response: "+result_str+".");
					log_writer.writeCSVfile(getServletContext().getRealPath(report_dir_name+csv_file_name),null);
					continue;
				}
// start timer for result PROCESSING					
				startTime = System.nanoTime();												
				
				ColumnsDescriptor column_descriptor;
// read column notations and long names from file					
				Hashtable<String,String> long_names = log_writer.splitInFilePairs("legend.txt","\n",":");	 
// Parse columns descriptions					
				try {
					column_descriptor = new ColumnsDescriptor(columns,result_str,long_names);			
				} catch (IndexOutOfBoundsException e) {
					log_writer.write("ERR","IndexOOBoundsException in processPiqQuery. "+e.getLocalizedMessage()); 
					log_writer.writeDebuglog("    IndexOOBoundsException in processPiqQuery. "+e.getLocalizedMessage());
					continue;
				}
				
				if (column_descriptor.haveMessage()) {		// Log if have error messages
					log_writer.writeDebuglog("Errors parsing column descriptions ("+columns+"): "+column_descriptor.getMessage());
				}
			    			 
// 9.
// Convert dates if have dates in data					
				if (column_descriptor.haveDateColumn()) {
					log_writer.write("PROC","Dates converting"); 
					result_str = column_descriptor.convertDates(result_str, requestor.header_row);
					log_writer.write("PROC","Dates CONVERTED"); 
				}				    
			   
			    try {
// 10.				    	
// Create DataTable 
			    	log_writer.write("PROC","DataTable creating"); 
			    	DataTable dataT;
			    	dataT = requestor.createDataTable(result_str, column_descriptor.getColumnDescriptions()); 
				    if (dataT == null) throw new DataSourceException(ReasonType.OTHER,"Error creating data table (Probable exception in Google library CsvDataSourceHelper.read() function.)");					    
			    	log_writer.write("PROC","DataTable CREATED");
// 11.	
// Apply Google query
				    if (query!=null && query.length() > 1) {
			    		try {				    			
						    dataT = DataSourceHelper.applyQuery(DataSourceHelper.parseQuery(query), dataT, dsRequest.getUserLocale());
						    log_writer.write("PROC","Google query applied: " + query);
			    		} catch (Exception e) {
			    			log_writer.write("ERR","Invalid Google query: " + query);				    			
			    			log_writer.writeDebuglog("Query error. Query="+ query+"\nData module response fragment:\n"+ result_str.substring(0,50));
			    			continue;				    			
			    		}
			    	}					    
				    
// Format numbers, so that decimal separator is always '.'
				    log_writer.write("PROC","Values formatting.");
				    ValueFormatter NumberF = ValueFormatter.createFromPattern(ValueType.NUMBER, "###.##", ULocale.US);
				    dataT = formatValues(dataT,NumberF);					    			    
			    	log_writer.write("PROC","Values FORMATTED.");
 
// Write data to CSV file
					log_writer.writeCSVfile(getServletContext().getRealPath(report_dir_name+csv_file_name),dataT);
					 
// Set correct filename in template file
					report_template_s = report_template_s.replace("\""+attr_file+"\"", "\""+report_dir_name+csv_file_name+"\"");
			    	
// end timer for result processing						
					endTime = System.nanoTime();					
					log_writer.writeTimeLog(startTime,endTime,"Processing");
					log_writer.writeProcSpeed(result_str.length());
			    }
			    catch (DataSourceException e) {
			    	log_writer.write("ERR","DataSource exception.");
			    	log_writer.writeDebuglog("Data source exception: "+e.getLocalizedMessage());
			    	continue;
			    } 				
			}  													// if end (if: request is not empty)
		}   													// while end
		
// 12. 
// Save report file		
		String template_name = http_request.getParameter("template");
		String report_path = getServletContext().getRealPath(report_dir_name +template_name+".html");
        log_writer.write("INF","Report file: "+report_path);
        save2file(report_path,report_template_s);
// 13.
// Set servlet response: path to report in HTML format
        response.setContentType("text/html;charset=UTF-8");
	    ServletOutputStream out = response.getOutputStream();		
	    String reqUrl = http_request.getRequestURL().toString();
	    reqUrl = reqUrl.replace(http_request.getServletPath(), "")+"/";	    	    
		try {			
			out.print("<html><body><a href=\""+reqUrl+report_dir_name +template_name+".html\">"+report_dir_name + template_name+".html</a></body></html>");              
			out.flush();
			out.close();
		} catch (IOException e) {
			log_writer.write("ERR","Error closing response stream.");
		}
		count--;  												// closed servlet instance		
		log_writer.close();		
	}	
	
	
/*
 * Format values in data table.
 * Formatting is necessary to fix decimal separator in numbers.
 */
	private DataTable formatValues(DataTable dataT, ValueFormatter formatter) {
		ValueType value_type = formatter.getType();
		List <TableRow> rows = dataT.getRows();				    	
    	for (TableRow row1:rows) {
    		List <TableCell> cells = row1.getCells();
    		for (TableCell cell:cells) {				    			
    			if (cell.getType() ==  value_type) {
    				String formattedValue = cell.getFormattedValue();
    				if (formattedValue == null) {
    					if (!cell.isNull()) cell.setFormattedValue(formatter.format(cell.getValue()));
    					else {				   
// If cell is null, Highcharts will not render the chart, thus need to set zero values    						
    						cell = new TableCell(zeroValue(value_type));
    					}					    				
    				}				    				
    			}
    		}
    	}
		return dataT;
	}
	
	
/*
 * Return zero value for specified type
 */
	private Value zeroValue(ValueType value_type) {
		if (value_type == ValueType.NUMBER) {
			return new NumberValue(0);
		} else if (value_type == ValueType.DATETIME) {
			return new DateTimeValue(zeroCalendar());
		} else if (value_type == ValueType.DATE) {
			return new DateValue(zeroCalendar());
		} else if (value_type == ValueType.TIMEOFDAY) {			
			return new TimeOfDayValue(zeroCalendar());
		} else if (value_type == ValueType.BOOLEAN) {
			return BooleanValue.FALSE;
		}
		return new TextValue("");
	}
	
	
/*
 * Create calendar set to 1 Jan 1970.
 */
	private com.ibm.icu.util.GregorianCalendar zeroCalendar() {
		com.ibm.icu.util.GregorianCalendar g_calendar = new com.ibm.icu.util.GregorianCalendar();
		g_calendar.setTimeInMillis(0);
		return g_calendar;
	}

	
/*
 * Return template file path.
 * Typical template_parameter value: "report01";
 */
	private String getTemplatePath(String template_parameter, ServletContext servlet_context) {		
		if (template_parameter.indexOf(".html") < 0) template_parameter = template_parameter+".html"; 
		String template_path = "templates/"+template_parameter;
		template_path = servlet_context.getRealPath(template_path);
		return template_path;
	}

	
/*
 * Call setErrorResponse of LogWriter and subtract simultaneous servlet threads couter
 */
	private void setErrorResponse(LogWriter log_writer, String message, HttpServletRequest request, HttpServletResponse response, ReasonType RTpar) throws IOException {
		log_writer.setErrorResponse(message, request, response, RTpar);
		count--;												// subtract number of working servlet threads
	}

	
/*
 * Get directory name for saving reports.
 */
	private String dirNameFromCalendar() {
		Calendar calendar = new GregorianCalendar();
		String dirname = String.format("reports/%tY/%1$tm_%1$td/", calendar);
		return dirname;
	}

	
/*
 * Save string to file
 */
	private void save2file(String filename, String str) throws IOException {		
		File file = new File(filename);
		file.createNewFile();
        FileUtils.writeStringToFile(file, str, "UTF-8");	
	}

	
/*
 * Replace parameter placeholders (<<par_name:default_value>>) with values from HTTP request and intag parameters. 
 * parameter_placeholder_pattern = "<<([\w\d\+\-_:\.\s]*)>>"
 */
	private String replaceParameterPlaceholders(String str, HttpServletRequest http_request, Hashtable <String,String> tag_parameters, RequestTemplate r_t) {
		Matcher m = parameter_placeholder_pattern.matcher(str);
		while (m.find()) {
			try {
// parameter - pair "parameter name":"default"value" as a string
// pars[0] - parameter name, pars[1] - default value				
				String parameter = m.group(1);					
				String[] pars = parameter.split(placeholder_delimiter);  					
				try {
// Save parameter name in list of paramters of RequestTemplate instance
					if (r_t != null) r_t.addParameter(pars[0]);	
				} catch (Exception e) {
					LogWriter.writeLog("-", "ERR", "Exception on "+m.group(1)+", name "+pars[0]+".", "MakeReport");
				}
// request_par - parameter value from HTTP request
				String request_par = http_request.getParameter(pars[0]);
				if (request_par!=null && request_par.length() > 0) {
// If parameter set in HTTP request
					str = str.replaceFirst(m.group(0),replaceTodayPlaceholder(request_par));
					continue;
				}
				if (tag_parameters != null) {
// Get parameter value from <request> tag parameters 
					String tag_p = tag_parameters.get(pars[0]);	
					if (tag_p != null) {
						str = str.replaceFirst(m.group(0), replaceTodayPlaceholder(tag_p)); 
						continue;					
					}
				} 
				if (pars.length > 1) {
// Replace placeholder with default value
					str = str.replaceFirst(m.group(0), pars[1]);
				}
				else {
// Search for <<today>> placeholder and replace if found
					String replaced_today = replaceTodayPlaceholder(m.group(1));
					if (replaced_today.equals(m.group(1))) {
// If no today placeholders, just replace with empty string						
						str = str.replaceFirst(m.group(0), ""); 
					} else {
// Replace with date for today placeholder						
						str = str.replaceFirst(m.group(0), replaced_today);
					}
				}
			} catch (ArrayIndexOutOfBoundsException e) {
				LogWriter.writeLog("-", "ERR", "Parameter "+m.group(1)+" exception replacing parameter placeholders.", "MakeReport");
			}
		}		
		return str;
	}
	
	
/*
 * Replace two kinds of parameter placeholders in string:
 * 	a. <<today>>,
 * 	b. <<today-X>> and <<today+X>>, where X - is an integer number of days. 
 * Returns date in milliseconds from epoch if placholders found,
 * unchanged string if no placeholders. 
 */
	private String replaceTodayPlaceholder(String p) {
		
// replace placehoder a.
		if (p.equals("today")) {
			long today_l = today_ms();
			p = Long.toString(today_l);
			return p;
		} 
// replace placeholder b.
		Matcher m = today_pattern.matcher(p);		
		if (m.find()) {			
			long number = Long.parseLong(m.group(1)) * 24 * 60 * 60 * 1000;  // Convert number of days into number of milliseconds
			long today_l = today_ms();
			if (p.indexOf("-") > 0) {
				long date = today_l - number; 					// milliseconds from epoch 
				p = String.valueOf(date);
			} else if (p.indexOf("+") > 0) {
				long date = today_l + number; 					// milliseconds from epoch  
				p = String.valueOf(date);
			} else p = Long.toString(today_l);
		}
		return p;
	}	
	
	
/*
 * Return today midnight time of GMT+0 time zone in milliseconds from epoch
 */
	private long today_ms() {
		Calendar now_c = new GregorianCalendar(); 			
		Calendar today_c = new GregorianCalendar(now_c.get(Calendar.YEAR), now_c.get(Calendar.MONTH), now_c.get(Calendar.DATE),0,0,0);	
		today_c.setTimeZone(TimeZone.getTimeZone("GMT+0"));
		long today_l = today_c.getTimeInMillis();	
		return today_l;		
	}
	
	
/*
 * Return CSV file name to write data into.
 * CSV file name is based on request template file name and parameters found inside placeholders in request template file.
 * Parameter names and values concatenated to request template file name.
 * Method parameters:
 * 	request_name - request template name,
 * 	request - HTTP request,
 * 	tag_parameters - parameters and values from request tag of report template,  
 *  used_parameters - names of parameters found inside placeholders in request template file.
 *  
 * Note: Complex file name with parameters is used so that it is possible to idetify what request was sent to Analysis module to obtain the data.
 */
	private String csvFileName(String request_name, HttpServletRequest request, Hashtable<String, String> tag_parameters, HashSet<String> used_parameters) {		
		String filename_par=null;
		if ((filename_par=request.getParameter("filename")) != null) {   	
// If have filename parameter in HTTP request, use it as filename
			//long timestamp = new Date().getTime();
			if (filename_par.length() > 0) return request_name+"_"+filename_par+".csv";
		}
		if (used_parameters == null || used_parameters.size() < 1) return request_name+".csv";
		String csv_filename = request_name;
		Boolean need_requestname_parameters_delimiter = true;	// Do we need to insert delimiter between request name and parameters?
		Boolean need_parameters_delimiter = false;				// Do we need to insert delimiter between parameter groups?
		Iterator<String> itrs = used_parameters.iterator();
		while (itrs.hasNext()) {   								// Iterate through parameters used inside request template
			if (need_requestname_parameters_delimiter) {
				csv_filename += requestname_parameters_delimiter;
				need_requestname_parameters_delimiter = false;
			}			
			String par_name = itrs.next();						// Get the name of the next used parameter
			if (par_name != null && par_name.length() > 0 ) {
				String par_value = "";
				String http_par_value = request.getParameter(par_name);
				if (http_par_value != null && http_par_value.length() > 0) {
					par_value = http_par_value;					// Use parameter value from HTTP request
				} else {
					String tag_parameter_value = tag_parameters.get(par_name);
					if (tag_parameter_value != null && tag_parameter_value.length() > 0) {
						par_value = tag_parameter_value;		// Use parameter value from request tag
					}
				}				
				if (par_value.length() > 0) {
					if (need_parameters_delimiter) csv_filename += pairs_delimiter;
					csv_filename += par_name+"_"+par_value;
					need_parameters_delimiter = true;
				}
			}
		}
		csv_filename = encodeFilename(csv_filename);
		return csv_filename+".csv";
	}
	
	
/*
 * Call doGet with same parameters
 */
	public void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
		doGet(request,response);
	}	
	
	
/*
 * Remove illegal characters from file name
 */
	String encodeFilename(String filename) {
		filename = filename.replaceAll("[^0-9a-zA-Z._+!~-]", " ");
		return filename;
	}		
}
