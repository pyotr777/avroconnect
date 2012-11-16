/*
 * Class for parsing columns formats.
 * 
 * Constructor method accepts a description of columns as a String and data from Analysis module as a String.
 * Column descriptions list has format: columnName1[_columnType1[_columnUnits1]], columnName2[_columnType2[_columnUnits2]],... 
 * Valid column types are:
 * 		num,    minsec, time,     	date, datetime, or anything else for Text type. 
 * They are translated into following types defined in com.google.visualization.datasource.datatable.value.ValueType:
 * 		Number, Number, Timeofday,	Date, Datetime, Text.
 * Column types are optional. By default - Text type. Minsec exists for compatibility.
 * Column units are optional units (measure) desigantions used for signing chart axes. 
 * 
 */

import java.io.BufferedReader;
import java.io.IOException;
import java.io.Reader;
import java.io.StringReader;
import java.util.ArrayList;
import java.util.Date;
import java.util.Hashtable;
import org.apache.commons.lang.StringUtils;

import com.google.visualization.datasource.datatable.ColumnDescription;
import com.google.visualization.datasource.datatable.value.ValueType;

public class ColumnsDescriptor  {
// Types and names of columns for creating DataTable.
	private ArrayList<ColumnDescription> column_descriptions;  
// Array of columns types used to convert dates.
	private ValueType[] column_types; 	
// havedatecolumn = true if we need to convert dates from epoch time in ms, not supported by Google Chart Tools visualization library, into human-readable format.	
	private boolean havedatecolumn;		
// message for error log
	private String message;				
	
