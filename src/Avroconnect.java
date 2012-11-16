/* This program is a part of Visualization module of HOPSA project.
 * 
 * The program is a servlet working under Tomcat, and is intended for use with a web interface for building queries (like this one: /avroconnect/index.html).
 * It recieves an HTTP request from web client.
 *
 * Request should include:
 * a. DB query in Hoplang or Pig Latin in parameter "pig";
 * b. Columns descriptions in parameter "columns";
 *    Description format: columnname_columntype_columnunits - name, type and unit of measurement of columns, separated with commas.
 *    If column type is omitted, Text (String) is used.
 *    Other possible column types:
 *      "num" for NUMBER
 *      "minsec" for NUMBER (for compatibility)
 *      "time" tor TIMEOFDAY
 *      "date" for DATE
 *      "datetime" for DATETIME
 *    Types are listed in com.google.visualization.datasource.datatable.value.ValueType
 *    Sample columns description: "queue, day_date, avglength_num_jobs". - Respond must include three columns: text column (name of a queue), date column and number column (number of jobs).
 * c. Complementary Google Query Language query in parameter "tq"(note1);
 *   *note1: Goolge query can also be inside "pig" parameter, coming after actual Pig or Hoplang query: " pig query; tq= google query "
 *   Google query is executed on results of Pig (Hoplang) query, before data is sent back to the client.
 * Other request parameters:
 * "conf" - configuration file name,
 * "csv" - file name to save data in CSV format before data is sent back to the client.
 *
 * Workflow:
 * 1. Receive request form web client.
 * 2. Read configuration file
 * 3. Generate request to Analysis module using AVRO over HTTP.
 * 4. Send query to Analysis module and wait for response with data.
 * 5. Parse column descriptions in HTTP request parameter "columns".
 * 6. Convert dates (if there are dates in response) from epoch milliseconds to human readable format. Milliseconds are not supported by Google Chart Tools used for visualization.
 * 7. Use createDataTable(Reader, List<ColumnDescription>, Boolean) to create com.google.visualization.datasource.datatable.DataTable instance.
 * 8. Apply Google query (if exists) to the DataTable.
 * 9. If parameter "csv" is set, write data to CSV file.
 * 10. Send data to web client by calling method com.google.visualization.datasource.DataSourceHelper.setServletResponse(DataTable, DataSourceRequest, HttpServletResponse).
 */

import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import java.io.*;
import java.util.Hashtable;

import javax.servlet.*;

import org.apache.commons.io.FileUtils;
import com.google.visualization.datasource.DataSourceHelper;
import com.google.visualization.datasource.DataSourceRequest;
import com.google.visualization.datasource.base.DataSourceException;
import com.google.visualization.datasource.base.ReasonType;
import com.google.visualization.datasource.datatable.DataTable;

public class Avroconnect extends HttpServlet { 

	private static final long serialVersionUID = 1L; 
	
