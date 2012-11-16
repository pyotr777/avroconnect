/* 
 * Class for writing logs.
 * It can write logs to stdout (Tomcat logs), to arbitrary file for debug logs and to arbitrary file for timer logs.
 * Also handles servlet error responses.
 */

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.io.UnsupportedEncodingException;
import java.io.Writer;
import java.sql.Timestamp;
import java.util.Hashtable;
import java.util.List;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.commons.io.FileUtils;

import com.google.visualization.datasource.DataSourceHelper;
import com.google.visualization.datasource.base.DataSourceException;
import com.google.visualization.datasource.base.ReasonType;
import com.google.visualization.datasource.datatable.ColumnDescription;
import com.google.visualization.datasource.datatable.DataTable;
import com.google.visualization.datasource.render.CsvRenderer;
import com.ibm.icu.util.ULocale;

class LogWriter {
	
	public boolean has_debug_log = false;						// Shows if debug log is possible
	public boolean has_time_log = false;						// Shows if timer log is possible
	
	private Writer debug_log = null;	
	private Writer time_log = null;	
	private String debug_log_flename;							// Name of the file to write messages for developers
	private String job_count;
	private String servlet_name;								// Name fo the servlet which whill use this instance of FileWriter
	private String root_dir_path;								// Servlet root path
	
	private long time_total = 0;								// Total time for calculating processing speed 
	
/*
 * Create FileWriter with job counter ( > 0 for Makereport servlet, 0 otherwise), servlet name and servlet root path. 
 */	
	public LogWriter(int job_count, String servlet_name, String root_dir_path) throws IOException {
// Set job_count to number or "-" if number <= 0. (Counter starts from 1)		
		if (job_count > 0) this.job_count = Integer.toString(job_count);						
		else this.job_count = "-";
		this.servlet_name = servlet_name;													
		this.root_dir_path = root_dir_path;
	}
	
	
/*
 * Create debug log writer
 */
	public void setDebugLog(String debug_log_flename) throws IOException, UnsupportedEncodingException, FileNotFoundException {
		if (debug_log_flename!=null && debug_log_flename.length()>0) {					
			this.debug_log = createWriter(debug_log_flename); 
			this.has_debug_log = true;
			this.debug_log_flename = debug_log_flename;
			LogWriter.writeLog(this.job_count, "INF", "debug log file created: "+debug_log_flename, servlet_name);
		}
	}
	
	
/*
 * Create new timer log writer (and close previous one)
 */
	public void setTimerLog(String time_log_file) throws IOException, UnsupportedEncodingException, FileNotFoundException {
// Close writer created before
		if (this.has_time_log) {								
			this.time_log.flush();
			this.time_log.close();
			this.has_time_log = false;
		}
// Create timer log writer timelog		
		if (time_log_file!=null && time_log_file.length()>0) {										
			this.time_log = createWriter(time_log_file); 
			this.has_time_log = true;
		}		
	}
	
	
/*
 * Create Writer instance for writing to file.
 */
	private Writer createWriter(String filename) throws IOException, UnsupportedEncodingException, FileNotFoundException {
		return new BufferedWriter(new OutputStreamWriter(new FileOutputStream(filename),"UTF-8"));
	}
	
	
/*
 * Write message to stdout (Tomcat log) - call static function with instance variables as parameters. 
 */
	public void write(String message_type, String message) {
		LogWriter.writeLog(this.job_count, message_type, message, servlet_name);
	}
	
	
/*
 * Write message to debug log file.
 */
	public void writeDebuglog(String s) throws IOException {
		if (has_debug_log) {
			debug_log.write(s+"\r\n");
		} 
	}
	
	
/*
 * Write time and message to timer log file
 */
	public void writeTimeLog(long start_time, long end_time, String message) throws IOException {
		if (has_time_log) {
			if (start_time >= end_time) {
				time_log.write("0,"+message+"\r\n");
				return;
			}
			long time = (end_time - start_time)/1000000;  	// time in milliseconds 
			time_log.write(time +","+message+"\r\n");
			time_total += time;
		} else throw(new IOException("Timer log is not created."));
	}

	
/*
 * Write processing speed to timer log file	
 */
	public void writeProcSpeed(long response_length)  throws IOException  {
		if (has_time_log) {
			float speed = (float) response_length / (float) time_total;
			time_log.write(speed+",Chars per ms\r\n");
		} else throw(new IOException("Timer log is not created."));
	}
	
/*
 * Writes message to stdout.
 */
	public static void writeLog(String job_count, String message_type, String message, String servlet_name) {
		System.out.println(new Timestamp((new java.util.Date()).getTime())+ "\t"+job_count+"\t"+message_type+"\t"+message+"\t"+servlet_name);
	}


/*
 * Write dataTable to SCV file.
 */
	public void writeCSVfile(String filename,DataTable dataT) {
		String csv_string = "";
		if (dataT != null) {
			CharSequence CS = CsvRenderer.renderDataTable(dataT, ULocale.US, ",");
			String column_descriptions = "";
			csv_string = CS.toString();
			if (CS != null) column_descriptions = form_descriptions(dataT.getColumnDescriptions());
			if (column_descriptions.length() > 1) {  
// remove column headers from autogenerated table			
				csv_string = csv_string.substring(csv_string.indexOf("\n"));
// attach column descriptions to the first line				
				csv_string = column_descriptions + csv_string;
			}
		}
		try {
			write("INF","Writing to file "+ filename);			
			File file = new File(filename);
            file.createNewFile();
            FileUtils.writeStringToFile(file, csv_string,"UTF-8");
		} catch (Exception e) {
			write("ERR","Error writing file. " + e.getMessage());
			try {
				writeDebuglog("Error writing file. " + e.getMessage());
			} catch (Exception ex) { }
		}
	}
	
	
	private String form_descriptions(List<ColumnDescription> columnDescriptions) {
		String descriptions = "";
		for (int i=0; i < columnDescriptions.size(); i++) {
			if (i > 0) descriptions += ",";
			ColumnDescription cd = columnDescriptions.get(i);
			descriptions += "\"" + cd.getId() + ":" + cd.getType() + ":"+ cd.getLabel() + "\""; 
		}
		return descriptions;
	}


