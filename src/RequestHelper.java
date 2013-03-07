/*
 *  This class is for parsing configuration file and sending query using Avro over HTTP to Analysis module.
 *    
 *  Class constructor parses config file and initializes class variables: 
 *  	address: 	HTTP address of Pig (Hoplang) server (which is part of Analysis module),
 *  	Timelimit: 	time in milliseconds before connection times out,  
 * 		headerRow:	if a header row expected in return result
 * 		(In general, Pig does not provide header row, Hoplang server provides header row).  
 * 
 * 	Exception handling must be done outside of constructor function.
 * 
 */

import java.io.BufferedReader;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.IOException;
import java.io.Reader;
import java.io.StringReader;
import java.net.ConnectException;
import java.net.MalformedURLException;
import java.net.SocketTimeoutException;
import java.net.URL;
import java.util.HashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import javax.servlet.ServletContext;

import org.apache.avro.Protocol;
import org.apache.avro.Schema;
import org.apache.avro.generic.GenericData;
import org.apache.avro.generic.GenericRecord;
import org.apache.avro.ipc.HttpTransceiver;
import org.apache.avro.ipc.generic.GenericRequestor;
import org.apache.avro.util.Utf8;

import com.google.visualization.datasource.base.DataSourceException;
import com.google.visualization.datasource.datatable.ColumnDescription;
import com.google.visualization.datasource.datatable.DataTable;
import com.google.visualization.datasource.util.CsvDataSourceHelper;

class RequestHelper { 
	
// Important variables initialized with default values
	public String address = "cluster.parallel.ru:19099/";
	public int timeout = 600000;
	public Boolean header_row = false;
		
// Static patterns for parsing config file
	static final private Pattern addr_p = Pattern.compile("address:\\s*([\\w\\d\\.:/]+)"); 
	static final private Pattern timeout_p = Pattern.compile("timeout:\\s*(\\d+)");
	static final private Pattern hr_p = Pattern.compile("header row:\\s*(\\w+)");
	
// Static Avro protocol and schema attributes with initialization 
	final private String protocol_filename =  "queryserver.avpr";
	final private String sch = "{" +		
		" 	\"namespace\": \"hopsa\"," +
		" 	\"type\":\"record\"," +
		" 	\"name\":\"doQuery\"," +
		" 	\"fields\": [" +
		" 		{\"name\" : \"query\", \"type\" : \"string\"}," +
		" 		{\"name\" : \"pars\", \"type\" : {\"type\" : \"map\", \"values\" : \"string\"}}" +
		" 	]" +
		" }";
	
	private Schema pars_s;
	private GenericRecord pars;
	
	private URL url;
	private GenericRequestor requestor;
	private HttpTransceiver trans;		
	private File protocol_file;
	private Protocol prtl;
	
/*
 * Method for parsing config file and class variables initialization.
 * Config file should include: HTTP address of Pir (Hoplang) server, timeout time in milliseconds, boolean: "Is a header row expected in return result?". 
 *  
 * Sample config file contents:
 * -----------------------------
 * address: cluster.parallel.ru:9091
 * timeout: 1500000ms
 * header row: true
 * ----------------------------- 
 */	
	public RequestHelper(String conf_path, ServletContext servlet_context) throws FileNotFoundException, MalformedURLException, IOException {	
		String line;
		if (conf_path.indexOf(".txt.txt") > 0) conf_path = conf_path.replaceAll(".txt.txt", ".txt");
		FileReader conffile = new FileReader(conf_path);
		BufferedReader bufRead = new BufferedReader(conffile);			
		try {
			while ((line=bufRead.readLine())!= null) { 
				if (line.length() < 3) continue;					
				
				Matcher m1 = addr_p.matcher(line);
				if (m1.find()) {
					this.address = m1.group(1);		
					continue;
				} 
				
				m1 = timeout_p.matcher(line);
				if (m1.find()) {
					this.timeout = Integer.parseInt(m1.group(1));
					continue;
				}
				
				m1 = hr_p.matcher(line);
				if (m1.find()) {
					this.header_row = Boolean.parseBoolean(m1.group(1));
				}
			}			
		}			
		finally {
			bufRead.close();
		}
		url = new URL("http://" + this.address);
		this.pars_s = Schema.parse(this.sch);
		this.pars = new GenericData.Record(pars_s);
		
		this.protocol_file = new File(servlet_context.getRealPath(protocol_filename));  	
		this.prtl = Protocol.parse(this.protocol_file);		
		this.trans = new HttpTransceiver(this.url);
		this.trans.setTimeout(this.timeout);
		this.requestor = new GenericRequestor(this.prtl,this.trans);
	}
	
	
/*
 * Method for sending request using Avro over HTTP.
 * Parameters: 
 * 	query_string - Pig Latin or Hoplang query,
 * 	errlog - writer for debug logs.
 * 
 * Result is returned as a string.
 * Exceptions to be handled outside.
 */	
	public String sendQuery(String query_string, LogWriter errlog) throws ConnectException, SocketTimeoutException, IOException, IllegalArgumentException  { 				
		if (errlog != null)	{
			errlog.writeDebuglog("Connecting to: address=" + this.address + " timeout="+ this.timeout+ "ms headerRow="+ this.header_row+"\n");
			errlog.writeDebuglog("Do request: "+query_string);
		}
		this.pars.put("query", new Utf8(query_string));
		this.pars.put("pars", new HashMap<String, String>());
		String result = "";		
		result = requestor.request("doQuery", this.pars).toString();		
		return result;
	}	
	
	
/*
 * Create DataTable from CSV string 
 */
	public DataTable createDataTable(String result_str, java.util.List<ColumnDescription> cldrl) throws DataSourceException, IOException {
		Reader result_reader = (Reader) new StringReader(result_str);	    
	    BufferedReader reader = new BufferedReader(result_reader);
		DataTable dt = null;		
		try {
			dt = CsvDataSourceHelper.read(reader,cldrl,header_row);
		} finally {
			reader.close();
			result_reader.close();
		}
		return dt;
	}
}