	public void doGet(HttpServletRequest request, HttpServletResponse response)	throws ServletException, IOException {
		
// Log time of execution start to stdout (Apache log file)
		LogWriter log_writer = new LogWriter(0,"Avroconnect",getServletContext().getRealPath("/"));
		log_writer.write("AZ","START  conf="+request.getParameter("conf")+" from "+request.getRemoteAddr());  

// 2. (see "Workflow" description above) 
// Extract config file name from parameters		
		String conffilename = request.getParameter("conf");
		if (conffilename==null || conffilename.length()<1) conffilename = "config";
		String conf_path=getServletContext().getRealPath(conffilename+".txt");
		
// requestHelper class is for parsing config file and sending query to Pig or Hoplang server. 
		RequestHelper requestor;		
		try {
// Parse config file and initialize requestor class variables:
// 	address, Timelimit and headerRow.
// 
// Note: Parsing config file cannot be done in init() method, because "conf" parameter can differ from one HTTP request to another, 
// but variables set in init() method are shared among all instances and threads.
			requestor = new RequestHelper(conf_path);
		}
		catch (Exception e) {
			log_writer.setErrorResponse("Error reading config file "+conf_path+". "+e.getMessage(), request, response, null);	
			return;
		}
		
// 3.
// Parse Pig Latin (Hoplang) query (variable pig_query),
// and Google Query Language query (variable google_query).
// GQL query can be either in HTTP parameter "tq",
// or inside HTTP "pig" parameter after actual Pig Latin or Hoplang query and after "tq=".
		String pig_query;
		String google_query = request.getParameter("tq");
		pig_query = request.getParameter("pig");
		int i = pig_query.indexOf("tq=");
		if (i > 0) {
				google_query = pig_query.substring(i);
				pig_query = pig_query.substring(0,i);
		}
		String result_str;		
		log_writer.write( "COMM","Sending query. Address="+ requestor.address+" timeout="+requestor.timeout);
		
// 4.
// Send Pig (Hoplang) request to Analysis module.
		String CSVfolder = "CSVs";
// debugCSV parameter is for testing. If set, do not send request to Analysis module, instead read result from debugCSV file.		
		String debugCSV = request.getParameter("debugCSV");							 
		try {			
			if (debugCSV != null && debugCSV.length() > 0) {									
				if (debugCSV.indexOf(".csv") < 0) debugCSV = debugCSV + ".csv";			 
				result_str = FileUtils.readFileToString(new File(getServletContext().getRealPath(CSVfolder+"/"+debugCSV)));  
			}
// Send request to Analysis module and wait for result		
// Parameters: 	query in Pig Latin or Hoplang,	debug log writer (set to null here)	
			else {
				result_str = requestor.sendQuery(pig_query, null);		
			}
		} catch (Exception e) {
			log_writer.setErrorResponse("Exception: "+e.getLocalizedMessage(), request, response, null);
			return;
		}
		
// Detect empty resonse.
		if (result_str.indexOf("\n") <=0) {
			log_writer.setErrorResponse("Empty response", request, response, null);
			return;			
		}
		log_writer.write( "COMM","Response received. Length="+result_str.length());

// If response starts with "--", it's an error response.
// It is a characteristic of Hoplang server. 
		if (result_str.indexOf("--") == 0) {
			log_writer.setErrorResponse(result_str, request, response, null);
			return;
		}
		
// 5.
// Parse columns formats.
		String columns = request.getParameter("columns");
		ColumnsDescriptor column_descriptor;
		
// read column notations and long names from file	
		Hashtable<String,String> long_names = log_writer.splitInFilePairs("legend.txt","\n",":");
		
		try {
			column_descriptor = new ColumnsDescriptor(columns, result_str,long_names);
		} catch (IndexOutOfBoundsException e) {
			log_writer.setErrorResponse("IndexOOBoundsException in processPiqQuery. "+e.getLocalizedMessage(), request, response, null);
			return;
		}
		
// Method ColumnsDescriptor can set an error message, if error is not fatal, and continue execution using default parameters. 
// Log message if message is set.
		//
		if (column_descriptor.haveMessage()) {
			log_writer.write( "ERR","Errors parsing Columns: "+column_descriptor.getMessage());
		}
	    
// 6.
// Convert dates if needed.
		if (column_descriptor.haveDateColumn()) result_str = column_descriptor.convertDates(result_str, requestor.header_row);
			   
		
// 7.
// Create DataTable
	    try {
	    	DataTable dataT;
	    	DataSourceRequest dsRequest;
	    	dataT = requestor.createDataTable(result_str, column_descriptor.getColumnDescriptions()); 
		    if (dataT == null) throw new DataSourceException(ReasonType.OTHER,"Error creating data table (Probable exception in Google library CsvDataSourceHelper.read() function.)");
		    
// Build a DataSource request from an HttpServletRequest. 
		    dsRequest = new DataSourceRequest(request);		    	    	
	    	
// 8. 
//Execute Google Query Language query.
	    	if (google_query!=null && google_query.length() > 1) {
	    		try {	    			
				    dataT = DataSourceHelper.applyQuery(dsRequest.getQuery(), dataT, dsRequest.getUserLocale());				    
	    		} catch (Exception e) {
	    			log_writer.setExtendedErrorResponse("Wrong query: " + google_query, "Wrong query: " + google_query+". "+e.getLocalizedMessage()+"\nAnalysis module response fragment:\n"+ result_str.substring(0,100), request, response, null);
	    			return;
	    		}
	    	}
	    	
// 9.
// If CSV parameter is set, write results to csv file
		    String csv=request.getParameter("csv");
	    	if (csv != null && csv.length() > 0 && !(debugCSV != null && debugCSV.length() > 0) ) {
	    		if (csv.indexOf(".csv") < 0) csv = csv + ".csv";
	    		FileUtils.writeStringToFile(new File(getServletContext().getRealPath(CSVfolder+"/"+csv)),result_str); 		// Write raw result string.
	    	}
	    	
// 10. Send response.
		    DataSourceHelper.setServletResponse(dataT, dsRequest, response);
		    log_writer.write("AZ","STOP");		
		    log_writer.close();
	    }
	    catch (DataSourceException e) {
	    	 log_writer.setErrorResponse("DataSourceException: "+e.getLocalizedMessage(), request, response, null);
	    	return;
	    } 
	    catch (IOException e) {
	    	 log_writer.setErrorResponse("IOException: "+e.getLocalizedMessage(), request, response, null);
	    	return;
	    } 
	}
}