	/*
 * Split file of format: value1=parameter1:value2=parameter2:...
 * into a hashtable.
 * Parameter-value blocks (value=parameter) separated by pairs_delimiter (":" in the example above),
 * parameter and value are separated by parameter_value_delimiter ("=" in the example above).
 */
	public Hashtable<String, String> splitInFilePairs(String relative_path, String pairs_delimiter, String parameter_value_delimiter) throws IOException {
		String string = FileUtils.readFileToString(new File(root_dir_path+relative_path));
		return splitStringPairs(string, pairs_delimiter, parameter_value_delimiter);		
	}	
	
	
/*
 * Split one String of format: value1=parameter1:value2=parameter2:...
 * into a hashtable.
 * Parameter-value blocks (value=parameter) separated by pairs_delimiter (":" in the example above),
 * parameter and value are separated by delimiter_values ("=" in the example above).
 */
	public Hashtable<String, String> splitStringPairs(String string,String pairs_delimiter, String parameter_value_delimiter) {
		Hashtable<String, String> set = new Hashtable<String, String>();
		String[] pairs = string.split(pairs_delimiter);
		for (int j=0; j< pairs.length; j++) {
			String[] par_arr = pairs[j].split(parameter_value_delimiter);
			set.put(par_arr[0].trim(), par_arr[1].trim());
		}
		return set;
	}
	
	
/*
 * Make error logs and send error response to client.
 * Call to this method MUST be followed by RETURN in servlet doGet (doPost) method.
 */
	public void setErrorResponse(String message, HttpServletRequest request, HttpServletResponse response, ReasonType RTpar) throws IOException {
		if (has_debug_log) writeDebuglog(message);
		write("ERR", message); 
		write("AZ", "STOP");
		ReasonType RT = RTpar; 									// Reason type of error
		if (RTpar == null) RT = ReasonType.OTHER;  				
		DataSourceHelper.setServletErrorResponse(new DataSourceException(RT, message), request, response);
		close();												// Close opened writers
	}
	
	
/*
 * Same as setErrorResponse method, but includes two different messages: for Servlet response and for logs. 
 * 
 * The next operator after calling this method must be "return".
 */
	public void setExtendedErrorResponse(String message, String extendedMessage, HttpServletRequest request, HttpServletResponse response, ReasonType RTpar) throws IOException {
		if (has_debug_log) writeDebuglog(message);
		write("ERR",message); 				
		write("AZ","STOP");
		ReasonType RT = RTpar;  								// Reason type of error
		if (RTpar == null) RT = ReasonType.OTHER;  				// if Reason type is not set, default to "OTHER".
		DataSourceHelper.setServletErrorResponse(new DataSourceException(RT, extendedMessage), request, response); 
		close();
	}		

	
/*
 * Close all writers 
 */
	public void close() throws IOException {
		try {
			if (has_debug_log) {
				debug_log.write("+");
			}							
		} finally {
			if (has_debug_log) {
				debug_log.close();
				has_debug_log = false;
				write("INF", "debug log file CLOSED "+debug_log_flename);
			}
			if (has_time_log) {
				time_log.close();
				has_time_log = false;
			}
			write("AZ","CLOSED.");
		}
	}			
}
