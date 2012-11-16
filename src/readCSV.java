/* 
 * Read a CSV file and send data as a DataTable.
 * Parameter: 
 * 	file - filename.
 * 	 
 */

import java.io.*;
import java.util.ArrayList;
import java.util.Arrays;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.commons.lang.StringUtils;
import com.google.visualization.datasource.*;
import com.google.visualization.datasource.base.*;
import com.google.visualization.datasource.datatable.*;
import com.google.visualization.datasource.datatable.value.ValueType;
import com.google.visualization.datasource.util.*;
import com.ibm.icu.util.ULocale;

public class readCSV extends HttpServlet {

	/**
	 * 
	 */
	private static final long serialVersionUID = 1L;

	public void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
		LogWriter log_writer = new LogWriter(0,"readCSV",getServletContext().getRealPath("/"));
		String url = request.getParameter("file");    
	    if (StringUtils.isEmpty(url)) {
	    	log_writer.setErrorResponse("File parameter is not specified.", request, response, null);	
			return;
	    } else {
	    	url = getServletContext().getRealPath(url);
	    }
	    //System.out.println("Reading from "+ url);
	    BufferedReader reader = null;
	    FileReader csvfile = null;
	    try {
		    try {
		    	csvfile = new FileReader(url);
		    	reader = new BufferedReader(csvfile);	
		    	//reader = new BufferedReader(new InputStreamReader(new URL(url).openStream()));
		    } catch (IOException e) {
		    	throw new DataSourceException(ReasonType.INVALID_REQUEST,"Couldn't read from url: " + url+ "  " + e.getMessage());
		    }
		    DataTable dataTable = null;
		    //ULocale requestLocale = DataSourceHelper.getLocaleFromRequest(request);
		    ULocale requestLocale = new ULocale("en_US");
		    DataSourceRequest dsRequest = null;	 
		    dsRequest = new DataSourceRequest(request);
		    
		    //Define number of columns, their types and names
		    //reader.mark(150);
		    String line = reader.readLine();
		    
		    if (line == null) {
		    	throw new DataSourceException(ReasonType.OTHER, "No data");		    	
		    } 
		    
		    line = line.replaceAll("\"", "");
		    String[] elements = line.split(",");
		    int num_cols = elements.length;
		    
		    ValueType column_type;
		    
		    ArrayList<ColumnDescription> cldrl = new ArrayList<ColumnDescription>();
		    for (int i = 0; i < num_cols; i++) {
		    	String[] column_name_parts = elements[i].split(":");
		    	column_type = ValueType.TEXT;
		    	if (column_name_parts.length>1) {
			    	if (column_name_parts[1].equals("NUMBER")) {
			    		column_type = ValueType.NUMBER;
			    	} else if (column_name_parts[1].equals("DATE")) {
			    		column_type = ValueType.DATE;			    		
			    	} else if (column_name_parts[1].equals("DATETIME")) {
			    		column_type = ValueType.DATETIME;			    		
			    	} else if (column_name_parts[1].equals("TIMEOFDAY")) {
			    		column_type = ValueType.TIMEOFDAY;			    		
			    	}
			    	
		    	}
		    	if (column_name_parts.length>2) cldrl.add(new ColumnDescription(column_name_parts[0],column_type,column_name_parts[2]));	
		    	else cldrl.add(new ColumnDescription(column_name_parts[0],column_type,elements[i]));		    	
		    }
		    try {		      
		    	dataTable = CsvDataSourceHelper.read(reader, cldrl, false, requestLocale);
		    	
		    	//  Report table structure
		    	//List<ColumnDescription> cds = dataTable.getColumnDescriptions();
    			DataSourceHelper.setServletResponse(dataTable, dsRequest, response);		      
		    } catch (IOException e) {
		    	throw new DataSourceException(ReasonType.INVALID_REQUEST, "Couldn't read from url: " + url+ "   " + e.getMessage());  
		    }
	    }
	    catch (DataSourceException e) {
	    	log_writer.setErrorResponse(e.getLocalizedMessage(), request, response, e.getReasonType());	    				
	    }
	    finally {
	    	reader.close();
	    	csvfile.close();
	    	
	    }
	    return;
	}

	DataTable convertDates(DataTable dataTable, int[] cols) throws DataSourceException {
		String query = "SELECT ";
		String labels = " label ";
		Boolean first_column = true, first_label = true;
		for (int i=0; i < dataTable.getNumberOfColumns(); i++) {
			if (first_column) first_column = false;
			else query += ", ";
			if (Arrays.binarySearch(cols, i) >= 0) {				
				query += "toDate("+dataTable.getColumnDescription(i).getId() +")";
				if (first_label) first_label = false;
				else labels += ", ";
				labels += "toDate("+dataTable.getColumnDescription(i).getId() +") '"+ dataTable.getColumnDescription(i).getLabel()+"'";
			}
			else {				
				query += dataTable.getColumnDescription(i).getId();
			}
		}
		dataTable = DataSourceHelper.applyQuery(DataSourceHelper.parseQuery(query+labels),dataTable, null);
		return dataTable;
	}
	
}