	private String fields_delimiter="_";
	private String column_descriptions_delimiter = ",";
	private String data_columns_delimeter = ","; 
	private Hashtable <String,String> long_names;
	private Hashtable<ValueType,String> date_formats;
	private Hashtable<String,ValueType> types;	

/*
 * Method for setting up instance varibales: 
 * 		column_descriptions - array of ColumnDescriptions,
 * 		column_types,
 * 		havedatecolumn.
 * Parameters: 
 *  	columns - column descriptions list 
 *  	result_str - data from Analysis module
 */
	public ColumnsDescriptor(String columns, String result_str,Hashtable<String,String> long_names) throws ArrayIndexOutOfBoundsException  {
		this.long_names = long_names;
		String column_name_dummy= "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
		
// Date formats used to convert milliseconds from epoch to human readable format according to column descriptions		
		this.date_formats = new Hashtable<ValueType,String>();
	    this.date_formats.put(ValueType.DATE,"yyyy-MM-dd");
	    this.date_formats.put(ValueType.DATETIME,"yyyy-MM-dd HH:mm:ss");
	    this.date_formats.put(ValueType.TIMEOFDAY,"kk:mm:ss SSS");
		
// Map used to convert short column type notations in column descriptions to actual column types	    
		this.types = new Hashtable<String,ValueType>();
		this.types.put("num", ValueType.NUMBER);
		this.types.put("minsec", ValueType.NUMBER);
		this.types.put("time", ValueType.TIMEOFDAY);
		this.types.put("date", ValueType.DATE);
		this.types.put("datetime", ValueType.DATETIME);
		
		this.message = "";
		String row = result_str.substring(0,result_str.indexOf("\n"));
		String[] values = row.split(data_columns_delimeter);
		int columns_n = values.length; 						 	// Number of columns in result first row		
		column_types = new ValueType[columns_n];
		String[] column_names = new String[columns_n];
		String[] column_units = new String[columns_n];
		if (columns!=null) columns = removeSpaces(columns);
		int i1 = 0;		
		havedatecolumn = false;
		if (columns.length()>1) {
			String[] columns_ar = columns.split(column_descriptions_delimiter);	
			for (i1=0; i1 < columns_n; i1++) {
				if (columns_ar.length > i1) {  					
// Have description of this column in columns parameter.
// columns_ar[i1] has description of the column in format: columnName[_columnType[_columnUnits]].
					String[] col = columns_ar[i1].split(fields_delimiter);  	
					if (col[0]!=null) column_names[i1] = col[0];
					else column_names[i1] = column_name_dummy.substring(i1, i1+1);
					String c_type = "";
					if (col.length>1) {
						if (col[1].length()>0) c_type=col[1];
					}
					column_units[i1] = "";
					if (col.length>2) {
						if (col[2].length() > 0) column_units[i1] = col[2];
					}	
					column_types[i1] = translateType(c_type);					
				}
				else {											
// No description in columns parameter, set defaults.					
					column_types[i1]= ValueType.NUMBER;
					column_names[i1] = column_name_dummy.substring(i1, i1+1);
					this.message += "No description for column "+ (i1+1)+ ". "; 
				}						
			}			
		} else {
// No columns description.
// Assume first column to be Text,
// other columns - Numbers.
// Take column names from column_name_dummy String.
			column_types[0]= ValueType.TEXT;
			column_names[0] = "A";
			for (i1=1; i1 < columns_n;i1++){
				column_types[i1]= ValueType.NUMBER;
				column_names[i1] = column_name_dummy.substring(i1, i1+1);
			}			
		}			    	
	    column_descriptions = new ArrayList<ColumnDescription>();	    
	    for (int j=0; j < columns_n; j++) {
    		column_descriptions.add(new ColumnDescription(column_names[j],column_types[j],getLongName(column_names[j],column_units[j])));
    	}
	}
	
	
/*
 * Translate shorthand type description 
 * into com.google.visualization.datasource.datatable.value.ValueType
 */
	private ValueType translateType(String c_type) {
		ValueType column_type = null;
		if (c_type != null && c_type.length() > 0) column_type = this.types.get(c_type);
		if (column_type == null) column_type = ValueType.TEXT;
		if (column_type == ValueType.TIMEOFDAY || column_type == ValueType.DATE || column_type == ValueType.DATETIME) {
			havedatecolumn = true;
		}		
		return column_type;
	}

	
/*
 * Removes all spaces in a string.
 */
	private String removeSpaces(String s) {
		return s.replaceAll("\\s", "");
	}	
	
	
/*
 * Method for converting short column names into descriptive chart titles.
 * First parameter -  columnName, 
 * second parameter - columnUnits (optional).
 */
	public String getLongName(String column_name, String units) {		
		String name = "";
		if (column_name!=null && long_names != null) name = long_names.get(column_name);
		if (name == null) name = column_name;   		
		if (units!=null && units.length() > 0) name = name + " ("+units+")";
		return name;
	}
	
	
/*
 * Methods for accessing instance varibales.
 */
	public Boolean haveDateColumn() {
		return havedatecolumn;
	}
	
	
	public ValueType[] getColumnTypes() {
		return column_types;
	}
	
	
	public ArrayList<ColumnDescription> getColumnDescriptions() {
		return column_descriptions;
	}

	
	public String getMessage() {
		String message = this.message;
		this.message = "";
		return message;
	}

	
	public boolean haveMessage() {
		if (this.message != null && this.message.length() > 0) return true;
		return false;
	}	
	
	
/*
 * Convert dates from epoch time in ms to human-readable format according to column descriptions "types". 
 * Parameters:
 * 		result_str - string with data,
 * 		types - column types,
 * 		headerRow - 1st row of data has headers.
 * Return value - String with data with converted dates.	  
 */
	public String convertDates(String result_str, Boolean headerRow) throws IOException {
		String s = "";
		String line = null;
		Reader result_reader = (Reader) new StringReader(result_str);	    
	    BufferedReader reader = new BufferedReader(result_reader);
		try {
			if (headerRow) { 			// If 1st line has headers, do not convert it.
				line = reader.readLine();
				s = line+"\n";
			}
			while ((line = reader.readLine()) != null) {
				s += convertDatesOneLine(line)+"\n";				
			}
		} finally {
			reader.close();
			result_reader.close();
		}
		return s;
	}

	
/*
 * Convert epoch time in ms to human-readable format.
 * Parameter:
 * 		line - one row of data with epoch time. 		
 */

	public String convertDatesOneLine(String line) {
		String[] parts = line.split(",");
		for (int i=0; i < column_types.length; i++) {
			if (i >= parts.length ) {	
// If have descriptions for more columns than there are actually in this data row.
// Add an empty element to CSV string.
				line = StringUtils.join(parts,",")+", ,"; 		
				parts = line.split(",");
				LogWriter.writeLog("-", "ERR", "Empty data cells in row: " + line,"");
				continue;
			}
			if (parts[i] == null) continue;
			try {
				String date_format = date_formats.get(column_types[i]);
				if (date_format != null) {					
					Date d = new Date(new Long(parts[i]));
					java.text.SimpleDateFormat date = new java.text.SimpleDateFormat(date_format);
// Set timezone to GMT - we get all times from Analysis module in GMT.					
					//date.setTimeZone(TimeZone.getTimeZone("GMT+0"));  
					String date_s = date.format(d);
					parts[i] = date_s;
				}				
			} catch (NumberFormatException e) {
				LogWriter.writeLog("-", "ERR", "Have wrong "+column_types[i].getTypeCodeLowerCase()+" format in column "+(i+1)+": "+parts[i],"");
			} 
		}
		line = StringUtils.join(parts,",");
		return line;
	}
}


